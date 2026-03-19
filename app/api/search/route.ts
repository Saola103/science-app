import { NextRequest, NextResponse } from "next/server";
import { fetchArxivOpenAccessPapers } from "../../../lib/sources/arxiv";
import { generateText } from "../../../lib/llm/index";

export const maxDuration = 60;

type SearchRequest = {
  mode: "keyword" | "deep" | "drill";
  query?: string;
  timeRange?: "all" | "6mo" | "1yr" | "5yr" | "10yr";
  format?: "title" | "summary" | "abstract";
  history?: { role: "user" | "assistant"; content: string }[];
};

/**
 * Generate a casual Japanese summary from abstract text.
 * If AI fails, returns the original abstract truncated.
 */
async function safeSummarize(abstract: string): Promise<string> {
  try {
    const prompt = [
      "以下の科学論文のアブストラクトを、一般読者向けに日本語で簡潔に要約してください。",
      "「です・ます調」で200文字以内にまとめてください。",
      "",
      "=== アブストラクト ===",
      abstract,
    ].join("\n");
    return await generateText(prompt);
  } catch {
    // AI失敗時はアブストラクトの先頭を返す
    return abstract.length > 300 ? abstract.slice(0, 300) + "..." : abstract;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: SearchRequest = await req.json();
    const { mode, query, timeRange, format, history } = body;

    // --- Mode A: Keyword Search & Mode C: Drill-down ---
    if (mode === "keyword" || mode === "drill") {
      if (!query) {
        return NextResponse.json({ error: "Query is required" }, { status: 400 });
      }

      const rawPapers = await fetchArxivOpenAccessPapers(query, 20, "submittedDate");

      // Time filter
      let filteredPapers = rawPapers;
      if (timeRange && timeRange !== "all") {
        const now = new Date();
        const cutoffDate = new Date();
        if (timeRange === "6mo") cutoffDate.setMonth(now.getMonth() - 6);
        if (timeRange === "1yr") cutoffDate.setFullYear(now.getFullYear() - 1);
        if (timeRange === "5yr") cutoffDate.setFullYear(now.getFullYear() - 5);
        if (timeRange === "10yr") cutoffDate.setFullYear(now.getFullYear() - 10);

        filteredPapers = rawPapers.filter(p => {
          if (!p.publishedAt) return false;
          return new Date(p.publishedAt) >= cutoffDate;
        });
      }

      let papersToReturn = filteredPapers.slice(0, 10);

      if (format === "summary") {
        // Summarize top 5 in parallel (save API quota), rest get truncated abstract
        const summaryPromises = papersToReturn.map(async (paper, idx) => {
          if (!paper.abstract) return paper;
          if (idx < 5) {
            const aiSummary = await safeSummarize(paper.abstract);
            return { ...paper, summary: aiSummary };
          }
          // For items 6-10, just use truncated abstract
          const truncated = paper.abstract.length > 300
            ? paper.abstract.slice(0, 300) + "..."
            : paper.abstract;
          return { ...paper, summary: truncated };
        });
        papersToReturn = await Promise.all(summaryPromises);
      }

      return NextResponse.json({ papers: papersToReturn });
    }

    // --- Mode B: Deep / Concierge Search ---
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
      } catch {
        return NextResponse.json({
          message: aiResponseRaw,
          action: "question"
        });
      }

      if (aiResponse.action === "search") {
        const papers = await fetchArxivOpenAccessPapers(aiResponse.query, 5, "relevance");

        const summarizedPapers = await Promise.all(papers.map(async (p) => {
          if (!p.abstract) return p;
          const s = await safeSummarize(p.abstract);
          return { ...p, summary: s };
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
