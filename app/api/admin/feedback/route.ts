import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabase/serviceClient";
import { rejectUnlessAdmin } from "../../../../lib/auth/adminAuth";
import { readJsonLimited } from "../../../../lib/api/readJson";

export async function POST(req: NextRequest) {
  try {
    // R1-05: 合言葉は本文のpasswordで受ける設計のため、本文を読む必要がある。
    // 32KB制限つきで読み、不正JSON・null・非オブジェクトは400(500にしない)。
    // 認証が通るまでDBには触れない。
    const parsed = await readJsonLimited(req);
    if (parsed.status) {
      return NextResponse.json({ error: parsed.status === 413 ? "payload too large" : "invalid json" }, { status: parsed.status });
    }
    const b = parsed.body as { password?: unknown } | null;
    if (typeof b !== "object" || b === null || Array.isArray(b)) {
      return NextResponse.json({ error: "invalid body" }, { status: 400 });
    }

    const denied = rejectUnlessAdmin(req, typeof b.password === "string" ? b.password : null);
    if (denied) return denied;

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
