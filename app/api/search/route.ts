
import { NextRequest, NextResponse } from "next/server";
import { fetchArxivOpenAccessPapers } from "../../../lib/sources/arxiv";
import { fetchPubMedPapers } from "../../../lib/sources/pubmed";
import { summarize } from "../../../lib/llm/summarize";
import { generateText, isQueryEmbeddingEnabled } from "../../../lib/llm/index";
import { hybridSearch } from "../../../lib/supabase/vectorSearch";
import { checkRateLimit, getClientIp } from "../../../lib/rateLimit";
import { readJsonLimited } from "../../../lib/api/readJson";
import { BUDGET_EXCEEDED_MESSAGE, checkPublicBudget, runInPublicScope } from "../../../lib/llm/publicBudget";

// タイムアウト設定（VercelのHobbyプランだと10秒制限があるが、Proなら長い。一応長めに）
export const maxDuration = 60;

const MAX_QUERY_LENGTH = 300;

type SearchRequest = {
  mode: "keyword";
  query?: string;
  timeRange?: "all" | "6mo" | "1yr" | "5yr" | "10yr";
  format?: "title" | "summary" | "abstract";
  source?: "all" | "arxiv" | "pubmed";
};

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (!checkRateLimit(`search:${ip}`, 20, 60_000)) {
      return NextResponse.json(
        { error: "リクエストが多すぎます。少し時間をおいてから再度お試しください。" },
        { status: 429 }
      );
    }

    const parsed = await readJsonLimited(req);
    if (parsed.status) {
      return NextResponse.json(
        { error: parsed.status === 413 ? "Payload too large" : "Invalid JSON" },
        { status: parsed.status }
      );
    }
    const body = (parsed.body ?? {}) as Record<string, unknown>;

    // Input validation: whitelist enums, require string query.
    const mode = body.mode;
    if (mode !== "keyword") {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    }
    if (body.query !== undefined && typeof body.query !== "string") {
      return NextResponse.json({ error: "query must be a string" }, { status: 400 });
    }
    const pick = <T extends string>(v: unknown, allowed: readonly T[]): T | undefined =>
      typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;
    const timeRange = pick(body.timeRange, ["all", "6mo", "1yr", "5yr", "10yr"] as const);
    const format = pick(body.format, ["title", "summary", "abstract"] as const);
    const source = pick(body.source, ["all", "arxiv", "pubmed"] as const) ?? "all";
    const query = typeof body.query === "string" ? body.query.slice(0, MAX_QUERY_LENGTH) : undefined;
    // Daily budget guard (see lib/llm/publicBudget.ts). Only requests that will
    // actually call Groq are blocked when the public Groq share is spent:
    // summary format, or a non-ASCII query (gets translated by Groq).
    // Over-budget embeddings just degrade vector search to keyword search.
    const needsGroq =
      format === "summary" ||
      (typeof query === "string" && /[^\x00-\x7F]/.test(query));
    const budget = await checkPublicBudget({ groq: needsGroq });
    if (budget.blocked) {
      return NextResponse.json({ error: BUDGET_EXCEEDED_MESSAGE }, { status: 429 });
    }
    return await runInPublicScope({ embedBlocked: budget.embedBlocked }, () =>
      handleSearch(query, timeRange, format, source)
    );
  } catch (error) {
    console.error("Search API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

async function handleSearch(
  query: string | undefined,
  timeRange: SearchRequest["timeRange"],
  format: SearchRequest["format"],
  source: "all" | "arxiv" | "pubmed"
): Promise<NextResponse> {
  try {
    // --- Keyword Search ---
    {
      if (!query) {
        return NextResponse.json({ error: "Query is required" }, { status: 400 });
      }

      // If query contains non-ASCII (Japanese etc.), translate to English for better search
      let searchQuery = query;
      const hasNonAscii = /[^\x00-\x7F]/.test(query);
      if (hasNonAscii) {
        try {
          const translated = await generateText(
            `Translate the following search query to concise English keywords for academic paper search. Return ONLY the English keywords, no explanation.\nQuery: "${query}"`
          );
          searchQuery = translated.trim();
          console.log(`[Search] Translated query: "${query}" → "${searchQuery}"`);
        } catch {
          console.warn("[Search] Translation failed, using original query");
        }
      }

      // Try vector search from Supabase first (pre-indexed papers with embeddings)
      let vectorPapers: any[] = [];
      try {
        vectorPapers = await hybridSearch(searchQuery, 10);
      } catch (e) {
        console.warn("[Search] Vector/hybrid search failed, falling back to API search:", e);
      }

      // If we got enough results from vector search, use those
      if (vectorPapers.length >= 5) {
        // Apply time filter
        let filteredPapers = applyTimeFilter(vectorPapers, timeRange);
        return NextResponse.json({ papers: filteredPapers.slice(0, 10), searchMethod: isQueryEmbeddingEnabled() ? "vector" : "keyword" });
      }

      // Otherwise, fetch from external APIs
      const allPapers: any[] = [...vectorPapers];

      // Fetch from arXiv
      if (source === "all" || source === "arxiv") {
        const arxivPapers = await fetchArxivOpenAccessPapers(searchQuery, 15, "submittedDate");
        allPapers.push(...arxivPapers.map(p => ({ ...p, source: "arXiv" })));
      }

      // Fetch from PubMed
      if (source === "all" || source === "pubmed") {
        try {
          const pubmedPapers = await fetchPubMedPapers(searchQuery, 10, "relevance");
          allPapers.push(...pubmedPapers.map(p => ({
            id: p.id,
            title: p.title,
            abstract: p.abstract,
            authors: p.authors,
            publishedAt: p.publishedAt,
            url: p.url,
            license: p.license,
            journal: p.journal,
            source: "PubMed",
          })));
        } catch (e) {
          console.warn("[Search] PubMed fetch failed:", e);
        }
      }

      // Deduplicate by title similarity (simple approach)
      const seen = new Set<string>();
      const dedupedPapers = allPapers.filter(p => {
        const key = p.title?.toLowerCase().slice(0, 60);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Apply time filter
      let filteredPapers = applyTimeFilter(dedupedPapers, timeRange);

      // Limit results
      let papersToReturn = filteredPapers.slice(0, 10);

      // Generate AI summaries if requested
      if (format === "summary") {
        const summaryPromises = papersToReturn.map(async (paper) => {
          // Skip if already has a summary (from vector search / DB)
          if (paper.summary_general || paper.summary) return paper;
          if (paper.abstract) {
            try {
              const aiSummary = await summarize(paper.abstract, { maxLength: 300, tone: "casual" });
              return { ...paper, summary: aiSummary };
            } catch (e) {
              console.error(`Failed to summarize paper ${paper.id}:`, e);
              return paper;
            }
          }
          return paper;
        });
        papersToReturn = await Promise.all(summaryPromises);
      }

      return NextResponse.json({ papers: papersToReturn, searchMethod: "hybrid" });
    }

  } catch (error) {
    console.error("Search API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/** Apply time range filter to papers */
function applyTimeFilter(papers: any[], timeRange?: string): any[] {
  if (!timeRange || timeRange === "all") return papers;

  const now = new Date();
  const cutoffDate = new Date();
  if (timeRange === "6mo") cutoffDate.setMonth(now.getMonth() - 6);
  if (timeRange === "1yr") cutoffDate.setFullYear(now.getFullYear() - 1);
  if (timeRange === "5yr") cutoffDate.setFullYear(now.getFullYear() - 5);
  if (timeRange === "10yr") cutoffDate.setFullYear(now.getFullYear() - 10);

  return papers.filter(p => {
    const dateStr = p.publishedAt || p.published_at;
    if (!dateStr) return true; // Keep papers without dates
    const pubDate = new Date(dateStr);
    return pubDate >= cutoffDate;
  });
}
