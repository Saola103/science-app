import { generateText } from "./index";

type SummarizeOptions = {
  /** 要約の最大文字数（おおよその目安） */
  maxLength?: number;
  /** 要約のトーン（例: "neutral", "casual", "formal" など） */
  tone?: string;
};

const DEFAULT_MAX_LENGTH = 450;

function buildPrompt(content: string, options: SummarizeOptions = {}): string {
  const maxLength = options.maxLength ?? DEFAULT_MAX_LENGTH;
  const tone = options.tone ?? "neutral";

  if (tone === "casual") {
    // General Audience / Student mode (Pocket Dive - General)
    return [
      "あなたは熟練のサイエンス・コミュニケーターです。コンセプトは「Pocket Dive」で、読者が科学の深淵へダイブしたくなるような魅力的な解説を提供してください。",
      "以下の科学論文のAbstractを、一般の方々に向けて、以下の形式で要約してください。",
      "",
      "### 【重要】文体とトーンに関する指示",
      "1. 必ず「です・ます調」の丁寧な敬語（丁寧語）を使用してください。",
      "2. 冒頭は、読者が「おっ、これは面白そうだ！」と興味を惹かれるような、キャッチーで魅力的な導入文（フック）から始めてください。",
      "3. 専門用語は、中学生でも理解できるように徹底的に噛み砕いて説明してください。",
      "",
      "### 形式要件:",
      "1. 【3つのダイブポイント】: 冒頭に、この研究の最もワクワクする核心を3行の箇条書き（- ）で簡潔に提示してください。",
      "2. 【魅力的な解説】: その後に、導入文を含む200文字程度のわかりやすい解説文を続けてください。",
      "",
      `- 出力言語: 日本語`,
      `- 目安文字数: ${maxLength} 文字以内`,
      "",
      "=== 対象テキスト ===",
      content,
    ].join("\n");
  }

  // Expert Mode (Pocket Dive - Expert)
  return [
    "あなたは学術的な正確性を重視する専門家です。以下の論文のAbstractを、研究者向けに論理性と厳密さを保ちつつ要約してください。",
    "",
    "### 形式要件:",
    "1. 【3つの要点】: 冒頭に、研究の核心的貢献（Contribution）を3行の箇条書き（- ）で示してください。",
    "2. 【専門的解説】: 研究の目的、手法、主要な結果（Conclusion）を、簡潔かつ正確な日本語（～である、～だ調）でまとめてください。",
    "",
    `- 出力言語: 日本語`,
    `- 目安文字数: ${maxLength} 文字以内`,
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
