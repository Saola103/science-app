"use server";

import { getSupabaseServerClient } from "@/lib/supabase/serviceClient";

export async function fetchLatestPapers(limit = 10) {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
        .from("papers")
        .select("id, title, journal, url, published_at, summary, summary_general, summary_expert")
        .order("published_at", { ascending: false })
        .limit(limit);

    if (error) {
        throw new Error(`Failed to fetch papers: ${error.message}`);
    }

    return data;
}
