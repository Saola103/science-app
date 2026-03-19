-- ============================================
-- POCKET DIVE: Vector Search Setup
-- ============================================
-- Run this in Supabase SQL Editor to enable
-- semantic similarity search on papers.
-- ============================================

-- 1. Enable pgvector extension
create extension if not exists vector;

-- 2. Ensure the summary_embedding column exists with correct type
-- (If the column already exists as a different type, you may need to drop and recreate it)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'papers' and column_name = 'summary_embedding'
  ) then
    alter table papers add column summary_embedding vector(768);
  end if;
end $$;

-- 3. Create an index for fast vector similarity search (IVFFlat)
-- Note: IVFFlat requires some data to exist first. If your table is empty,
-- use HNSW index instead (works even on empty tables).
drop index if exists papers_embedding_idx;
create index papers_embedding_idx on papers
  using hnsw (summary_embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- 4. Create the match_papers RPC function for vector similarity search
create or replace function match_papers(
  query_embedding vector(768),
  match_threshold float default 0.5,
  match_count int default 10
)
returns table (
  id text,
  title text,
  abstract text,
  authors text[],
  journal text,
  published_at text,
  url text,
  license text,
  source text,
  summary text,
  summary_general text,
  summary_expert text,
  image_url text,
  pmcid text,
  pmid text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    papers.id,
    papers.title,
    papers.abstract,
    papers.authors,
    papers.journal,
    papers.published_at,
    papers.url,
    papers.license,
    papers.source,
    papers.summary,
    papers.summary_general,
    papers.summary_expert,
    papers.image_url,
    papers.pmcid,
    papers.pmid,
    1 - (papers.summary_embedding <=> query_embedding) as similarity
  from papers
  where papers.summary_embedding is not null
    and 1 - (papers.summary_embedding <=> query_embedding) > match_threshold
  order by papers.summary_embedding <=> query_embedding
  limit match_count;
end;
$$;

-- 5. Grant access to the function for authenticated and anon roles
grant execute on function match_papers(vector(768), float, int) to authenticated;
grant execute on function match_papers(vector(768), float, int) to anon;
