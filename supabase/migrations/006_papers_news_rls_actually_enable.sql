-- ============================================================
-- POCKET DIVE: papers/news の RLS を実際に有効化する（004の再適用）
-- ============================================================
-- Run this in Supabase Dashboard > SQL Editor.
--
-- 経緯: 004_security_hardening.sql は papers/news に RLS をかける内容
-- だったが、本番プロジェクトでは実際には適用されておらず、Supabase の
-- セキュリティアドバイザーで papers/news の RLS が無効（ERROR level）
-- であることが2026-09-17に判明した。subscribers だけは 004 通りに
-- ロックされていたため、004 が部分的にしか実行されなかったと見られる。
-- feed_interactions も、004 が意図した命名のポリシーではなく古い
-- ("Anyone can insert interactions" 等）ポリシーのままだったため、
-- 併せて置き換える。
--
-- 影響: 読み取り（anon/authenticated）は今まで通り誰でも可能。
-- 書き込み（INSERT/UPDATE/DELETE）はこれまでも実質的にアプリの
-- service role 経由でしか行っていないため、アプリの挙動は変わらない。
-- 変わるのは「anon キーを直接使って papers/news に書き込む」という、
-- 本来ありえない経路が塞がる点のみ。
-- ============================================================

-- papers — public read, no direct writes from anon/authenticated
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

-- news — same shape as papers
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

-- feed_interactions — 旧ポリシー（命名が004と異なる=未適用の証跡）を
-- 004が意図した命名・内容に置き換える
DROP POLICY IF EXISTS "Anyone can insert interactions" ON feed_interactions;
DROP POLICY IF EXISTS "Users can read own interactions" ON feed_interactions;
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
-- Verify（別途実行、参考用）
-- ─────────────────────────────────────────────────────────────
-- SELECT tablename, policyname, cmd, roles
-- FROM pg_policies
-- WHERE tablename IN ('papers', 'news', 'feed_interactions')
-- ORDER BY tablename, policyname;
