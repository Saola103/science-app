/**
 * API: Get user's liked/saved feed items
 * GET /api/user/interactions?action=like|save
 *
 * Client passes the Supabase access token in Authorization header.
 * Returns the actual paper/news items the user has liked or saved.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "../../../../lib/supabase/serviceClient";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "like";
  const idsOnly = searchParams.get("idsOnly") === "true";

  // Get user from Authorization: Bearer <access_token>
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "").trim();

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify token with Supabase anon client
  const supabaseAnon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  const schema = process.env.SUPABASE_SCHEMA ?? "public";

  const { data: interactions } = await supabase
    .schema(schema)
    .from("feed_interactions")
    .select("item_id, item_type, created_at")
    .eq("user_id", user.id)
    .eq("action", action)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!interactions || interactions.length === 0) {
    return NextResponse.json(idsOnly ? { ids: [] } : { items: [] });
  }

  // idsOnly: just return the list of item IDs (used by feed page to init like state)
  if (idsOnly) {
    return NextResponse.json({ ids: interactions.map(i => i.item_id) });
  }

  const paperIds = interactions.filter(i => i.item_type === "paper").map(i => i.item_id);
  const newsIds  = interactions.filter(i => i.item_type === "news").map(i => i.item_id);
  const results: any[] = [];

  if (paperIds.length > 0) {
    const { data: papers } = await supabase
      .schema(schema)
      .from("papers")
      .select("id, title, summary_general, category, published_at, url, authors, source")
      .in("id", paperIds);
    if (papers) results.push(...papers.map(p => ({ ...p, type: "paper" })));
  }

  if (newsIds.length > 0) {
    const { data: news } = await supabase
      .schema(schema)
      .from("news")
      .select("id, title, summary_general, category, published_at, url, source")
      .in("id", newsIds);
    if (news) results.push(...news.map(n => ({ ...n, type: "news" })));
  }

  const orderMap = new Map(interactions.map((i, idx) => [i.item_id, idx]));
  results.sort((a, b) => (orderMap.get(a.id) ?? 99) - (orderMap.get(b.id) ?? 99));

  return NextResponse.json({ items: results });
}
