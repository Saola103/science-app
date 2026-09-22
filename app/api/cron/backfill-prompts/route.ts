/**
 * Vercel Cron Job: Prompt-rewrite backfill (papers only)
 *
 * Regenerates summary_general/summary_expert for papers still carrying the
 * pre-2026-09-22 prompt output (the 目的/手法/結果/意義 label format, before
 * commit de36dc3 switched expert-summary.md/casual-summary.md to a
 * narrative form) — NOT the same thing as cron/fix-summaries, which only
 * repairs null/duplicate/old-format summaries. This targets otherwise
 * perfectly valid summaries that just predate the prompt rewrite.
 *
 * Requires two migrations to have been run first (Supabase Dashboard > SQL
 * Editor):
 *   - supabase/migrations/007_papers_summary_updated_at.sql
 *   - supabase/migrations/008_groq_daily_usage.sql
 * Without them this route responds 200 with `skipped: "migration not applied"`
 * rather than guessing — see BUDGET NOTES below for why treating a missing
 * migration as "the whole day is free" would be actively dangerous here.
 *
 * BUDGET NOTES (owner-approved policy: prioritize new collection, spend
 * only what's left on backfill):
 *
 * Config-derived estimate for what collection *could* use in a day
 * (18 categories x PAPERS_PER_CATEGORY=4 papers x 2 Groq calls/paper x
 * ~3,164 measured avg tokens/call x 2 collect runs/day for papers, plus
 * up to ~108 RSS articles/run x ~981 measured avg tokens/call x 2 runs/day
 * for news) comes out to roughly 300,000-500,000 tokens/day *if fully
 * saturated* — well over Groq's 200,000/day cap on its own. In other
 * words, collection is structurally unbounded relative to the daily cap;
 * it already runs until either finishing or hitting a 429, so there is no
 * static number that reliably "reserves enough" for it. A live,
 * cross-invocation usage counter (lib/llm/dailyUsage.ts) is the only
 * approach that actually respects "new collection first": this cron is
 * scheduled (see vercel.json) to run at 23:00 UTC, after both collect runs
 * (00:00, 12:00 UTC) and fix-summaries (09:00 UTC), so by the time it
 * checks the day's usage-so-far, that total already reflects what
 * collection actually consumed today — not a guess.
 *
 * If the live counter is unavailable (migration not applied / read
 * failure — NOT the same as "0 used today", see dailyUsage.ts), this
 * falls back to STATIC_RESERVE_FALLBACK, a deliberately conservative
 * assumption that collection already used most of the day's budget.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabase/serviceClient";
import { summarize } from "../../../../lib/llm/summarize";
import { getTodayGroqUsage } from "../../../../lib/llm/dailyUsage";
import { bearerToken, isAuthorizedAdmin } from "../../../../lib/auth/adminAuth";

export const maxDuration = 300;

const DAILY_CAP = 200_000; // Groq tokens/day, confirmed live via 429 (see lib/llm/index.ts)
const SAFETY_BUFFER = 15_000; // headroom below the hard cap for estimation error
const STATIC_RESERVE_FALLBACK = 150_000; // assumed collection usage when the live counter is unavailable
const TOKENS_PER_PAPER_ESTIMATE = 3_200; // measured avg casual+expert combined, rounded up slightly
const MAX_PAPERS_PER_RUN = 30; // hard cap independent of budget, to stay well within maxDuration=300s

// Papers with summary_updated_at before this are pre-prompt-rewrite
// stragglers (existing rows were backdated to 'epoch' by the migration;
// this cutoff is a belt-and-suspenders check in case that ever changes).
const PROMPT_REWRITE_CUTOFF = "2026-09-22T00:00:00Z";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(req: NextRequest) {
  if (!isAuthorizedAdmin(bearerToken(req.headers.get("authorization")))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();

  // ── Check migrations are applied before doing anything ──────────────────
  const { error: columnCheckError } = await supabase
    .from("papers")
    .select("summary_updated_at")
    .limit(1);
  if (columnCheckError) {
    return NextResponse.json({
      success: true,
      skipped: "migration not applied: supabase/migrations/007_papers_summary_updated_at.sql",
      detail: columnCheckError.message,
    });
  }

  // ── Compute today's remaining budget ─────────────────────────────────────
  const { tokensUsed, available } = await getTodayGroqUsage();
  const assumedUsed = available ? tokensUsed : STATIC_RESERVE_FALLBACK;
  const remainingBudget = Math.max(0, DAILY_CAP - assumedUsed - SAFETY_BUFFER);

  if (remainingBudget < TOKENS_PER_PAPER_ESTIMATE) {
    return NextResponse.json({
      success: true,
      skipped: "no budget remaining today",
      usageTrackingAvailable: available,
      assumedUsedToday: assumedUsed,
      remainingBudget,
    });
  }

  const paperBudget = Math.min(
    MAX_PAPERS_PER_RUN,
    Math.floor(remainingBudget / TOKENS_PER_PAPER_ESTIMATE)
  );

  // ── Find candidates (pre-prompt-rewrite, recency-first) ──────────────────
  const { data: candidates, error: fetchError } = await supabase
    .from("papers")
    .select("id, title, abstract, summary_embedding")
    .lt("summary_updated_at", PROMPT_REWRITE_CUTOFF)
    .order("published_at", { ascending: false })
    .limit(paperBudget);

  if (fetchError) {
    return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 });
  }

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({
      success: true,
      done: "no papers remaining on the pre-rewrite prompt",
      remainingBudget,
    });
  }

  let fixed = 0;
  let errors = 0;
  const results: { id: string; status: string }[] = [];

  for (const paper of candidates) {
    const text = paper.abstract || paper.title || "";
    if (!text.trim()) continue;
    try {
      const generalSummary = await summarize(text, { tone: "casual" });
      await delay(900);
      const expertSummary = await summarize(text, { tone: "expert" });
      await delay(900);

      const { error: updateError } = await supabase
        .from("papers")
        .update({
          summary_general: generalSummary,
          summary_expert: expertSummary,
          summary: generalSummary,
          summary_updated_at: new Date().toISOString(),
        })
        .eq("id", paper.id);

      if (updateError) {
        errors++;
        results.push({ id: paper.id, status: `error: ${updateError.message}` });
      } else {
        fixed++;
        results.push({ id: paper.id, status: "fixed" });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors++;
      results.push({ id: paper.id, status: `error: ${msg}` });
      if (msg.includes("429")) break; // stop on rate limit, same pattern as cron/fix-summaries
    }
    await delay(500);
  }

  return NextResponse.json({
    success: true,
    usageTrackingAvailable: available,
    assumedUsedToday: assumedUsed,
    remainingBudget,
    paperBudget,
    fixed,
    errors,
    results,
    timestamp: new Date().toISOString(),
  });
}
