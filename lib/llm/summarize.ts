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
    "あなたは日本語の要約アシスタントです。",
    "以下の文章を重要なポイントが抜けないように要約してください。",
    `- 出力言語: 日本語`,
    `- 文章量の目安: およそ ${maxLength} 文字以内`,
    `- トーン: ${tone}`,
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

