-- ============================================================
-- POCKET DIVE 012: A6 -- remove direct anon write paths, lock RPC execution
-- ============================================================
-- Run in Supabase Dashboard > SQL Editor (owner applies manually; NOT applied
-- by Dev). Idempotent: safe to run more than once.
--
-- Why: every write in the app goes through the service-role client
-- (getSupabaseServerClient): /api/feed/interact -> feed_interactions,
-- /api/feedback -> feedback, lib/llm/dailyUsage.ts -> increment_groq_daily_usage.
-- No code path uses the anon key to INSERT, so these anon policies/grants only
-- let an outside caller bypass the API-level validation and rate limits
-- by hitting PostgREST directly with the public anon key.
-- (The only anon-key client in app code is auth.getUser(token) in
-- /api/user/interactions; it does not touch these tables or functions.)
-- Service role bypasses RLS, so dropping the policies does not affect the app.
--
-- Deploy order: none required (no app code depends on the anon policies).
--
-- ROLLBACK (comment; run manually if needed):
--   CREATE POLICY "interactions_insert_anon_session" ON public.feed_interactions
--     FOR INSERT TO anon WITH CHECK (user_id IS NULL);
--   CREATE POLICY "feedback_public_insert" ON public.feedback
--     FOR INSERT TO anon, authenticated
--     WITH CHECK (length(message) > 0 AND length(message) <= 1000);
--   GRANT EXECUTE ON FUNCTION public.increment_groq_daily_usage(date, bigint) TO PUBLIC;
--   ALTER FUNCTION public.increment_groq_daily_usage(date, bigint) RESET search_path;
--   ALTER FUNCTION public.match_papers(vector, double precision, integer) RESET search_path;
--   GRANT EXECUTE ON FUNCTION public.match_papers(vector, double precision, integer) TO PUBLIC, anon, authenticated;
--
-- Intentionally KEPT: policy "interactions_insert_authenticated" on
-- feed_interactions (logged-in users may insert rows for themselves). It is
-- an accepted residual: it requires a valid user JWT and is scoped to the
-- user's own user_id, unlike the anonymous paths removed below.

-- 1. Drop anon INSERT policies
DROP POLICY IF EXISTS "interactions_insert_anon_session" ON public.feed_interactions;
DROP POLICY IF EXISTS "feedback_public_insert" ON public.feedback;

-- 2. increment_groq_daily_usage: service_role only. Actual signature in prod
--    is (date, bigint).
REVOKE EXECUTE ON FUNCTION public.increment_groq_daily_usage(date, bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_groq_daily_usage(date, bigint) TO service_role;

-- 3. Pin search_path (function search-path hijack hardening).
--    increment_groq_daily_usage only touches public.groq_daily_usage.
ALTER FUNCTION public.increment_groq_daily_usage(date, bigint) SET search_path = public, extensions, pg_temp;
--    match_papers uses the pgvector `<=>` operator and vector type. With
--    "public, extensions" both locations resolve, so it works whether the
--    extension lives in public (today) or extensions (Supabase default).
--    pg_temp is listed LAST so temp objects cannot shadow public ones.
ALTER FUNCTION public.match_papers(vector, double precision, integer) SET search_path = public, extensions, pg_temp;

-- 4. match_papers: service_role only. Its sole caller is lib/supabase/vectorSearch.ts
--    (3 rpc call sites), all via getSupabaseServerClient() = service role.
--    No client-side/anon-key caller exists.
REVOKE EXECUTE ON FUNCTION public.match_papers(vector, double precision, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_papers(vector, double precision, integer) TO service_role;

-- VERIFY after applying:
--   SELECT proname, proconfig, proacl FROM pg_proc
--     WHERE proname IN ('increment_groq_daily_usage','match_papers');
--   SELECT tablename, policyname, cmd, roles FROM pg_policies
--     WHERE tablename IN ('feed_interactions','feedback');
--   match_papers smoke test (must not error; any row count is fine):
--     SELECT count(*) FROM match_papers(
--       (SELECT summary_embedding FROM papers WHERE summary_embedding IS NOT NULL LIMIT 1), 0.5, 3);
--   Then confirm the app: open the feed's search / "related papers" once, and
--   /api/health/collection groq.today.tokens keeps increasing after a cron run.
