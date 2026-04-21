/**
 * Admin API: Re-generate summaries for recent papers that have poor/identical summaries.
 *
 * GET /api/admin/fix-summaries?secret=CRON_SECRET&limit=20&source=bioRxiv
 *
 * Finds papers where summary_expert is null OR summary_expert = summary_general
 * (i.e. same content), then re-generates both with the improved prompts.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabase/serviceClient";
import { summarize } from "../../../../lib/llm/summarize";

export const maxDuration = 300;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && secret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = Math.min(parseInt(searchParams.get("limit") || "15"), 30);
  const sourceFilter = searchParams.get("source"); // e.g. "bioRxiv" or "arXiv"

  const supabase = getSupabaseServerClient();

  // Fetch recent papers
  let query = supabase
    .from("papers")
    .select("id, title, abstract, summary_general, summary_expert, source")
    .order("published_at", { ascending: false })
    .limit(limit * 3); // fetch extra to filter duplicates

  if (sourceFilter) {
    query = query.eq("source", sourceFilter);
  }

  const { data: papers, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!papers || papers.length === 0) {
    return NextResponse.json({ message: "No papers found", fixed: 0 });
  }

  // Filter: only papers where expert is null OR expert === general (identical content)
  const needsFix = papers.filter((p) => {
    if (!p.summary_expert) return true;
    if (!p.summary_general) return true;
    // Check if summaries are too similar (edit distance approximation: long common prefix)
    const a = (p.summary_general || "").trim().slice(0, 80);
    const b = (p.summary_expert || "").trim().slice(0, 80);
    return a === b;
  }).slice(0, limit);

  console.log(`[fix-summaries] Found ${needsFix.length} papers to fix out of ${papers.length} checked`);

  let fixed = 0;
  let errors = 0;
  const results: { id: string; status: string }[] = [];

  for (const paper of needsFix) {
    const textForSummary = paper.abstract || paper.title || "";
    if (!textForSummary.trim()) {
      results.push({ id: paper.id, status: "skipped (no content)" });
      continue;
    }

    try {
      // Re-generate casual summary
      const generalSummary = await summarize(textForSummary, { tone: "casual" });
      await delay(900);

      // Re-generate expert summary
      const expertSummary = await summarize(textForSummary, { tone: "expert" });
      await delay(900);

      // Update in DB
      const { error: updateError } = await supabase
        .from("papers")
        .update({
          summary_general: generalSummary,
          summary_expert: expertSummary,
          summary: generalSummary,
        })
        .eq("id", paper.id);

      if (updateError) {
        console.error(`[fix-summaries] Update failed for ${paper.id}:`, updateError.message);
        results.push({ id: paper.id, status: `error: ${updateError.message}` });
        errors++;
      } else {
        console.log(`[fix-summaries] Fixed: ${paper.id} (${paper.source})`);
        results.push({ id: paper.id, status: "fixed" });
        fixed++;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[fix-summaries] Failed for ${paper.id}:`, msg);
      results.push({ id: paper.id, status: `error: ${msg}` });
      errors++;
    }

    await delay(500);
  }

  return NextResponse.json({
    success: true,
    checked: papers.length,
    needsFix: needsFix.length,
    fixed,
    errors,
    results,
    timestamp: new Date().toISOString(),
  });
}
