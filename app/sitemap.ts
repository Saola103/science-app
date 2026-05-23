/**
 * Dynamic Sitemap — app/sitemap.ts
 *
 * Next.js 13+ App Router: この関数が /sitemap.xml を自動生成する。
 * Googleに最新論文ページをインデックスさせるための重要なSEOファイル。
 *
 * Google Search Console でこのサイトマップを登録してください:
 *   https://scienceapp-alpha.vercel.app/sitemap.xml
 */

import { MetadataRoute } from "next";
import { getSupabaseServerClient } from "../lib/supabase/serviceClient";

const BASE_URL = "https://scienceapp-alpha.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/ja`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/ja/feed`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/ja/search`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/ja/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/ja/privacy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/ja/terms`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  // Dynamic paper pages — fetch latest 200 papers from DB
  let paperRoutes: MetadataRoute.Sitemap = [];
  try {
    const supabase = getSupabaseServerClient();
    const { data: papers } = await supabase
      .from("papers")
      .select("id, published_at")
      .order("published_at", { ascending: false })
      .limit(200);

    if (papers) {
      paperRoutes = papers.map((p) => ({
        url: `${BASE_URL}/ja/paper?id=${encodeURIComponent(p.id)}`,
        lastModified: p.published_at ? new Date(p.published_at) : new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.8,
      }));
    }
  } catch {
    // Fail gracefully — sitemap still returns static routes
    console.warn("[sitemap] Could not fetch papers from DB");
  }

  return [...staticRoutes, ...paperRoutes];
}
