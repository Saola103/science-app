#!/usr/bin/env ts-node

import { fetchArxivOpenAccessPapers } from "../lib/sources/arxiv";
import { fetchScienceNews } from "../lib/sources/news";
import { summarize, CATEGORY_IMAGES } from "../lib/llm/summarize";
import { embedText } from "../lib/llm/index";
import { upsertPaperToSupabase } from "../lib/supabase/serviceClient";

const CATEGORIES = [
  { id: "physics", query: "physics quantum relativity" },
  { id: "biology", query: "biology genetics evolution" },
  { id: "chemistry", query: "chemistry materials" },
  { id: "it_ai", query: "artificial intelligence machine learning computer science" },
  { id: "neuroscience", query: "neuroscience brain cognition" },
  { id: "medicine", query: "medicine health" },
  { id: "mathematics", query: "mathematics" },
  { id: "astronomy", query: "astronomy astrophysics" },
  { id: "energy", query: "energy fusion renewable" },
  { id: "environment", query: "environment ecology climate" },
  { id: "psychology", query: "psychology behavior" },
  { id: "robotics", query: "robotics automation" }
];

function loadEnvLocal(): void {
  if (process.env.GEMINI_API_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    const fs = require("node:fs");
    const path = require("node:path");
    const envPath = path.resolve(process.cwd(), ".env.local");
    if (!fs.existsSync(envPath)) return;
    const content = fs.readFileSync(envPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      let value = trimmed.slice(eqIndex + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      if (key && process.env[key] === undefined) process.env[key] = value;
    }
  } catch (err) {
    console.warn("Failed to load .env.local:", err);
  }
}

async function processItem(item: any, catId: string, source: "arxiv" | "gnews") {
  try {
    console.log(`\n[${catId}] Processing ${source}: ${item.title.slice(0, 50)}...`);
    const abstract = item.abstract || item.content || item.description || item.title;

    console.log("  - Generating summaries and detecting category...");
    let summaryGeneral = "";
    let summaryExpert = "";
    try {
      summaryGeneral = await summarize(abstract, { tone: "casual", maxLength: 600 });
      summaryExpert = await summarize(abstract, { tone: "formal", maxLength: 800 });
    } catch (sumErr) {
      console.error("  ❌ Summarization failed for this item. skipping.");
      return;
    }

    let detectedCategory = "other";
    const categoryMatch = summaryGeneral.match(/\[(physics|biology|it_ai|medicine|other)\]/i);
    if (categoryMatch) {
      detectedCategory = categoryMatch[1].toLowerCase();
      summaryGeneral = summaryGeneral.replace(/\[(physics|biology|it_ai|medicine|other)\]/i, "").trim();
    }

    const images = CATEGORY_IMAGES[detectedCategory as keyof typeof CATEGORY_IMAGES] || CATEGORY_IMAGES["other"];
    const imageUrl = item.image || images[Math.floor(Math.random() * images.length)];
    console.log(`  - Detected Category: ${detectedCategory}, Image: ${imageUrl}`);

    let summaryEmbedding: number[] | undefined;
    try {
      console.log("  - Generating embedding (768d)...");
      summaryEmbedding = await embedText(summaryGeneral);
      console.log(`  - Embedding success: dim=${summaryEmbedding.length}`);
    } catch (embErr) {
      console.warn("  ⚠️ Embedding failed, skipping vector search capability.");
    }

    console.log("  - Upserting to Supabase...");
    await upsertPaperToSupabase({
      id: item.id || item.url,
      title: item.title,
      abstract: abstract,
      authors: item.authors || (item.source?.name ? [item.source.name] : []),
      journal: source === "gnews" ? item.source?.name : undefined,
      publishedAt: item.publishedAt,
      url: item.url,
      license: source === "arxiv" ? "arXiv OA" : undefined,
      source: source,
      summary: summaryGeneral,
      summaryGeneral,
      summaryExpert,
      summaryEmbedding,
      imageUrl,
    });
    console.log("  ✅ Successfully ingested.");
    
    await new Promise(r => setTimeout(r, 4000));
  } catch (err) {
    console.error(`  ❌ Failed to process:`, err instanceof Error ? err.message : err);
    await new Promise(r => setTimeout(r, 5000));
  }
}

async function ingestForCategory(cat: typeof CATEGORIES[0], limit: number) {
  console.log(`\n--- 🚀 Ingesting Category: ${cat.id} (Query: ${cat.query}) ---`);
  try {
    const papers = await fetchArxivOpenAccessPapers(cat.query, limit);
    console.log(`Found ${papers.length} arXiv papers.`);

    // Wait slightly before news to avoid spamming network
    await new Promise(resolve => setTimeout(resolve, 1000));

    const news = await fetchScienceNews(cat.query);
    console.log(`Found ${news.length} science news articles.`);

    for (const paper of papers) {
      await processItem(paper, cat.id, "arxiv");
    }

    // Process up to limit news articles
    for (const article of news.slice(0, limit)) {
      await processItem(article, cat.id, "gnews");
    }
  } catch (err) {
    console.error(`❌ Critical error in category ${cat.id}:`, err);
  }
}

async function main() {
  loadEnvLocal();
  const limitPerCategory = Number(process.argv[2]) || 3;

  console.log(`🌟 Starting Automated Ingest at ${new Date().toISOString()}`);

  for (const cat of CATEGORIES) {
    await ingestForCategory(cat, limitPerCategory);
  }

  console.log("\n✅ All categories processed successfully.");
}

if (require.main === module) {
  main().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}
