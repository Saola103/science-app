/**
 * API: Science TikTok Feed
 * GET /api/feed?cursor=...&limit=10&preferences={"biology":3}
 *
 * Returns a mixed feed of papers + news, ordered by recency,
 * with optional category-based personalization.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabase/serviceClient";

export const maxDuration = 30;

type FeedItem = {
  id: string;
  type: "paper" | "news";
  title: string;
  title_ja?: string | null;
  summary?: string | null;
  summary_ja?: string | null;
  summary_general?: string | null;
  summary_expert?: string | null;
  summary_general_ja?: string | null;
  category?: string | null;
  published_at?: string | null;
  url?: string | null;
  source?: string | null;
  authors?: string[] | null;
  arxiv_id?: string | null;
  image_url?: string | null;
};

function getCategoryGradient(category?: string | null): string {
  if (!category || category === "general") return "from-indigo-950 via-blue-950 to-slate-900";
  const cat = category.toLowerCase();
  if (cat.includes("neuro") || cat.includes("brain")) return "from-purple-900 via-violet-900 to-indigo-950";
  if (cat.includes("medicine") || cat.includes("health") || cat.includes("disease")) return "from-rose-900 via-red-900 to-pink-950";
  if (cat.includes("bio") || cat.includes("genetics") || cat.includes("cell") || cat.includes("gene")) return "from-emerald-900 via-green-800 to-teal-950";
  if (cat.includes("astro") || cat.includes("space") || cat.includes("cosmos")) return "from-indigo-900 via-blue-900 to-slate-950";
  if (cat.includes("physics")) return "from-blue-900 via-indigo-800 to-violet-950";
  if (cat.includes("math")) return "from-cyan-900 via-blue-900 to-indigo-950";
  if (cat.includes("chem") || cat.includes("material")) return "from-amber-900 via-orange-800 to-red-950";
  if (cat.includes("quantum")) return "from-violet-900 via-purple-800 to-fuchsia-950";
  if (cat.includes("ai") || cat.includes("computer") || cat.includes("machine") || cat.includes("robot")) return "from-violet-900 via-purple-900 to-fuchsia-950";
  if (cat.includes("climate") || cat.includes("ecology") || cat.includes("environment")) return "from-teal-900 via-emerald-800 to-green-950";
  if (cat.includes("energy") || cat.includes("solar")) return "from-yellow-900 via-amber-800 to-orange-950";
  if (cat.includes("psycho") || cat.includes("social") || cat.includes("cognitive")) return "from-pink-900 via-rose-800 to-purple-950";
  return "from-indigo-950 via-blue-950 to-slate-900";
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor"); // ISO timestamp for pagination
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 20);
    const preferencesStr = searchParams.get("preferences");

    let preferences: Record<string, number> = {};
    if (preferencesStr) {
      try {
        preferences = JSON.parse(preferencesStr);
      } catch {
        // ignore invalid preferences
      }
    }

    const supabase = getSupabaseServerClient();

    // Each type gets half the limit so both always appear
    const half = Math.ceil(limit / 2);

    // Fetch papers — arXiv only (PubMed removed: copyright concerns with closed-access abstracts)
    let papersQuery = supabase
      .from("papers")
      .select("id, title, summary, summary_general, summary_expert, category, published_at, url, authors, source, image_url")
      .neq("source", "PubMed")
      .order("published_at", { ascending: false })
      .limit(half);

    if (cursor) {
      papersQuery = papersQuery.lt("published_at", cursor);
    }

    // Fetch news
    let newsQuery = supabase
      .from("news")
      .select("id, title, description, summary_general, category, published_at, url, source_name, image_url")
      .order("published_at", { ascending: false })
      .limit(half);

    if (cursor) {
      newsQuery = newsQuery.lt("published_at", cursor);
    }

    const [papersResult, newsResult] = await Promise.allSettled([papersQuery, newsQuery]);

    const papers: FeedItem[] = [];
    if (papersResult.status === "fulfilled" && papersResult.value.data) {
      for (const p of papersResult.value.data) {
        papers.push({
          id: p.id,
          type: "paper",
          title: p.title,
          summary: p.summary_general || p.summary,
          summary_general: p.summary_general,
          summary_expert: p.summary_expert,
          category: p.category,
          published_at: p.published_at,
          url: p.url,
          authors: Array.isArray(p.authors) ? p.authors : [],
          source: p.source || "arXiv",
          image_url: p.image_url,
        });
      }
    }

    const newsItems: FeedItem[] = [];
    if (newsResult.status === "fulfilled" && newsResult.value.data) {
      for (const n of newsResult.value.data) {
        newsItems.push({
          id: n.id,
          type: "news",
          title: n.title,
          summary: n.summary_general || n.description,
          summary_general: n.summary_general,
          category: n.category,
          published_at: n.published_at,
          url: n.url,
          source: n.source_name,
          image_url: n.image_url,
        });
      }
    }

    // Sort each group by recency independently, then interleave paper/news/paper/news...
    papers.sort((a, b) => new Date(b.published_at ?? 0).getTime() - new Date(a.published_at ?? 0).getTime());
    newsItems.sort((a, b) => new Date(b.published_at ?? 0).getTime() - new Date(a.published_at ?? 0).getTime());

    // Apply personalization: boost preferred categories within each group
    if (Object.keys(preferences).length > 0) {
      const boost = (items: FeedItem[]) =>
        [...items].sort((a, b) => {
          const sa = a.category ? (preferences[a.category.toLowerCase()] ?? 0) : 0;
          const sb = b.category ? (preferences[b.category.toLowerCase()] ?? 0) : 0;
          if (sb !== sa) return sb - sa;
          return new Date(b.published_at ?? 0).getTime() - new Date(a.published_at ?? 0).getTime();
        });
      papers.splice(0, papers.length, ...boost(papers));
      newsItems.splice(0, newsItems.length, ...boost(newsItems));
    }

    // Interleave: paper, news, paper, news...
    const allItems: FeedItem[] = [];
    const maxLen = Math.max(papers.length, newsItems.length);
    for (let i = 0; i < maxLen && allItems.length < limit; i++) {
      if (i < papers.length) allItems.push(papers[i]);
      if (allItems.length < limit && i < newsItems.length) allItems.push(newsItems[i]);
    }

    const resultItems = allItems.map((item) => ({
      ...item,
      gradient: getCategoryGradient(item.category),
    }));

    // Compute next cursor (oldest item's date)
    const nextCursor = resultItems.length > 0
      ? resultItems[resultItems.length - 1].published_at
      : null;

    return NextResponse.json({
      items: resultItems,
      nextCursor,
      hasMore: resultItems.length === limit,
    });
  } catch (error) {
    console.error("[Feed API] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
