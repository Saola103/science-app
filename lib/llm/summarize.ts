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
    // General Audience / Student mode (Pocket Dive - General)
    return [
      "あなたは科学コミュニケーターです。コンセプトは「Pocket Dive」で、読者が科学の世界へダイブしたくなるような魅力が必要です。",
      "以下の科学論文のAbstractを、一般人にも分かりやすく、かつ「面白そう！」と思える魅力的な導入から始めて要約してください。",
      "",
      "### 形式要件:",
      "1. 【3つのダイブポイント】: 冒頭に、この研究の最も面白い核心を3行の箇条書き（- ）で示してください。",
      "2. 【魅力的な解説】: その後に、専門用語を噛み砕き、きちんとした「です・ます調」で解説を加えてください。",
      "",
      `- 出力言語: 日本語`,
      `- 文字数: ${maxLength} 文字程度`,
      "",
      "=== 対象テキスト ===",
      content,
    ].join("\n");
  }

  // Expert Mode (Pocket Dive - Expert)
  return [
    "あなたは科学の専門家です。以下の論文のAbstractを、研究者向けに論理的かつ厳密に要約してください。",
    "### 形式要件:",
    "1. 【3つの要点】: 冒頭に、研究の核心を3行の箇条書き（- ）で示してください。",
    "2. 【学術的解説】: 研究の目的・手法・結果（PMR）を、簡潔かつ正確な日本語（～である調）でまとめてください。",
    "",
    `- 出力言語: 日本語`,
    `- 文字数: ${maxLength} 文字程度`,
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

