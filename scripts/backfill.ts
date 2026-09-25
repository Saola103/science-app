/**
 * One-off / re-runnable backfill for papers & news that are missing
 * summaries and/or embeddings (e.g. after the Groq key outage that left
 * ~5500 rows with null summary_general).
 *
 * Unlike the /api/cron/fix-summaries route (capped small to fit inside a
 * single Vercel Cron invocation), this is meant to be run locally / from a
 * long-lived process, so it can churn through the whole backlog across
 * several invocations without a maxDuration limit. It processes most-recent
 * items first, since those are what users actually see in the feed.
 *
 * Usage:
 *   npx tsx scripts/backfill.ts --papers 200 --news 200
 *   npx tsx scripts/backfill.ts --papers 500 --news 0   # papers only
 *   npx tsx scripts/backfill.ts --embeddings-only 500   # just fill missing embeddings
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { summarize, summarizeNews } from "../lib/llm/summarize";
import { embedText } from "../lib/llm/index";
import { hasValidHeadline } from "../lib/format/summaryText";

function arg(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1 || !process.argv[i + 1]) return fallback;
  return parseInt(process.argv[i + 1], 10);
}

const PAPERS_LIMIT = arg("papers", 100);
const NEWS_LIMIT = arg("news", 100);
const EMBEDDINGS_ONLY = process.argv.includes("--embeddings-only")
  ? arg("embeddings-only", 200)
  : 0;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

function isOldFormatSummary(summary: string): boolean {
  return !hasValidHeadline(summary);
}

/** True if general/expert are missing, in the pre-3-block-prompt old format
 * (no valid headline — see has_valid_headline / hasValidHeadline()), or so
 * similar they read as duplicates in the UI (the identical-prefix heuristic
 * /api/admin/fix-summaries already uses — kept in sync here since this
 * script covers the same backlog without that route's 300s Vercel ceiling).
 *
 * 2026-09-26: added the has_valid_headline check — this used to only catch
 * null/identical summary pairs, silently missing the much larger backlog of
 * rows that DO have non-null, non-identical general/expert summaries but
 * predate the 3-block headline format (has_valid_headline=false/null). That
 * backlog is exactly what app/api/cron/fix-summaries's `.or(...)` query
 * targets server-side; this script now matches it instead of only
 * discovering the narrower null/identical subset. */
function needsFix(p: { summary_general: string | null; summary_expert: string | null; has_valid_headline?: boolean | null }): boolean {
  if (!p.summary_general || !p.summary_expert) return true;
  if (!p.has_valid_headline) return true;
  return p.summary_general.trim().slice(0, 80) === p.summary_expert.trim().slice(0, 80);
}

async function backfillPapers(supabase: ReturnType<typeof getSupabase>, limit: number) {
  if (limit <= 0) return;
  console.log(`\n=== Papers (target: ${limit}) ===`);

  // Filter server-side on the same has_valid_headline/null conditions
  // app/api/cron/fix-summaries uses (see supabase/migrations/
  // 009_has_valid_headline.sql), instead of only scanning a recent
  // published_at window and filtering client-side — that window approach
  // used to silently miss most of the backlog (see needsFix's doc comment
  // above). needsFix() is still applied after fetching as a second pass for
  // the identical-prefix case, which isn't expressible in the `.or(...)`.
  const { data: candidates, error } = await supabase
    .from("papers")
    .select("id, title, abstract, summary_general, summary_expert, summary_embedding, has_valid_headline")
    .or("summary_general.is.null,summary_expert.is.null,has_valid_headline.eq.false,has_valid_headline.is.null")
    .order("published_at", { ascending: false })
    .limit(limit * 2);

  if (error) throw error;
  const papers = (candidates || []).filter(needsFix).slice(0, limit);
  if (papers.length === 0) {
    console.log("No papers with missing/duplicate summaries.");
    return;
  }

  let done = 0;
  for (const paper of papers) {
    const text = paper.abstract || paper.title || "";
    if (!text.trim()) continue;
    try {
      const generalSummary = await summarize(text, { tone: "casual" });
      const expertSummary = await summarize(text, { tone: "expert" });
      const embedding = paper.summary_embedding ? undefined : await embedText(text);

      const update: Record<string, unknown> = {
        summary_general: generalSummary,
        summary_expert: expertSummary,
        summary: generalSummary,
        has_valid_headline: hasValidHeadline(generalSummary),
      };
      if (embedding && embedding.length > 0) update.summary_embedding = embedding;

      const { error: updateError } = await supabase.from("papers").update(update).eq("id", paper.id);
      if (updateError) throw updateError;

      done++;
      console.log(`[papers] ${done}/${papers.length} fixed: ${paper.title.slice(0, 50)}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[papers] failed for ${paper.id}:`, msg);
      // generateText() already retries transient 429s 3x internally (see
      // lib/llm/index.ts) before throwing, so a 429 reaching here means the
      // Groq daily cap (TPD) is exhausted, not a one-off rate blip — every
      // remaining item would otherwise retry-then-fail the same way,
      // burning ~15-20s each for nothing. Stop this batch instead (mirrors
      // the same `if (msg.includes("429")) break;` guard already used in
      // app/api/cron/fix-summaries and app/api/admin/fix-summaries).
      if (msg.includes("429")) {
        console.warn("[papers] Groq daily cap likely hit — stopping papers batch early.");
        break;
      }
    }
  }
  console.log(`Papers: ${done}/${papers.length} fixed.`);
}

async function backfillNews(supabase: ReturnType<typeof getSupabase>, limit: number) {
  if (limit <= 0) return;
  console.log(`\n=== News (target: ${limit}) ===`);

  // 2026-09-26: this used to fetch only the `limit*3` MOST RECENT rows
  // (ordered by published_at desc) and filter client-side — but recently
  // collected news already gets a valid headline at write time (see
  // lib/pipeline/collect.ts), so that recency window mostly contained
  // already-fine rows and rarely reached the real backlog (older rows,
  // further back in published_at order, predating the 3-block prompt).
  // A manual run against the live backlog confirmed this: it reported
  // "No news with missing/old-format summaries" despite ~4,900 backlogged
  // rows existing. Filter server-side on has_valid_headline instead (same
  // fix already applied to backfillPapers() above, and to
  // app/api/cron/fix-summaries's query) so this reaches the whole backlog
  // regardless of how deep it sits in published_at order.
  const { data: items, error } = await supabase
    .from("news")
    .select("id, title, description, summary_general, category, has_valid_headline")
    .or("summary_general.is.null,has_valid_headline.eq.false,has_valid_headline.is.null")
    .order("published_at", { ascending: false })
    .limit(limit * 2);

  if (error) throw error;
  const toFix = (items || [])
    .filter((n) => !n.summary_general || isOldFormatSummary(n.summary_general))
    .slice(0, limit);

  if (toFix.length === 0) {
    console.log("No news with missing/old-format summaries.");
    return;
  }

  let done = 0;
  for (const item of toFix) {
    const text = item.description || item.title || "";
    if (!text.trim()) continue;

    try {
      const newSummary = await summarizeNews({
        title: item.title,
        description: text,
        category: item.category ?? undefined,
      });
      const { error: updateError } = await supabase
        .from("news")
        .update({ summary_general: newSummary, has_valid_headline: hasValidHeadline(newSummary) })
        .eq("id", item.id);
      if (updateError) throw updateError;

      done++;
      console.log(`[news] ${done}/${toFix.length} fixed: ${item.title.slice(0, 50)}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[news] failed for ${item.id}:`, msg);
      // See the matching comment in backfillPapers() above — a 429 here
      // means the Groq daily cap is exhausted, so stop early instead of
      // retrying every remaining item.
      if (msg.includes("429")) {
        console.warn("[news] Groq daily cap likely hit — stopping news batch early.");
        break;
      }
    }
  }
  console.log(`News: ${done}/${toFix.length} fixed.`);
}

async function backfillEmbeddingsOnly(supabase: ReturnType<typeof getSupabase>, limit: number) {
  if (limit <= 0) return;
  console.log(`\n=== Embeddings only (target: ${limit}) ===`);

  const { data: papers, error } = await supabase
    .from("papers")
    .select("id, title, abstract")
    .is("summary_embedding", null)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  if (!papers || papers.length === 0) {
    console.log("No papers with missing embeddings.");
    return;
  }

  let done = 0;
  for (const paper of papers) {
    const text = paper.abstract || paper.title || "";
    if (!text.trim()) continue;
    try {
      const embedding = await embedText(text);
      if (embedding.length === 0) continue;
      const { error: updateError } = await supabase
        .from("papers")
        .update({ summary_embedding: embedding })
        .eq("id", paper.id);
      if (updateError) throw updateError;
      done++;
      console.log(`[embeddings] ${done}/${papers.length}: ${paper.title.slice(0, 50)}`);
    } catch (e) {
      console.error(`[embeddings] failed for ${paper.id}:`, e instanceof Error ? e.message : e);
    }
  }
  console.log(`Embeddings: ${done}/${papers.length} fixed.`);
}

async function main() {
  const supabase = getSupabase();
  const t0 = Date.now();

  if (EMBEDDINGS_ONLY > 0) {
    await backfillEmbeddingsOnly(supabase, EMBEDDINGS_ONLY);
  } else {
    await backfillPapers(supabase, PAPERS_LIMIT);
    await backfillNews(supabase, NEWS_LIMIT);
  }

  console.log(`\nDone in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
