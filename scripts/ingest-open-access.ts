#!/usr/bin/env ts-node

import { fetchArxivOpenAccessPapers } from "../lib/sources/arxiv";
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

async function ingestForCategory(cat: typeof CATEGORIES[0], limit: number) {
  console.log(`\n--- 🚀 Ingesting Category: ${cat.id} (Query: ${cat.query}) ---`);
  try {
    const papers = await fetchArxivOpenAccessPapers(cat.query, limit);
    console.log(`Found ${papers.length} papers.`);

    for (const paper of papers) {
      try {
        console.log(`\n[${cat.id}] Processing: ${paper.title.slice(0, 50)}...`);
        const abstract = paper.abstract || paper.title;

        // Professional Summaries with retries/error handling
        console.log("  - Generating summaries and detecting category...");
        let summaryGeneral = "";
        let summaryExpert = "";
        try {
          summaryGeneral = await summarize(abstract, { tone: "casual", maxLength: 600 });
          summaryExpert = await summarize(abstract, { tone: "formal", maxLength: 800 });
        } catch (sumErr) {
          console.error("  ❌ Summarization failed for this paper. skipping.");
          continue;
        }

        // Category & Image Detection
        // summaryGeneral の末尾に含まれるはずのカテゴリを抽出
        let detectedCategory = "other";
        const categoryMatch = summaryGeneral.match(/\[(physics|biology|it_ai|medicine|other)\]/i);
        if (categoryMatch) {
          detectedCategory = categoryMatch[1].toLowerCase();
          // 要約テキストからカテゴリ名タグを削除してクリーンにする
          summaryGeneral = summaryGeneral.replace(/\[(physics|biology|it_ai|medicine|other)\]/i, "").trim();
        }

        // 画像のランダム選択
        const images = CATEGORY_IMAGES[detectedCategory] || CATEGORY_IMAGES["other"];
        const imageUrl = images[Math.floor(Math.random() * images.length)];
        console.log(`  - Detected Category: ${detectedCategory}, Image: ${imageUrl}`);

        let summaryEmbedding: number[] | undefined;
        try {
          console.log("  - Generating embedding (768d)...");
          summaryEmbedding = await embedText(summaryGeneral);
          console.log(`  - Embedding success: dim=${summaryEmbedding.length}`);
        } catch (embErr) {
          console.warn("  ⚠️ Embedding failed, skipping vector search capability for this paper.");
        }

        console.log("  - Upserting to Supabase...");
        await upsertPaperToSupabase({
          ...paper,
          source: "arxiv",
          summary: summaryGeneral,
          summaryGeneral,
          summaryExpert,
          summaryEmbedding,
          imageUrl,
        });
        console.log("  ✅ Successfully ingested.");

        // Wait to avoid rate limits (Gemini 429 is common on free tier)
        await new Promise(r => setTimeout(r, 4000));
      } catch (paperErr) {
        console.error(`  ❌ Failed to process paper "${paper.title.slice(0, 30)}":`, paperErr instanceof Error ? paperErr.message : paperErr);
        // Wait a bit longer if failed (might be a 429)
        await new Promise(r => setTimeout(r, 5000));
        continue;
      }
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
