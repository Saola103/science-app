import { NextRequest, NextResponse } from "next/server";
import { embedText } from "@/lib/llm/index";
import { getSupabaseClient } from "@/lib/supabase/client";

export async function POST(req: NextRequest) {
    try {
        const { query, limit = 10 } = await req.json();

        if (!query || typeof query !== "string") {
            return NextResponse.json(
                { error: "Query is required" },
                { status: 400 }
            );
        }

        // 検索クエリをベクトル化
        const queryEmbedding = await embedText(query);

        // Supabase クライアントを取得
        const supabase = getSupabaseClient();

        // RPC match_papers を呼び出して類似論文を取得
        const { data: papers, error } = await supabase.rpc("match_papers", {
            query_embedding: queryEmbedding,
            match_threshold: 0.5, // 類似度のしきい値（適宜調整）
            match_count: limit,
        });

        if (error) {
            console.error("Supabase RPC error:", error);
            return NextResponse.json(
                { error: "Failed to fetch matching papers" },
                { status: 500 }
            );
        }

        return NextResponse.json({ papers });
    } catch (error) {
        console.error("Search API error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
