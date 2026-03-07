import { generateText } from "./index";

type SummarizeOptions = {
  /** 要約の最大文字数（おおよその目安） */
  maxLength?: number;
  /** 要約のトーン（例: "neutral", "casual", "formal" など） */
  tone?: string;
};

const DEFAULT_MAX_LENGTH = 400;

function buildPrompt(content: string, options: SummarizeOptions = {}): string {
  const maxLength = options.maxLength ?? DEFAULT_MAX_LENGTH;
  const tone = options.tone ?? "neutral";

  return [
    "あなたは科学コミュニケーションの専門家です。",
    "以下の文章を、知的好奇心旺盛な一般読者（学生や社会人）向けに、専門用語を乱用せず、かつ知性を感じさせる洗練された日本語で要約してください。",
    `- 出力言語: 日本語`,
    `- 文章量の目安: およそ ${maxLength} 文字以内`,
    `- トーン: 公平かつ論理的で、親しみやすいが「幼稚」ではない表現（～だよ、～だね等の語尾は避け、ですます調で記述）`,
    "",
    "=== 対象テキスト ===",
    content,
  ].join("\n");
}

export async function summarize(
  content: string,
  options?: SummarizeOptions,
): Promise<string> {
  const prompt = buildPrompt(content, options);
  return generateText(prompt);
}

