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
    const intentResult = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      prompt: `Extract English search keywords for arXiv from the following user query. Return ONLY the keywords, no explanation.\nUser Query: "${userQuery}"`,
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

  const context = allPapers.map(p => `[${p.source}] Title: ${p.title}\nURL: ${p.url}\nSummary: ${p.summary}\n`).join('\n---\n');

  const result = await streamText({
    model: groq('llama-3.3-70b-versatile'),
    system: `あなたは専門的な研究パートナー『Pocket Dive AI』です。以下の【参考論文データ】をもとに、ユーザーの質問や仮説に対して論理的かつ分かりやすく回答してください。

【絶対遵守ルール（著作権と倫理）】
1. 翻案権の回避: 論文のAbstractの文章表現をそのままコピーすることは厳禁です。事実関係のみを抽出し、あなた自身の言葉で書き直してください。
2. 引用元の明記: 参照した論文の『タイトル』と『URLリンク』をリスト形式で明記してください。
3. 不確実性の提示: 情報が不十分な場合は「現在の検索結果からは断言できません」と答えてください。

【言語設定】
ユーザーの入力言語に合わせて回答してください。

【参考論文データ】
${context || "関連する論文が見つかりませんでした。"}`,
    messages,
  });

  return result.toDataStreamResponse();
}
