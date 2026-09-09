/**
 * Admin API: Re-generate summaries for recent papers/news that have poor/missing summaries.
 *
 * GET /api/admin/fix-summaries?secret=CRON_SECRET&limit=20&source=bioRxiv
 * GET /api/admin/fix-summaries?secret=CRON_SECRET&limit=30&fixNews=true
 *
 * Papers: Finds entries where summary_general is null, summary_expert is null,
 * or both summaries are identical. Re-generates both with the improved prompts.
 *
 * News (fixNews=true): Finds news items whose summary_general lacks a short
 * Japanese headline on the first line (old format). Re-generates summary_general only.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabase/serviceClient";
import { summarize } from "../../../../lib/llm/summarize";
import { generateText } from "../../../../lib/llm/index";
import { isAuthorizedAdmin } from "../../../../lib/auth/adminAuth";

export const maxDuration = 300;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Returns true if summary does NOT start with a short Japanese headline */
function isOldFormatSummary(summary: string): boolean {
  const firstLine = summary.trim().split("\n")[0].trim();
  const hasJapanese = /[぀-ヿ一-鿿]/.test(firstLine);
  return !hasJapanese || firstLine.length > 40;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (!isAuthorizedAdmin(searchParams.get("secret"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
  const sourceFilter = searchParams.get("source"); // e.g. "bioRxiv" or "arXiv"
  const fixNews = searchParams.get("fixNews") === "true";

  const supabase = getSupabaseServerClient();

  let totalFixed = 0;
  let totalErrors = 0;
  const allResults: { id: string; table: string; status: string }[] = [];

  // ── 1. Fix papers ──────────────────────────────────────────────────────────
  {
    let query = supabase
      .from("papers")
      .select("id, title, abstract, summary_general, summary_expert, source")
      .order("published_at", { ascending: false })
      .limit(limit * 4);

    if (sourceFilter) {
      query = query.eq("source", sourceFilter);
    }

    const { data: papers, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const papersList = papers ?? [];

    const noSummary = papersList.filter((p) => !p.summary_general);
    const noExpert = papersList.filter(
      (p) => p.summary_general && !p.summary_expert
    );
    const identical = papersList.filter((p) => {
      if (!p.summary_general || !p.summary_expert) return false;
      const a = p.summary_general.trim().slice(0, 80);
      const b = p.summary_expert.trim().slice(0, 80);
      return a === b;
    });

    const seen = new Set<string>();
    const papersToFix = [...noSummary, ...noExpert, ...identical]
      .filter((p) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      })
      .slice(0, limit);

    console.log(
      `[fix-summaries] Papers: ${papersToFix.length} to fix (noSummary=${noSummary.length}, noExpert=${noExpert.length}, identical=${identical.length}) of ${papersList.length} checked`
    );

    for (const paper of papersToFix) {
      const text = paper.abstract || paper.title || "";
      if (!text.trim()) {
        allResults.push({ id: paper.id, table: "papers", status: "skipped (no content)" });
        continue;
      }
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
      }
      await delay(500);
    }
  }

  // ── 2. Fix news (only when fixNews=true) ───────────────────────────────────
  if (fixNews) {
    const newsLimit = Math.max(limit - totalFixed, 5);

    const { data: newsItems, error: newsError } = await supabase
      .from("news")
      .select("id, title, description, summary_general, source_name, category")
      .order("published_at", { ascending: false })
      .limit(newsLimit * 4);

    if (newsError) {
      console.error("[fix-summaries] News query error:", newsError.message);
    } else {
      const newsList = newsItems ?? [];

      const newsToFix = newsList
        .filter((n) => {
          if (!n.summary_general) return true; // no summary at all
          return isOldFormatSummary(n.summary_general); // old format
        })
        .slice(0, newsLimit);

      console.log(
        `[fix-summaries] News: ${newsToFix.length} to fix of ${newsList.length} checked`
      );

      for (const item of newsToFix) {
        const text = item.description || item.title || "";
        if (!text.trim()) {
          allResults.push({ id: item.id, table: "news", status: "skipped (no content)" });
          continue;
        }

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
