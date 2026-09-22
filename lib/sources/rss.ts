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
  // EurekAlert!の3フィード(biology_biochemistry/technology_engineering/medical)は
  // 2026-09-22時点でURL自体が404(RSS配信を廃止した可能性、ホームページにも
  // RSSの案内が見当たらない)。同じ「大学・研究機関のプレスリリースを配信する」
  // 趣旨に近い、Science X Network系列の姉妹サイトに差し替えた(実際にfetchして
  // item取得を確認済み)。
  // Phys.org 生物学ニュース（旧EurekAlert biology_biochemistry の代替）
  {
    url: "https://phys.org/rss-feed/biology-news/",
    source: "Phys.org",
    category: "biology",
  },
  // TechXplore（Phys.org姉妹サイト、旧EurekAlert technology_engineering の代替）
  {
    url: "https://techxplore.com/rss-feed/",
    source: "TechXplore",
    category: "it_ai",
  },
  // Medical Xpress（Phys.org姉妹サイト、旧EurekAlert medical の代替）
  {
    url: "https://medicalxpress.com/rss-feed/",
    source: "Medical Xpress",
    category: "medicine",
  },
  // Space.com 宇宙ニュース
  // 2026-09-22時点: URL自体はspace.com公式サイトの<link rel="alternate">タグが
  // 今も案内している正しいフィードだが、フィード自体が空(<title>Latest from
  // null</title>、item 0件)を返す状態を確認。Space.com側のサイト不具合と
  // 思われ、他の代替パス(/feeds/all/news 等)も同様に空だったため、URLは
  // そのまま維持し、復旧を待つ形で残す(★要継続監視、他に生きている
  // 同等の宇宙ニュース専門フィードが見つからなかったため除外はしていない)。
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
  // 理化学研究所 (RIKEN) — 2026-09-22時点でURL自体が404。サイト内・ホームページ
  // いずれにもRSS配信の案内(<link rel="alternate" type=".../+xml">)が見当たらず、
  // 代替の公式RSS URLも見つからなかったため、一旦リストから除外した(★申し送り:
  // RIKENは日本語の研究プレスリリースを配信する唯一のソースだったため、復旧時は
  // 再度公式サイトを確認のこと。RSS自体を廃止した可能性が高い)。
  //
  // 国立天文台 (NAOJ) — 2026-09-22時点で旧URL(rss-news.xml)は404。公式サイトは
  // 現在Atom形式(https://www.nao.ac.jp/atom.xml、20件確認)のみ配信しており、
  // このファイルのparseFeed()は<item>タグ(RSS 2.0)のみを解釈するため、Atom形式の
  // <entry>タグには対応していない。URLを差し替えるだけではitem 0件のままになる
  // ため、今回は除外した(★申し送り: Atom形式のパース対応(<entry>/<summary>/
  // <link href="...">等の解釈追加)を行えば復旧可能。日本語の天文ニュースソースが
  // 手薄になるため、対応の優先度は高めに検討する価値がある)。

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
  // 旧URL(new.nsf.gov/feeds/news)は2026-09-22時点で404(NSFがドメイン・パス構成を
  // 変更したため)。公式サイトの<link rel="alternate">が案内する新URLに差し替え済み
  // (実際にfetchして15件取得できることを確認)。
  {
    url: "https://www.nsf.gov/rss/rss_www_news.xml",
    source: "NSF",
    category: "general",
  },
  // CERN News（素粒子物理学・加速器実験）
  // 旧URL(home.cern/news/rss.xml)は2026-09-22時点で404。公式サイトの
  // <link rel="alternate">が案内する新URL(WordPress標準のfeed URL)に差し替え済み
  // (実際にfetchして10件取得できることを確認)。
  {
    url: "https://home.cern/feed/",
    source: "CERN",
    category: "physics",
  },
  // ScienceAlert は2026-09-22時点でUser-Agentによらず常時403(Bot対策によるブロック
  // と思われ、URL変更では復旧不可)。同じく「平易な解説の人気科学ニュース」という
  // 趣旨が近く、実際にfetchしてitem取得を確認できたPopular Scienceに差し替えた。
  {
    url: "https://www.popsci.com/feed/",
    source: "Popular Science",
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

  // ── 追加：手薄な分野を埋める新規収集元（Col調査 2026-09-22、Devが再fetchして
  // 動作を二重確認済み。Mongabay Newsはライセンス上の懸念(CC BY-ND=改変不可が
  // AI日本語要約と抵触する可能性、Leg確認待ち)のため今回は含めていない）───────
  // Phys.org Chemistry News（化学。既存フィードにはchemistry専門ソースが0件だった）
  {
    url: "https://phys.org/rss-feed/chemistry-news/",
    source: "Phys.org",
    category: "chemistry",
  },
  // Phys.org Earth Science News（地球科学・環境。既存フィードは天文寄りで手薄だった）
  {
    url: "https://phys.org/rss-feed/earth-news/",
    source: "Phys.org",
    category: "climate",
  },
  // Neuroscience News（神経科学。既存フィードには専門ソースが0件だった）
  {
    url: "https://neurosciencenews.com/feed/",
    source: "Neuroscience News",
    category: "neuroscience",
  },
  // PsyPost（心理学。既存フィードには専門ソースが0件だった）
  {
    url: "https://www.psypost.org/feed/",
    source: "PsyPost",
    category: "psychology",
  },
  // Universe Today（天文。既存4件と切り口が異なる学術寄りの天文ニュース）
  {
    url: "https://www.universetoday.com/feed/",
    source: "Universe Today",
    category: "astronomy",
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
