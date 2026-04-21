import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabase/serviceClient";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("papers")
    .select("id, title, abstract, summary_general, summary_expert, category, published_at, url, authors, source, image_url")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
