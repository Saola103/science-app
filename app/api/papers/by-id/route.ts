import { NextRequest, NextResponse } from "next/server";
import { isPaperDisplayable } from "../../../../lib/sources/policy";
import { checkRateLimit, getClientIp } from "../../../../lib/rateLimit";
import { getSupabaseServerClient } from "../../../../lib/supabase/serviceClient";

export async function GET(req: NextRequest) {
  // R1-08: DB負荷対策
  if (!checkRateLimit(`by-id:${getClientIp(req)}`, 60, 60_000)) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("papers")
    .select("id, title, abstract, summary_general, summary_expert, category, published_at, url, authors, source, image_url, license")
    .eq("id", id)
    .single();

  if (error || !data || !isPaperDisplayable(data)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
