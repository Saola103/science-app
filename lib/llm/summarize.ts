import { generateText } from "./index";

type SummarizeOptions = {
  /** 要約の最大文字数（後方互換のため保持、新プロンプトでは無視） */
  maxLength?: number;
  /** "casual" = やさしく一般向け / "expert" = 研究者向け技術要約 */
  tone?: string;
};

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
    .replace(/<[^>]+>/g, " ")
    .replace(/\$\$[\s\S]+?\$\$/g, "(数式)")
    .replace(/\$[^$]+?\$/g, "(数式)")
    .replace(/\\[a-zA-Z]+\{([^}]*)\}/g, "$1")
    .replace(/\\/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * ── やさしく版プロンプト ──
 *
 * 出力形式:
 *   1行目: 10〜20文字の日本語タイトル（体言止めか短文。疑問形禁止）
 *   空行
 *   本文: 150〜200文字の連続した文章（箇条書き禁止）
 *   空行
 *   [カテゴリタグ]
 *
 * FeedCardはこの構造を前提にしてタイトルと本文を分離する。
 */
function buildCasualPrompt(content: string): string {
  const cleaned = cleanAbstract(content);
  return `あなたは人気サイエンスライターです。科学論文を、好奇心旺盛な高校生が「もっと知りたい！」と感じる日本語コラムに変えてください。

【出力フォーマット（厳守）】
1行目: 10〜20文字の日本語タイトル（体言止めか短文。疑問形は絶対禁止。例:「脳が"忘れる"仕組みを解明」「光より速い通信は可能か」）
（空行1つ）
本文: 150〜200文字の連続した文章。1〜2段落。
（空行1つ）
[カテゴリ]

【本文のルール】
・箇条書き（・や-や数字リスト）は絶対に使わない
・専門用語を使う場合は「〜というのはまるで〇〇のようなもので」「ちょうど〇〇と同じ仕組みで」など身近な例えで補足
・「〜です・〜ます・〜でしょう・〜なんです」のやわらかいですます調
・冒頭を毎回同じ言葉で始めない。内容に合わせて自然に選ぶ
  使える書き出しの例:「実は」「〜が判明しました」「〜というジレンマがあります」「〜で世界が変わるかもしれません」「長年の謎が、ついに解けました」「あなたの体の中でも〜が起きています」
・最後の1文は「だから、この研究は〜可能性を開きます」「この発見が〜につながるかもしれません」のように意義や夢を示す

【カテゴリ一覧】
[physics] [biology] [it_ai] [medicine] [astronomy] [chemistry] [environment] [mathematics] [other]

【出力例（形式の参考）】
タコの腕が"考える"驚きの仕組み

実はタコの腕は、脳とは別に独立した神経回路を持っています。腕1本ずつに小さな「ミニ脳」があって、中央の脳の命令を待たずに動けるんです。まるで8人のプレイヤーが同時に動くサッカーチームのよう。この仕組みを解明することで、ロボットアームの制御技術が大きく変わるかもしれません。

[biology]

=== 論文テキスト ===
${cleaned}`;
}

/**
 * ── くわしく版プロンプト ──
 *
 * 出力形式:
 *   目的: （1〜2文）
 *   手法: （実験手法・モデル・データセット）
 *   結果: （定量的成果を含む）
 *   意義: （分野へのインパクト）
 *
 * シンプルなラベル形式でstripMarkdownの干渉を受けにくく、
 * FeedCardの「くわしく」表示でそのまま自然に読める。
 */
function buildExpertPrompt(content: string): string {
  const cleaned = cleanAbstract(content);
  return `以下の科学論文を、大学院生・研究者向けに技術的に正確な日本語で要約してください。

【出力フォーマット（必ず守る）】
目的: 〈この研究が解決しようとした問題・目標を1〜2文で〉
手法: 〈使用した実験手法・モデル・アルゴリズム・データセットを具体的に〉
結果: 〈得られた定量的成果・ベースラインとの比較を含めて〉
意義: 〈この研究が分野に与えるインパクト・今後の展望を1〜2文で〉

【ルール】
・専門用語はそのまま使用（初出時のみ英語を括弧で併記: 例「注意機構（Attention）」）
・「〜である・〜した・〜された・〜される」の簡潔な体言止め調
・各項目1〜2文、全体200〜280文字

=== 論文テキスト ===
${cleaned}`;
}

function buildPrompt(content: string, options: SummarizeOptions = {}): string {
  const tone = options.tone ?? "casual";
  if (tone === "casual") return buildCasualPrompt(content);
  return buildExpertPrompt(content);
}

export async function summarize(
  content: string,
  options?: SummarizeOptions,
): Promise<string> {
  const prompt = buildPrompt(content, options);
  // やさしく = temperature高め（創造性・読みやすさ重視）/ くわしく = 低め（正確性重視）
  const temperature = options?.tone === "casual" ? 0.72 : 0.30;
  return generateText(prompt, temperature);
}
