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

// A short teaser for the card front — several sentences up to a char budget
// (not just "the first sentence") so a short opening sentence doesn't leave
// the card looking thinner than its neighbors; still shorter than the full
// easyExplanation shown in the detail sheet, so tapping "詳しく" reveals more
// than the card already showed instead of repeating it verbatim.
function firstSentences(text: string, maxSentences: number, maxChars: number): string {
  if (!text) return "";
  const sentences = text.split(/(?<=[。！？])/).filter((s) => s.trim().length > 0);
  let out = "";
  for (let i = 0; i < Math.min(maxSentences, sentences.length); i++) {
    if (out.length + sentences[i].length > maxChars && out.length > 0) break;
    out += sentences[i];
  }
  if (!out) out = text.slice(0, maxChars);
  return out.trim();
}

function formatAuthors(authors: string[] | null | undefined, source: string | null | undefined, type: "paper" | "news"): string {
  if (type === "news") return source || "ニュース";
  if (!authors || authors.length === 0) return "著者不明";
  const shown = authors.slice(0, 2).join(", ");
  return authors.length > 2 ? `${shown} 他` : shown;
}

/**
 * Maps a raw /api/feed item (DB shape) into the `Article` shape feedapp's
 * components expect (lib/proto/types.ts).
 *
 * - `summary` (headline) / `leadText` (teaser) / `easyExplanation` all derive
 *   from `summary_general`, whose format is "headline\n\nbody" (see
 *   lib/llm/summarize.ts's prompt) — the same parsing components/FeedCard.tsx
 *   already relies on for the production /feed route, factored out to
 *   lib/format/summaryText.ts so both stay in sync.
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
const HEADLINE_MAX_CHARS = 32; // keeps the card title to roughly 1–2 lines
function splitBodyForFallbackHeadline(body: string): { headline: string | null; remainder: string } {
  if (!body) return { headline: null, remainder: body };
  const match = body.match(/^[^。！？\n]*[。！？]/);
  const rawSentence = match ? match[0] : body;
  const trimmed = rawSentence.trim();
  if (!trimmed) return { headline: null, remainder: body };
  const headline = trimmed.length <= HEADLINE_MAX_CHARS ? trimmed : `${trimmed.slice(0, HEADLINE_MAX_CHARS)}…`;
  const remainder = body.slice(rawSentence.length).replace(/^\s+/, "").trim();
  // If removing the headline sentence leaves nothing, keep the original body
  // for the teaser/explanation rather than showing an empty card.
  return { headline, remainder: remainder || body };
}

export function mapFeedItemToArticle(item: FeedApiItem): Article {
  const rawGeneral = item.summary_general || item.summary || "";
  const parsed = rawGeneral ? parseGeneralSummary(rawGeneral) : { headline: null, body: "" };
  let headline = parsed.headline;
  let generalBody = parsed.body || (item.summary ? stripMarkdown(item.summary) : "");

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

  const easyExplanation = generalBody || item.title;
  // Several sentences up to a char budget — sized to fill roughly 3-4 lines
  // of the card's teaser text consistently (a single short first sentence
  // used to leave some cards looking noticeably thinner than others). Still
  // shorter than the full easyExplanation shown in the detail sheet, so
  // tapping "詳しく" reveals more than the card already showed.
  const leadText = firstSentences(easyExplanation, 3, 100) || easyExplanation.slice(0, 100);

  return {
    id: `${item.type}-${item.id}`,
    category,
    contentType: item.type,
    summary: headline || item.title,
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
    detailedExplanation: expertBody || easyExplanation,
    url: item.url || undefined,
  };
}
