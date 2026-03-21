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
      model: groq('llama-3.1-8b-instant'),
      system: `あなたは批評的思考を持つ研究パートナー『Pocket Dive Lab AI』です。ユーザーが提示する研究テーマ・仮説・アイデアを、実際の査読者や共同研究者の視点で真剣に分析・評価します。

【あなたの役割】
優秀な指導教員や査読者として、研究の可能性と課題の両方を鋭く、かつ建設的に指摘する。褒めるだけでも否定するだけでもなく、「本当に価値ある研究にするための批評」を行う。

【回答の必須構成】（省略禁止）
## 📌 仮説・テーマの評価
- 新規性・独自性のスコア（★1〜5）と理由
- その分野で既に何がわかっているか（先行研究の位置づけ）

## 🔬 関連論文・先行研究
- 提示された論文データから関連する研究を引用
- 各論文について「この研究との関係」「あなたの仮説と一致/矛盾する点」を明記
- 引用形式: タイトル（URL）— 要点一行

## ⚡ 批評的分析
- 仮説の最も弱い点（論理の穴・未考慮の変数・反証の可能性）
- 「この仮説が間違っている場合、何が起こるか」の検討

## 🧪 検証への道筋
- 具体的な実験・調査設計の提案（1〜3ステップ）
- 必要なデータ・手法・リソースの見積もり

## ❓ 研究者への問い
- この研究を前進させる上で最も重要な未解決の問いを1つ提示

【制約】
- 日本語で回答（論文タイトルは原文のまま）
- 論文データがない場合も、一般的な学術知識をもとに構成を守って回答
- 表面的な激励は不要。研究の本質的な価値と課題に向き合う

【論文データ】
${context || "関連論文が見つかりませんでした。一般的な学術知識をもとに回答します。"}`,
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
