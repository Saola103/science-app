import { MetadataRoute } from "next";

const BASE_URL = "https://scienceapp-alpha.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Disallow API routes and internal paths from indexing
        disallow: ["/api/", "/_next/", "/api/cron/"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
