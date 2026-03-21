/**
 * Vector Similarity Search using pgvector in Supabase
 *
 * Requires a Supabase SQL function `match_papers` to be created:
 *
 * ```sql
 * -- Enable pgvector extension (run once)
 * create extension if not exists vector;
 *
 * -- Create the matching function
 * create or replace function match_papers(
 *   query_embedding vector(768),
 *   match_threshold float default 0.5,
 *   match_count int default 10
 * )
 * returns table (
 *   id text,
 *   title text,
 *   abstract text,
 *   authors text[],
 *   journal text,
 *   published_at text,
 *   url text,
 *   license text,
 *   source text,
 *   summary text,
 *   summary_general text,
 *   summary_expert text,
 *   image_url text,
 *   pmcid text,
 *   pmid text,
 *   similarity float
 * )
 * language plpgsql
 * as $$
 * begin
 *   return query
 *   select
 *     papers.id,
 *     papers.title,
 *     papers.abstract,
 *     papers.authors,
 *     papers.journal,
 *     papers.published_at,
 *     papers.url,
 *     papers.license,
 *     papers.source,
 *     papers.summary,
 *     papers.summary_general,
 *     papers.summary_expert,
 *     papers.image_url,
 *     papers.pmcid,
 *     papers.pmid,
 *     1 - (papers.summary_embedding <=> query_embedding) as similarity
 *   from papers
 *   where papers.summary_embedding is not null
 *     and 1 - (papers.summary_embedding <=> query_embedding) > match_threshold
 *   order by papers.summary_embedding <=> query_embedding
 *   limit match_count;
 * end;
 * $$;
 * ```
 */

import { getSupabaseServerClient } from "./serviceClient";
import { embedText } from "../llm/index";
import type { PaperCardData } from "../../types";

export type VectorSearchResult = PaperCardData & {
  similarity: number;
  source?: string;
};

/**
 * Perform semantic similarity search on papers using vector embeddings.
 *
 * @param query - Natural language search query
 * @param matchCount - Maximum number of results to return
 * @param matchThreshold - Minimum similarity threshold (0-1)
 * @returns Papers ranked by semantic similarity
 */
export async function searchPapersByVector(
  query: string,
  matchCount: number = 10,
  matchThreshold: number = 0.3
): Promise<VectorSearchResult[]> {
  // 1. Generate embedding for the search query
  const queryEmbedding = await embedText(query);

  // Guard: if embedding is unavailable (e.g. Groq free tier), skip vector search
  if (!queryEmbedding || queryEmbedding.length === 0) {
    console.warn("[vectorSearch] Empty embedding returned, skipping RPC call.");
    return [];
  }

  // 2. Call the Supabase RPC function
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.rpc("match_papers", {
    query_embedding: queryEmbedding,
    match_threshold: matchThreshold,
    match_count: matchCount,
  });

  if (error) {
    console.error("[vectorSearch] RPC match_papers failed:", error.message);
    throw new Error(`Vector search failed: ${error.message}`);
  }

  return (data || []) as VectorSearchResult[];
}

/**
 * Find papers similar to a given paper by its ID.
 * Useful for "related papers" recommendations.
 */
export async function findSimilarPapers(
  paperId: string,
  matchCount: number = 5,
  matchThreshold: number = 0.4
): Promise<VectorSearchResult[]> {
  const supabase = getSupabaseServerClient();

  // 1. Get the paper's embedding
  const { data: paper, error: fetchErr } = await supabase
    .from("papers")
    .select("summary_embedding")
    .eq("id", paperId)
    .single();

  if (fetchErr || !paper?.summary_embedding) {
    console.error("[findSimilarPapers] Could not find embedding for paper:", paperId);
    return [];
  }

  // 2. Use the embedding to find similar papers
  const { data, error } = await supabase.rpc("match_papers", {
    query_embedding: paper.summary_embedding,
    match_threshold: matchThreshold,
    match_count: matchCount + 1, // +1 because the paper itself will match
  });

  if (error) {
    console.error("[findSimilarPapers] RPC failed:", error.message);
    return [];
  }

  // Filter out the source paper itself
  return ((data || []) as VectorSearchResult[]).filter((p) => p.id !== paperId);
}

/**
 * Hybrid search: combine keyword results with vector similarity.
 * Falls back to keyword-only if vector search fails.
 */
export async function hybridSearch(
  query: string,
  maxResults: number = 10
): Promise<VectorSearchResult[]> {
  const supabase = getSupabaseServerClient();

  // Run keyword search and vector search in parallel
  const [keywordResults, vectorResults] = await Promise.allSettled([
    // Keyword search via Supabase full-text or ilike
    supabase
      .from("papers")
      .select("id, title, abstract, journal, url, published_at, summary, summary_general, summary_expert, image_url, source")
      .or(`title.ilike.%${query}%,abstract.ilike.%${query}%`)
      .order("published_at", { ascending: false })
      .limit(maxResults),
    // Vector similarity search
    searchPapersByVector(query, maxResults, 0.3).catch(() => []),
  ]);

  // Merge and deduplicate results, preferring vector results (they have similarity scores)
  const seen = new Set<string>();
  const merged: VectorSearchResult[] = [];

  // Vector results first (ranked by similarity)
  if (vectorResults.status === "fulfilled") {
    for (const paper of vectorResults.value) {
      if (!seen.has(paper.id)) {
        seen.add(paper.id);
        merged.push(paper);
      }
    }
  }

  // Then keyword results
  if (keywordResults.status === "fulfilled" && keywordResults.value.data) {
    for (const paper of keywordResults.value.data) {
      if (!seen.has(paper.id)) {
        seen.add(paper.id);
        merged.push({ ...paper, similarity: 0 } as VectorSearchResult);
      }
    }
  }

  return merged.slice(0, maxResults);
}
