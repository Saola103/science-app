/**
 * API: Anonymous feedback submission
 * POST /api/feedback
 * Body: { message: string }
 *
 * No user_id, email, or session_id is stored — fully anonymous by design.
 *
 * Two independent sinks, either of which is enough for the request to
 * succeed:
 *  - Google Sheets, via a Google Apps Script Web App URL in
 *    FEEDBACK_SHEET_WEBHOOK_URL (see docs/feedback-sheet-setup.md). This is
 *    the primary way to *read* feedback day-to-day — no admin password, no
 *    Supabase dashboard, just open the spreadsheet.
 *  - Supabase `feedback` table (see supabase/migrations/005_feedback.sql),
 *    kept as a durable backup / for the admin dashboard fallback.
 * Failures in either sink are logged but non-fatal to the other.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabase/serviceClient";
import { checkRateLimit, getClientIp } from "../../../lib/rateLimit";

const MAX_MESSAGE_LENGTH = 1000;
const SHEET_WEBHOOK_TIMEOUT_MS = 8000;

async function sendToSheet(message: string): Promise<boolean> {
  const url = process.env.FEEDBACK_SHEET_WEBHOOK_URL;
  if (!url) return false;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SHEET_WEBHOOK_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, created_at: new Date().toISOString() }),
      signal: controller.signal,
      redirect: "follow",
    });
    return res.ok;
  } catch (err) {
    console.error("[Feedback API] Sheet webhook error:", err);
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function saveToSupabase(message: string): Promise<boolean> {
  try {
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.from("feedback").insert({ message });
    if (error) {
      console.error("[Feedback API] DB error:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[Feedback API] Supabase error:", err);
    return false;
  }
}

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

    const trimmed = message.trim();
    const [sheetOk, dbOk] = await Promise.all([sendToSheet(trimmed), saveToSupabase(trimmed)]);

    if (!sheetOk && !dbOk) {
      return NextResponse.json({ error: "failed to save" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Feedback API] Error:", error);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
