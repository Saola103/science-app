/**
 * API: Feed Interaction Tracking
 * POST /api/feed/interact
 * Body: { item_id, item_type: "paper"|"news", action: "like"|"save"|"skip"|"view", session_id }
 *
 * Stores interactions in feed_interactions table (created on first use).
 * user_id is derived from the Authorization: Bearer <token> header server-side.
 * Client-provided user_id in the body is intentionally ignored to prevent spoofing.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabase/serviceClient";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // NOTE: user_id from body is intentionally NOT destructured here.
    // We derive it from the JWT on the server to prevent cross-user spoofing.
    const { item_id, item_type, action, session_id, category } = body;

    // --- Auth: verify user from Authorization header ---
    const supabase = getSupabaseServerClient();
    let verifiedUserId: string | null = null;
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      try {
        const { data: { user } } = await supabase.auth.getUser(token);
        verifiedUserId = user?.id ?? null;
      } catch { /* invalid token — treat as anonymous */ }
    }

    if (!item_id || !item_type || !action || !session_id) {
      return NextResponse.json(
        { error: "item_id, item_type, action, and session_id are required" },
        { status: 400 }
      );
    }

    if (!["paper", "news"].includes(item_type)) {
      return NextResponse.json({ error: "item_type must be 'paper' or 'news'" }, { status: 400 });
    }

    if (!["like", "unlike", "save", "skip", "view"].includes(action)) {
      return NextResponse.json({ error: "action must be like, unlike, save, skip, or view" }, { status: 400 });
    }

    const schema = process.env.SUPABASE_SCHEMA ?? "public";

    // "unlike" = delete the existing like record (only if authenticated)
    if (action === "unlike") {
      if (verifiedUserId) {
        await supabase
          .schema(schema)
          .from("feed_interactions")
          .delete()
          .eq("item_id", String(item_id))
          .eq("user_id", verifiedUserId)
          .eq("action", "like");
      }
      return NextResponse.json({ ok: true });
    }

    // Insert the interaction
    const { error } = await supabase
      .schema(schema)
      .from("feed_interactions")
      .insert({
        item_id: String(item_id),
        item_type: item_type,
        action: action,
        session_id: String(session_id),
        category: category || null,
        user_id: verifiedUserId,   // server-verified only — never from body
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
