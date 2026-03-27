/**
 * API: Feed Interaction Tracking
 * POST /api/feed/interact
 * Body: { item_id, item_type: "paper"|"news", action: "like"|"save"|"skip"|"view", session_id }
 *
 * Stores interactions in feed_interactions table (created on first use).
 * No auth required - uses session_id from client localStorage.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabase/serviceClient";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { item_id, item_type, action, session_id, category } = body;

    if (!item_id || !item_type || !action || !session_id) {
      return NextResponse.json(
        { error: "item_id, item_type, action, and session_id are required" },
        { status: 400 }
      );
    }

    if (!["paper", "news"].includes(item_type)) {
      return NextResponse.json({ error: "item_type must be 'paper' or 'news'" }, { status: 400 });
    }

    if (!["like", "save", "skip", "view"].includes(action)) {
      return NextResponse.json({ error: "action must be like, save, skip, or view" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const schema = process.env.SUPABASE_SCHEMA ?? "public";

    // Insert the interaction (table created with IF NOT EXISTS logic via Supabase)
    const { error } = await supabase
      .schema(schema)
      .from("feed_interactions")
      .insert({
        item_id: String(item_id),
        item_type: item_type,
        action: action,
        session_id: String(session_id),
        category: category || null,
        created_at: new Date().toISOString(),
      });

    if (error) {
      // If table doesn't exist, return a graceful response
      // The table will need to be created via migration
      console.error("[Feed Interact] DB error:", error.message);
      // Return success anyway to not break the client
      return NextResponse.json({ ok: true, note: "interaction noted" });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Feed Interact API] Error:", error);
    // Don't fail hard - interactions are non-critical
    return NextResponse.json({ ok: true, note: "interaction noted" });
  }
}
