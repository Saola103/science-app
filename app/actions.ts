"use server";

import { getSupabaseServerClient } from "../lib/supabase/serviceClient";
import { NewsCardData } from "../components/NewsCard";
import { NEWS_ALLOWED_SOURCES, PAPER_VISIBILITY_OR } from "../lib/sources/policy";

export async function fetchLatestPapers(limit = 10, categories?: string[]) {
    console.log("[fetchLatestPapers] Fetching, limit:", limit, "categories:", categories);
    const supabase = getSupabaseServerClient();

    let query = supabase
        .from("papers")
        .select("id, title, journal, url, published_at, summary, summary_general, summary_expert, source, category, image_url")
        .or(PAPER_VISIBILITY_OR) // G4: bioRxiv/medRxiv は CC BY/CC0 のみ
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
 * Fetch latest news articles from the Supabase news table.
 * Returns empty array if the table doesn't exist yet (before migration).
 */
export async function fetchLatestNews(limit = 6): Promise<NewsCardData[]> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("news")
    .select("id, title, url, published_at, description, summary_general, source_name, category")
    .in("source_name", [...NEWS_ALLOWED_SOURCES]) // G4: 許可した情報源のみ
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) {
    // Table might not exist yet — fail silently
    console.warn("[fetchLatestNews] Could not fetch news:", error.message);
    return [];
  }

  return (data || []).map((item) => ({
    id: item.id,
    title: item.title,
    source: item.source_name ?? null,
    url: item.url ?? null,
    published_at: item.published_at ?? null,
    summary_general: item.summary_general ?? item.description ?? null,
    summary_expert: null,
    image_url: null, // G4: ニュースの外部画像は使わない
    category: item.category ?? null,
  }));
}
