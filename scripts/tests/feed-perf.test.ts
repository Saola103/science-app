// フィードAPIの内部最適化(並列化+母数キャッシュ)の検証:
// ローカルのスタブfetchでSupabase(PostgREST)を模し、DB呼び出し回数・直列の深さ・出力を確認する。
// 実DB・外部通信なし。
import assert from "node:assert/strict";
import { NextRequest } from "next/server";

process.env.NEXT_PUBLIC_SUPABASE_URL = "http://stub.local";
process.env.SUPABASE_SERVICE_ROLE_KEY = "stub";

const POOL = { papers: 40, news: 20 };
const DELAY_MS = 120;
let calls: { table: string; head: boolean; t0: number; t1: number }[] = [];

function row(table: string, i: number) {
  const base = {
    id: `${table}-${i}`,
    title: `title ${i}`,
    summary_general: `見出し${i}\n本文${i}`,
    category: i % 2 ? "neuroscience" : "physics",
    published_at: new Date(Date.UTC(2026, 10, 1) - i * 3600_000).toISOString(),
    url: `https://example.org/${table}/${i}`,
  };
  return table === "papers"
    ? { ...base, summary: "s", summary_expert: "e", authors: ["a"], source: "arXiv", image_url: null }
    : { ...base, description: "d", source_name: "NASA" };
}

globalThis.fetch = (async (input: any, init?: any) => {
  const url = new URL(typeof input === "string" ? input : input.url);
  const table = url.pathname.split("/").pop()!;
  const head = (init?.method ?? "GET") === "HEAD";
  const t0 = Date.now();
  await new Promise((r) => setTimeout(r, DELAY_MS));
  const pool = POOL[table as "papers" | "news"];
  calls.push({ table, head, t0, t1: Date.now() });
  if (head) {
    return new Response(null, { status: 200, headers: { "content-range": `*/${pool}` } });
  }
  const offset = Number(url.searchParams.get("offset") ?? 0);
  const limit = Number(url.searchParams.get("limit") ?? pool);
  const rows = Array.from({ length: Math.min(limit, Math.max(0, pool - offset)) }, (_, k) => row(table, offset + k));
  return new Response(JSON.stringify(rows), { status: 200, headers: { "content-type": "application/json", "content-range": `${offset}-${offset + rows.length - 1}/${pool}` } });
}) as typeof fetch;

const get = (qs: string) => new NextRequest(`http://x/api/feed${qs}`);

(async () => {
  const { GET: next } = await import("../../app/api/feed/route");
  const { resetPoolSizeCache } = await import("../../lib/api/poolSizeCache");
  let orig: typeof next | null = null;
  try {
    orig = (await import("../../app/api/feed/route.orig" as string)).GET;
  } catch {
    /* 比較用の旧版が無い通常実行では省略 */
  }
  Math.random = () => 0.5;

  const cases = ["?limit=10", "?limit=10&category=neuro", "?limit=6&q=title", `?limit=10&cursor=${encodeURIComponent("2026-10-31T00:00:00.000Z")}`, "?limit=10&preferences=" + encodeURIComponent('{"physics":3}')];
  for (const qs of cases) {
    resetPoolSizeCache();
    calls = [];
    const t = Date.now();
    const res = await next(get(qs));
    const ms = Date.now() - t;
    const body = await res.json();
    assert.equal(res.status, 200, qs);
    assert.ok(body.items.length > 0, qs);
    console.log(`feed${qs.slice(0, 30)}: ${calls.length} DB calls, ${ms}ms`);
    if (orig) {
      resetPoolSizeCache();
      calls = [];
      const t2 = Date.now();
      const r2 = await orig(get(qs));
      const ms2 = Date.now() - t2;
      assert.deepEqual(body, await r2.json(), `output differs for ${qs}`);
      console.log(`   (old) ${calls.length} DB calls, ${ms2}ms`);
    }
  }

  // 初回ページ: 母数2回+ページ2回=4回、直列の深さ2段(= 2*DELAY 前後)。2回目はキャッシュで2回・1段。
  resetPoolSizeCache();
  calls = [];
  let t = Date.now();
  await next(get("?limit=10"));
  assert.equal(calls.length, 4);
  assert.ok(Date.now() - t < DELAY_MS * 3, "first page should be ~2 sequential steps");
  calls = [];
  t = Date.now();
  await next(get("?limit=10"));
  assert.equal(calls.length, 2, "pool sizes cached on 2nd open");
  assert.ok(Date.now() - t < DELAY_MS * 2, "second open should be ~1 step");
  console.log("feed-perf: OK");
})();
