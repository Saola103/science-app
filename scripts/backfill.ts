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

import { summarize } from "../lib/llm/summarize";
import { generateText, embedText } from "../lib/llm/index";

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
  const firstLine = summary.trim().split("\n")[0].trim();
  const hasJapanese = /[぀-ヿ一-鿿]/.test(firstLine);
  return !hasJapanese || firstLine.length > 40;
}

/** True if general/expert are missing, or so similar they read as duplicates
 * in the UI (the identical-prefix heuristic /api/admin/fix-summaries already
 * uses — kept in sync here since this script covers the same backlog without
 * that route's 300s Vercel ceiling). */
function needsFix(p: { summary_general: string | null; summary_expert: string | null }): boolean {
  if (!p.summary_general || !p.summary_expert) return true;
  return p.summary_general.trim().slice(0, 80) === p.summary_expert.trim().slice(0, 80);
}

async function backfillPapers(supabase: ReturnType<typeof getSupabase>, limit: number) {
  if (limit <= 0) return;
  console.log(`\n=== Papers (target: ${limit}) ===`);

  // Over-fetch then filter client-side: catches null AND identical
  // general/expert pairs, not just null ones (see needsFix above).
  const { data: candidates, error } = await supabase
    .from("papers")
    .select("id, title, abstract, summary_general, summary_expert, summary_embedding")
    .order("published_at", { ascending: false })
    .limit(limit * 4);

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
      };
      if (embedding && embedding.length > 0) update.summary_embedding = embedding;

      const { error: updateError } = await supabase.from("papers").update(update).eq("id", paper.id);
      if (updateError) throw updateError;

      done++;
      console.log(`[papers] ${done}/${papers.length} fixed: ${paper.title.slice(0, 50)}`);
    } catch (e) {
      console.error(`[papers] failed for ${paper.id}:`, e instanceof Error ? e.message : e);
    }
  }
  console.log(`Papers: ${done}/${papers.length} fixed.`);
}

async function backfillNews(supabase: ReturnType<typeof getSupabase>, limit: number) {
  if (limit <= 0) return;
  console.log(`\n=== News (target: ${limit}) ===`);

  const { data: items, error } = await supabase
    .from("news")
    .select("id, title, description, summary_general, category")
    .order("published_at", { ascending: false })
    .limit(limit * 3); // over-fetch, then filter client-side for null/old-format

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
    const catTag = item.category || "other";
    const prompt = `あなたは人気サイエンスライターです。以下の科学ニュース記事を、好奇心旺盛な高校生が「もっと知りたい！」と感じる日本語コラムに変えてください。

【出力フォーマット（厳守）】
1行目: 10〜20文字の日本語タイトル（体言止めか短文。疑問形は絶対禁止。例:「AIが創薬を100倍加速」「ブラックホールの新発見」）
（空行1つ）
本文: 100〜150文字の連続した文章。箇条書き禁止。ですます調。
（空行1つ）
[${catTag}]

=== ニュース記事 ===
タイトル: ${item.title}

内容: ${text}`;

    try {
      const newSummary = await generateText(prompt, 0.72);
      const { error: updateError } = await supabase
        .from("news")
        .update({ summary_general: newSummary })
        .eq("id", item.id);
      if (updateError) throw updateError;

      done++;
      console.log(`[news] ${done}/${toFix.length} fixed: ${item.title.slice(0, 50)}`);
    } catch (e) {
      console.error(`[news] failed for ${item.id}:`, e instanceof Error ? e.message : e);
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
