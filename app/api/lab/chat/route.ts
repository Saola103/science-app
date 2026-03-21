import { createGroq } from '@ai-sdk/groq';
import { streamText, generateText } from 'ai';
import { searchArxivPapers } from '../../../../lib/agents/arxivSearch';
import { fetchPubMedPapers } from '../../../../lib/sources/pubmed';
import { searchPapersByVector } from '../../../../lib/supabase/vectorSearch';

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages } = await req.json();
  const lastMessage = messages[messages.length - 1];
  const userQuery = lastMessage.content;

  let searchKeywords = userQuery;
  try {
    // Use lighter model for intent extraction to conserve daily token quota
    const intentResult = await generateText({
      model: groq('llama-3.1-8b-instant'),
      prompt: `Extract English search keywords for arXiv from the following user query. Return ONLY the keywords, no explanation.\nUser Query: "${userQuery}"`,
      maxTokens: 60,
    });
    searchKeywords = intentResult.text.trim();
  } catch (error) {
    console.error("Intent extraction failed:", error);
  }

  const [arxivResults, pubmedResults, vectorResults] = await Promise.allSettled([
    searchArxivPapers(searchKeywords),
    fetchPubMedPapers(searchKeywords, 3, "relevance").catch(() => []),
    searchPapersByVector(searchKeywords, 3, 0.3).catch(() => []),
  ]);

  const allPapers: { title: string; url: string; summary: string; source: string }[] = [];
  const seenTitles = new Set<string>();

  if (arxivResults.status === "fulfilled") {
    for (const p of arxivResults.value) {
      const key = p.title.toLowerCase().slice(0, 50);
      if (!seenTitles.has(key)) { seenTitles.add(key); allPapers.push({ title: p.title, url: p.url, summary: p.summary, source: "arXiv" }); }
    }
  }
  if (pubmedResults.status === "fulfilled") {
    for (const p of pubmedResults.value) {
      const key = p.title.toLowerCase().slice(0, 50);
      if (!seenTitles.has(key)) { seenTitles.add(key); allPapers.push({ title: p.title, url: p.url, summary: p.abstract || "", source: "PubMed" }); }
    }
  }
  if (vectorResults.status === "fulfilled") {
    for (const p of vectorResults.value) {
      const key = p.title.toLowerCase().slice(0, 50);
      if (!seenTitles.has(key)) { seenTitles.add(key); allPapers.push({ title: p.title, url: p.url || "", summary: (p as any).summary_general || (p as any).summary || (p as any).abstract || "", source: "Database" }); }
    }
  }

  // Truncate summaries to limit tokens sent to Groq
  const context = allPapers.slice(0, 6).map(p => {
    const shortSummary = (p.summary || "").slice(0, 300);
    return `[${p.source}] ${p.title}\n${p.url}\n${shortSummary}`;
  }).join('\n---\n');

  try {
    const result = await streamText({
      model: groq('llama-3.3-70b-versatile'),
      system: `あなたは科学リサーチパートナー『Pocket Dive AI』です。ユーザーの研究アイデアや仮説に対し、論理的な批判・検証実験の提案・関連研究の示唆を行い、必ず逆質問を一つ含めて回答してください。引用元のタイトルとURLを明記してください。\n\n【論文データ】\n${context || "関連論文が見つかりませんでした。"}`,
      messages,
      maxTokens: 1024,
    });

    return result.toDataStreamResponse();
  } catch (error: any) {
    const msg = error?.message || "";
    const isRateLimit = msg.includes("rate limit") || msg.includes("Rate limit") || error?.statusCode === 429;
    if (isRateLimit) {
      console.error("[/api/lab/chat] Groq rate limit reached:", msg.slice(0, 200));
      return new Response(
        JSON.stringify({
          error: "1日のAI利用制限に達しました。しばらく時間をおいてから再度お試しください。（Groq無料枠の1日トークン制限）"
        }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }
    console.error("[/api/lab/chat] streamText error:", error);
    throw error;
  }
}
