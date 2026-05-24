-- ============================================================
-- POCKET DIVE: Row Level Security (RLS) Policies
-- ============================================================
-- Run this in Supabase Dashboard > SQL Editor
-- Service role key bypasses RLS — API routes are unaffected.
-- ============================================================

-- papers: 誰でも読める、書き込みはサービスロールのみ
ALTER TABLE papers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "papers_public_read" ON papers;
CREATE POLICY "papers_public_read"
  ON papers FOR SELECT
  TO anon, authenticated
  USING (true);

-- news: 誰でも読める
ALTER TABLE news ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "news_public_read" ON news;
CREATE POLICY "news_public_read"
  ON news FOR SELECT
  TO anon, authenticated
  USING (true);

-- feed_interactions: ログイン済みは自分のuser_idのみ書き込み可、未ログインはNULLのみ
ALTER TABLE feed_interactions ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザー: 自分のuser_idのみINSERT可
DROP POLICY IF EXISTS "interactions_insert" ON feed_interactions;
DROP POLICY IF EXISTS "interactions_insert_authenticated" ON feed_interactions;
CREATE POLICY "interactions_insert_authenticated"
  ON feed_interactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 未ログイン(anon): user_id = NULL のみINSERT可（session_idベース追跡）
DROP POLICY IF EXISTS "interactions_insert_anon_session" ON feed_interactions;
CREATE POLICY "interactions_insert_anon_session"
  ON feed_interactions FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

-- 自分のレコードのみDELETE可
DROP POLICY IF EXISTS "interactions_delete_own" ON feed_interactions;
CREATE POLICY "interactions_delete_own"
  ON feed_interactions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- 自分のレコード（またはanonymousレコード）のみSELECT可
DROP POLICY IF EXISTS "interactions_read_own" ON feed_interactions;
CREATE POLICY "interactions_read_own"
  ON feed_interactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);
