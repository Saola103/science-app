"use server";

import { getSupabaseServerClient } from "@/lib/supabase/serviceClient";

export async function fetchLatestPapers(limit = 10) {
    console.log("[fetchLatestPapers] Starting fetch, limit:", limit);
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
        .from("papers")
        .select("id, title, journal, url, published_at, summary, summary_general, summary_expert")
        .order("published_at", { ascending: false })
        .limit(limit);

    if (error) {
        console.error("[fetchLatestPapers] Error:", error.message);
        throw new Error(`Failed to fetch papers: ${error.message}`);
    }

    console.log("[fetchLatestPapers] Success, rows:", data?.length);
    return data;
}
