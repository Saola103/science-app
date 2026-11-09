-- ============================================================
-- POCKET DIVE: api_daily_usage (per-bucket daily budget counters)
-- ============================================================
-- Run this in Supabase Dashboard > SQL Editor (owner applies manually).
--
-- Purpose: the public LLM routes (/api/search; /api/chat was removed, bucket groq_chat_8b is no longer written) must not be able
-- to exhaust the free-tier daily budget that the cron jobs (collect,
-- fix-summaries, backfill) depend on. groq_daily_usage (008) only keeps ONE
-- total per day across all callers, so it cannot say how much of that total
-- was spent by public traffic. This adds a second, bucketed counter:
--
--   bucket 'groq_public'          Groq gpt-oss-120b tokens spent by public routes
--   bucket 'groq_chat_8b'         Groq llama-3.1-8b-instant tokens spent by /api/chat
--   bucket 'gemini_embed_public'  Gemini embedding requests made by public routes
--
-- Server-only: RLS is enabled with no policies, and EXECUTE on the function
-- is revoked from anon/authenticated, so only the service-role key can use it.

CREATE TABLE IF NOT EXISTS api_daily_usage (
  usage_date DATE NOT NULL,
  bucket TEXT NOT NULL,
  units BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (usage_date, bucket)
);

ALTER TABLE api_daily_usage ENABLE ROW LEVEL SECURITY;

-- Atomic upsert-increment (same pattern as increment_groq_daily_usage).
CREATE OR REPLACE FUNCTION increment_api_daily_usage(p_date date, p_bucket text, p_units bigint)
RETURNS void AS $$
  INSERT INTO api_daily_usage (usage_date, bucket, units, updated_at)
  VALUES (p_date, p_bucket, p_units, now())
  ON CONFLICT (usage_date, bucket)
  DO UPDATE SET
    units = api_daily_usage.units + EXCLUDED.units,
    updated_at = now();
$$ LANGUAGE sql;

REVOKE EXECUTE ON FUNCTION increment_api_daily_usage(date, text, bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_api_daily_usage(date, text, bigint) TO service_role;
