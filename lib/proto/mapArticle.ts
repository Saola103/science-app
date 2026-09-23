import { Article, Illustration } from "./types";
import { mapDbCategoryToTaxonomy } from "./mockData";
import { stripMarkdown, stripMarkdownExpert, parseGeneralSummary } from "../format/summaryText";

/** Shape returned by GET /api/feed's `items` array (see app/api/feed/route.ts). */
export type FeedApiItem = {
  id: string;
  type: "paper" | "news";
  title: string;
  summary?: string | null;
  summary_general?: string | null;
  summary_expert?: string | null;
  category?: string | null;
  published_at?: string | null;
  url?: string | null;
  source?: string | null;
  authors?: string[] | null;
  image_url?: string | null;
};

const ILLUSTRATIONS: Illustration[] = ["network", "graph", "comparison", "process"];

// No real signal backs the illustration field (see lib/proto/types.ts) — it's
// purely decorative, so a deterministic hash of the id is enough to keep it
// stable across re-renders/pagination without adding any new generation step.
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function pickIllustration(seedKey: string): Illustration {
  return ILLUSTRATIONS[hashString(seedKey) % ILLUSTRATIONS.length];
}

function formatPublishedAt(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

// A short teaser for the card front — as many WHOLE sentences as fit under
// the char budget, never a mid-sentence cut. No "…" truncation: a card that
// ends on a complete thought (even a little short of the budget) reads far
// better than one chopped off with an ellipsis, which is what this used to
// do when a sentence would overflow the budget (reverted after explicit
// feedback that "…"-truncation reads as broken, not as intentionally
// concise).
function firstSentences(text: string, maxSentences: number, maxChars: number): string {
  if (!text) return "";
  const sentences = text.split(/(?<=[。！？])/).filter((s) => s.trim().length > 0);
  let out = "";
  for (let i = 0; i < Math.min(maxSentences, sentences.length); i++) {
    const next = out + sentences[i];
    if (next.length > maxChars) break;
    out = next;
  }
  // First sentence alone already exceeds the budget — fall back to a clean
  // clause-boundary cut (see truncateToCompleteClause) rather than an empty
  // teaser or a mid-word slice.
  if (!out) out = truncateToCompleteClause(sentences[0] || text, maxChars);
  return out.trim();
}

// Cuts at the last complete 、-delimited clause that still fits, so an
// over-budget sentence ends on a natural pause instead of mid-word — used
// only as a last resort when no combination of whole sentences fits the
// budget. Never appends "…": per explicit feedback, ending mid-thought with
// an ellipsis reads as broken, so a clean (if slightly incomplete-sounding)
// clause break is preferred, and a hard character cut is the final fallback
// only when the text has no comma to break on at all.
function truncateToCompleteClause(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const clauses = text.split(/(?<=[、,])/);
  let out = "";
  for (const clause of clauses) {
    if ((out + clause).length > maxChars) break;
    out += clause;
  }
  out = out.trim().replace(/[、,]$/, "");
  return out || text.slice(0, maxChars).trim();
}

function formatAuthors(authors: string[] | null | undefined, source: string | null | undefined, type: "paper" | "news"): string {
  if (type === "news") return source || "ニュース";
  if (!authors || authors.length === 0) return "著者不明";
  const shown = authors.slice(0, 2).join(", ");
  return authors.length > 2 ? `${shown} 他` : shown;
}

// --- 「やさしく」「くわしく」重複判定 -----------------------------------
//
// 確定ケース: lib/pipeline/collect.ts の processPaper() は「くわしく」要約
// (summarize(tone:"expert")) の生成に失敗すると summary_expert を null の
// まま保存する。この場合 expertBody は null になり、下の
// mapFeedItemToArticle() では detailedExplanation が easyExplanation と
// バイト単位で完全一致する（229行目付近の `expertBody || easyExplanation`
// フォールバック）。このケースは閾値判定を経由せず、下の
// isDuplicateSummaryPair() 呼び出し側で expertBody === null を直接見て
// 100%確定で重複扱いにする。
//
// 曖昧なケース: 「やさしく」「くわしく」はどちらも生成されたが、内容が
// 実質同じ文になってしまった場合。日本語は単語間にスペースがなく形態素解析
// ライブラリなしでは単語単位の比較がしづらいため、依存ゼロで言語非依存に
// 動く「文字2-gramのJaccard係数」を使う。やさしく（平易な連続文）とくわしく
// （目的/手法/結果/意義のラベル付き構造）は本来フォーマットが大きく異なる
// ため、内容が別物であれば表面的な文字レベル類似度は自然と低くなる。誤って
// 正常な記事を非表示にしないよう、閾値は保守的に高め（0.8）に設定している
// — 実データでの閾値調整が必要になった場合はこの値をチューニングする。
const DUPLICATE_SUMMARY_JACCARD_THRESHOLD = 0.8;
const NGRAM_SIZE = 2;

function normalizeForSimilarity(text: string): string {
  // 句読点・空白・改行を除去し、比較を文字内容そのものに絞る。
  return text.replace(/[\s、。,.!?！？「」『』()（）・…\-—]/g, "");
}

function toNgramSet(text: string, n: number): Set<string> {
  const grams = new Set<string>();
  if (text.length < n) {
    if (text.length > 0) grams.add(text);
    return grams;
  }
  for (let i = 0; i <= text.length - n; i++) {
    grams.add(text.slice(i, i + n));
  }
  return grams;
}

function jaccardSimilarity(a: string, b: string): number {
  const setA = toNgramSet(normalizeForSimilarity(a), NGRAM_SIZE);
  const setB = toNgramSet(normalizeForSimilarity(b), NGRAM_SIZE);
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const gram of setA) {
    if (setB.has(gram)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * True when `easy`/`detailed` should be treated as duplicate summaries.
 * `expertBody === null` (expert summary generation failed, see collect.ts)
 * is a 100%-certain duplicate and short-circuits the similarity check;
 * otherwise falls back to the conservative n-gram Jaccard threshold above.
 */
function isDuplicateSummaryPair(easy: string, detailed: string, expertBody: string | null): boolean {
  if (expertBody === null) return true;
  if (!easy || !detailed) return false;
  return jaccardSimilarity(easy, detailed) >= DUPLICATE_SUMMARY_JACCARD_THRESHOLD;
}

/**
 * Maps a raw /api/feed item (DB shape) into the `Article` shape feedapp's
 * components expect (lib/proto/types.ts).
 *
 * - `summary` (headline) / `leadText` (teaser) / `easyExplanation` all derive
 *   from `summary_general`, whose format is "headline\n\nfeed body\n\neasy
 *   explanation" (see lib/llm/prompts/casual-summary.md) — parsed by
 *   lib/format/summaryText.ts's parseGeneralSummary. Records generated
 *   before that 3-block prompt shape only have "headline\n\nbody" (or one
 *   undifferentiated paragraph); see the easyExplanationBlock branch below
 *   for the fallback that still handles those.
 * - `detailedExplanation` uses `summary_expert`, falling back to the general
 *   summary/body/title if expert summary generation failed for this item
 *   (see lib/pipeline/collect.ts's try/catch around summarize(tone:"expert")).
 * - `divePoints` are derived from real fields only (source, published date,
 *   category) — no fabricated "insight" text, and no extra LLM call.
 */
// Some older records were summarized before the prompt reliably produced a
// distinct "headline\n\nbody" shape — their summary_general is one long
// Japanese paragraph with no short first line, so parseGeneralSummary's
// isGoodHeadline() rejects it (too long) and headline comes back null. That
// used to fall through to the raw English DB title (item.title) as the
// card's displayed headline — a real bug, not a missing-translation issue:
// the Japanese text was already there, just not split into a headline.
//
// This derives a short headline straight from the (already Japanese) body's
// first sentence, and — critically — returns the REMAINDER of the body with
// that sentence removed, so the card's title and its teaser/body text don't
// end up showing the exact same sentence twice (a real bug this same fix
// once introduced: deriving the headline without trimming it back out of the
// body first).
const HEADLINE_MAX_CHARS = 40; // keeps the card title within its box (see lib/llm/summarize.ts's prompt rule 1)
function splitBodyForFallbackHeadline(body: string): { headline: string | null; remainder: string } {
  if (!body) return { headline: null, remainder: body };
  const match = body.match(/^[^。！？\n]*[。！？]/);
  const rawSentence = match ? match[0] : body;
  const trimmed = rawSentence.trim();
  if (!trimmed) return { headline: null, remainder: body };
  const headline = trimmed.length <= HEADLINE_MAX_CHARS ? trimmed : truncateToCompleteClause(trimmed, HEADLINE_MAX_CHARS);
  const remainder = body.slice(rawSentence.length).replace(/^\s+/, "").trim();
  // Some legacy single-paragraph records are short enough overall that
  // removing the headline's sentence leaves too little for a readable
  // teaser (a couple of these short-blurb news items measured under 30
  // chars remaining). Keep the full original body in that case — a little
  // semantic overlap with the (often truncated, "…"-suffixed) headline reads
  // better than a near-empty card.
  const MIN_REMAINDER_CHARS = 40;
  return { headline, remainder: remainder.length >= MIN_REMAINDER_CHARS ? remainder : body };
}

// Even when a proper "headline\n\nbody" split exists, the body's own first
// sentence often restarts with the exact same noun phrase as the headline
// (e.g. headline "老化を遅らせる薬剤" followed by body "老化を遅らせる薬剤が脳に…") —
// natural for a standalone paragraph, but reads as a flat-out repeat when the
// headline is already sitting right above it as the card's bold title. Skip
// that opening sentence for the card teaser specifically (not for the full
// easyExplanation, which never shows the headline alongside it — see
// ArticleDetailSheet.tsx).
function bodyForTeaser(headline: string | null, body: string): string {
  if (!headline || !body) return body;
  const strippedHeadline = headline.trim();
  if (!strippedHeadline) return body;
  const firstSentenceMatch = body.match(/^[^。！？\n]*[。！？]/);
  const firstSentence = firstSentenceMatch ? firstSentenceMatch[0] : null;
  if (firstSentence && firstSentence.trim().startsWith(strippedHeadline)) {
    const rest = body.slice(firstSentence.length).replace(/^\s+/, "").trim();
    // As in splitBodyForFallbackHeadline: don't strip down to a near-empty
    // teaser just to avoid overlap with the headline — a short, slightly
    // redundant card beats an almost-blank one.
    return rest.length >= 40 ? rest : body;
  }
  return body;
}

export function mapFeedItemToArticle(item: FeedApiItem): Article {
  const rawGeneral = item.summary_general || item.summary || "";
  const parsed = rawGeneral ? parseGeneralSummary(rawGeneral) : { headline: null, body: "", easyExplanation: null };
  let headline = parsed.headline;
  let generalBody = parsed.body || (item.summary ? stripMarkdown(item.summary) : "");
  const easyExplanationBlock = parsed.easyExplanation;

  // No real headline line was found (see splitBodyForFallbackHeadline above) —
  // derive one from the body's first sentence, and use the rest of the body
  // (not the same text again) for the teaser/full explanation below.
  if (!headline && generalBody) {
    const split = splitBodyForFallbackHeadline(generalBody);
    if (split.headline) {
      headline = split.headline;
      generalBody = split.remainder;
    }
  }

  const rawExpert = item.summary_expert;
  const expertBody = rawExpert ? stripMarkdownExpert(rawExpert) : null;

  const category = mapDbCategoryToTaxonomy(item.category, `${item.title} ${rawGeneral}`);
  const sourceLabel = item.source || (item.type === "paper" ? "arXiv" : "ニュース");
  const publishedAt = formatPublishedAt(item.published_at);

  const easyExplanation = easyExplanationBlock || generalBody || item.title;

  let rawLeadText: string;
  if (easyExplanationBlock) {
    // New 3-block prompt shape: `generalBody` IS the feed-card teaser,
    // already written to its own 70-110 char budget — used as-is instead of
    // truncating the (separate, longer) easy explanation down to size.
    rawLeadText = generalBody || easyExplanation;
  } else {
    // Legacy 2-block shape (no distinct easy-explanation block): only one
    // body exists, shared by the card teaser and the detail view — derive a
    // short teaser from it, as before this prompt split.
    const teaserSource = bodyForTeaser(headline, easyExplanation);
    rawLeadText = firstSentences(teaserSource, 5, 110) || truncateToCompleteClause(teaserSource, 110);
  }
  // Safety net for both paths: the LLM doesn't always hit its own budget
  // exactly, so re-cap here rather than trusting the prompt alone.
  const leadText = rawLeadText.length <= 110 ? rawLeadText : firstSentences(rawLeadText, 10, 110) || truncateToCompleteClause(rawLeadText, 110);

  const rawHeadline = headline || item.title;
  const summary = rawHeadline.length <= HEADLINE_MAX_CHARS ? rawHeadline : truncateToCompleteClause(rawHeadline, HEADLINE_MAX_CHARS);

  const detailedExplanation = expertBody || easyExplanation;
  const isDuplicateSummary = isDuplicateSummaryPair(easyExplanation, detailedExplanation, expertBody);

  return {
    id: `${item.type}-${item.id}`,
    category,
    contentType: item.type,
    summary,
    leadText,
    illustration: pickIllustration(item.id),
    divePoints: [
      { label: "出典", text: sourceLabel },
      { label: "掲載日", text: publishedAt || "日付不明" },
      { label: "分野", text: category },
    ],
    source: sourceLabel,
    author: formatAuthors(item.authors, item.source, item.type),
    publishedAt,
    easyExplanation,
    detailedExplanation,
    isDuplicateSummary,
    url: item.url || undefined,
  };
}
