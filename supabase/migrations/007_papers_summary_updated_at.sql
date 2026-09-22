-- ============================================================
-- POCKET DIVE: papers.summary_updated_at (backfill-prompts cron support)
-- ============================================================
-- Run this in Supabase Dashboard > SQL Editor.
--
-- Tracks when a paper's summary_general / summary_expert were last
-- (re)generated, so the /api/cron/backfill-prompts job can find papers
-- still carrying the pre-2026-09-22 label-format summaries (before the
-- casual/expert-summary.md narrative-form prompt rewrite, commit
-- de36dc3) and skip ones it has already reprocessed with the new
-- prompt — without needing a separate "done" flag.
--
-- Existing rows are backdated to 'epoch' (1970-01-01) so the backfill
-- job picks them all up as candidates. Every future write to
-- summary_general/summary_expert (new collection via
-- upsertPaperToSupabase, cron/fix-summaries, and this backfill job
-- itself) sets this column to the current time, which naturally
-- excludes that row from future backfill runs.

ALTER TABLE papers ADD COLUMN IF NOT EXISTS summary_updated_at TIMESTAMPTZ;

UPDATE papers SET summary_updated_at = 'epoch'::timestamptz WHERE summary_updated_at IS NULL;
