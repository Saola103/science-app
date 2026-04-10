/**
 * bioRxiv / medRxiv API integration
 *
 * Uses the bioRxiv Content API (free, no key required).
 * https://api.biorxiv.org/
 *
 * Endpoint: GET https://api.biorxiv.org/details/{server}/{interval}/{cursor}/json
 *   server   : "biorxiv" | "medrxiv"
 *   interval : "YYYY-MM-DD/YYYY-MM-DD"  or  "NNN" (last N days)
 *   cursor   : pagination offset (0, 30, 60, …)
 *
 * All bioRxiv preprints are open-access CC BY / CC BY-ND — safe to summarize.
 */

const BIORXIV_API = "https://api.biorxiv.org/details";

export type BiorxivPaper = {
  id: string;
  title: string;
  abstract?: string;
  authors: string[];
  publishedAt?: string;
  url: string;
  category: string;
  source: "bioRxiv" | "medRxiv";
  license: string;
  doi: string;
};

type BiorxivRecord = {
  doi: string;
  title: string;
  authors: string;
  author_corresponding: string;
  date: string;          // "YYYY-MM-DD"
  abstract: string;
  category: string;
  server: string;
  license: string;
};

/** bioRxiv category → our internal category mapping */
export const BIORXIV_CATEGORIES: Record<string, string> = {
  neuroscience:          "neuroscience",
  "cell-biology":        "biology",
  genetics:              "genetics",
  "molecular-biology":   "biology",
  biophysics:            "biology",
  biochemistry:          "biology",
  "systems-biology":     "biology",
  "evolutionary-biology":"biology",
  "animal-behavior-and-cognition": "neuroscience",
  physiology:            "medicine",
  pharmacology:          "medicine",
  "scientific-communication-and-education": "other",
};

/**
 * Fetch recent papers from bioRxiv (or medRxiv) for a given category.
 *
 * @param server      "biorxiv" | "medrxiv"
 * @param category    bioRxiv category slug (e.g. "neuroscience")
 * @param daysBack    how many past days to search (default 2)
 * @param maxResults  max papers to return
 */
export async function fetchBiorxivPapers(
  server: "biorxiv" | "medrxiv",
  category: string,
  daysBack: number = 2,
  maxResults: number = 5,
): Promise<BiorxivPaper[]> {
  const now = new Date();
  const from = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const interval = `${fmt(from)}/${fmt(now)}`;

  const url = `${BIORXIV_API}/${server}/${interval}/0/json`;

  let data: { collection?: BiorxivRecord[]; messages?: { status: string }[] };
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`[bioRxiv] fetch failed: ${res.status} ${res.statusText}`);
      return [];
    }
    data = await res.json();
  } catch (e) {
    console.error("[bioRxiv] fetch error:", e);
    return [];
  }

  if (!data.collection || data.collection.length === 0) return [];

  // Filter by category and deduplicate by DOI (sometimes same paper appears multiple times)
  const seen = new Set<string>();
  const papers: BiorxivPaper[] = [];

  for (const rec of data.collection) {
    if (papers.length >= maxResults) break;
    if (rec.category.toLowerCase() !== category.toLowerCase()) continue;
    if (seen.has(rec.doi)) continue;
    seen.add(rec.doi);

    const authorList = rec.authors
      .split(";")
      .map((a) => a.trim())
      .filter(Boolean)
      .slice(0, 10);

    const sourceLabel = server === "biorxiv" ? "bioRxiv" : "medRxiv";
    const doiUrl = `https://doi.org/${rec.doi}`;
    const paperUrl = `https://www.${server}.org/content/${rec.doi}v1`;

    papers.push({
      id: `${server}:${rec.doi}`,
      title: rec.title,
      abstract: rec.abstract || undefined,
      authors: authorList,
      publishedAt: rec.date ? `${rec.date}T00:00:00Z` : undefined,
      url: paperUrl,
      doi: rec.doi,
      category: BIORXIV_CATEGORIES[category] ?? "biology",
      source: sourceLabel,
      license: rec.license || "CC BY",
    });
  }

  return papers;
}

/**
 * Category queries to run each day for bioRxiv.
 * Focused on neuroscience + biology — matches user's research interests.
 */
export const BIORXIV_CATEGORY_QUERIES: Array<{
  server: "biorxiv" | "medrxiv";
  category: string;
  internalCategory: string;
}> = [
  // Neuroscience — primary focus
  { server: "biorxiv", category: "neuroscience",                    internalCategory: "neuroscience" },
  { server: "biorxiv", category: "animal-behavior-and-cognition",   internalCategory: "neuroscience" },
  // Biology
  { server: "biorxiv", category: "cell-biology",                    internalCategory: "biology" },
  { server: "biorxiv", category: "genetics",                        internalCategory: "genetics" },
  { server: "biorxiv", category: "molecular-biology",               internalCategory: "biology" },
  { server: "biorxiv", category: "biophysics",                      internalCategory: "biology" },
  // Medical (medRxiv)
  { server: "medrxiv", category: "neurology",                       internalCategory: "medicine" },
];
