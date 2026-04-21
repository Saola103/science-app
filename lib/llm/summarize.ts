import { generateText } from "./index";

type SummarizeOptions = {
  /** 要約の最大文字数（おおよその目安） */
  maxLength?: number;
  /** "casual" = やさしく一般向け / "expert" = 研究者向け技術要約 */
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

/**
 * Abstract の前処理: LaTeX・HTML・特殊文字を除去してLLMに渡しやすくする
 */
function cleanAbstract(text: string): string {
  return text
    // HTMLタグ除去
    .replace(/<[^>]+>/g, " ")
    // LaTeX数式: $...$ や $$...$$ → (数式)
    .replace(/\$\$[\s\S]+?\$\$/g, "(数式)")
    .replace(/\$[^$]+?\$/g, "(数式)")
    // LaTeX コマンド: \command{...} → 中身だけ残す
    .replace(/\\[a-zA-Z]+\{([^}]*)\}/g, "$1")
    // 残った \ エスケープ
    .replace(/\\/g, " ")
    // 複数スペース・改行を整理
    .replace(/\s+/g, " ")
    .trim();
}

function buildPrompt(content: string, options: SummarizeOptions = {}): string {
  const tone = options.tone ?? "casual";
  const cleaned = cleanAbstract(content);

  if (tone === "casual") {
    // ── やさしく版：高校生・一般向け。ナラティブ形式、箇条書きなし ──
    return [
      "あなたはサイエンスライターです。以下の科学論文を、科学に興味を持ちはじめた高校生でも楽しめるように日本語で解説してください。",
      "",
      "【厳守ルール】",
      "1. 冒頭は「驚き」か「なぜ？」という問いかけから始めてください。",
      "2. 専門用語は使わず、身近な例えやたとえ話で説明してください。",
      "3. 箇条書き（・や-や数字リスト）は一切使わないでください。",
      "4. 文体は「〜です/ます/なんです/でしょう」の柔らかいですます調で統一してください。",
      "5. 全体を150〜200文字の連続した文章1〜3段落で書いてください。",
      "6. 最後の行に、以下のカテゴリから1つだけを角括弧で出力してください（説明不要）:",
      "   [physics] [biology] [it_ai] [medicine] [astronomy] [chemistry] [environment] [mathematics] [other]",
      "",
      "=== 論文テキスト ===",
      cleaned,
    ].join("\n");
  }

  // ── くわしく版：研究者・上級者向け。構造的・技術的 ──
  return [
    "あなたは科学論文の専門的レビュアーです。以下の論文Abstractを、大学院生・研究者向けに技術的な正確さを保って日本語で要約してください。",
    "",
    "【出力形式（必ず守ること）】",
    "▍研究の目的と背景",
    "（1〜2文で簡潔に）",
    "",
    "▍手法",
    "（用いた実験手法・モデル・データセットを具体的に）",
    "",
    "▍主要な結果",
    "（数値・定量的成果があれば含めて）",
    "",
    "▍科学的意義",
    "（この研究が分野に与えるインパクト）",
    "",
    "【ルール】",
    "- 専門用語はそのまま使用（初出時は括弧で英語を併記）",
    "- 文体は「〜である/〜した/〜されている」調",
    "- 各セクション合計で250〜350文字",
    "- 箇条書きは使わずセクション見出し後に文章を続けること",
    "",
    "=== 論文テキスト ===",
    cleaned,
  ].join("\n");
}

export async function summarize(
  content: string,
  options?: SummarizeOptions,
): Promise<string> {
  const prompt = buildPrompt(content, options);
  // やさしく = temperature高め（読みやすさ重視）/ くわしく = 低め（正確性重視）
  const temperature = options?.tone === "casual" ? 0.75 : 0.35;
  return generateText(prompt, temperature);
}
