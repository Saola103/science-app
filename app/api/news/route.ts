
import { NextRequest, NextResponse } from "next/server";
import { fetchScienceNews } from "../../../lib/sources/news";
import { summarize } from "../../../lib/llm/summarize";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query } = body;

    // 1. ニュース取得
    const articles = await fetchScienceNews(query || "science technology");

    // 2. AI要約 (上位3件のみなど制限)
    // ニュースは短いのでdescriptionを使うか、contentを使うか。
    // ここでは description をベースに日本語要約を生成する
    const summaryPromises = articles.slice(0, 5).map(async (article) => {
      try {
        const textToSummarize = article.description || article.content;
        if (textToSummarize) {
            // ニュース用の短い要約
            const aiSummary = await summarize(textToSummarize, { maxLength: 150, tone: "casual" });
            return { ...article, aiSummary };
        }
        return article;
      } catch (e) {
        return article;
      }
    });

    const processedArticles = await Promise.all(summaryPromises);

    return NextResponse.json({ articles: processedArticles });

  } catch (error) {
    console.error("News API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
