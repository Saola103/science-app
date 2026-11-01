/**
 * GET /api/health/collection -- collection freshness + Groq budget.
 * Not public: requires Authorization: Bearer <CRON_SECRET | ADMIN_PASSWORD>
 * (same check, throttle and fail-closed behaviour as the cron routes).
 */
import { NextRequest, NextResponse } from "next/server";
import { bearerToken, rejectUnlessAdmin } from "../../../../lib/auth/adminAuth";
import { getCollectionHealth } from "../../../../lib/health/collectionHealth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = rejectUnlessAdmin(req, bearerToken(req.headers.get("authorization")));
  if (denied) return denied;

  try {
    const health = await getCollectionHealth();
    return NextResponse.json(health, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[health/collection] failed:", e);
    return NextResponse.json({ error: "Health check failed" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
