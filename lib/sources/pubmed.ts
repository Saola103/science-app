/**
 * PubMed E-utilities API integration
 *
 * Uses the NCBI E-utilities (eSearch + eFetch) to retrieve open-access
 * biomedical literature from PubMed/PMC.
 *
 * Rate limit: max 3 requests/sec without API key, 10/sec with.
 * We add a polite delay between calls.
 */

const ESEARCH_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi";
const EFETCH_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi";
const ESUMMARY_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi";

export type PubMedPaper = {
  id: string;       // PubMed article URL
  pmid: string;
  pmcid?: string;
  title: string;
  abstract?: string;
  authors: string[];
  publishedAt?: string;
  url: string;
  journal?: string;
  license?: string;
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Search PubMed and return PMIDs matching the query
 */
async function searchPubMed(
  query: string,
  maxResults: number = 10,
  sort: "relevance" | "pub_date" = "pub_date"
): Promise<string[]> {
  const params = new URLSearchParams({
    db: "pubmed",
    term: query,
    retmax: String(maxResults),
    retmode: "json",
    sort: sort === "pub_date" ? "pub_date" : "relevance",
  });

  // Add API key if available (increases rate limit)
  const apiKey = process.env.NCBI_API_KEY;
  if (apiKey) params.set("api_key", apiKey);

  const res = await fetch(`${ESEARCH_BASE}?${params.toString()}`);
  if (!res.ok) {
    console.error(`PubMed eSearch failed: ${res.status} ${res.statusText}`);
    return [];
  }

  const data = await res.json();
  return data?.esearchresult?.idlist || [];
}

/**
 * Fetch full article details (abstract, authors, etc.) for given PMIDs
 */
async function fetchPubMedDetails(pmids: string[]): Promise<PubMedPaper[]> {
  if (pmids.length === 0) return [];

  const params = new URLSearchParams({
    db: "pubmed",
    id: pmids.join(","),
    retmode: "xml",
    rettype: "abstract",
  });

  const apiKey = process.env.NCBI_API_KEY;
  if (apiKey) params.set("api_key", apiKey);

  const res = await fetch(`${EFETCH_BASE}?${params.toString()}`);
  if (!res.ok) {
    console.error(`PubMed eFetch failed: ${res.status} ${res.statusText}`);
    return [];
  }

  const xml = await res.text();
  return parsePubMedXml(xml);
}

/**
 * Parse PubMed XML (efetch result) into structured paper objects
 */
function parsePubMedXml(xml: string): PubMedPaper[] {
  const papers: PubMedPaper[] = [];
  const articles = xml.split("<PubmedArticle>").slice(1);

  for (const raw of articles) {
    const article = "<PubmedArticle>" + raw;

    const pmid = extractXmlTag(article, "PMID");
    if (!pmid) continue;

    const title = extractXmlTag(article, "ArticleTitle") || "Untitled";
    const abstractText = extractAbstract(article);
    const authors = extractAuthors(article);
    const journal = extractXmlTag(article, "Title"); // Journal title
    const publishedAt = extractPubDate(article);

    // Try to find PMC ID
    const pmcid = extractArticleId(article, "pmc");

    const url = `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;

    papers.push({
      id: `pubmed:${pmid}`,
      pmid,
      pmcid: pmcid || undefined,
      title: cleanText(title),
      abstract: abstractText ? cleanText(abstractText) : undefined,
      authors,
      publishedAt,
      url,
      journal: journal ? cleanText(journal) : undefined,
      license: pmcid ? "PMC Open Access" : "PubMed",
      source: "PubMed",
    } as PubMedPaper & { source: string });
  }

  return papers;
}

function extractXmlTag(xml: string, tag: string): string | undefined {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = xml.match(regex);
  return match?.[1]?.trim();
}

function extractAbstract(xml: string): string | undefined {
  // PubMed abstracts can have multiple <AbstractText> sections
  const abstractSection = xml.match(/<Abstract>([\s\S]*?)<\/Abstract>/i);
  if (!abstractSection) return undefined;

  const texts: string[] = [];
  const regex = /<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/gi;
  let match;
  while ((match = regex.exec(abstractSection[1])) !== null) {
    texts.push(match[1].trim());
  }

  return texts.length > 0 ? texts.join(" ") : undefined;
}

function extractAuthors(xml: string): string[] {
  const authors: string[] = [];
  const authorList = xml.match(/<AuthorList[^>]*>([\s\S]*?)<\/AuthorList>/i);
  if (!authorList) return authors;

  const authorRegex = /<Author[^>]*>([\s\S]*?)<\/Author>/gi;
  let match;
  while ((match = authorRegex.exec(authorList[1])) !== null) {
    const lastName = extractXmlTag(match[1], "LastName");
    const foreName = extractXmlTag(match[1], "ForeName");
    if (lastName) {
      authors.push(foreName ? `${foreName} ${lastName}` : lastName);
    }
  }

  return authors;
}

function extractPubDate(xml: string): string | undefined {
  // Try ArticleDate first (electronic publication)
  const articleDate = xml.match(/<ArticleDate[^>]*>([\s\S]*?)<\/ArticleDate>/i);
  if (articleDate) {
    const year = extractXmlTag(articleDate[1], "Year");
    const month = extractXmlTag(articleDate[1], "Month");
    const day = extractXmlTag(articleDate[1], "Day");
    if (year) return `${year}-${(month || "01").padStart(2, "0")}-${(day || "01").padStart(2, "0")}`;
  }

  // Fallback to PubDate
  const pubDate = xml.match(/<PubDate>([\s\S]*?)<\/PubDate>/i);
  if (pubDate) {
    const year = extractXmlTag(pubDate[1], "Year");
    const month = extractXmlTag(pubDate[1], "Month");
    if (year) {
      const monthNum = monthToNumber(month || "Jan");
      return `${year}-${monthNum}-01`;
    }
  }

  return undefined;
}

function extractArticleId(xml: string, idType: string): string | null {
  const regex = new RegExp(`<ArticleId\\s+IdType="${idType}"[^>]*>([\\s\\S]*?)<\\/ArticleId>`, "i");
  const match = xml.match(regex);
  return match?.[1]?.trim() || null;
}

function cleanText(text: string): string {
  return text.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function monthToNumber(month: string): string {
  const months: Record<string, string> = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04",
    May: "05", Jun: "06", Jul: "07", Aug: "08",
    Sep: "09", Oct: "10", Nov: "11", Dec: "12",
  };
  return months[month] || month.padStart(2, "0");
}

// --- Public API ---

/**
 * Search PubMed for papers matching a query.
 * Returns fully hydrated paper objects with abstracts.
 */
export async function fetchPubMedPapers(
  query: string,
  maxResults: number = 10,
  sort: "relevance" | "pub_date" = "pub_date"
): Promise<PubMedPaper[]> {
  try {
    // 1. Search for PMIDs
    const pmids = await searchPubMed(query, maxResults, sort);
    if (pmids.length === 0) return [];

    // 2. Polite delay (NCBI rate limit)
    await delay(400);

    // 3. Fetch full details
    const papers = await fetchPubMedDetails(pmids);
    return papers;
  } catch (error) {
    console.error("PubMed fetch error:", error);
    return [];
  }
}

/**
 * Category-to-query mapping for PubMed periodic collection.
 * Uses MeSH terms for accurate categorization.
 */
export const PUBMED_CATEGORY_QUERIES: Record<string, string> = {
  biology: '("biology"[MeSH] OR "molecular biology"[MeSH]) AND open access[filter]',
  neuroscience: '("neurosciences"[MeSH] OR "brain"[MeSH]) AND open access[filter]',
  medicine: '("medicine"[MeSH] OR "therapeutics"[MeSH]) AND open access[filter]',
  genetics: '("genetics"[MeSH] OR "genomics"[MeSH]) AND open access[filter]',
  bio_tech: '("biotechnology"[MeSH] OR "bioengineering"[MeSH]) AND open access[filter]',
  chemistry: '("chemistry"[MeSH] OR "biochemistry"[MeSH]) AND open access[filter]',
  climate: '("climate change"[MeSH] OR "environmental health"[MeSH]) AND open access[filter]',
  psychology: '("psychology"[MeSH] OR "mental health"[MeSH]) AND open access[filter]',
};
