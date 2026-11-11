import Groq from "groq-sdk";
import { recordGroqUsage } from "./dailyUsage";
import { getPublicScope, recordApiUsage } from "./publicBudget";

// llama-3.3-70b-versatile was decommissioned by Groq (Aug 2026). gpt-oss-120b is
// the closest replacement in quality. Groq enforces BOTH an 8000 tokens/min
// (TPM) rate limit AND a 200,000 tokens/day (TPD) cap on this model/tier —
// confirmed live via a 429 ("tokens per day (TPD): Limit 200000") after a
// large one-off collection run. An earlier version of this comment claimed
// there was no daily cap; that was wrong. waitForTokenBudget below only
// paces the per-minute rate — it does NOT track the daily cap (that would
// need to persist across process restarts, which no caller here does), so a
// big batch (collect-once.ts, collect-historical.ts, backfill.ts) can still
// exhaust the whole day's 200k budget and start failing with 429s; when that
// happens, the failure is real and the fix is to wait for the daily reset,
// not to retry harder.
const MODEL = "openai/gpt-oss-120b";
const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMENSIONS = 768; // must match the `vector(768)` column in supabase/migrations/001_vector_search.sql

// Stay under Groq's 8000 TPM rate limit with headroom for other callers
// hitting the same key concurrently (Vercel cron + admin routes + this script).
// This budget is per-minute only — see the daily-cap note above for the
// separate constraint this does NOT cover.
const TPM_BUDGET = 6000;
const usageLog: { time: number; tokens: number }[] = [];

/** Blocks until issuing `estimatedTokens` more would stay within TPM_BUDGET over the trailing 60s. */
async function waitForTokenBudget(estimatedTokens: number): Promise<void> {
  for (;;) {
    const now = Date.now();
    while (usageLog.length && now - usageLog[0].time > 60_000) usageLog.shift();
    const used = usageLog.reduce((s, u) => s + u.tokens, 0);
    if (used + estimatedTokens <= TPM_BUDGET) {
      usageLog.push({ time: now, tokens: estimatedTokens });
      return;
    }
    const oldestAge = now - usageLog[0].time;
    await new Promise((r) => setTimeout(r, Math.max(500, 60_000 - oldestAge)));
  }
}

const GROQ_REQUEST_TIMEOUT_MS = 45_000;
const GEMINI_EMBED_TIMEOUT_MS = 20_000;

function getGroqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("CRITICAL: GROQ_API_KEY is missing. Get a free key at https://console.groq.com");
    throw new Error("GROQ_API_KEY is required. Get a free key at https://console.groq.com");
  }
  // SDK default is a 10-minute timeout; cap each call so one stuck request
  // cannot eat the 300s collection budget. maxRetries is 0 so the only retry is
  // the outer 429 loop in generateText (worst case 45s x 3, no hidden SDK retries).
  return new Groq({ apiKey, timeout: GROQ_REQUEST_TIMEOUT_MS, maxRetries: 0 });
}

export async function generateText(prompt: string, temperature = 0.7): Promise<string> {
  const client = getGroqClient();
  const maxTokens = 700;

  for (let attempt = 0; attempt < 3; attempt++) {
    await waitForTokenBudget(maxTokens);
    try {
      const result = await client.chat.completions.create({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature,
        max_tokens: maxTokens,
        reasoning_effort: "low",
      });
      // Fire-and-forget: record actual usage (falls back to the completion
      // cap if Groq didn't return a usage block) so cron/backfill-prompts
      // can see today's real cross-invocation total. See lib/llm/dailyUsage.ts.
      recordGroqUsage(result.usage?.total_tokens ?? maxTokens);
      return result.choices[0]?.message?.content || "";
    } catch (err) {
      const isRateLimit = err instanceof Groq.APIError && err.status === 429;
      if (isRateLimit && attempt < 2) {
        console.warn(`[Groq generateText] Rate limited, retrying (attempt ${attempt + 1})...`);
        await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
        continue;
      }
      // A timed-out / failed call may still have consumed tokens on Groq's side;
      // count the cap so the daily estimate is never lower than reality.
      // (A 429 is rejected before generation, so it is not counted.)
      if (!isRateLimit) recordGroqUsage(maxTokens);
      console.error("[Groq generateText Error]:", err);
      throw err;
    }
  }
  throw new Error("unreachable");
}

/**
 * Whether USER-TYPED search queries / questions may be sent to the Gemini
 * embedding API. Off by default (the free Gemini tier may use submitted
 * content to improve Google products); set ENABLE_QUERY_EMBEDDING=true once
 * on a paid tier to restore semantic search. Does NOT affect embedding of
 * public paper abstracts at collection time (embedText callers in the cron /
 * backfill paths).
 */
export function isQueryEmbeddingEnabled(): boolean {
  return process.env.ENABLE_QUERY_EMBEDDING === "true";
}

/**
 * Generates a 768-dim embedding via the Gemini embedding API (separate quota
 * from Groq — does not compete with the summarization token budget).
 * Calls the REST endpoint directly (the former @google/generative-ai SDK
 * predated `outputDimensionality` support and has been removed).
 * Returns an empty array on failure so callers can gracefully skip vector search.
 */
export async function embedText(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("[embedText] GEMINI_API_KEY is missing. Skipping embedding.");
    return [];
  }
  // Public routes: skip (callers degrade to keyword search) once the public
  // share of today's embedding quota is spent; otherwise count this request.
  const publicScope = getPublicScope();
  if (publicScope?.embedBlocked) return [];
  if (publicScope) recordApiUsage("gemini_embed_public", 1);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: `models/${EMBEDDING_MODEL}`,
          content: { parts: [{ text }] },
          outputDimensionality: EMBEDDING_DIMENSIONS,
        }),
        signal: AbortSignal.timeout(GEMINI_EMBED_TIMEOUT_MS), // failure falls through to the existing catch (returns [])
      }
    );
    if (!res.ok) {
      console.error("[embedText] Gemini embedding failed:", res.status, await res.text());
      return [];
    }
    const data = await res.json();
    return data.embedding?.values ?? [];
  } catch (err) {
    console.error("[embedText] Gemini embedding failed:", err);
    return [];
  }
}
