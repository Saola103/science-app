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

  if (tone === "casual") {
    // General Audience / Student mode
    return [
      "あなたは科学コミュニケーションの専門家です。",
      "以下の科学論文の要旨を、知的好奇心旺盛な一般読者（学生や社会人）向けに、以下の【厳格な形式】で要約してください。",
      "",
      "### 形式要件:",
      "1. 【3つのポイント】: 冒頭に、この研究の核心を突く短い3行の要点を箇条書き（- ）で示してください。",
      "2. 【詳細な解説】: その後に、専門用語を噛み砕きつつも知性を感じさせる洗練された日本語（～です、～ます調）で解説を加えてください。",
      "",
      `- 言語: 日本語`,
      `- 総文字数の目安: ${maxLength} 文字以内`,
      `- 注意事項: 「～だよ」「～だね」といった幼稚な表現は厳禁です。`,
      "",
      "=== 対象テキスト ===",
      content,
    ].join("\n");
  }

  return [
    "あなたは科学コミュニケーションの専門家です。",
    "以下の文章を、専門家や研究者向けに、論理的かつ厳密な日本語で要約してください。",
    `- 出力言語: 日本語`,
    `- 文章量の目安: およそ ${maxLength} 文字以内`,
    `- トーン: 公平かつ論理的な学術用（～である、～だ調、または洗練された～ですます調）`,
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

