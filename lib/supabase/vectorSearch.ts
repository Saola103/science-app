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
import { embedText, isQueryEmbeddingEnabled } from "../llm/index";
import { isPaperDisplayable } from "../sources/policy";
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
  // Privacy gate: user-typed queries are not sent to Gemini unless explicitly
  // enabled (ENABLE_QUERY_EMBEDDING=true). Callers fall back to keyword search.
  if (!isQueryEmbeddingEnabled()) return [];

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

  // G4: bioRxiv/medRxiv は CC BY/CC0 のみ
  return ((data || []) as VectorSearchResult[]).filter(isPaperDisplayable);
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
  // G4: bioRxiv/medRxiv は CC BY/CC0 のみ
  return ((data || []) as VectorSearchResult[]).filter((p) => p.id !== paperId && isPaperDisplayable(p));
}

const KEYWORD_STOPWORDS = new Set([
  "the", "of", "and", "or", "in", "on", "for", "to", "a", "an", "is", "are", "by", "with", "from", "about", "how", "what", "why",
]);

/**
 * Split a free-text query into safe substring-match tokens.
 * - Strips characters that are special in PostgREST filter strings / ilike
 *   patterns (`, ( ) % * _ \\ "`), so user input cannot alter the filter.
 * - Hiragana runs (particles, okurigana) act as separators so that a Japanese
 *   phrase like "麻酔と意識" becomes ["麻酔", "意識"].
 */
export function tokenizeKeywordQuery(query: string): string[] {
  const tokens = query
    .normalize("NFKC")
    .replace(/[,()%*_\\"'`;:]/g, " ")
    .split(/[\s、。・\/\u3040-\u309f]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !KEYWORD_STOPWORDS.has(t.toLowerCase()));
  return [...new Set(tokens)].slice(0, 6);
}

/** tokenizeKeywordQuery の結果から、PostgREST の .or() 用 ilike 条件を作る(トークンは無害化済みの前提)。 */
export function buildKeywordOrFilter(tokens: string[], columns: string[]): string {
  return tokens.flatMap((t) => columns.map((c) => `${c}.ilike.%${t}%`)).join(",");
}

/**
 * Keyword search (no embedding, no external call besides Supabase): case-
 * insensitive substring match of any query token against title / abstract /
 * Japanese summary, ranked by how many tokens match (title weighted higher),
 * then by recency.
 */
export async function keywordSearchPapers(
  query: string,
  maxResults: number = 10
): Promise<VectorSearchResult[]> {
  const tokens = tokenizeKeywordQuery(query);
  if (tokens.length === 0) return [];
  const supabase = getSupabaseServerClient();
  const filter = buildKeywordOrFilter(tokens, ["title", "abstract", "summary_general"]);
  const { data, error } = await supabase
    .from("papers")
    .select("id, title, abstract, journal, url, published_at, summary, summary_general, summary_expert, image_url, source, license")
    .or(filter)
    .order("published_at", { ascending: false })
    .limit(Math.max(maxResults * 5, 50));
  if (error) {
    console.error("[keywordSearch] query failed:", error.message);
    throw new Error(`Keyword search failed: ${error.message}`);
  }
  const lower = tokens.map((t) => t.toLowerCase());
  const score = (p: any) => {
    const title = String(p.title ?? "").toLowerCase();
    const rest = `${p.abstract ?? ""} ${p.summary_general ?? ""}`.toLowerCase();
    return lower.reduce((n, t) => n + (title.includes(t) ? 2 : 0) + (rest.includes(t) ? 1 : 0), 0);
  };
  return ((data || []) as any[])
    .map((p, i) => ({ p, i, s: score(p) }))
    .sort((a, b) => b.s - a.s || a.i - b.i) // stable: ties keep recency order
    .map(({ p }) => ({ ...p, similarity: 0 }) as VectorSearchResult)
    .filter(isPaperDisplayable)
    .slice(0, maxResults);
}

/**
 * Hybrid search: combine keyword results with vector similarity.
 * With ENABLE_QUERY_EMBEDDING off (default) this is keyword-only and never
 * contacts the embedding API.
 */
export async function hybridSearch(
  query: string,
  maxResults: number = 10
): Promise<VectorSearchResult[]> {
  // Run keyword search and vector search in parallel
  const [keywordResults, vectorResults] = await Promise.allSettled([
    keywordSearchPapers(query, maxResults),
    // Vector similarity search (returns [] when query embedding is disabled)
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
  if (keywordResults.status === "fulfilled") {
    for (const paper of keywordResults.value) {
      if (!seen.has(paper.id)) {
        seen.add(paper.id);
        merged.push(paper);
      }
    }
  }

  return merged.filter(isPaperDisplayable).slice(0, maxResults);
}
