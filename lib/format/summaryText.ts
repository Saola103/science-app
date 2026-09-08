/**
 * Shared parsing/formatting helpers for LLM-generated summaries
 * (`summary_general` / `summary_expert` from `lib/pipeline/collect.ts`).
 *
 * Originally lived only in components/FeedCard.tsx; extracted here so
 * app/[locale]/feedapp/* (which needs the exact same headline/body split
 * and markdown stripping to render real DB data) doesn't reimplement it.
 * FeedCard.tsx now imports from here too — behavior is unchanged, this is
 * a pure move.
 */

/**
 * Strip markdown syntax from casual ("general") summaries.
 * Removes section headers, category tags, and markdown formatting.
 * The prompt format outputs title on line 1, body after empty line,
 * and [category] at the end — all of which are handled here.
 */
export function stripMarkdown(text: string): string {
  return text
    // Old-format section headers (▍見出し from previous prompt version)
    .replace(/^▍[^\n]*/gm, "")
    .replace(/^3つの[ダ要][イブポイント点]+[：:][^\n]*/gm, "")
    .replace(/^(研究の目的|主要な結果|科学的意義|専門的解説|魅力的な解説)[と：:。\s]/gm, "")
    .replace(/#{1,6}\s*/g, "")
    // bold / italic
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    // Category tags (new format: [biology] at end of casual summary)
    .replace(/\n?\[(?:physics|biology|it_ai|medicine|astronomy|chemistry|environment|mathematics|other)\]\s*$/i, "")
    .replace(/\[[\w_]+\]/g, "")
    // Old-format 【...】 headers
    .replace(/【カテゴリ】[^\n]*/g, "")
    .replace(/【([^】]+)】/g, "$1：")
    // Second pass to clean up any "xxx：" section headers left by 【】 conversion
    .replace(/^(?:3つのダイブポイント|3つの要点|研究の目的と背景|研究の目的|手法|主要な結果|科学的意義|専門的解説|魅力的な解説|核心的貢献)[：:][^\n]*/gm, "")
    .replace(/\nカテゴリ：\s*\S+\s*$/i, "")
    // Bullet markers
    .replace(/^\s*[-*+•]\s*/gm, "• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Lighter stripping for expert summaries.
 * Preserves the label structure (目的: / 手法: / 結果: / 意義:)
 * that makes the expert view readable.
 * Only removes old ▍ headers, markdown formatting, and stale artifacts.
 */
export function stripMarkdownExpert(text: string): string {
  return text
    // Old-format ▍ section headers — remove the header line, keep content
    .replace(/^▍([^\n]*)\n/gm, "")
    // Remove category tags if somehow present
    .replace(/\n?\[(?:physics|biology|it_ai|medicine|astronomy|chemistry|environment|mathematics|other)\]\s*$/i, "")
    // Markdown formatting
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/#{1,6}\s*/g, "")
    // Old 【...】 artifacts
    .replace(/【カテゴリ】[^\n]*/g, "")
    .replace(/\[[\w_]+\]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isGoodHeadline(t: string): boolean {
  return (
    t.length >= 6 &&
    t.length <= 40 &&
    !/^(3つの|▍|【|ダイブポイント|要点|専門的解説|魅力的|研究の目的|目的[：:]\s|手法[：:]\s|結果[：:]\s|意義[：:]\s)/.test(t) &&
    !/^[•\-\*\d]\s/.test(t) &&
    // Must contain at least one Japanese character to be a Japanese headline
    /[぀-ヿ一-鿿]/.test(t)
  );
}

/**
 * Splits a raw `summary_general` string (already markdown-stripped) into a
 * Japanese headline (first line, if it looks like one) and the remaining body.
 */
export function parseGeneralSummary(rawGeneral: string): { headline: string | null; body: string } {
  const cleaned = stripMarkdown(rawGeneral);
  const rawHeadline = cleaned.split("\n")[0]?.trim() || null;
  const headline = rawHeadline && isGoodHeadline(rawHeadline) ? rawHeadline.trim() : null;
  const body = headline ? cleaned.slice(headline.length).replace(/^\s*\n+/, "").trim() : cleaned;
  return { headline, body };
}
