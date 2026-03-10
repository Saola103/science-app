
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabase/serviceClient";

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    // 環境変数 ADMIN_PASSWORD と比較
    // 環境変数が設定されていない場合はアクセス不可にする
    const correctPassword = process.env.ADMIN_PASSWORD;

    if (!correctPassword || password !== correctPassword) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseServerClient();
    
    // inquiries テーブルから全件取得（作成日降順）
    const { data, error } = await supabase
      .from("inquiries")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ inquiries: data });
  } catch (error) {
    console.error("Admin API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
