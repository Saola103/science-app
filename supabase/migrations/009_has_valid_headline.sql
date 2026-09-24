-- ============================================================
-- POCKET DIVE: papers/news.has_valid_headline (broken-headline feed fix)
-- ============================================================
-- Run this in Supabase Dashboard > SQL Editor. Recommended: run during a
-- window that doesn't overlap the cron schedule in vercel.json (collect
-- 0:00/12:00 UTC, fix-summaries 9:00 UTC, backfill-prompts 23:00 UTC) —
-- e.g. UTC 3-7 — and take a manual Dashboard snapshot/backup first if your
-- plan doesn't already have PITR/daily backups (Sec review, 2026-09-24,
-- 30_組織/memory/sec_checklist.md). Not required for correctness — this is
-- an additive column, not a destructive change — but cheap insurance.
--
-- Root cause (see 30_組織/memory/kno_briefing.md / dev_log.md 2026-09-24):
-- app/api/feed/route.ts's withJapaneseSummary() (now withValidHeadline())
-- only checked `summary_general is not null`, but a large fraction of
-- existing rows have a non-null summary_general that predates the
-- 3-block "headline\n\nbody\n\neasy-explanation" prompt shape (one long
-- undifferentiated paragraph, no short Japanese headline on line 1).
-- lib/proto/mapArticle.ts's parseGeneralSummary() rejects those as a
-- headline and falls back to the raw (often English) DB title — the
-- "titles are garbled" symptom. This column flags exactly those rows so
-- the feed can exclude them without waiting for LLM re-summarization.
--
-- Judgement mirrors lib/format/summaryText.ts's hasValidHeadline() (kept
-- in sync manually — if that JS logic ever changes, re-run the UPDATE
-- below with the matching new WHERE clause):
--   summary_general IS NOT NULL AND non-empty
--   AND first line (up to first \n), trimmed, is <= 40 chars
--   AND that first line contains at least one Japanese character
--       (hiragana/katakana U+3040-30FF, CJK ideographs U+4E00-9FFF —
--       same ranges as the JS regex /[぀-ヿ一-鿿]/)
--
-- Design (per Sec review): a normal nullable column + separate UPDATE,
-- NOT a GENERATED ALWAYS AS ... STORED column — ADD COLUMN alone
-- (no default) is metadata-only and near-instant; the UPDATE takes only a
-- ROW EXCLUSIVE lock and does not block concurrent SELECTs from
-- app/api/feed/route.ts. A generated column's defining ALTER TABLE would
-- instead take ACCESS EXCLUSIVE while it computes every existing row,
-- blocking reads for its duration.

ALTER TABLE papers ADD COLUMN IF NOT EXISTS has_valid_headline BOOLEAN;
ALTER TABLE news ADD COLUMN IF NOT EXISTS has_valid_headline BOOLEAN;

UPDATE papers
SET has_valid_headline = (
  summary_general IS NOT NULL
  AND trim(summary_general) <> ''
  AND length(trim(split_part(trim(summary_general), E'\n', 1))) <= 40
  AND trim(split_part(trim(summary_general), E'\n', 1)) ~ '[぀-ヿ一-鿿]'
)
WHERE has_valid_headline IS NULL;

UPDATE news
SET has_valid_headline = (
  summary_general IS NOT NULL
  AND trim(summary_general) <> ''
  AND length(trim(split_part(trim(summary_general), E'\n', 1))) <= 40
  AND trim(split_part(trim(summary_general), E'\n', 1)) ~ '[぀-ヿ一-鿿]'
)
WHERE has_valid_headline IS NULL;

-- Going forward, every write path that sets summary_general (collect.ts via
-- lib/supabase/serviceClient.ts, app/api/cron/fix-summaries,
-- app/api/admin/fix-summaries, app/api/cron/backfill-prompts,
-- scripts/backfill.ts) also sets has_valid_headline at write time via the
-- same hasValidHeadline() function, so this column should never drift back
-- out of sync without another manual UPDATE like this one.
--
-- NOTE: app/api/feed/route.ts's withValidHeadline() filters on
-- `has_valid_headline = true`. Deploy the code change together with (or
-- after) running this migration+backfill — if the code ships first and
-- this column doesn't exist yet, every row is NULL (not true) and the feed
-- would return empty until the backfill runs.
