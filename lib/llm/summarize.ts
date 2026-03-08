import { generateText } from "./index";

type SummarizeOptions = {
  /** 要約の最大文字数（おおよその目安） */
  maxLength?: number;
  /** 要約のトーン（例: "neutral", "casual", "formal" など） */
  tone?: string;
};

const DEFAULT_MAX_LENGTH = 450;

/**
 * カテゴリ別サムネイル画像リスト (Unsplashフリー素材)
 */
export const CATEGORY_IMAGES: Record<string, string[]> = {
  "physics": [
    "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1614935151651-0bea312ecbb6?q=80&w=800&auto=format&fit=crop",
  ],
  "biology": [
    "https://images.unsplash.com/photo-1530026405186-ed1f139313f8?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1576086213369-97a306d36557?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1581093458791-9f3c3250bb8b?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1473951574080-01fe45ec8643?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1507413245164-6160d8298b31?q=80&w=800&auto=format&fit=crop",
  ],
  "it_ai": [
    "https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1504639725590-34d0984388bd?q=80&w=800&auto=format&fit=crop",
  ],
  "medicine": [
    "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1584036561566-baf1f5f17a45?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1532187875605-1ef638237bf2?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1516549655169-df83a0774514?q=80&w=800&auto=format&fit=crop",
  ],
  "astronomy": [
    "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1506318137071-a8e063b4b519?q=80&w=800&auto=format&fit=crop",
  ],
  "chemistry": [
    "https://images.unsplash.com/photo-1532187875605-1ef638237bf2?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1581093458791-9f3c3250bb8b?q=80&w=800&auto=format&fit=crop",
  ],
  "environment": [
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=800&auto=format&fit=crop",
  ],
  "mathematics": [
    "https://images.unsplash.com/photo-1509228468518-180dd4864904?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=800&auto=format&fit=crop",
  ],
  "other": [
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45?q=80&w=800&auto=format&fit=crop",
  ]
};

function buildPrompt(content: string, options: SummarizeOptions = {}): string {
  const maxLength = options.maxLength ?? DEFAULT_MAX_LENGTH;
  const tone = options.tone ?? "neutral";

  if (tone === "casual") {
    return [
      "あなたは熟練のサイエンス・コミュニケーターです。コンセプトは「Pocket Dive」です。",
      "以下の科学論文を、一般読者向けに「噛み砕いて」かつ「専門的深みを損なわずに」要約してください。",
      "",
      "### 【絶対遵守】文体とトーンの指示:",
      "1. 必ず「です・ます調」の丁寧な敬語を使用してください。「だ・である」調は厳禁です。",
      "2. 冒頭は読者の興味を惹く魅力的な導入から始めてください。",
      "3. 専門用語は、その意味を噛み砕いて説明してください。",
      "",
      "### 形式要件:",
      "1. 【3つのダイブポイント】: 冒頭に、この研究の核心を3つの箇条書き（- ）で提示してください。ここも「です・ます調」にしてください。",
      "2. 【魅力的な解説】: 200文字程度の解説文を続けてください。「です・ます調」を徹底してください。",
      "3. 【カテゴリ】: 最後に、内容に基づいて以下のいずれか一言のみをタグとして出力してください: [physics, biology, it_ai, medicine, astronomy, chemistry, environment, mathematics, other]",
      "",
      `- 出力言語: 日本語`,
      `- 目安文字数: ${maxLength} 文字以内`,
      "",
      "=== 対象テキスト ===",
      content,
    ].join("\n");
  }

  // Expert Mode
  return [
    "あなたは学術的な正確性を重視する専門家です。以下の論文のAbstractを、研究者向けに論理性と厳密さを保ちつつ要約してください。",
    "",
    "### 形式要件:",
    "1. 【3つの要点】: 冒頭に、研究の核心的貢献（Contribution）を3つの箇条書き（- ）で示してください。",
    "2. 【専門的解説】: 目的、手法、主要な結果を、正確な日本語（～である、～だ調）でまとめてください。",
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
