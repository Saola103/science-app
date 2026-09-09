/**
 * One-off / manually-triggered collection run, without the Vercel Cron
 * function's 300s maxDuration limit. Unlike /api/cron/collect (which uses
 * the conservative PAPERS_PER_CATEGORY tuned for a twice-daily run inside
 * that limit), this lets a single local run pull a much larger batch —
 * Groq's free tier is a 8000-tokens/minute rate limit (not a daily cap, see
 * lib/llm/index.ts), so generateText() just paces itself and this script
 * can run for as long as needed to work through a bigger batch.
 *
 * Usage:
 *   npx tsx scripts/collect-once.ts --per-category 25
 */

import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { runCollectionPipeline } from "../lib/pipeline/collect";

function arg(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1 || !process.argv[i + 1]) return fallback;
  return parseInt(process.argv[i + 1], 10);
}

const perCategory = arg("per-category", 10);

async function main() {
  console.log(`[collect-once] Starting with perCategory=${perCategory}...`);
  const result = await runCollectionPipeline({ perCategory });
  console.log("[collect-once] Done:", JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error("[collect-once] Fatal error:", e);
  process.exit(1);
});
