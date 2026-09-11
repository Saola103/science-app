/**
 * API: Anonymous feedback submission
 * POST /api/feedback
 * Body: { message: string }
 *
 * No user_id, email, or session_id is stored — fully anonymous by design.
 * See supabase/migrations/005_feedback.sql for the table/RLS shape.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabase/serviceClient";
import { checkRateLimit, getClientIp } from "../../../lib/rateLimit";

const MAX_MESSAGE_LENGTH = 1000;

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (!checkRateLimit(`feedback:${ip}`, 5, 60_000)) {
      return NextResponse.json({ error: "rate limited" }, { status: 429 });
    }

    const { message } = await req.json();

    if (typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: "message too long" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { error } = await supabase.from("feedback").insert({ message: message.trim() });

    if (error) {
      console.error("[Feedback API] DB error:", error.message);
      return NextResponse.json({ error: "failed to save" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Feedback API] Error:", error);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
