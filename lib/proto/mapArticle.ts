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

// A short single-sentence teaser for the card front — deliberately shorter
// than easyExplanation (shown in the detail sheet) so tapping "詳しく" reveals
// more than the card already showed, instead of repeating it verbatim.
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
export function mapFeedItemToArticle(item: FeedApiItem): Article {
  const rawGeneral = item.summary_general || item.summary || "";
  const { headline, body } = rawGeneral ? parseGeneralSummary(rawGeneral) : { headline: null, body: "" };
  const generalBody = body || (item.summary ? stripMarkdown(item.summary) : "");

  const rawExpert = item.summary_expert;
  const expertBody = rawExpert ? stripMarkdownExpert(rawExpert) : null;

  const category = mapDbCategoryToTaxonomy(item.category, `${item.title} ${rawGeneral}`);
  const sourceLabel = item.source || (item.type === "paper" ? "arXiv" : "ニュース");
  const publishedAt = formatPublishedAt(item.published_at);

  const easyExplanation = generalBody || item.title;
  // Deliberately just the first sentence, well short of the full easyExplanation
  // shown in the detail sheet — the card teaser and the "やさしく" panel must
  // read as "preview" vs. "the whole thing", not as duplicates of each other.
  const leadText = firstSentences(easyExplanation, 1, 70) || easyExplanation.slice(0, 70);

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
