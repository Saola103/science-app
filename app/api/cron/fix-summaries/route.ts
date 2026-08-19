/**
 * Vercel Cron Job: Daily Summary Repair
 *
 * Runs after the main collection cron to fix papers/news whose summaries
 * were skipped (null), identical, or in the old non-headline format.
 *
 * Schedule: Runs daily at 09:00 UTC (18:00 JST) — between the two collection crons
 * Configure in vercel.json: { "crons": [{ "path": "/api/cron/fix-summaries", "schedule": "0 9 * * *" }] }
 *
 * Also re-generates old-format news summaries (fixNews=true).
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabase/serviceClient";
import { summarize } from "../../../../lib/llm/summarize";
import { generateText } from "../../../../lib/llm/index";

export const maxDuration = 300;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isOldFormatSummary(summary: string): boolean {
  const firstLine = summary.trim().split("\n")[0].trim();
  const hasJapanese = /[぀-ヿ一-鿿]/.test(firstLine);
  return !hasJapanese || firstLine.length > 40;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const adminPassword = process.env.ADMIN_PASSWORD;

  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const isAuthorized =
    (cronSecret && token === cronSecret) ||
    (adminPassword && token === adminPassword);
  if ((cronSecret || adminPassword) && !isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = 15; // Conservative: ~15k tokens buffer after main cron
  const supabase = getSupabaseServerClient();

  let totalFixed = 0;
  let totalErrors = 0;
  const allResults: { id: string; table: string; status: string }[] = [];

  // ── 1. Fix papers with missing/broken summaries ────────────────────────────
  {
    const { data: papers, error } = await supabase
      .from("papers")
      .select("id, title, abstract, summary_general, summary_expert, source")
      .order("published_at", { ascending: false })
      .limit(limit * 4);

    if (!error && papers && papers.length > 0) {
      const noSummary = papers.filter((p) => !p.summary_general);
      const noExpert = papers.filter((p) => p.summary_general && !p.summary_expert);
      const identical = papers.filter((p) => {
        if (!p.summary_general || !p.summary_expert) return false;
        return p.summary_general.trim().slice(0, 80) === p.summary_expert.trim().slice(0, 80);
      });

      const seen = new Set<string>();
      const papersToFix = [...noSummary, ...noExpert, ...identical]
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
            .update({ summary_general: generalSummary, summary_expert: expertSummary, summary: generalSummary })
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
  {
    const newsLimit = Math.max(limit - totalFixed, 3);

    const { data: newsItems, error: newsError } = await supabase
      .from("news")
      .select("id, title, description, summary_general, source_name, category")
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
            .update({ summary_general: newSummary })
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

  return NextResponse.json({
    success: true,
    fixed: totalFixed,
    errors: totalErrors,
    results: allResults,
    timestamp: new Date().toISOString(),
  });
}
