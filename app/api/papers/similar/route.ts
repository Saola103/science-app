/**
 * API: Find similar papers using vector search
 * POST /api/papers/similar
 * Body: { paperId: string, limit?: number (1-10), threshold?: number (0-1) }
 *
 * The free-text `query` mode was removed (2026-10): it called the Gemini
 * embedding API on every request with no per-user cost control, and the UI
 * only ever sends `paperId`. paperId lookups read the stored embedding from
 * the DB and never call an external API.
 */

import { NextRequest, NextResponse } from "next/server";
import { findSimilarPapers } from "../../../../lib/supabase/vectorSearch";
import { checkRateLimit, getClientIp } from "../../../../lib/rateLimit";

const MAX_BODY_BYTES = 32 * 1024;
const MAX_PAPER_ID_LENGTH = 200;

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export async function POST(req: NextRequest) {
  try {
    if (Number(req.headers.get("content-length") || 0) > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }
    // DB-load protection only (no LLM spend); generous because every opened
    // paper detail sheet calls this once.
    if (!checkRateLimit(`similar:${getClientIp(req)}`, 60, 60_000)) {
      return NextResponse.json(
        { error: "リクエストが多すぎます。少し時間をおいてから再度お試しください。" },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    const paperId = body?.paperId;
    if (typeof paperId !== "string" || !paperId || paperId.length > MAX_PAPER_ID_LENGTH) {
      return NextResponse.json({ error: "paperId is required" }, { status: 400 });
    }

    const limit = Math.round(clamp(body.limit, 1, 10, 5));
    const threshold = clamp(body.threshold, 0, 1, 0.4);
    const results = await findSimilarPapers(paperId, limit, threshold);
    return NextResponse.json({ papers: results });
  } catch (error) {
    console.error("[Similar Papers API] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
