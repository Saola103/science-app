-- ============================================================
-- POCKET DIVE: Row Level Security (RLS) Setup
-- ============================================================
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor).
--
-- Policy design:
--   papers       : 全員が読める（公開データ）。書き込みはサービスロールのみ。
--   news         : 全員が読める（公開データ）。書き込みはサービスロールのみ。
--   feed_interactions: 自分のレコードのみ読み書き可。ログイン不要ユーザーは
--                      session_id ベースの書き込みのみ許可。
--   inquiries    : 書き込みは誰でも可（問い合わせ送信）。読み取りはなし（管理者のみ）。
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. papers テーブル
-- ─────────────────────────────────────────────────────────────
ALTER TABLE papers ENABLE ROW LEVEL SECURITY;

-- 誰でも読める
CREATE POLICY "papers_public_read"
  ON papers FOR SELECT
  USING (true);

-- 書き込みはサービスロール（バックエンドAPI）のみ
-- サービスロールキーは RLS をバイパスするため、この INSERT/UPDATE/DELETE
-- ポリシーは anon / authenticated ロールからの直接書き込みをブロックする。
CREATE POLICY "papers_service_only_write"
  ON papers FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- ─────────────────────────────────────────────────────────────
-- 2. news テーブル
-- ─────────────────────────────────────────────────────────────
ALTER TABLE news ENABLE ROW LEVEL SECURITY;

CREATE POLICY "news_public_read"
  ON news FOR SELECT
  USING (true);

CREATE POLICY "news_service_only_write"
  ON news FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- ─────────────────────────────────────────────────────────────
-- 3. feed_interactions テーブル
-- ─────────────────────────────────────────────────────────────
ALTER TABLE feed_interactions ENABLE ROW LEVEL SECURITY;

-- ログイン済みユーザー: 自分の行だけ読める
CREATE POLICY "interactions_select_own_user"
  ON feed_interactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ログイン済みユーザー: 挿入/更新 は自分の user_id のみ
CREATE POLICY "interactions_insert_authenticated"
  ON feed_interactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "interactions_update_own_user"
  ON feed_interactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 未ログインユーザー (anon): session_id ベースで書き込みを許可
-- （user_id は NULL のレコードのみ許可）
CREATE POLICY "interactions_insert_anon_session"
  ON feed_interactions FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

-- ─────────────────────────────────────────────────────────────
-- 4. inquiries テーブル
-- ─────────────────────────────────────────────────────────────
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

-- 誰でも問い合わせを送信できる（INSERT のみ）
CREATE POLICY "inquiries_public_insert"
  ON inquiries FOR INSERT
  WITH CHECK (true);

-- 読み取りは禁止（管理者はサービスロールキーで直接アクセス）
-- （SELECT ポリシーを作らないことで anon/authenticated は読めない）

-- ─────────────────────────────────────────────────────────────
-- 確認クエリ（実行後にコメントアウト可）
-- ─────────────────────────────────────────────────────────────
-- SELECT tablename, policyname, cmd, roles
-- FROM pg_policies
-- WHERE tablename IN ('papers', 'news', 'feed_interactions', 'inquiries')
-- ORDER BY tablename, policyname;
