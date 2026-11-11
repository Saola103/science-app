/**
 * R3b-03/04 の検証。実行: CRON_SECRET=x npx tsx scripts/tests/r3b-minor.test.ts
 *  - /api/feed の出力で journal を 120 文字に切る(既存の長い行にも効く)。ids / 通常ページの両経路。
 *  - Groq の失敗時の使用量加算: 4xx(429含む)は加算しない。5xx・タイムアウト・接続エラーは加算する。
 *  - arXiv 締切は 240 秒(ARXIV_DEADLINE_MS)。
 */
import assert from "node:assert/strict";
import Groq from "groq-sdk";
import { NextRequest } from "next/server";

process.env.NEXT_PUBLIC_SUPABASE_URL = "http://stub.local";
process.env.SUPABASE_SERVICE_ROLE_KEY = "stub";

const LONG = "J".repeat(500);
const paperRow = (i: number, source: string) => ({
  id: `p${i}`, title: "t", summary: "s", summary_general: "見出し\n本文", summary_expert: "e", category: "physics",
  published_at: "2026-11-01T00:00:00Z", url: "https://example.org/x", authors: ["a"], source, journal: LONG, license: "cc_by", image_url: null,
});
globalThis.fetch = (async (input: any, init?: any) => {
  const url = new URL(typeof input === "string" ? input : input.url);
  const table = url.pathname.split("/").pop()!;
  if ((init?.method ?? "GET") === "HEAD") return new Response(null, { status: 200, headers: { "content-range": "*/3" } });
  const rows = table === "papers" ? [paperRow(1, "EuropePMC"), paperRow(2, "arXiv")] : [];
  return new Response(JSON.stringify(rows), { status: 200, headers: { "content-type": "application/json", "content-range": `0-${rows.length - 1}/${rows.length}` } });
}) as typeof fetch;

(async () => {
  const { GET } = await import("../../app/api/feed/route");
  for (const qs of ["?ids=paper-p1,paper-p2", "?limit=6&type=paper"]) {
    const res = await GET(new NextRequest(`http://x/api/feed${qs}`));
    const body = await res.json();
    const epmc = (body.items as any[]).find((x) => x.source === "EuropePMC");
    assert.ok(epmc, `EuropePMC 行が無い: ${qs}`);
    assert.equal(epmc.journal.length, 120, qs);
    const other = (body.items as any[]).find((x) => x.source === "arXiv");
    if (other) assert.equal(other.journal, undefined); // 他ソースは journal を返さない(従来どおり)
  }

  const { shouldCountFailedGroqUsage } = await import("../../lib/llm/index");
  const h = new Headers();
  const mk = (status: number | undefined) => Groq.APIError.generate(status, { error: { message: "x" } }, "x", h);
  for (const s of [400, 401, 403, 404, 422, 429]) assert.equal(shouldCountFailedGroqUsage(mk(s)), false, `status ${s}`);
  for (const s of [500, 502, 503]) assert.equal(shouldCountFailedGroqUsage(mk(s)), true, `status ${s}`);
  assert.equal(shouldCountFailedGroqUsage(new Groq.APIConnectionTimeoutError()), true); // タイムアウト
  assert.equal(shouldCountFailedGroqUsage(new Groq.APIConnectionError({ message: "down" })), true); // 接続エラー
  assert.equal(shouldCountFailedGroqUsage(new Error("other")), true);

  const { ARXIV_DEADLINE_MS, isPastArxivDeadline } = await import("../../lib/pipeline/openAccessBudget");
  assert.equal(ARXIV_DEADLINE_MS, 240_000);
  assert.equal(isPastArxivDeadline(0, 240_000), false);
  assert.equal(isPastArxivDeadline(0, 240_001), true);
  console.log("r3b-minor: OK");
})();
