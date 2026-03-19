import { google } from '@ai-sdk/google';
import { streamText, generateText } from 'ai';
import { searchArxivPapers } from '../../../lib/agents/arxivSearch';
import { fetchPubMedPapers } from '../../../lib/sources/pubmed';
import { searchPapersByVector } from '../../../lib/supabase/vectorSearch';

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages } = await req.json();
  const lastMessage = messages[messages.length - 1];
  const userQuery = lastMessage.content;

  // 1. Intent Extraction: Generate English search keywords
  let searchKeywords = userQuery;
  try {
    const intentResult = await generateText({
      model: google('gemini-1.5-flash'),
      prompt: `Extract English search keywords for arXiv from the following user query. Return ONLY the keywords, no explanation.
User Query: "${userQuery}"`,
    });
    searchKeywords = intentResult.text.trim();
    console.log(`Intent extracted: "${userQuery}" -> "${searchKeywords}"`);
  } catch (error) {
    console.error("Intent extraction failed, using original query:", error);
  }

  // 2. Search from multiple sources in parallel
  const [arxivResults, pubmedResults, vectorResults] = await Promise.allSettled([
    searchArxivPapers(searchKeywords),
    fetchPubMedPapers(searchKeywords, 3, "relevance").catch(() => []),
    searchPapersByVector(searchKeywords, 3, 0.3).catch(() => []),
  ]);

  // 3. Merge results from all sources
  const allPapers: { title: string; url: string; summary: string; source: string }[] = [];
  const seenTitles = new Set<string>();

  // arXiv results
  if (arxivResults.status === "fulfilled") {
    for (const p of arxivResults.value) {
      const key = p.title.toLowerCase().slice(0, 50);
      if (!seenTitles.has(key)) {
        seenTitles.add(key);
        allPapers.push({ title: p.title, url: p.url, summary: p.summary, source: "arXiv" });
      }
    }
  }

  // PubMed results
  if (pubmedResults.status === "fulfilled") {
    for (const p of pubmedResults.value) {
      const key = p.title.toLowerCase().slice(0, 50);
      if (!seenTitles.has(key)) {
        seenTitles.add(key);
        allPapers.push({
          title: p.title,
          url: p.url,
          summary: p.abstract || "",
          source: "PubMed",
        });
      }
    }
  }

  // Vector search results (from Supabase DB)
  if (vectorResults.status === "fulfilled") {
    for (const p of vectorResults.value) {
      const key = p.title.toLowerCase().slice(0, 50);
      if (!seenTitles.has(key)) {
        seenTitles.add(key);
        allPapers.push({
          title: p.title,
          url: p.url || "",
          summary: p.summary_general || p.summary || p.abstract || "",
          source: "Database",
        });
      }
    }
  }

  // 4. Construct context
  const context = allPapers.map(paper =>
    `[${paper.source}] Title: ${paper.title}\nURL: ${paper.url}\nSummary: ${paper.summary}\n`
  ).join('\n---\n');

  // 5. Generate response with Gemini
  const result = await streamText({
    model: google('gemini-1.5-flash'),
    system: `あなたは専門的な研究パートナー『Pocket Dive AI』です。以下の【参考論文データ】をもとに、ユーザーの質問や仮説に対して論理的かつ分かりやすく回答してください。

【絶対遵守ルール（著作権と倫理）】
1. 翻案権の回避: 論文のAbstract（要約）の文章表現や語順をそのままコピー＆ペーストすることは法的に厳禁です。必ず事実関係のみを抽出し、あなた自身の言葉で完全に書き直して回答してください。
2. 引用元の明記: 回答の末尾、または参考にした箇所の直後に、必ず参照した論文の『タイトル』と『URLリンク』をリスト形式で明記してください。情報源を隠すことは絶対に許されません。
3. 不確実性の提示: 参考データに十分な情報がない場合は、推測で語らず「現在の検索結果からは断言できません」と誠実に答えてください。
4. ソースの多様性: 回答にはarXiv、PubMed、データベースなど複数のソースからの情報を活用し、幅広い視点を提供してください。

【参考論文データ】
${context || "関連する論文が見つかりませんでした。"}`,
    messages,
  });

  return result.toDataStreamResponse();
}
