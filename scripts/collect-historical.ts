/**
 * One-off backfill for date variety: the regular pipeline (lib/pipeline/collect.ts)
 * always sorts arXiv/bioRxiv by submittedDate descending, so every item collected
 * so far is from "right now" — the feed reads as if only today's papers exist.
 * This pulls arXiv papers from an explicit past date range instead, so the feed
 * has a real spread across 2026 rather than a single-day cluster.
 *
 * Usage:
 *   npx tsx scripts/collect-historical.ts --from 20260101 --to 20260601 --per-category 15
 */

import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { fetchArxivOpenAccessPapers } from "../lib/sources/arxiv";
import { processPaper, ARXIV_CATEGORY_QUERIES } from "../lib/pipeline/collect";

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const FROM = arg("from", "20260101"); // YYYYMMDD
const TO = arg("to", "20260601");
const PER_CATEGORY = parseInt(arg("per-category", "15"), 10);

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log(`[collect-historical] Fetching arXiv papers submitted ${FROM}–${TO}, ${PER_CATEGORY}/category...`);
  const dateFilter = `submittedDate:[${FROM}000000 TO ${TO}235959]`;

  let totalCollected = 0;
  let totalErrors = 0;

  for (const [category, baseQuery] of Object.entries(ARXIV_CATEGORY_QUERIES)) {
    const query = `${baseQuery} AND ${dateFilter}`;
    try {
      const papers = await fetchArxivOpenAccessPapers(query, PER_CATEGORY, "submittedDate");
      console.log(`[collect-historical] ${category}: ${papers.length} found`);
      await delay(3000); // arXiv rate limit

      for (const paper of papers) {
        try {
          await processPaper({ ...paper, source: "arXiv" });
          totalCollected++;
          await delay(1000);
        } catch (e) {
          console.error(`[collect-historical] failed ${paper.id}:`, e instanceof Error ? e.message : e);
          totalErrors++;
        }
      }
    } catch (e) {
      console.error(`[collect-historical] arXiv fetch failed for ${category}:`, e instanceof Error ? e.message : e);
      totalErrors++;
    }
  }

  console.log(`[collect-historical] Done. Collected: ${totalCollected}, Errors: ${totalErrors}`);
}

main().catch((e) => {
  console.error("[collect-historical] Fatal error:", e);
  process.exit(1);
});
