/**
 * Paper Collection Pipeline
 *
 * Fetches papers from arXiv (open-access preprints), generates AI summaries
 * (general + expert), creates embeddings, and upserts into Supabase.
 *
 * PubMed was removed: abstracts from closed-access journals carry publisher
 * copyright even with the "open access" filter. arXiv papers are submitted
 * under Creative Commons / arXiv non-exclusive license — fully safe.
 *
 * Designed to be called by a Vercel Cron job (GET /api/cron/collect).
 */

import { fetchArxivOpenAccessPapers } from "../sources/arxiv";
import { fetchBiorxivPapers, BIORXIV_CATEGORY_QUERIES } from "../sources/biorxiv";
import { fetchScienceNewsFromRSS } from "../sources/rss";
import { summarize } from "../llm/summarize";
import { generateText, embedText } from "../llm/index";
import { upsertPaperToSupabase, upsertNewsToSupabase } from "../supabase/serviceClient";
import { CATEGORY_IMAGES } from "../llm/summarize";

// arXiv category codes — broad science coverage
const ARXIV_CATEGORY_QUERIES: Record<string, string> = {
  physics:          "cat:physics.*",
  astronomy:        "cat:astro-ph.*",
  math:             "cat:math.*",
  computer_science: "cat:cs.*",
  machine_learning: "cat:cs.AI OR cat:cs.LG OR cat:stat.ML",
  quantum:          "cat:quant-ph",
  biology:          "cat:q-bio.*",    // quantitative biology (overlaps with bioRxiv)
  economics:        "cat:econ.*",
};

/** How many papers to collect per category per run */
const PAPERS_PER_CATEGORY = 3;

/** Delay between API calls to be polite */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Pick a random image from the category image pool */
function pickCategoryImage(category: string): string {
  const images = CATEGORY_IMAGES[category] || CATEGORY_IMAGES["other"];
  return images[Math.floor(Math.random() * images.length)];
}

/** Extract category tag from a general summary (last line should be the tag) */
function extractCategory(summary: string): string {
  const categories = [
    "physics", "biology", "it_ai", "medicine", "astronomy",
    "chemistry", "environment", "mathematics", "other"
  ];
  const lower = summary.toLowerCase();
  for (const cat of categories) {
    if (lower.includes(`[${cat}]`) || lower.endsWith(cat)) {
      return cat;
    }
  }
  // Try to find category mention in last 50 chars
  const tail = lower.slice(-50);
  for (const cat of categories) {
    if (tail.includes(cat)) return cat;
  }
  return "other";
}

type CollectResult = {
  source: string;
  category: string;
  collected: number;
  errors: number;
};

/**
 * Process a single paper: generate summaries, embedding, and save to DB
 */
async function processPaper(paper: {
  id: string;
  title: string;
  abstract?: string;
  authors: string[];
  publishedAt?: string;
  url: string;
  license?: string;
  journal?: string;
  pmid?: string;
  pmcid?: string;
  source: string;
}): Promise<void> {
  const textForSummary = paper.abstract || paper.title;

  // Generate both summaries sequentially to avoid Groq rate limits
  // casual = やさしく（一般向け）/ expert = くわしく（研究者向け）
  let generalSummary: string | null = null;
  let expertSummary: string | null = null;

  try {
    generalSummary = await summarize(textForSummary, { tone: "casual" });
  } catch (e) {
    console.error(`General summary failed for ${paper.id}:`, e);
  }

  await delay(800); // Groq rate limit buffer between calls

  try {
    expertSummary = await summarize(textForSummary, { tone: "expert" });
  } catch (e) {
    console.error(`Expert summary failed for ${paper.id}:`, e);
  }

  // Generate embedding from abstract or title
  let embedding: number[] | undefined;
  try {
    embedding = await embedText(textForSummary);
  } catch (e) {
    console.error(`Embedding failed for ${paper.id}:`, e);
  }

  // Determine category from the general summary
  const category = generalSummary ? extractCategory(generalSummary) : "other";
  const imageUrl = pickCategoryImage(category);

  await upsertPaperToSupabase({
    id: paper.id,
    title: paper.title,
    abstract: paper.abstract,
    authors: paper.authors,
    journal: paper.journal,
    publishedAt: paper.publishedAt,
    url: paper.url,
    license: paper.license,
    pmid: paper.pmid,
    pmcid: paper.pmcid,
    source: paper.source,
    summary: generalSummary || undefined,
    summaryGeneral: generalSummary || undefined,
    summaryExpert: expertSummary || undefined,
    summaryEmbedding: embedding,
    imageUrl,
    category,
  });
}

/**
 * Collect papers from arXiv for all configured categories
 */
export async function collectFromArxiv(): Promise<CollectResult[]> {
  const results: CollectResult[] = [];

  for (const [category, query] of Object.entries(ARXIV_CATEGORY_QUERIES)) {
    let collected = 0;
    let errors = 0;

    try {
      const papers = await fetchArxivOpenAccessPapers(query, PAPERS_PER_CATEGORY, "submittedDate");
      await delay(3000); // arXiv rate limit

      for (const paper of papers) {
        try {
          await processPaper({
            ...paper,
            source: "arXiv",
          });
          collected++;
          await delay(1000);
        } catch (e) {
          console.error(`Failed to process arXiv paper ${paper.id}:`, e);
          errors++;
        }
      }
    } catch (e) {
      console.error(`arXiv fetch failed for category ${category}:`, e);
      errors++;
    }

    results.push({ source: "arXiv", category, collected, errors });
  }

  return results;
}

/**
 * Collect papers from bioRxiv / medRxiv (neuroscience + biology focus)
 */
export async function collectFromBiorxiv(): Promise<CollectResult[]> {
  const results: CollectResult[] = [];

  for (const { server, category, internalCategory } of BIORXIV_CATEGORY_QUERIES) {
    let collected = 0;
    let errors = 0;

    try {
      const papers = await fetchBiorxivPapers(server, category, 2, PAPERS_PER_CATEGORY);
      await delay(1000); // polite delay

      for (const paper of papers) {
        try {
          await processPaper({
            id: paper.id,
            title: paper.title,
            abstract: paper.abstract,
            authors: paper.authors,
            publishedAt: paper.publishedAt,
            url: paper.url,
            license: paper.license,
            source: paper.source,
          });
          collected++;
          await delay(1000);
        } catch (e) {
          console.error(`Failed to process ${server} paper ${paper.id}:`, e);
          errors++;
        }
      }
    } catch (e) {
      console.error(`${server} fetch failed for category ${category}:`, e);
      errors++;
    }

    results.push({ source: server === "biorxiv" ? "bioRxiv" : "medRxiv", category, collected, errors });
  }

  return results;
}

/**
 * Collect science news from RSS feeds, generate Japanese summaries, and save to DB
 */
export async function collectNews(): Promise<{ collected: number; errors: number }> {
  let collected = 0;
  let errors = 0;

  try {
    console.log("[Pipeline] Fetching science news from RSS feeds...");
    const articles = await fetchScienceNewsFromRSS();
    console.log(`[Pipeline] Fetched ${articles.length} news articles from RSS`);

    for (const article of articles) {
      try {
        // Generate a Japanese summary using Groq
        const prompt = `以下の英語ニュース記事を日本語で3〜5行に要約してください。科学的な内容を一般の読者にわかりやすく伝えてください。\n\nタイトル: ${article.title}\n\n内容: ${article.description}`;

        let summaryJa: string | null = null;
        try {
          summaryJa = await generateText(prompt);
          await delay(500); // Groq rate limit buffer
        } catch (e) {
          console.warn(`[Pipeline] News summary failed for "${article.title}":`, e);
        }

        await upsertNewsToSupabase({
          id: article.id,
          title: article.title,
          description: article.description,
          url: article.url,
          image_url: article.image_url,
          published_at: article.published_at,
          source_name: article.source_name,
          category: article.category,
          summary_general: summaryJa,
        });

        collected++;
      } catch (e) {
        console.error(`[Pipeline] Failed to save news "${article.title}":`, e);
        errors++;
      }
    }
  } catch (e) {
    console.error("[Pipeline] News collection failed:", e);
    errors++;
  }

  return { collected, errors };
}

/**
 * Run the full collection pipeline (arXiv + bioRxiv/medRxiv + News)
 */
export async function runCollectionPipeline(): Promise<{
  arXiv: CollectResult[];
  bioRxiv: CollectResult[];
  news: { collected: number; errors: number };
  totalCollected: number;
  totalErrors: number;
}> {
  console.log("[Pipeline] Starting full collection (arXiv + bioRxiv + news)...");
  const startTime = Date.now();

  // Run all three in parallel
  const [arXiv, bioRxiv, news] = await Promise.all([
    collectFromArxiv(),
    collectFromBiorxiv(),
    collectNews(),
  ]);

  const totalCollected =
    arXiv.reduce((s, r) => s + r.collected, 0) +
    bioRxiv.reduce((s, r) => s + r.collected, 0) +
    news.collected;

  const totalErrors =
    arXiv.reduce((s, r) => s + r.errors, 0) +
    bioRxiv.reduce((s, r) => s + r.errors, 0) +
    news.errors;

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `[Pipeline] Done in ${duration}s. Collected: ${totalCollected}, Errors: ${totalErrors}`
  );

  return { arXiv, bioRxiv, news, totalCollected, totalErrors };
}
