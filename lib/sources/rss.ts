/**
 * RSS Feed News Fetcher
 *
 * Fetches science news from free, open RSS feeds — no API key required.
 * Used by the daily collection pipeline to populate the news table.
 */

export type RSSNewsArticle = {
  id: string;
  title: string;
  description: string;
  url: string;
  image_url: string | null;
  published_at: string;
  source_name: string;
  category: string;
};

const RSS_FEEDS: { url: string; source: string; category: string }[] = [
  // ── 既存（実績あり）──────────────────────────────────────────────────────
  {
    url: "https://www.sciencedaily.com/rss/all.xml",
    source: "Science Daily",
    category: "general",
  },
  {
    url: "https://phys.org/rss-feed/",
    source: "Phys.org",
    category: "physics",
  },
  {
    url: "https://feeds.feedburner.com/NASABreakingNews",
    source: "NASA",
    category: "astronomy",
  },

  // ── 追加：海外プレスリリース・ニュース（著作権フリー or 公開情報）────────
  // EurekAlert! 生物・生化学（大学・研究機関が配信するプレスリリース）
  {
    url: "https://www.eurekalert.org/rss/biology_biochemistry.xml",
    source: "EurekAlert",
    category: "biology",
  },
  // EurekAlert! AI・テクノロジー
  {
    url: "https://www.eurekalert.org/rss/technology_engineering.xml",
    source: "EurekAlert",
    category: "it_ai",
  },
  // EurekAlert! 医学・健康
  {
    url: "https://www.eurekalert.org/rss/medical.xml",
    source: "EurekAlert",
    category: "medicine",
  },
  // Space.com 宇宙ニュース
  {
    url: "https://www.space.com/feeds/all",
    source: "Space.com",
    category: "astronomy",
  },
  // Live Science（総合科学ニュース）
  {
    url: "https://www.livescience.com/feeds/all",
    source: "Live Science",
    category: "general",
  },
  // Science News（週刊誌系、高品質）
  {
    url: "https://www.sciencenews.org/feed",
    source: "Science News",
    category: "general",
  },

  // ── 追加：日本の科学機関（研究成果プレスリリース）────────────────────────
  // 理化学研究所 (RIKEN)
  {
    url: "https://www.riken.jp/medialibrary/riken/pr/news/rss.xml",
    source: "RIKEN",
    category: "biology",
  },
  // 国立天文台 (NAOJ)
  {
    url: "https://www.nao.ac.jp/rss-news.xml",
    source: "国立天文台",
    category: "astronomy",
  },

  // ── 追加：高品質英語メディア（無料・APIキー不要）────────────────────────
  // Quanta Magazine（数学・物理・生物を最高品質で解説）
  {
    url: "https://www.quantamagazine.org/feed/",
    source: "Quanta Magazine",
    category: "general",
  },
  // MIT News Research（MITの研究プレスリリース）
  {
    url: "http://news.mit.edu/rss/research",
    source: "MIT News",
    category: "general",
  },
  // Ars Technica Science（テック×科学ニュース、高品質）
  {
    url: "https://feeds.arstechnica.com/arstechnica/science",
    source: "Ars Technica",
    category: "it_ai",
  },
  // NSF News（米国国立科学財団、政府機関・完全無料）
  {
    url: "https://new.nsf.gov/feeds/news",
    source: "NSF",
    category: "general",
  },
  // CERN News（素粒子物理学・加速器実験）
  {
    url: "https://home.cern/news/rss.xml",
    source: "CERN",
    category: "physics",
  },
  // ScienceAlert（人気科学ニュース、平易な解説）
  {
    url: "https://www.sciencealert.com/feed",
    source: "ScienceAlert",
    category: "general",
  },
  // Smithsonian Magazine Science & Nature
  {
    url: "https://www.smithsonianmag.com/rss/science-nature/",
    source: "Smithsonian",
    category: "general",
  },
  // EarthSky（天文・地球科学・気候）
  {
    url: "https://earthsky.org/feed",
    source: "EarthSky",
    category: "astronomy",
  },
  // New Atlas（新技術・AI・ロボット・医療機器）
  {
    url: "https://newatlas.com/index.rss",
    source: "New Atlas",
    category: "it_ai",
  },
];

/** Deterministic ID from URL */
function urlToId(url: string): string {
  let hash = 5381;
  for (let i = 0; i < url.length; i++) {
    hash = (hash * 33) ^ url.charCodeAt(i);
  }
  return "rss-" + Math.abs(hash >>> 0).toString(36);
}

/** Extract content from CDATA or plain text tags */
function extractCDATA(raw: string): string {
  const cdata = raw.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  if (cdata) return cdata[1].trim();
  return raw.replace(/<[^>]+>/g, "").trim();
}

/** Extract the first occurrence of a tag's content */
function getTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = xml.match(re);
  return m ? extractCDATA(m[1]) : "";
}

/** Try to extract an image URL from a feed item */
function extractImage(item: string): string | null {
  // media:content url="..."
  const media = item.match(/media:content[^>]+url="([^"]+)"/i);
  if (media) return media[1];

  // enclosure url="..."
  const enclosure = item.match(/enclosure[^>]+url="([^"]+\.(?:jpg|jpeg|png|gif|webp)[^"]*)"/i);
  if (enclosure) return enclosure[1];

  // img src in description
  const img = item.match(/<img[^>]+src="([^"]+)"/i);
  if (img) return img[1];

  return null;
}

async function parseFeed(
  feedUrl: string,
  sourceName: string,
  category: string,
  maxItems = 5
): Promise<RSSNewsArticle[]> {
  try {
    const res = await fetch(feedUrl, {
      headers: { "User-Agent": "PocketDive_Bot/1.0 (https://pocket-dive.app)" },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();

    const articles: RSSNewsArticle[] = [];
    const itemRe = /<item>([\s\S]*?)<\/item>/g;
    let match: RegExpExecArray | null;
    let count = 0;

    while ((match = itemRe.exec(xml)) !== null && count < maxItems) {
      const item = match[1];
      const title = getTag(item, "title");
      const rawLink = getTag(item, "link") || getTag(item, "guid");
      const url = rawLink.startsWith("http") ? rawLink : "";
      const description = getTag(item, "description").slice(0, 600);
      const pubDate = getTag(item, "pubDate") || getTag(item, "dc:date");
      const image = extractImage(item);

      if (title && url) {
        const published = pubDate
          ? new Date(pubDate).toISOString()
          : new Date().toISOString();

        articles.push({
          id: urlToId(url),
          title,
          description,
          url,
          image_url: image,
          published_at: published,
          source_name: sourceName,
          category,
        });
        count++;
      }
    }

    return articles;
  } catch (err) {
    console.warn(`[RSS] Failed to fetch ${feedUrl}:`, err);
    return [];
  }
}

/**
 * Fetch recent science news from all configured RSS feeds.
 * Returns up to 5 articles per feed, sorted newest-first.
 * Fails gracefully — returns empty array if all feeds fail.
 */
export async function fetchScienceNewsFromRSS(): Promise<RSSNewsArticle[]> {
  const settled = await Promise.allSettled(
    RSS_FEEDS.map((f) => parseFeed(f.url, f.source, f.category, 5))
  );

  const articles: RSSNewsArticle[] = [];
  for (const r of settled) {
    if (r.status === "fulfilled") articles.push(...r.value);
  }

  // Deduplicate by id, sort by date
  const seen = new Set<string>();
  return articles
    .filter((a) => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    })
    .sort(
      (a, b) =>
        new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
    );
}
