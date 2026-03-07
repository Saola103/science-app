import { NextRequest, NextResponse } from "next/server";
import { embedText } from "@/lib/llm/index";
import { getSupabaseServerClient } from "@/lib/supabase/serviceClient";

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
        const supabase = getSupabaseServerClient();

        // RPC match_papers を呼び出して類似論文を取得
        const { data: papers, error } = await supabase.rpc("match_papers", {
            query_embedding: queryEmbedding,
            match_threshold: 0.1, // しきい値を下げてマッチしやすくする
            match_count: limit,
        });

        if (error) {
            console.error("Supabase RPC error (likely function missing):", error.message);
            // Fallback: 簡易的なキーワード検索（タイトルまたは要約）
            const { data: fallbackPapers, error: fallbackError } = await supabase
                .from("papers")
                .select("id, title, journal, url, published_at, summary, summary_general, summary_expert")
                .or(`title.ilike.%${query}%,summary.ilike.%${query}%`)
                .limit(limit);

            if (fallbackError) {
                console.error("Fallback search error:", fallbackError.message);
                return NextResponse.json({ papers: [] });
            }
            return NextResponse.json({ papers: fallbackPapers });
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
