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
import { getCollectionHealth, type CollectionHealth } from "../../../../lib/health/collectionHealth";
import { formatCollectionMessage, sendDiscord } from "../../../../lib/notify/discord";
import { bearerToken, rejectUnlessAdmin } from "../../../../lib/auth/adminAuth";

export const maxDuration = 300; // 5 minutes max for Vercel Pro

// Owner-approved temporary pause (2026-09-22): prioritize clearing the
// prompt-rewrite backfill backlog (cron/backfill-prompts) over new
// collection for a few days, so backfill can use nearly the whole day's
// 200k Groq token budget instead of competing with collection for it. This
// is a date guard inside the route rather than removing the vercel.json
// cron entries, specifically so collection resumes automatically at the
// cutoff with no manual step (Vercel keeps calling this route on its normal
// schedule the whole time; this just no-ops until the cutoff).
// 2026-09-25 00:00 JST === 2026-09-24T15:00:00Z.
const COLLECTION_PAUSED_UNTIL = new Date("2026-09-24T15:00:00Z");

export async function GET(req: NextRequest) {
  // Verify the request is from Vercel Cron (Bearer CRON_SECRET) or a manual
  // trigger (Bearer ADMIN_PASSWORD). Fails closed if neither secret is configured.
  const denied = rejectUnlessAdmin(req, bearerToken(req.headers.get("authorization")));
  if (denied) return denied;

  if (new Date() < COLLECTION_PAUSED_UNTIL) {
    console.log(
      `[Cron] Collection is temporarily paused (backfill priority) until ${COLLECTION_PAUSED_UNTIL.toISOString()} — skipping this run.`
    );
    return NextResponse.json({
      success: true,
      skipped: "collection temporarily paused to prioritize prompt-rewrite backfill",
      resumesAt: COLLECTION_PAUSED_UNTIL.toISOString(),
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const result = await runCollectionPipeline();

    // Optional Discord summary. Skipped entirely (no DB read) when the
    // webhook is not configured; any failure here is swallowed.
    if (process.env.DISCORD_WEBHOOK_URL) {
      try {
        let health: CollectionHealth | null = null;
        try {
          health = await getCollectionHealth();
        } catch (e) {
          console.warn("[Cron] health check for notification failed:", e);
        }
        await sendDiscord(formatCollectionMessage(result, health));
      } catch {
        /* never fail the cron because of a notification */
      }
    }

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
