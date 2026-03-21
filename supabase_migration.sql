-- ============================================================
-- POCKET DIVE — Supabase SQL Migration
-- Run this once in the Supabase SQL Editor
-- ============================================================

-- 1. papers テーブルに image_url カラムを追加（まだ存在しない場合）
ALTER TABLE public.papers
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. news テーブルを作成（まだ存在しない場合）
CREATE TABLE IF NOT EXISTS public.news (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  description  TEXT,
  url          TEXT,
  image_url    TEXT,
  published_at TEXT,
  source_name  TEXT,
  category     TEXT DEFAULT 'general',
  summary_general TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- news テーブルのインデックス（日付降順検索を高速化）
CREATE INDEX IF NOT EXISTS news_published_at_idx
  ON public.news (published_at DESC);

-- 3. pgvector 拡張を有効化（ベクトル検索用）
CREATE EXTENSION IF NOT EXISTS vector;

-- 4. papers テーブルに summary_embedding カラムを追加（ベクトル検索用）
ALTER TABLE public.papers
  ADD COLUMN IF NOT EXISTS summary_embedding vector(768);

-- 5. ベクトル類似検索のための関数
CREATE OR REPLACE FUNCTION match_papers(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.5,
  match_count     int   DEFAULT 10
)
RETURNS TABLE (
  id          text,
  title       text,
  abstract    text,
  url         text,
  journal     text,
  published_at text,
  source      text,
  summary     text,
  summary_general text,
  summary_expert  text,
  similarity  float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    p.id,
    p.title,
    p.abstract,
    p.url,
    p.journal,
    p.published_at,
    p.source,
    p.summary,
    p.summary_general,
    p.summary_expert,
    1 - (p.summary_embedding <=> query_embedding) AS similarity
  FROM public.papers p
  WHERE p.summary_embedding IS NOT NULL
    AND 1 - (p.summary_embedding <=> query_embedding) > match_threshold
  ORDER BY p.summary_embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ============================================================
-- 完了！Vercel 環境変数として以下を設定してください：
--
--   GROQ_API_KEY     = gsk_... （https://console.groq.com で取得）
--   CRON_SECRET      = 任意のランダム文字列（例: openssl rand -hex 32）
--   NEXT_PUBLIC_SUPABASE_URL      = SupabaseプロジェクトURL
--   NEXT_PUBLIC_SUPABASE_ANON_KEY = Supabase Anon Key
--   SUPABASE_SERVICE_ROLE_KEY     = Supabase Service Role Key
-- ============================================================
