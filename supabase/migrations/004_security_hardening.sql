-- ============================================================
-- POCKET DIVE: Security hardening pass
-- ============================================================
-- Run this in Supabase Dashboard > SQL Editor.
--
-- Why this migration exists:
--  1. `subscribers` was never brought under RLS by any prior migration.
--     Verified live: with the public anon key, `select * from subscribers`
--     is not blocked (table happened to be empty, so no rows leaked yet,
--     but the moment someone actually subscribes, their email — and the
--     confirm_token / unsubscribe_token columns used to manage that
--     subscription — become world-readable via the anon key that ships in
--     every page load). Nothing in the current app code reads/writes this
--     table directly with the anon key, so locking it to service-role-only
--     access costs nothing.
--  2. There are two conflicting, differently-named "003_*" migrations in
--     this repo (003_rls_policies.sql and 003_row_level_security.sql) for
--     papers/news/feed_interactions, so it's unclear which one actually
--     ran against the live project. This migration is idempotent (drops
--     each named policy before recreating it) and restates the intended
--     final state, so running it converges to one known-good state
--     regardless of which 003 file ran before.
--
-- Service role key (used by all of this app's own API routes) bypasses
-- RLS entirely — these policies are the actual boundary for the public
-- anon key, which ships in the browser bundle and is usable directly
-- against the Supabase REST API by anyone, not just through this app's UI.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. subscribers — lock down completely (service role only)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;
-- Intentionally no CREATE POLICY here: with RLS enabled and zero policies,
-- anon/authenticated get nothing; only the service role (which bypasses
-- RLS) can read or write this table.

-- ─────────────────────────────────────────────────────────────
-- 2. papers — public read, no direct writes from anon/authenticated
-- ─────────────────────────────────────────────────────────────
ALTER TABLE papers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "papers_public_read" ON papers;
CREATE POLICY "papers_public_read"
  ON papers FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "papers_service_only_write" ON papers;
CREATE POLICY "papers_service_only_write"
  ON papers FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- ─────────────────────────────────────────────────────────────
-- 3. news — same shape as papers
-- ─────────────────────────────────────────────────────────────
ALTER TABLE news ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "news_public_read" ON news;
CREATE POLICY "news_public_read"
  ON news FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "news_service_only_write" ON news;
CREATE POLICY "news_service_only_write"
  ON news FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- ─────────────────────────────────────────────────────────────
-- 4. feed_interactions — own rows only; anon may only write session-only
--    (user_id IS NULL) rows, matching /api/feed/interact's behavior of
--    never trusting a client-supplied user_id.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE feed_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "interactions_insert" ON feed_interactions;
DROP POLICY IF EXISTS "interactions_insert_authenticated" ON feed_interactions;
CREATE POLICY "interactions_insert_authenticated"
  ON feed_interactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "interactions_insert_anon_session" ON feed_interactions;
CREATE POLICY "interactions_insert_anon_session"
  ON feed_interactions FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

DROP POLICY IF EXISTS "interactions_update_own_user" ON feed_interactions;
CREATE POLICY "interactions_update_own_user"
  ON feed_interactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "interactions_delete_own" ON feed_interactions;
CREATE POLICY "interactions_delete_own"
  ON feed_interactions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "interactions_select_own_user" ON feed_interactions;
DROP POLICY IF EXISTS "interactions_read_own" ON feed_interactions;
CREATE POLICY "interactions_read_own"
  ON feed_interactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

-- ─────────────────────────────────────────────────────────────
-- Verify (run separately, this SELECT is informational only)
-- ─────────────────────────────────────────────────────────────
-- SELECT tablename, policyname, cmd, roles
-- FROM pg_policies
-- WHERE tablename IN ('papers', 'news', 'feed_interactions', 'subscribers')
-- ORDER BY tablename, policyname;
