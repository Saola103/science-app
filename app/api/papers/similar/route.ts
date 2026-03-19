/**
 * API: Find similar papers using vector search
 * POST /api/papers/similar
 * Body: { paperId: string } or { query: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { findSimilarPapers, searchPapersByVector } from "../../../../lib/supabase/vectorSearch";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.paperId) {
      const results = await findSimilarPapers(body.paperId, body.limit || 5);
      return NextResponse.json({ papers: results });
    }

    if (body.query) {
      const results = await searchPapersByVector(body.query, body.limit || 10, body.threshold || 0.3);
      return NextResponse.json({ papers: results });
    }

    return NextResponse.json({ error: "paperId or query is required" }, { status: 400 });
  } catch (error) {
    console.error("[Similar Papers API] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
