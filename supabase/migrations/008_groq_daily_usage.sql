-- ============================================================
-- POCKET DIVE: groq_daily_usage (cross-invocation token budget tracking)
-- ============================================================
-- Run this in Supabase Dashboard > SQL Editor.
--
-- Vercel Cron invocations (cron/collect, cron/fix-summaries,
-- cron/backfill-prompts) each run as separate stateless processes, so
-- there's no in-memory way to know how much of Groq's 200,000
-- tokens/day cap earlier crons already used today. This table + RPC
-- function gives every Groq call (see lib/llm/dailyUsage.ts, wired into
-- lib/llm/index.ts's generateText()) a shared, atomically-incrementing
-- daily counter, so cron/backfill-prompts (scheduled to run after the
-- day's collection crons) can ask "how much is actually left today?"
-- Server-only: no RLS policies are defined, so only the service-role
-- key (which bypasses RLS) can read or write this table.

CREATE TABLE IF NOT EXISTS groq_daily_usage (
  usage_date DATE PRIMARY KEY,
  tokens_used BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE groq_daily_usage ENABLE ROW LEVEL SECURITY;

-- Atomic upsert-increment: a plain "upsert" would overwrite tokens_used
-- rather than add to it, which would lose usage recorded by concurrent
-- calls. ON CONFLICT DO UPDATE with a self-referencing SET is a single
-- atomic statement in Postgres, so this is safe under concurrency.
CREATE OR REPLACE FUNCTION increment_groq_daily_usage(p_date date, p_tokens bigint)
RETURNS void AS $$
  INSERT INTO groq_daily_usage (usage_date, tokens_used, updated_at)
  VALUES (p_date, p_tokens, now())
  ON CONFLICT (usage_date)
  DO UPDATE SET
    tokens_used = groq_daily_usage.tokens_used + EXCLUDED.tokens_used,
    updated_at = now();
$$ LANGUAGE sql;
