// R1-03: "use server" は付けない。app/page.tsx(サーバーコンポーネント)から直接呼ぶだけなので、
// 付けると公開Server Action(外部から呼べるPOST受け口)になってしまう。

import { getSupabaseServerClient } from "../lib/supabase/serviceClient";
import { NewsCardData } from "../components/NewsCard";
import { applyNewsVisibility, applyPaperVisibility } from "../lib/sources/visibility";
import { parseLimit, sanitizeCategory } from "../lib/api/params";
import { buildKeywordOrFilter, tokenizeKeywordQuery } from "../lib/supabase/vectorSearch";

export async function fetchLatestPapers(limit = 10, categories?: string[]) {
    const safeLimit = parseLimit(limit, 10, 1, 50);
    const supabase = getSupabaseServerClient();

    let query = applyPaperVisibility(
        supabase
            .from("papers")
            .select("id, title, journal, url, published_at, summary, summary_general, summary_expert, source, category, image_url")
    ) // G4: 許可リスト+ライセンス(共通関数)
        .order("published_at", { ascending: false });

    // Simple personalization: Filter by categories if provided.
    // R1-03: 入力は無害化してから .or() に入れる(トークン化はキーワード検索と同じ)
    if (Array.isArray(categories) && categories.length > 0 && !categories.includes("all")) {
        const tokens = [...new Set(categories.slice(0, 10).flatMap((c) => tokenizeKeywordQuery(String(sanitizeCategory(String(c)) ?? ""))))];
        if (tokens.length > 0) {
            query = query.or(buildKeywordOrFilter(tokens, ["title", "abstract"]));
        }
    }

    const { data, error } = await query.limit(safeLimit);

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

  const { data, error } = await applyNewsVisibility(
    supabase
      .from("news")
      .select("id, title, url, published_at, description, summary_general, source_name, category")
  ) // G4: 許可した情報源のみ(共通関数)
    .order("published_at", { ascending: false })
    .limit(parseLimit(limit, 6, 1, 50));

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
