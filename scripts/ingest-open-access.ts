#!/usr/bin/env ts-node

import { fetchArxivOpenAccessPapers } from "../lib/sources/arxiv";
import { summarize } from "../lib/llm/summarize";
import { embedText } from "../lib/llm/index";
import { upsertPaperToSupabase } from "../lib/supabase/serviceClient";


function loadEnvLocal(): void {
  // `npx tsx` で実行する場合、Next.js の env ローダが走らないため手動で読み込む
  if (
    process.env.GEMINI_API_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("node:fs") as typeof import("node:fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("node:path") as typeof import("node:path");

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

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch {
    // 読み込みに失敗しても、既存の env で継続する
  }
}

async function main() {
  loadEnvLocal();

  const query = process.argv[2] ?? "machine learning";
  const maxResultsArg = process.argv[3];
  const maxResults = maxResultsArg ? Number(maxResultsArg) || 10 : 10;

  console.log(`🔎 arXiv からオープンアクセス論文を検索します: "${query}"`);

  const papers = await fetchArxivOpenAccessPapers(query, maxResults);

  if (papers.length === 0) {
    console.log("該当する arXiv 論文が見つかりませんでした。");
    return;
  }

  console.log(`✅ ${papers.length} 件の論文メタデータを取得しました。要約と保存を開始します。`);

  for (const paper of papers) {
    console.log(`\n---\n📝 処理中: ${paper.title}`);

    const contentForSummary = paper.abstract && paper.abstract.trim().length > 0
      ? paper.abstract
      : [
        paper.title,
        paper.publishedAt ? `Published at: ${paper.publishedAt}` : "",
      ]
        .filter(Boolean)
        .join("\n");

    const summary = await summarize(contentForSummary);
    const summaryGeneral = await summarize(contentForSummary, { tone: "casual", maxLength: 300 });
    const summaryExpert = await summarize(contentForSummary, { tone: "formal", maxLength: 500 });

    // ベクトル化 (optional — skip if embedding model is not available)
    let summaryEmbedding: number[] | undefined;
    try {
      summaryEmbedding = await embedText(summaryGeneral);
    } catch (embErr) {
      console.warn("⚠️ Embedding generation skipped:", (embErr as Error).message?.slice(0, 100));
    }

    await upsertPaperToSupabase({
      ...paper,
      source: "arxiv",
      summary,
      summaryGeneral,
      summaryExpert,
      summaryEmbedding,
    });

    console.log("💾 Supabase に保存しました (papers テーブル / upsert)。");

    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  console.log("\n🎉 インジェスト処理が完了しました。");
}

// ts-node / node から直接実行されたときだけ main を走らせる
if (require.main === module) {
  main().catch((err) => {
    console.error("インジェスト処理中にエラーが発生しました:", err);
    process.exit(1);
  });
}

