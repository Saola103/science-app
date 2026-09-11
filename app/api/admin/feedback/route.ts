import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabase/serviceClient";
import { isAuthorizedAdmin } from "../../../../lib/auth/adminAuth";

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    if (!isAuthorizedAdmin(typeof password === "string" ? password : null)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseServerClient();

    // 来た順（古い→新しい）で並べる
    const { data, error } = await supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({ feedback: data });
  } catch (error) {
    console.error("Admin Feedback API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
