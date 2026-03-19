import { google } from '@ai-sdk/google';
import { streamText, generateText } from 'ai';
import { searchArxivPapers } from '../../../lib/agents/arxivSearch';

export const maxDuration = 60; // Extend duration for search and processing

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

  // 2. Search arXiv
  const papers = await searchArxivPapers(searchKeywords);
  
  // 3. Construct context
  const context = papers.map(paper => 
    `Title: ${paper.title}\nURL: ${paper.url}\nSummary: ${paper.summary}\n`
  ).join('\n---\n');

  // 4. Generate response with Gemini using the strict system prompt
  const result = await streamText({
    model: google('gemini-1.5-flash'), // Updated to flash as requested
    system: `あなたは専門的な研究パートナー『Pocket Dive AI』です。以下の【参考論文データ】をもとに、ユーザーの質問や仮説に対して論理的かつ分かりやすく回答してください。

【絶対遵守ルール（著作権と倫理）】
1. 翻案権の回避: 論文のAbstract（要約）の文章表現や語順をそのままコピー＆ペーストすることは法的に厳禁です。必ず事実関係のみを抽出し、あなた自身の言葉で完全に書き直して回答してください。
2. 引用元の明記: 回答の末尾、または参考にした箇所の直後に、必ず参照した論文の『タイトル』と『URLリンク』をリスト形式で明記してください。情報源を隠すことは絶対に許されません。
3. 不確実性の提示: 参考データに十分な情報がない場合は、推測で語らず「現在の検索結果からは断言できません」と誠実に答えてください。

【参考論文データ】
${context || "関連する論文が見つかりませんでした。"}`,
    messages,
  });

  return result.toDataStreamResponse();
}
