import { createGroq } from '@ai-sdk/groq';
import { streamText, generateText } from 'ai';
import { searchArxivPapers } from '../../../lib/agents/arxivSearch';
import { fetchPubMedPapers } from '../../../lib/sources/pubmed';
import { searchPapersByVector } from '../../../lib/supabase/vectorSearch';

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
    console.error("Intent extraction failed, using original query:", error);
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
      model: groq('llama-3.1-8b-instant'),
      system: `あなたは知的好奇心を刺激するサイエンスコンシェルジュ『Pocket Dive』です。ユーザーの疑問や興味を深め、科学の世界への扉を開く案内役として振る舞ってください。

【あなたのスタイル】
- 親しみやすく、でも知的に。友人の賢い先輩研究者が話しかけるように。
- むずかしい概念は身近な例えで。でも本質は端折らない。
- 回答の最後には「これを知ると次に気になるのが〜」と、知的好奇心を引き出す一言を必ず添える。
- 論文を紹介するときは「この研究が明らかにしたのは〜」「面白いことに〜」など、ストーリーとして語る。

【回答構成】
1. ユーザーの問いを一言で受け止める（共感・驚き・興味など）
2. 関連論文をもとに、発見の核心をわかりやすく説明
3. 論文タイトルとURLを明記（「詳しくはこちら：」の形で）
4. 「さらに深掘りするなら…」で次の問いを提示

【制約】
- 日本語で回答（論文タイトルは原文のまま）
- 不確実な情報は「〜とされています」「〜の可能性があります」と表現
- 論文データがない場合でも一般知識で誠実に答え、「論文データが見つからなかったため一般的な回答になります」と断りを入れる

【論文データ】
${context || "関連論文が見つかりませんでした。一般的な知識をもとに回答します。"}`,
      messages,
      maxTokens: 1024,
    });

    return result.toDataStreamResponse();
  } catch (error: any) {
    const msg = error?.message || "";
    const isRateLimit = msg.includes("rate limit") || msg.includes("Rate limit") || error?.statusCode === 429;
    if (isRateLimit) {
      console.error("[/api/chat] Groq rate limit reached:", msg.slice(0, 200));
      return new Response(
        JSON.stringify({
          error: "1日のAI利用制限に達しました。しばらく時間をおいてから再度お試しください。（Groq無料枠の1日トークン制限）"
        }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }
    console.error("[/api/chat] streamText error:", error);
    throw error;
  }
}
