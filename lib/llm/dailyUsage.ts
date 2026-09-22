/**
 * Cross-invocation Groq daily token usage tracking.
 *
 * Vercel Cron invocations (cron/collect, cron/fix-summaries, and the new
 * cron/backfill-prompts) each run as a fresh, stateless serverless process,
 * so the in-memory TPM budget in lib/llm/index.ts (which only paces the
 * per-minute rate within a single invocation) can't tell you how much of
 * Groq's 200,000 tokens/day cap earlier invocations already used *today*.
 * This persists a running daily total in Supabase so a later job (the
 * backfill cron, scheduled to run after the day's collection crons) can
 * ask "how much is actually left today?" instead of guessing from a static
 * split.
 *
 * Requires supabase/migrations/008_groq_daily_usage.sql to have been run.
 */
import { getSupabaseServerClient } from "../supabase/serviceClient";

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD, UTC calendar day
}

/**
 * Record that `tokens` were just spent on a Groq call. Fire-and-forget —
 * never throws or blocks the caller; a tracking failure should never break
 * actual summarization. Relies on the increment_groq_daily_usage() SQL
 * function (atomic upsert) so concurrent calls don't clobber each other.
 */
export function recordGroqUsage(tokens: number): void {
  if (!tokens || tokens <= 0) return;
  try {
    const supabase = getSupabaseServerClient();
    supabase
      .rpc("increment_groq_daily_usage", { p_date: todayUTC(), p_tokens: tokens })
      .then(({ error }: { error: { message: string } | null }) => {
        if (error) console.warn("[dailyUsage] record failed:", error.message);
      });
  } catch (e) {
    console.warn("[dailyUsage] record failed:", e);
  }
}

/**
 * Today's total Groq token usage so far (UTC calendar day) across every
 * caller (collection, fix-summaries repairs, this backfill job's own prior
 * runs today).
 *
 * `available: false` means the table/migration isn't set up yet or the
 * read failed — that's a different situation from "genuinely 0 tokens
 * used today" and callers (cron/backfill-prompts) must NOT treat it the
 * same way, or a missing migration would look like "the whole day's
 * budget is free" and starve collection. Callers should fall back to a
 * conservative static assumption when `available` is false.
 */
export async function getTodayGroqUsage(): Promise<{ tokensUsed: number; available: boolean }> {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("groq_daily_usage")
      .select("tokens_used")
      .eq("usage_date", todayUTC())
      .maybeSingle();
    if (error) throw error;
    return { tokensUsed: data?.tokens_used ?? 0, available: true };
  } catch (e) {
    console.warn("[dailyUsage] read failed — treating today's usage as unknown:", e);
    return { tokensUsed: 0, available: false };
  }
}
