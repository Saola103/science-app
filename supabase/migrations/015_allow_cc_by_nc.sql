-- ============================================================
-- POCKET DIVE 015: show bioRxiv / medRxiv papers whose license is exactly CC BY-NC
-- ============================================================
-- Run in Supabase Dashboard > SQL Editor (owner applies manually; NOT applied
-- by Dev). Idempotent: safe to run more than once.
-- PREREQUISITE: 014 MUST ALREADY BE APPLIED (014 drops other permissive policies and
-- REVOKEs; this file only swaps papers_public_read). Do not run 015 alone on a DB
-- that has not had 014.
-- All statements run in ONE transaction (BEGIN/COMMIT below): either the whole swap
-- happens or none of it, so there is no moment without the policy.
--
-- WHAT THIS DOES
--   Re-creates ONLY the papers_public_read policy from 014 with one change:
--     bioRxiv/medRxiv licenses: ('cc_by', 'cc0', 'cc0_ng')  ->  ('cc_by', 'cc0', 'cc0_ng', 'cc_by_nc')
--   Everything else in 014 (news policy, feed_interactions, REVOKEs, function
--   search_path, other sources) is untouched.
--
-- WHY (legal basis)
--   Leg conclusion (20_ビジネス/進行中/ビジネス戦略/POCKET_DIVE_法務整備_G4.md ch.7):
--   CC BY-NC papers may be shown ONLY while the service has no ads, no paid
--   features, no donations and no sponsors. If that changes, REMOVE 'cc_by_nc'
--   (see ROLLBACK (a)) BEFORE starting any monetisation.
--   Matching is EXACT (case-sensitive): cc_by_nc_nd / cc_by_nd / cc_by_nc_sa /
--   cc_no / 'CC BY' (29 rows back-filled earlier) / NULL stay hidden.
--
-- SOURCE OF TRUTH IS THE CODE. The literals below are COPIES of
--   PAPER_ALLOWED_SOURCES / LICENSE_CHECKED_PAPER_SOURCES / PREPRINT_ALLOWED_LICENSES /
--   OPEN_ACCESS_PAPER_SOURCES / OPEN_ACCESS_ALLOWED_LICENSES   (lib/sources/policy.ts)
-- scripts/tests/migration015.test.ts parses THIS file and fails if the
-- literals drift from policy.ts. The app-side filters (PAPER_VISIBILITY_OR /
-- applyPaperVisibility / isPaperDisplayable) use the same list.
--
-- ROLLBACK (comment; run manually if needed):
--   (a) back to the 014 rule (hides CC BY-NC again; do this before any monetisation):
--   DROP POLICY IF EXISTS "papers_public_read" ON public.papers;
--   CREATE POLICY "papers_public_read" ON public.papers FOR SELECT TO anon, authenticated
--     USING (
--       source = 'arXiv'
--       OR (source IN ('bioRxiv', 'medRxiv') AND license IN ('cc_by', 'cc0', 'cc0_ng'))
--       OR (source IN ('EuropePMC', 'FrontiersYoungMinds', 'PLOS') AND license IN ('cc_by'))
--     );
--   (the app code also has to drop 'cc_by_nc' from PREPRINT_ALLOWED_LICENSES, otherwise
--    the app would still show them from service-role paths.)

BEGIN;
ALTER TABLE public.papers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "papers_public_read" ON public.papers;
CREATE POLICY "papers_public_read"
  ON public.papers FOR SELECT
  TO anon, authenticated
  USING (
    source = 'arXiv'
    OR (source IN ('bioRxiv', 'medRxiv') AND license IN ('cc_by', 'cc0', 'cc0_ng', 'cc_by_nc'))
    OR (source IN ('EuropePMC', 'FrontiersYoungMinds', 'PLOS') AND license IN ('cc_by'))
  );
COMMIT;
-- NULL source/license evaluate to NULL (= not visible), matching the code.

-- ─────────────────────────────────────────────────────────────
-- VERIFY (SQL Editor; all read-only). Run (a) BEFORE applying, then again after.
-- ─────────────────────────────────────────────────────────────
-- a) Count visible to anon. Expected: after = before + (number of bioRxiv/medRxiv rows
--    with license = 'cc_by_nc'), about +136 papers.
--     BEGIN; SET LOCAL ROLE anon;
--       SELECT count(*) AS anon_papers FROM papers;
--     ROLLBACK;
-- b) How many rows the change adds (service/postgres role) and the license breakdown
--    for bioRxiv/medRxiv:
--     SELECT source, license, count(*) FROM papers
--       WHERE source IN ('bioRxiv','medRxiv') GROUP BY 1, 2 ORDER BY 1, 2;
--     SELECT count(*) AS newly_visible FROM papers
--       WHERE source IN ('bioRxiv','medRxiv') AND license = 'cc_by_nc';
-- c) Still hidden from anon (expect 0 for each):
--     BEGIN; SET LOCAL ROLE anon;
--       SELECT count(*) FROM papers WHERE source IN ('bioRxiv','medRxiv')
--         AND (license IS NULL OR license NOT IN ('cc_by','cc0','cc0_ng','cc_by_nc'));
--       SELECT count(*) FROM papers WHERE license IN ('cc_by_nc_nd','cc_by_nd','cc_by_nc_sa','cc_no','CC BY');
--     ROLLBACK;
-- d) Policy text (expect exactly one papers_public_read containing 'cc_by_nc'):
--     SELECT policyname, qual FROM pg_policies WHERE tablename = 'papers' ORDER BY 1;
-- e) App smoke test: /feedapp/feed, /paper?id=<a cc_by_nc bioRxiv paper id>: the source
--    line shows "ライセンス: CC BY-NC ... 変更あり".
