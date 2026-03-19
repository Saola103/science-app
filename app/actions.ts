"use server";

import { getSupabaseServerClient } from "../lib/supabase/serviceClient";
import { findSimilarPapers } from "../lib/supabase/vectorSearch";

export async function fetchLatestPapers(limit = 10, categories?: string[]) {
    console.log("[fetchLatestPapers] Fetching, limit:", limit, "categories:", categories);
    const supabase = getSupabaseServerClient();

    let query = supabase
        .from("papers")
        .select("id, title, journal, url, published_at, summary, summary_general, summary_expert, image_url, source")
        .order("published_at", { ascending: false });

    // Simple personalization: Filter by categories if provided
    if (categories && categories.length > 0 && !categories.includes("all")) {
        const filters = categories.map(cat => `title.ilike.%${cat}%,abstract.ilike.%${cat}%`).join(",");
        query = query.or(filters);
    }

    const { data, error } = await query.limit(limit);

    if (error) {
        console.error("[fetchLatestPapers] Error:", error.message);
        throw new Error(`Failed to fetch papers: ${error.message}`);
    }

    return data;
}

/**
 * Fetch papers based on user's bookmarked papers using vector similarity.
 * Uses pgvector to find semantically similar papers to the user's bookmarks.
 */
export async function fetchRecommendedPapers(userId: string, limit = 5) {
    const supabase = getSupabaseServerClient();

    // 1. Get user's bookmarks
    const { data: bookmarks, error: bError } = await supabase
        .from("bookmarks")
        .select("paper_id")
        .eq("user_id", userId);

    if (bError || !bookmarks || bookmarks.length === 0) {
        return fetchLatestPapers(limit);
    }

    const bookmarkedIds = bookmarks.map(b => b.paper_id);

    // 2. Try vector similarity search using the most recent bookmark as seed
    try {
        const recentBookmarkId = bookmarkedIds[0];
        const similarPapers = await findSimilarPapers(recentBookmarkId, limit + bookmarkedIds.length, 0.3);

        // Filter out already bookmarked papers
        const bookmarkSet = new Set(bookmarkedIds);
        const filtered = similarPapers.filter(p => !bookmarkSet.has(p.id));

        if (filtered.length >= 3) {
            return filtered.slice(0, limit);
        }
    } catch (e) {
        console.warn("[fetchRecommendedPapers] Vector search failed, falling back to journal-based:", e);
    }

    // 3. Fallback: journal-based similarity
    const { data: seedPapers } = await supabase
        .from("papers")
        .select("title, journal")
        .in("id", bookmarkedIds.slice(0, 3));

    if (!seedPapers || seedPapers.length === 0) return fetchLatestPapers(limit);

    const journals = Array.from(new Set(seedPapers.map(p => p.journal).filter(Boolean)));

    const { data: recommendations, error: rError } = await supabase
        .from("papers")
        .select("id, title, journal, url, published_at, summary, summary_general, summary_expert, image_url, source")
        .not("id", "in", `(${bookmarkedIds.join(",")})`)
        .or(journals.length > 0 ? `journal.in.(${journals.map(j => `"${j}"`).join(",")})` : 'id.neq.0')
        .order("published_at", { ascending: false })
        .limit(limit);

    if (rError || !recommendations || recommendations.length === 0) {
        return fetchLatestPapers(limit);
    }

    return recommendations;
}
