import { createGroq } from '@ai-sdk/groq';
import { streamText, generateText } from 'ai';
import { searchArxivPapers } from '../../../../lib/agents/arxivSearch';

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages } = await req.json();
  const lastMessage = messages[messages.length - 1];
  const userQuery = lastMessage.content;

  // 1. Intent Extraction for RAG
  let searchKeywords = userQuery;
  try {
    const intentResult = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      prompt: `Extract English search keywords for arXiv from the following user query. Return ONLY the keywords, no explanation.
User Query: "${userQuery}"`,
    });
    searchKeywords = intentResult.text.trim();
  } catch (error) {
    console.error("Intent extraction failed:", error);
  }

  // 2. Search arXiv
  const papers = await searchArxivPapers(searchKeywords);

  // 3. Construct context
  const context = papers.map(paper =>
    `Title: ${paper.title}\nURL: ${paper.url}\nSummary: ${paper.summary}\n`
  ).join('\n---\n');

  // 4. Generate response with Lab specific system prompt
  const result = await streamText({
    model: groq('llama-3.3-70b-versatile'),
    system: `あなたは専門的な科学リサーチパートナーです。ユーザーの研究アイデアや仮説に対し、論理的な批判、検証実験の提案、関連する研究分野の示唆を行ってください。必ず、ユーザーの興味の解像度を深めるための逆質問を一つ含めること。

【言語設定】
ユーザーの入力言語に合わせて回答してください。日本語で質問されたら日本語で、英語なら英語で回答してください。

【絶対遵守ルール（著作権と倫理）】
1. 翻案権の回避: 論文のAbstract（要約）の文章表現や語順をそのままコピー＆ペーストすることは法的に厳禁です。必ず事実関係のみを抽出し、あなた自身の言葉で完全に書き直して回答してください。
2. 引用元の明記: 回答の末尾、または参考にした箇所の直後に、必ず参照した論文の『タイトル』と『URLリンク』をリスト形式で明記してください。情報源を隠すことは許されません。
3. 不確実性の提示: 参考データに十分な情報がない場合は、推測で語らず「現在の検索結果からは断言できません」と誠実に答えてください。

【参考論文データ】
${context || "関連する論文が見つかりませんでした。"}`,
    messages,
  });

  return result.toDataStreamResponse();
}
