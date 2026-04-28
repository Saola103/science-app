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

-- feed_interactions: 誰でも書き込める（session_id ベース）、自分のデータのみ読める
ALTER TABLE feed_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "interactions_insert" ON feed_interactions;
CREATE POLICY "interactions_insert"
  ON feed_interactions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "interactions_delete_own" ON feed_interactions;
CREATE POLICY "interactions_delete_own"
  ON feed_interactions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "interactions_read_own" ON feed_interactions;
CREATE POLICY "interactions_read_own"
  ON feed_interactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);
