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
        let queryEmbedding: number[] = [];
        try {
            queryEmbedding = await embedText(query);
        } catch (embErr) {
            console.error("[Search API] Embedding generation failed:", embErr);
            // embedding失敗時は強制的にフォールバックへ
            throw new Error("EMBEDDING_FAILED");
        }

        // Supabase クライアントを取得
        const supabase = getSupabaseServerClient();

        // RPC match_papers を呼び出して類似論文を取得
        const { data: papers, error } = await supabase.rpc("match_papers", {
            query_embedding: queryEmbedding,
            match_threshold: 0.1,
            match_count: limit,
        });

        if (error) {
            console.error("[Search API] Supabase RPC match_papers error:", error.message, error.details, error.hint);
            // RPCが失敗した場合はフォールバック検索（ilike）を実行
            const { data: fallbackPapers, error: fallbackError } = await supabase
                .from("papers")
                .select("id, title, journal, url, published_at, summary, summary_general, summary_expert")
                .or(`title.ilike.%${query}%,summary.ilike.%${query}%`)
                .order("published_at", { ascending: false })
                .limit(limit);

            if (fallbackError) {
                console.error("[Search API] Fallback search also failed:", fallbackError.message);
                return NextResponse.json({ papers: [], error: "Search failed" });
            }
            return NextResponse.json({ papers: fallbackPapers, warning: "Using keyword search fallback" });
        }

        return NextResponse.json({ papers });
    } catch (error: any) {
        console.error("[Search API] Fatal error:", error);

        // フォールバック（キーワード検索のみ）を試みる（最終手段）
        try {
            const supabase = getSupabaseServerClient();
            const { data } = await supabase
                .from("papers")
                .select("id, title, journal, url, published_at, summary, summary_general, summary_expert")
                .or(`title.ilike.%${req.nextUrl.searchParams.get("query") || ""}%`)
                .limit(10);
            return NextResponse.json({ papers: data || [] });
        } catch (inner) {
            return NextResponse.json({ error: "Search service unavailable" }, { status: 500 });
        }
    }
}
