#!/usr/bin/env ts-node

import { fetchArxivOpenAccessPapers } from "../lib/sources/arxiv";
import { summarize } from "../lib/llm/summarize";
import { embedText } from "../lib/llm/index";
import { upsertPaperToSupabase } from "../lib/supabase/serviceClient";

const CATEGORIES = [
  { id: "physics", query: "physics" },
  { id: "biology", query: "biology" },
  { id: "chemistry", query: "chemistry" },
  { id: "computer_science", query: "computer science machine learning" },
  { id: "neuroscience", query: "neuroscience" },
  { id: "medicine", query: "medicine health" },
  { id: "math", query: "mathematics" },
  { id: "astronomy", query: "astronomy astrophysics" },
  { id: "energy", query: "energy fusion renewable" },
  { id: "environment", query: "environment ecology climate" }
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
        console.log("  - Generating summaries...");
        let summaryGeneral = "";
        let summaryExpert = "";
        try {
          summaryGeneral = await summarize(abstract, { tone: "casual", maxLength: 600 });
          summaryExpert = await summarize(abstract, { tone: "formal", maxLength: 800 });
        } catch (sumErr) {
          console.error("  ❌ Summarization failed for this paper. Skipping summaries.");
          summaryGeneral = abstract.slice(0, 500); // Fallback to raw abstract
        }

        let summaryEmbedding: number[] | undefined;
        try {
          console.log("  - Generating embedding...");
          summaryEmbedding = await embedText(summaryGeneral);
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
        });
        console.log("  ✅ Successfully ingested.");

        // Wait to avoid rate limits
        await new Promise(r => setTimeout(r, 1500));
      } catch (paperErr) {
        console.error(`  ❌ Failed to process paper "${paper.title.slice(0, 30)}":`, paperErr instanceof Error ? paperErr.message : paperErr);
        continue; // Next paper
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
