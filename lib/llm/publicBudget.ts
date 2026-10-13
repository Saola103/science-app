/**
 * Daily budget guard for the PUBLIC LLM routes (/api/chat, /api/search).
 *
 * Why: Groq (gpt-oss-120b: 200k tokens/day) and Gemini embeddings (~1000/day)
 * are free-tier quotas shared by the public routes AND the cron jobs
 * (collect, fix-summaries, backfill). Nobody is billed, but if public traffic
 * (or someone scripting it) drains the quota, the daily collection stops.
 * So public traffic gets its own capped share, tracked per bucket in
 * api_daily_usage (supabase/migrations/011_api_daily_usage.sql), and the rest
 * (>= 40% of the Groq cap) is always left for cron.
 *
 * Public usage is attributed with AsyncLocalStorage: a public route wraps its
 * handler body in runInPublicScope(), and recordGroqUsage()/embedText() (which
 * the cron jobs also call, outside any scope) add to the public bucket only
 * when a scope is active. Cron behaviour is unchanged.
 *
 * Failure mode: if the counter can't be read (migration not applied yet,
 * Supabase hiccup) the guard FAILS OPEN and logs a warning -- the existing
 * per-IP rate limit still applies. Blocking all public traffic because a
 * counter is unreadable would be a worse failure than the one this prevents.
 *
 * Limits: counters are updated fire-and-forget after each call, so a burst of
 * concurrent requests can overshoot a cap by a few requests' worth.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { getSupabaseServerClient } from "../supabase/serviceClient";

export type Bucket = "groq_public" | "groq_chat_8b" | "gemini_embed_public";

export const GROQ_DAILY_CAP = 200_000; // gpt-oss-120b tokens/day (see lib/llm/index.ts)
export const GEMINI_EMBED_DAILY_CAP = 1_000; // embedContent requests/day (see cron/fix-summaries)

/** Public share of each daily quota. The remainder is reserved for cron. */
export const PUBLIC_LIMITS: Record<Bucket, number> = {
  groq_public: Math.floor(GROQ_DAILY_CAP * 0.6), // 120k; cron keeps >= 80k
  gemini_embed_public: Math.floor(GEMINI_EMBED_DAILY_CAP * 0.6), // 600; cron keeps >= 400
  // llama-3.1-8b-instant is a separate Groq model (own quota, not shared with
  // cron's gpt-oss). Its real daily limit isn't verified here; this is a
  // cost/abuse ceiling, not a protection of cron. Adjust if the real limit differs.
  groq_chat_8b: 300_000,
};

export const BUDGET_EXCEEDED_MESSAGE =
  "本日のAI機能の利用上限に達しました。明日（日本時間の朝9時ごろ）にまたお試しください。論文のフィードは引き続きご利用いただけます。";

type PublicScope = { embedBlocked: boolean };
const scopeStore = new AsyncLocalStorage<PublicScope>();

export function runInPublicScope<T>(scope: PublicScope, fn: () => Promise<T>): Promise<T> {
  return scopeStore.run(scope, fn);
}

export function getPublicScope(): PublicScope | undefined {
  return scopeStore.getStore();
}

export function todayUTC(): string {
  return new Date().toISOString().slice(0, 10); // same UTC day boundary as groq_daily_usage
}

/** Fire-and-forget increment; never throws. */
export function recordApiUsage(bucket: Bucket, units: number): void {
  if (!units || units <= 0) return;
  try {
    getSupabaseServerClient()
      .rpc("increment_api_daily_usage", { p_date: todayUTC(), p_bucket: bucket, p_units: Math.ceil(units) })
      .then(({ error }: { error: { message: string } | null }) => {
        if (error) console.warn("[publicBudget] record failed:", error.message);
      });
  } catch (e) {
    console.warn("[publicBudget] record failed:", e);
  }
}

async function readUsage(): Promise<Partial<Record<Bucket, number>> | null> {
  try {
    const { data, error } = await getSupabaseServerClient()
      .from("api_daily_usage")
      .select("bucket, units")
      .eq("usage_date", todayUTC());
    if (error) throw error;
    const out: Partial<Record<Bucket, number>> = {};
    for (const row of data ?? []) out[row.bucket as Bucket] = Number(row.units);
    return out;
  } catch (e) {
    console.warn("[publicBudget] read failed -- guard is failing open:", e);
    return null;
  }
}

/**
 * Check today's public usage before doing LLM work.
 *  - needs.groq / needs.chat: this request will spend that bucket; `blocked`
 *    is true when it is already over its public cap.
 *  - embedBlocked: Gemini embeddings are over the public cap. This is not a
 *    reason to reject the request (vector search degrades to keyword search),
 *    so callers pass it to runInPublicScope instead.
 */
export async function checkPublicBudget(needs: {
  groq?: boolean;
  chat?: boolean;
}): Promise<{ blocked: boolean; embedBlocked: boolean }> {
  const usage = await readUsage();
  if (!usage) return { blocked: false, embedBlocked: false };
  const over = (b: Bucket) => (usage[b] ?? 0) >= PUBLIC_LIMITS[b];
  return {
    blocked: Boolean((needs.groq && over("groq_public")) || (needs.chat && over("groq_chat_8b"))),
    embedBlocked: over("gemini_embed_public"),
  };
}
