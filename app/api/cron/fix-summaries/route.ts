/**
 * Vercel Cron Job: Daily Summary Repair
 *
 * Runs after the main collection cron to fix papers/news whose summaries
 * were skipped (null), identical, or in the old non-headline format, and
 * backfills missing paper embeddings (needed for vector search).
 *
 * Schedule: Runs daily at 09:00 UTC (18:00 JST) — between the two collection crons
 * Configure in vercel.json: { "crons": [{ "path": "/api/cron/fix-summaries", "schedule": "0 9 * * *" }] }
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabase/serviceClient";
import { summarize } from "../../../../lib/llm/summarize";
import { generateText, embedText } from "../../../../lib/llm/index";
import { bearerToken, isAuthorizedAdmin } from "../../../../lib/auth/adminAuth";
import { hasValidHeadline } from "../../../../lib/format/summaryText";

export const maxDuration = 300;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Kept as a thin wrapper (rather than inlining !hasValidHeadline everywhere
// below) so this file's existing "old format" naming/callsites don't need to
// change — see lib/format/summaryText.ts's hasValidHeadline() doc comment
// for what "old format" actually means and where else this judgement is used.
function isOldFormatSummary(summary: string): boolean {
  return !hasValidHeadline(summary);
}

export async function GET(req: NextRequest) {
  if (!isAuthorizedAdmin(bearerToken(req.headers.get("authorization")))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Groq is now throttled to its TPM budget inside generateText() itself
  // (see lib/llm/index.ts), so this limit is bounded by Vercel's maxDuration
  // rather than a daily token cap — 40 summary-pairs comfortably fits in 300s.
  const limit = 40;
  // Gemini embeddings are capped at 1000/day (separate from Groq). New papers
  // collected each day use ~45 of that; keep this well under the remainder so
  // it never starves same-day collection.
  const EMBED_LIMIT = 150;
  const supabase = getSupabaseServerClient();

  let totalFixed = 0;
  let totalErrors = 0;
  const allResults: { id: string; table: string; status: string }[] = [];

  // ── 1. Fix papers with missing/broken summaries ────────────────────────────
  // Previously this only ordered by published_at desc and looked at the most
  // recent `limit*4` rows, so old-format stragglers further back in the
  // published_at ordering than that window were never reached (2026-09-24
  // manual run confirmed fixed:0 against a recent-only window that was
  // already all valid). Filtering server-side on has_valid_headline (see
  // supabase/migrations/009_has_valid_headline.sql) instead of eyeballing a
  // fixed recency window reaches the whole backlog regardless of how deep it
  // sits in published_at order — .is(...null) is included alongside
  // .eq(...false) as a safety net for any row this column hasn't been
  // (re)computed for yet.
  {
    const { data: papers, error } = await supabase
      .from("papers")
      .select("id, title, abstract, summary_general, summary_expert, source, has_valid_headline")
      .or("summary_general.is.null,summary_expert.is.null,has_valid_headline.eq.false,has_valid_headline.is.null")
      .order("published_at", { ascending: false })
      .limit(limit * 4);

    if (!error && papers && papers.length > 0) {
      const noSummary = papers.filter((p) => !p.summary_general);
      const noExpert = papers.filter((p) => p.summary_general && !p.summary_expert);
      const oldHeadlineFormat = papers.filter((p) => p.summary_general && !hasValidHeadline(p.summary_general));
      const identical = papers.filter((p) => {
        if (!p.summary_general || !p.summary_expert) return false;
        return p.summary_general.trim().slice(0, 80) === p.summary_expert.trim().slice(0, 80);
      });

      const seen = new Set<string>();
      const papersToFix = [...noSummary, ...noExpert, ...oldHeadlineFormat, ...identical]
        .filter((p) => {
          if (seen.has(p.id)) return false;
          seen.add(p.id);
          return true;
        })
        .slice(0, Math.floor(limit / 2));

      console.log(`[cron/fix-summaries] Papers to fix: ${papersToFix.length}`);

      for (const paper of papersToFix) {
        const text = paper.abstract || paper.title || "";
        if (!text.trim()) continue;
        try {
          const generalSummary = await summarize(text, { tone: "casual" });
          await delay(900);
          const expertSummary = await summarize(text, { tone: "expert" });
          await delay(900);

          const { error: updateError } = await supabase
            .from("papers")
            .update({
              summary_general: generalSummary,
              summary_expert: expertSummary,
              summary: generalSummary,
              summary_updated_at: new Date().toISOString(),
              has_valid_headline: hasValidHeadline(generalSummary),
            })
            .eq("id", paper.id);

          if (updateError) {
            allResults.push({ id: paper.id, table: "papers", status: `error: ${updateError.message}` });
            totalErrors++;
          } else {
            allResults.push({ id: paper.id, table: "papers", status: "fixed" });
            totalFixed++;
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          allResults.push({ id: paper.id, table: "papers", status: `error: ${msg}` });
          totalErrors++;
          if (msg.includes("429")) break; // stop on rate limit
        }
        await delay(500);
      }
    }
  }

  // ── 2. Fix news with old-format summaries ──────────────────────────────────
  // Same fix as the papers query above: filter server-side on
  // has_valid_headline instead of a recent-published_at window, so this
  // actually works through the ~4,900-record news backlog over successive
  // daily runs instead of only ever seeing (already-fine) recent items.
  {
    const newsLimit = Math.max(limit - totalFixed, 3);

    const { data: newsItems, error: newsError } = await supabase
      .from("news")
      .select("id, title, description, summary_general, source_name, category, has_valid_headline")
      .or("summary_general.is.null,has_valid_headline.eq.false,has_valid_headline.is.null")
      .order("published_at", { ascending: false })
      .limit(newsLimit * 4);

    if (!newsError && newsItems && newsItems.length > 0) {
      const newsToFix = newsItems
        .filter((n) => !n.summary_general || isOldFormatSummary(n.summary_general))
        .slice(0, newsLimit);

      console.log(`[cron/fix-summaries] News to fix: ${newsToFix.length}`);

      for (const item of newsToFix) {
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
          await delay(900);

          const { error: updateError } = await supabase
            .from("news")
            .update({ summary_general: newSummary, has_valid_headline: hasValidHeadline(newSummary) })
            .eq("id", item.id);

          if (updateError) {
            allResults.push({ id: item.id, table: "news", status: `error: ${updateError.message}` });
            totalErrors++;
          } else {
            allResults.push({ id: item.id, table: "news", status: "fixed" });
            totalFixed++;
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          allResults.push({ id: item.id, table: "news", status: `error: ${msg}` });
          totalErrors++;
          if (msg.includes("429")) break; // stop on rate limit
        }
        await delay(500);
      }
    }
  }

  // ── 3. Backfill missing embeddings (independent of summary status) ─────────
  let embeddingsFixed = 0;
  {
    const { data: papers, error } = await supabase
      .from("papers")
      .select("id, title, abstract")
      .is("summary_embedding", null)
      .order("published_at", { ascending: false })
      .limit(EMBED_LIMIT);

    if (!error && papers && papers.length > 0) {
      console.log(`[cron/fix-summaries] Embeddings to backfill: ${papers.length}`);
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
          if (!updateError) embeddingsFixed++;
        } catch (e) {
          console.error(`[cron/fix-summaries] Embedding failed for ${paper.id}:`, e);
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    fixed: totalFixed,
    embeddingsFixed,
    errors: totalErrors,
    results: allResults,
    timestamp: new Date().toISOString(),
  });
}
