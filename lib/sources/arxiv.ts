const ARXIV_API_BASE = "http://export.arxiv.org/api/query";

export type ArxivOpenAccessPaper = {
  id: string;
  title: string;
  abstract?: string;
  authors: string[];
  publishedAt?: string;
  url: string;
  license?: string;
};

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`arXiv API request failed: ${res.status} ${res.statusText}`);
  }
  return await res.text();
}

function extractTag(block: string, tag: string): string | undefined {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = block.match(regex);
  if (!match) return undefined;
  return match[1].trim();
}

function extractAllAuthors(block: string): string[] {
  const authors: string[] = [];
  const authorRegex = /<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/gi;
  let match: RegExpExecArray | null;
  while ((match = authorRegex.exec(block)) !== null) {
    const name = match[1].trim();
    if (name) authors.push(name);
  }
  return authors;
}

/**
 * arXiv からオープンアクセス論文（原則すべて OA）を検索して返す。
 *
 * - `http://export.arxiv.org/api/query?search_query=...` を叩いて Atom フィードを取得
 * - 各 entry から title, id/url, published, summary(abstract), authors を抽出
 * - arXiv 論文は原則 OA なのでライセンスフィルタリングは行わず、`license` は "arXiv OA" として扱う
 */
export async function fetchArxivOpenAccessPapers(
  query: string,
  maxResults: number = 10,
  sortBy: "relevance" | "lastUpdatedDate" | "submittedDate" = "submittedDate",
): Promise<ArxivOpenAccessPaper[]> {
  const params = new URLSearchParams({
    search_query: query.includes(':') ? query : `all:${query}`,
    start: "0",
    max_results: String(maxResults),
    sortBy: sortBy,
    sortOrder: "descending"
  });

  const url = `${ARXIV_API_BASE}?${params.toString()}`;
  const xml = await fetchText(url);

  const entries = xml.split("<entry>").slice(1); // 最初のフィードヘッダ部分をスキップ
  const results: ArxivOpenAccessPaper[] = [];

  for (const rawEntry of entries) {
    const entry = "<entry>" + rawEntry; // パースしやすいようにラップ

    const id = extractTag(entry, "id");
    const titleRaw = extractTag(entry, "title");
    const summaryRaw = extractTag(entry, "summary");
    const publishedRaw = extractTag(entry, "published");
    const authors = extractAllAuthors(entry);

    if (!id || !titleRaw) {
      continue;
    }

    const title = titleRaw.replace(/\s+/g, " ").trim();
    const abstract = summaryRaw ? summaryRaw.replace(/\s+/g, " ").trim() : undefined;
    const publishedAt = publishedRaw?.trim();

    const url = id; // arXiv API の <id> は論文 URL（abs）なのでそのまま採用

    results.push({
      id,
      title,
      abstract,
      authors,
      publishedAt,
      url,
      license: "arXiv OA",
    });
  }

  return results;
}

