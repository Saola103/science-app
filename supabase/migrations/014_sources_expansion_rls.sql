-- ============================================================
-- POCKET DIVE 014: 013 + new CC BY sources (replacement version of 013)
-- ============================================================
-- Run in Supabase Dashboard > SQL Editor (owner applies manually; NOT applied
-- by Dev). Idempotent: safe to run more than once.
--
-- WHAT'S NEW vs 013 (2026-11, feat/sources-expansion)
--   014 is a SUPERSET / REPLACEMENT of 013: same policies + hardening, with the
--   allow-lists extended for the new license-clear sources:
--     papers: + source IN ('EuropePMC','FrontiersYoungMinds','PLOS') AND license = 'cc_by'
--     news  : + 'ESO', 'ESA/Webb', 'ESA/Hubble'
--   If 013 is already applied, running 014 on top is fine (idempotent, it
--   DROPs and re-CREATEs the same two policies). If 013 is NOT applied yet,
--   apply 014 INSTEAD of 013 (do not apply 013 afterwards: it would narrow the
--   lists again). New papers.license value for these sources is 'cc_by' (the
--   fetcher exact-matches Europe PMC "cc by" / Crossref CC BY 4.0 URL at
--   ingestion and stores the normalized marker).
--
-- Purpose
--   Until now papers_public_read / news_public_read were USING (true), so rows
--   the app hides for licensing reasons (non-permitted news such as Phys.org,
--   bioRxiv/medRxiv with a non-CC BY/CC0 license) could still be read in full
--   (abstract, summaries) by calling the Supabase REST API directly with the
--   public anon key. This makes the RLS policies themselves enforce the same
--   rule as the app. service_role bypasses RLS, so cron and all server-side
--   app code (getSupabaseServerClient) are unaffected.
--
--   1. papers_public_read / news_public_read -> USING the visibility rule.
--   2. Defence in depth: REVOKE write privileges from anon/authenticated on
--      papers/news; REVOKE ALL on the policy-less tables.
--   3. increment_api_daily_usage: pin search_path (advisor warning).
--
-- SOURCE OF TRUTH IS THE CODE. The literals below are COPIES. When the code
-- changes, change this policy in a NEW migration (015...) in the same release:
--   papers sources  <- PAPER_ALLOWED_SOURCES        (lib/sources/policy.ts)
--   license-checked <- LICENSE_CHECKED_PAPER_SOURCES (policy.ts, bioRxiv/medRxiv)
--   licenses        <- PREPRINT_ALLOWED_LICENSES    (policy.ts)
--   CC BY sources   <- OPEN_ACCESS_PAPER_SOURCES    (policy.ts)
--   CC BY licenses  <- OPEN_ACCESS_ALLOWED_LICENSES (policy.ts)
--   news sources    <- NEWS_ALLOWED_SOURCES         (policy.ts)
-- scripts/tests/sources-expansion.test.ts parses THIS file and fails if the
-- literals below drift from policy.ts.
--   (the app-side filters are PAPER_VISIBILITY_OR / applyPaperVisibility /
--    applyNewsVisibility in lib/sources/visibility.ts)
-- Matching is EXACT (case-sensitive), same as PAPER_VISIBILITY_OR. Note that
-- isPreprintLicenseAllowed() in code also trims + lowercases; that only matters
-- for the service-role paths, never for anon, so the stricter SQL is safe.
-- Values as of 2026-11-10:
--   PAPER_ALLOWED_SOURCES   = arXiv, bioRxiv, medRxiv, EuropePMC, FrontiersYoungMinds, PLOS
--   PREPRINT_ALLOWED_LICENSES = cc_by, cc0, cc0_ng   ('CC BY' etc. = hidden)
--   OPEN_ACCESS_ALLOWED_LICENSES = cc_by              (EuropePMC/FrontiersYoungMinds/PLOS)
--   NEWS_ALLOWED_SOURCES    = NASA, NSF, ESO, ESA/Webb, ESA/Hubble   (CERN removed)
--
-- Deploy order: the app code (feat/sources-expansion, which filters with the
-- same rule and reads papers/news only via service role) can go first or
-- second; there is no app dependency on the old USING (true). Recommended:
-- deploy code first, then run this SQL (so the rule is app-enforced the whole
-- time). Do NOT run this before the code if the new sources are not yet
-- collected: it is harmless (no rows match) but pointless.
-- Anon-key reads of papers/news by the app: none (see dev_log 2026-11-10).
--
-- ROLLBACK (comment; run manually if needed):
--   (a) back to the 013 rule (drops only the new sources from visibility):
--   DROP POLICY IF EXISTS "papers_public_read" ON public.papers;
--   CREATE POLICY "papers_public_read" ON public.papers FOR SELECT TO anon, authenticated
--     USING (source = 'arXiv' OR (source IN ('bioRxiv','medRxiv') AND license IN ('cc_by','cc0','cc0_ng')));
--   DROP POLICY IF EXISTS "news_public_read" ON public.news;
--   CREATE POLICY "news_public_read" ON public.news FOR SELECT TO anon, authenticated
--     USING (source_name IN ('NASA','NSF'));
--   (b) back to the pre-013 state (everything readable):
--   DROP POLICY IF EXISTS "papers_public_read" ON public.papers;
--   CREATE POLICY "papers_public_read" ON public.papers FOR SELECT
--     TO anon, authenticated USING (true);
--   DROP POLICY IF EXISTS "news_public_read" ON public.news;
--   CREATE POLICY "news_public_read" ON public.news FOR SELECT
--     TO anon, authenticated USING (true);
--   GRANT INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
--     ON public.papers, public.news TO anon, authenticated;   -- RLS still blocks writes
--   GRANT ALL ON public.api_daily_usage, public.feedback,
--     public.groq_daily_usage, public.subscribers TO anon, authenticated;  -- only if ever needed
--   ALTER FUNCTION public.increment_api_daily_usage(date, text, bigint) RESET search_path;

-- ─────────────────────────────────────────────────────────────
-- 1. Visibility policies
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.papers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "papers_public_read" ON public.papers;
CREATE POLICY "papers_public_read"
  ON public.papers FOR SELECT
  TO anon, authenticated
  USING (
    source = 'arXiv'
    OR (source IN ('bioRxiv', 'medRxiv') AND license IN ('cc_by', 'cc0', 'cc0_ng'))
    OR (source IN ('EuropePMC', 'FrontiersYoungMinds', 'PLOS') AND license IN ('cc_by'))
  );
-- NULL source/license evaluate to NULL (= not visible), matching the code.
-- "papers_service_only_write" (FOR ALL ... USING (false), from 004) is left as is:
-- permissive policies are OR-ed, and USING (false) never widens access.

ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "news_public_read" ON public.news;
CREATE POLICY "news_public_read"
  ON public.news FOR SELECT
  TO anon, authenticated
  USING (source_name IN ('NASA', 'NSF', 'ESO', 'ESA/Webb', 'ESA/Hubble'));

-- feed_interactions policies: intentionally unchanged.

-- ─────────────────────────────────────────────────────────────
-- 2. Privilege hardening (defence in depth; RLS remains the main wall)
-- ─────────────────────────────────────────────────────────────
-- papers / news: read-only for the public roles. SELECT is kept.
-- (authenticated is included because no logged-in path writes these either.)
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.papers, public.news FROM anon, authenticated;

-- Policy-less, server-only tables: no privileges for the public roles at all.
-- Guarded so the migration does not fail if a table does not exist.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['api_daily_usage', 'feedback', 'groq_daily_usage', 'subscribers'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', t);
    END IF;
  END LOOP;
END $$;

-- Deliberately NOT touched: feed_interactions grants (authenticated insert/select/
-- delete go through its policies), all sequences (feed_interactions may rely on a
-- sequence for authenticated INSERT), and other functions (012 already locked
-- increment_groq_daily_usage / match_papers; 011 locked increment_api_daily_usage).
-- Note: Supabase default privileges re-grant anon/authenticated on FUTURE tables
-- in public; every new table needs its own RLS + REVOKE.

-- ─────────────────────────────────────────────────────────────
-- 3. increment_api_daily_usage: pin search_path
-- ─────────────────────────────────────────────────────────────
-- Body only references api_daily_usage (public). pg_temp last so temp objects
-- cannot shadow public ones. Signature from 011: (date, text, bigint).
ALTER FUNCTION public.increment_api_daily_usage(date, text, bigint) SET search_path = public, pg_temp;

-- ─────────────────────────────────────────────────────────────
-- VERIFY after applying (SQL Editor; all read-only)
-- ─────────────────────────────────────────────────────────────
-- a) Policies:
--   SELECT tablename, policyname, cmd, roles, qual FROM pg_policies
--     WHERE tablename IN ('papers','news') ORDER BY 1, 2;
-- b) Expected anon-visible counts must equal the app-visible counts.
--    Simulated anon (rolls back, no side effects):
--     BEGIN; SET LOCAL ROLE anon;
--       SELECT (SELECT count(*) FROM papers) AS anon_papers,
--              (SELECT count(*) FROM news)   AS anon_news;
--     ROLLBACK;
--    Reference (service/postgres role), should match anon_papers / anon_news:
--     SELECT count(*) FROM papers
--       WHERE source = 'arXiv'
--          OR (source IN ('bioRxiv','medRxiv') AND license IN ('cc_by','cc0','cc0_ng'))
--          OR (source IN ('EuropePMC','FrontiersYoungMinds','PLOS') AND license IN ('cc_by'));
--     SELECT count(*) FROM news WHERE source_name IN ('NASA','NSF','ESO','ESA/Webb','ESA/Hubble');
--    Hidden rows must be invisible to anon:
--     BEGIN; SET LOCAL ROLE anon;
--       SELECT count(*) FROM papers WHERE source IN ('bioRxiv','medRxiv')
--         AND (license IS NULL OR license NOT IN ('cc_by','cc0','cc0_ng'));   -- expect 0
--       SELECT count(*) FROM news WHERE source_name NOT IN ('NASA','NSF','ESO','ESA/Webb','ESA/Hubble');  -- expect 0
--       SELECT count(*) FROM papers WHERE source IN ('EuropePMC','FrontiersYoungMinds','PLOS')
--         AND (license IS NULL OR license <> 'cc_by');                                  -- expect 0
--     ROLLBACK;
--    Any new-source rows whose license is not 'cc_by' (should be none; the fetcher never writes them):
--     SELECT source, license, count(*) FROM papers
--       WHERE source IN ('EuropePMC','FrontiersYoungMinds','PLOS') GROUP BY 1, 2;
-- c) Privileges (anon should have only SELECT on papers/news, nothing on the 4 tables):
--   SELECT table_name, grantee, string_agg(privilege_type, ',') FROM information_schema.role_table_grants
--     WHERE table_schema = 'public' AND grantee IN ('anon','authenticated')
--     GROUP BY 1, 2 ORDER BY 1, 2;
-- d) Function:
--   SELECT proname, proconfig, proacl FROM pg_proc WHERE proname = 'increment_api_daily_usage';
-- e) App smoke test: /feedapp/feed, /api/feed?limit=6, /paper?id=<arXiv id>,
--    /sitemap.xml still work (service role), and a cron run still inserts rows.
