
import { NextRequest, NextResponse } from "next/server";
import { fetchArxivOpenAccessPapers, ArxivOpenAccessPaper } from "../../../lib/sources/arxiv";
import { fetchPubMedPapers } from "../../../lib/sources/pubmed";
import { summarize } from "../../../lib/llm/summarize";
import { generateText } from "../../../lib/llm/index";
import { searchPapersByVector, hybridSearch } from "../../../lib/supabase/vectorSearch";

// タイムアウト設定（VercelのHobbyプランだと10秒制限があるが、Proなら長い。一応長めに）
export const maxDuration = 60;

type SearchRequest = {
  mode: "keyword" | "deep" | "drill";
  query?: string;
  timeRange?: "all" | "6mo" | "1yr" | "5yr" | "10yr";
  format?: "title" | "summary" | "abstract";
  history?: { role: "user" | "assistant"; content: string }[];
  source?: "all" | "arxiv" | "pubmed";
};

export async function POST(req: NextRequest) {
  try {
    const body: SearchRequest = await req.json();
    const { mode, query, timeRange, format, history, source = "all" } = body;

    // --- Mode A: Keyword Search & Mode C: Drill-down ---
    if (mode === "keyword" || mode === "drill") {
      if (!query) {
        return NextResponse.json({ error: "Query is required" }, { status: 400 });
      }

      // Try vector search from Supabase first (pre-indexed papers with embeddings)
      let vectorPapers: any[] = [];
      try {
        vectorPapers = await hybridSearch(query, 10);
      } catch (e) {
        console.warn("[Search] Vector/hybrid search failed, falling back to API search:", e);
      }

      // If we got enough results from vector search, use those
      if (vectorPapers.length >= 5) {
        // Apply time filter
        let filteredPapers = applyTimeFilter(vectorPapers, timeRange);
        return NextResponse.json({ papers: filteredPapers.slice(0, 10), searchMethod: "vector" });
      }

      // Otherwise, fetch from external APIs
      const allPapers: any[] = [...vectorPapers];

      // Fetch from arXiv
      if (source === "all" || source === "arxiv") {
        const arxivPapers = await fetchArxivOpenAccessPapers(query, 15, "submittedDate");
        allPapers.push(...arxivPapers.map(p => ({ ...p, source: "arXiv" })));
      }

      // Fetch from PubMed
      if (source === "all" || source === "pubmed") {
        try {
          const pubmedPapers = await fetchPubMedPapers(query, 10, "relevance");
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

    // --- Mode B: Deep Search (Conversational) ---
    if (mode === "deep") {
      const lastUserMessage = history?.[history.length - 1]?.content || query;

      const contextPrompt = `
あなたは科学論文検索アシスタントです。
ユーザーとの会話履歴:
${history?.map(h => `${h.role}: ${h.content}`).join("\n") || "なし"}

ユーザーの最新の発言: "${lastUserMessage}"

タスク:
ユーザーの意図を理解し、以下のJSON形式で応答してください。
1. まだユーザーの意図が曖昧で、具体的な分野やキーワードを絞り込むための質問が必要な場合:
{
  "action": "question",
  "text": "ユーザーへの深掘り質問（日本語）"
}

2. 検索条件が十分に固まった場合、arXiv検索用のクエリを生成してください:
{
  "action": "search",
  "query": "arXiv API query (e.g. 'cat:cs.AI AND ti:transformer')",
  "pubmedQuery": "PubMed search query (e.g. 'machine learning AND protein')",
  "text": "検索を実行します。（ユーザーへの報告メッセージ）"
}
`;

      const aiResponseRaw = await generateText(contextPrompt);
      let aiResponse;
      try {
          const jsonMatch = aiResponseRaw.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
              aiResponse = JSON.parse(jsonMatch[0]);
          } else {
              throw new Error("No JSON found");
          }
      } catch (e) {
          return NextResponse.json({
              message: aiResponseRaw,
              action: "question"
          });
      }

      if (aiResponse.action === "search") {
          // Search arXiv, PubMed, and vector DB in parallel
          const [arxivPapers, pubmedPapers, vectorPapers] = await Promise.allSettled([
            fetchArxivOpenAccessPapers(aiResponse.query, 5, "relevance"),
            aiResponse.pubmedQuery
              ? fetchPubMedPapers(aiResponse.pubmedQuery, 5, "relevance")
              : Promise.resolve([]),
            searchPapersByVector(lastUserMessage || "", 5, 0.3).catch(() => []),
          ]);

          // Merge results
          const allPapers: any[] = [];
          if (arxivPapers.status === "fulfilled") allPapers.push(...arxivPapers.value);
          if (pubmedPapers.status === "fulfilled") {
            allPapers.push(...pubmedPapers.value.map(p => ({
              id: p.id, title: p.title, abstract: p.abstract,
              authors: p.authors, publishedAt: p.publishedAt,
              url: p.url, source: "PubMed",
            })));
          }
          if (vectorPapers.status === "fulfilled") {
            // Add vector results that aren't already present
            const existingIds = new Set(allPapers.map(p => p.title?.toLowerCase().slice(0, 60)));
            for (const p of vectorPapers.value) {
              const key = p.title?.toLowerCase().slice(0, 60);
              if (!existingIds.has(key)) {
                allPapers.push(p);
                existingIds.add(key);
              }
            }
          }

          // Summarize top results
          const topPapers = allPapers.slice(0, 8);
          const summarizedPapers = await Promise.all(topPapers.map(async (p) => {
              if (p.summary_general || p.summary) return p;
              if (p.abstract) {
                  try {
                    const s = await summarize(p.abstract, { maxLength: 200, tone: "casual" });
                    return { ...p, summary: s };
                  } catch { return p; }
              }
              return p;
          }));

          return NextResponse.json({
              message: aiResponse.text,
              action: "search",
              papers: summarizedPapers
          });
      } else {
          return NextResponse.json({
              message: aiResponse.text,
              action: "question"
          });
      }
    }

    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });

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
