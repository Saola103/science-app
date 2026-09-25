-- ============================================================
-- POCKET DIVE: papers/news.category — one-off backfill to the final
-- Japanese taxonomy value (category-filter simplification)
-- ============================================================
-- DRAFT ONLY — created by Dev 2026-09-26, NOT executed. Owner/Ceo to run
-- via Supabase Dashboard > SQL Editor (or MCP) after reviewing. This file
-- deliberately does not touch RLS or add/drop any column — it's a
-- same-column, same-type data UPDATE only (see "Why no ALTER TABLE" below).
--
-- Run this during a window outside the cron schedule in vercel.json
-- (collect 0:00/12:00 UTC, fix-summaries 9:00 UTC, backfill-prompts 23:00
-- UTC), same recommendation as 009_has_valid_headline.sql, and take a
-- manual Dashboard snapshot first if the plan doesn't already have
-- PITR/daily backups.
--
-- ── Background (see 30_組織/memory/kno_briefing.md 依頼4 / dev_log.md
-- 2026-09-26) ──────────────────────────────────────────────────────────
-- Until this change, papers.category / news.category held the pipeline's
-- raw internal vocabulary (English: physics, biology, it_ai, medicine,
-- astronomy, chemistry, environment, mathematics, other — plus, for news
-- only, general/climate/neuroscience/psychology from RSS_FEEDS), and every
-- READ site (lib/proto/mapArticle.ts, category tiles, filter modal, /search)
-- re-derived the Japanese taxonomy label from that raw value on every
-- render via lib/proto/mockData.ts's mapDbCategoryToTaxonomy(), including a
-- keyword heuristic that reclassifies biology/medicine items mentioning
-- brain/neuro terms into 神経科学.
--
-- lib/pipeline/collect.ts now computes that same final Japanese taxonomy
-- value ONCE, at write time (collection / summary generation), and saves it
-- directly into the category column — so reads become a direct lookup
-- instead of a runtime re-derivation. mapDbCategoryToTaxonomy() was made
-- idempotent (a value already in CATEGORIES is returned unchanged) so it
-- keeps working as a safety net for rows this migration hasn't reached yet.
--
-- This UPDATE performs the equivalent one-off conversion for EXISTING rows,
-- so the whole table ends up in the same final-taxonomy vocabulary as new
-- writes, rather than leaving old rows in the raw English vocabulary
-- indefinitely relying on the JS-side fallback branch.
--
-- ── Judgement (mirrors lib/proto/mockData.ts's DB_CATEGORY_TO_TAXONOMY +
-- NEURO_KEYWORDS, kept in sync manually) ─────────────────────────────────
--   physics -> 物理学, astronomy -> 天文学, chemistry -> 化学,
--   mathematics -> 数学, it_ai -> 情報学, environment/climate -> 環境科学,
--   neuroscience -> 神経科学, psychology -> 心理学, other/general -> その他
--   biology/medicine -> 神経科学 if title+summary_general mentions a
--     brain/neuro keyword (same keyword list as NEURO_KEYWORDS in
--     lib/proto/mockData.ts), otherwise 生物学/医学 respectively.
--   Anything already one of the 11 CATEGORIES values (a row this migration
--     runs twice on, or a row collect.ts already wrote post-deploy) is left
--     untouched — see the WHERE clause's second condition.
--   Any other/unrecognized raw value falls back to その他 (matches
--     mapDbCategoryToTaxonomy()'s `?? "その他"` fallback).
--
-- ── Why no ALTER TABLE ────────────────────────────────────────────────
-- The category column's type (text/varchar) and nullability are unchanged
-- — this migration only rewrites the values already inside it, so unlike
-- 009_has_valid_headline.sql there is no new column to add.
--
-- ── Deploy order (IMPORTANT — read before running) ──────────────────────
-- Run this AFTER deploying the code change (commit that ships
-- lib/pipeline/collect.ts's write-time category finalization,
-- lib/proto/mockData.ts's now-idempotent mapDbCategoryToTaxonomy(), and the
-- Japanese-taxonomy CATEGORIES list in app/search/page.tsx), not before.
-- Reasoning: mapDbCategoryToTaxonomy()'s idempotent short-circuit (return
-- dbCategory unchanged if it's already one of CATEGORIES) only exists in
-- the NEW code. The OLD (currently-deployed, pre-2026-09-26) production
-- code's mapDbCategoryToTaxonomy() only recognizes the raw English/RSS
-- vocabulary as lookup keys — if this SQL runs first and flips every row's
-- category to a Japanese value while the OLD code is still live, that old
-- code's DB_CATEGORY_TO_TAXONOMY lookup would silently miss on every row
-- (Japanese keys aren't in that lookup table) and fall everything through
-- to "その他", breaking category display/filtering fleet-wide until the
-- code deploy catches up. Code-first, then this SQL, avoids that window
-- entirely.

-- Papers ---------------------------------------------------------------
UPDATE papers
SET category = CASE
  WHEN category ILIKE 'physics'     THEN '物理学'
  WHEN category ILIKE 'astronomy'   THEN '天文学'
  WHEN category ILIKE 'chemistry'   THEN '化学'
  WHEN category ILIKE 'mathematics' THEN '数学'
  WHEN category ILIKE 'it_ai'       THEN '情報学'
  WHEN category ILIKE 'environment' THEN '環境科学'
  WHEN category ILIKE 'climate'     THEN '環境科学'
  WHEN category ILIKE 'neuroscience' THEN '神経科学'
  WHEN category ILIKE 'psychology'  THEN '心理学'
  WHEN category ILIKE 'biology' AND (
    coalesce(title, '') || ' ' || coalesce(summary_general, '')
  ) ~* '脳|神経|ニューロン|シナプス|大脳|小脳|海馬|脳幹|皮質|脳波|認知科学|意識|睡眠|麻酔|brain|neuro|cortex|synap|cogniti|conscious'
    THEN '神経科学'
  WHEN category ILIKE 'biology'     THEN '生物学'
  WHEN category ILIKE 'medicine' AND (
    coalesce(title, '') || ' ' || coalesce(summary_general, '')
  ) ~* '脳|神経|ニューロン|シナプス|大脳|小脳|海馬|脳幹|皮質|脳波|認知科学|意識|睡眠|麻酔|brain|neuro|cortex|synap|cogniti|conscious'
    THEN '神経科学'
  WHEN category ILIKE 'medicine'    THEN '医学'
  WHEN category ILIKE 'general'     THEN 'その他'
  WHEN category ILIKE 'other'       THEN 'その他'
  ELSE 'その他'
END
WHERE category IS NULL
   OR category NOT IN ('神経科学','物理学','生物学','化学','天文学','医学','情報学','環境科学','数学','心理学','その他');

-- News -------------------------------------------------------------------
UPDATE news
SET category = CASE
  WHEN category ILIKE 'physics'     THEN '物理学'
  WHEN category ILIKE 'astronomy'   THEN '天文学'
  WHEN category ILIKE 'chemistry'   THEN '化学'
  WHEN category ILIKE 'mathematics' THEN '数学'
  WHEN category ILIKE 'it_ai'       THEN '情報学'
  WHEN category ILIKE 'environment' THEN '環境科学'
  WHEN category ILIKE 'climate'     THEN '環境科学'
  WHEN category ILIKE 'neuroscience' THEN '神経科学'
  WHEN category ILIKE 'psychology'  THEN '心理学'
  WHEN category ILIKE 'biology' AND (
    coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(summary_general, '')
  ) ~* '脳|神経|ニューロン|シナプス|大脳|小脳|海馬|脳幹|皮質|脳波|認知科学|意識|睡眠|麻酔|brain|neuro|cortex|synap|cogniti|conscious'
    THEN '神経科学'
  WHEN category ILIKE 'biology'     THEN '生物学'
  WHEN category ILIKE 'medicine' AND (
    coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(summary_general, '')
  ) ~* '脳|神経|ニューロン|シナプス|大脳|小脳|海馬|脳幹|皮質|脳波|認知科学|意識|睡眠|麻酔|brain|neuro|cortex|synap|cogniti|conscious'
    THEN '神経科学'
  WHEN category ILIKE 'medicine'    THEN '医学'
  WHEN category ILIKE 'general'     THEN 'その他'
  WHEN category ILIKE 'other'       THEN 'その他'
  ELSE 'その他'
END
WHERE category IS NULL
   OR category NOT IN ('神経科学','物理学','生物学','化学','天文学','医学','情報学','環境科学','数学','心理学','その他');

-- ── Post-run sanity checks (run manually, not part of the migration) ────
-- SELECT category, count(*) FROM papers GROUP BY category ORDER BY 2 DESC;
-- SELECT category, count(*) FROM news   GROUP BY category ORDER BY 2 DESC;
-- Every category value returned should be one of the 11 CATEGORIES
-- (神経科学/物理学/生物学/化学/天文学/医学/情報学/環境科学/数学/心理学/その他).
