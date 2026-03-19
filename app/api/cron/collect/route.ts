/**
 * Vercel Cron Job: Daily Paper Collection
 *
 * Automatically fetches papers from arXiv and PubMed,
 * generates AI summaries (general + expert),
 * creates vector embeddings, and stores everything in Supabase.
 *
 * Schedule: Runs daily at 06:00 UTC (15:00 JST)
 * Configure in vercel.json: { "crons": [{ "path": "/api/cron/collect", "schedule": "0 6 * * *" }] }
 *
 * Can also be triggered manually with the correct CRON_SECRET.
 */

import { NextRequest, NextResponse } from "next/server";
import { runCollectionPipeline } from "../../../../lib/pipeline/collect";

export const maxDuration = 300; // 5 minutes max for Vercel Pro

export async function GET(req: NextRequest) {
  // Verify the request is from Vercel Cron or has the correct secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Vercel Cron sends the secret in the Authorization header
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runCollectionPipeline();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    console.error("[Cron] Collection pipeline failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
