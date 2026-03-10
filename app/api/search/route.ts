
import { NextRequest, NextResponse } from "next/server";
import { fetchArxivOpenAccessPapers, ArxivOpenAccessPaper } from "../../../lib/sources/arxiv";
import { summarize } from "../../../lib/llm/summarize";
import { generateText } from "../../../lib/llm/index";

// タイムアウト設定（VercelのHobbyプランだと10秒制限があるが、Proなら長い。一応長めに）
export const maxDuration = 60;

type SearchRequest = {
  mode: "keyword" | "deep" | "drill";
  query?: string;
  timeRange?: "all" | "6mo" | "1yr" | "5yr" | "10yr";
  format?: "title" | "summary" | "abstract";
  history?: { role: "user" | "assistant"; content: string }[];
};

export async function POST(req: NextRequest) {
  try {
    const body: SearchRequest = await req.json();
    const { mode, query, timeRange, format, history } = body;

    // --- Mode A: Keyword Search & Mode C: Drill-down (Basically same backend logic) ---
    if (mode === "keyword" || mode === "drill") {
      if (!query) {
        return NextResponse.json({ error: "Query is required" }, { status: 400 });
      }

      // 1. arXivから論文取得 (少し多めに取って期間フィルタする)
      // Drill-downの場合はカテゴリ指定などが来る想定だが、今回はqueryにカテゴリ名が入ってくる前提
      // 例: "cat:cs.AI" など。UI側でクエリを構築する。
      const rawPapers = await fetchArxivOpenAccessPapers(query, 20, "submittedDate");

      // 2. 期間フィルタリング
      let filteredPapers = rawPapers;
      if (timeRange && timeRange !== "all") {
        const now = new Date();
        let cutoffDate = new Date();
        if (timeRange === "6mo") cutoffDate.setMonth(now.getMonth() - 6);
        if (timeRange === "1yr") cutoffDate.setFullYear(now.getFullYear() - 1);
        if (timeRange === "5yr") cutoffDate.setFullYear(now.getFullYear() - 5);
        if (timeRange === "10yr") cutoffDate.setFullYear(now.getFullYear() - 10);

        filteredPapers = rawPapers.filter(p => {
          if (!p.publishedAt) return false;
          const pubDate = new Date(p.publishedAt);
          return pubDate >= cutoffDate;
        });
      }

      // 3. 表示形式に応じた処理 (AI要約)
      // format === 'summary' の場合のみ Gemini を叩く
      // 速度向上のため、上位5件のみ要約するなどの制限を設ける
      let papersToReturn = filteredPapers.slice(0, 10); // 最大10件

      if (format === "summary") {
        // 並列で要約生成
        const summaryPromises = papersToReturn.map(async (paper) => {
          // アブストラクトがあればそれを元に要約、なければタイトルから（アブスト必須だが）
          if (paper.abstract) {
            try {
              // 一般向け要約を生成
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

      return NextResponse.json({ papers: papersToReturn });
    }

    // --- Mode B: Deep Search (Conversational) ---
    if (mode === "deep") {
      // 履歴の最後のユーザー発言を取得
      const lastUserMessage = history?.[history.length - 1]?.content || query;
      
      // 1. 会話の意図を判定 & 検索クエリ生成
      // Geminiに「これは検索が必要か？必要ならクエリを、そうでなければ深掘り質問を」と聞く
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
      
      // 注意: generateText は string を返すので JSON パースが必要
      // ここでは簡易的に実装
      const aiResponseRaw = await generateText(contextPrompt);
      let aiResponse;
      try {
          // JSONブロックを探す
          const jsonMatch = aiResponseRaw.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
              aiResponse = JSON.parse(jsonMatch[0]);
          } else {
              throw new Error("No JSON found");
          }
      } catch (e) {
          // フォールバック: そのまま質問として返す
          return NextResponse.json({ 
              message: aiResponseRaw, 
              action: "question" 
          });
      }

      if (aiResponse.action === "search") {
          // 検索実行
          const papers = await fetchArxivOpenAccessPapers(aiResponse.query, 5, "relevance");
          
          // 論文が見つかったら要約して返す
          const summarizedPapers = await Promise.all(papers.map(async (p) => {
              if (p.abstract) {
                  const s = await summarize(p.abstract, { maxLength: 200, tone: "casual" });
                  return { ...p, summary: s };
              }
              return p;
          }));

          return NextResponse.json({
              message: aiResponse.text,
              action: "search",
              papers: summarizedPapers
          });
      } else {
          // 質問を返す
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
