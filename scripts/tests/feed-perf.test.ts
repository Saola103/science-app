// フィードAPIの内部最適化(並列化+母数キャッシュ)の検証:
// ローカルのスタブfetchでSupabase(PostgREST)を模し、DB呼び出し回数・直列の深さ・出力を確認する。
// 実DB・外部通信なし。
import assert from "node:assert/strict";
import { NextRequest } from "next/server";

process.env.NEXT_PUBLIC_SUPABASE_URL = "http://stub.local";
process.env.SUPABASE_SERVICE_ROLE_KEY = "stub";

const POOL = { papers: 40, news: 20 };
const DELAY_MS = 120;
let calls: { table: string; head: boolean; t0: number; t1: number; url: URL }[] = [];

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
  calls.push({ table, head, t0, t1: Date.now(), url });
  if (head) {
    return new Response(null, { status: 200, headers: { "content-range": `*/${pool}` } });
  }
  const offset = Number(url.searchParams.get("offset") ?? 0);
  const limit = Number(url.searchParams.get("limit") ?? pool);
  const rows = Array.from({ length: Math.min(limit, Math.max(0, pool - offset)) }, (_, k) => row(table, offset + k));
  return new Response(JSON.stringify(rows), { status: 200, headers: { "content-type": "application/json", "content-range": `${offset}-${offset + rows.length - 1}/${pool}` } });
}) as typeof fetch;

// R3-05: 全パターン・全DB呼び出し(件数のHEAD含む)に可視性条件が付いていること。
// papers: or=(...) のどれかが PAPER_VISIBILITY_OR と完全一致(q の or とは別パラメータ)。
// news: source_name=in.(NASA,...) が付く。注入文字列(source.eq.PubMed)が可視性条件に混ざらないことも確認。
function assertVisibility(label: string, expectedPapersCalls: number, expectedNewsCalls: number, policy: { PAPER_VISIBILITY_OR: string; NEWS_ALLOWED_SOURCES: readonly string[] }) {
  const papers = calls.filter((c) => c.table === "papers");
  const news = calls.filter((c) => c.table === "news");
  assert.equal(papers.length, expectedPapersCalls, `${label}: papers call count`);
  assert.equal(news.length, expectedNewsCalls, `${label}: news call count`);
  for (const c of papers) {
    const ors = c.url.searchParams.getAll("or");
    const vis = ors.filter((v) => v === `(${policy.PAPER_VISIBILITY_OR})`);
    assert.equal(vis.length, 1, `${label}: papers${c.head ? " (HEAD)" : ""} lacks visibility or: ${c.url.search}`);
    assert.ok(vis[0].includes("source.eq.arXiv"), label);
    for (const v of ors) {
      if (v !== vis[0]) assert.ok(!v.includes("source.eq.arXiv"), `${label}: unexpected or`);
    }
  }
  const expectedIn = `in.(${policy.NEWS_ALLOWED_SOURCES.join(",")})`;
  assert.ok(expectedIn.startsWith("in.(NASA"));
  for (const c of news) {
    assert.deepEqual(c.url.searchParams.getAll("source_name"), [expectedIn], `${label}: news${c.head ? " (HEAD)" : ""} lacks source_name filter: ${c.url.search}`);
  }
}

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

  const policy = await import("../../lib/sources/policy");
  const inj = encodeURIComponent("source.eq.PubMed");
  const cases = ["?limit=10", "?limit=10&category=neuro", "?limit=6&q=title", `?limit=10&cursor=${encodeURIComponent("2026-10-31T00:00:00.000Z")}`, "?limit=10&preferences=" + encodeURIComponent('{"physics":3}'), `?limit=10&q=${inj}`, `?limit=10&category=${inj}`, `?limit=10&q=${inj}&category=${inj}&cursor=${encodeURIComponent("2026-10-31T00:00:00.000Z")}`];
  for (const qs of cases) {
    resetPoolSizeCache();
    calls = [];
    const t = Date.now();
    const res = await next(get(qs));
    const ms = Date.now() - t;
    const body = await res.json();
    assert.equal(res.status, 200, qs);
    if (!qs.includes("PubMed")) assert.ok(body.items.length > 0, qs);
    // 通常の初回: papers/news とも 母数HEAD+ページ=2回。それ以外(category/q/cursor)はページ1回。
    const first = !/[?&](q|category|cursor)=/.test(qs);
    assertVisibility(`feed${qs.slice(0, 30)}`, first ? 2 : 1, first ? 2 : 1, policy);
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

  // ids モード(保存記事): papers/news の両方に可視性条件が付く
  resetPoolSizeCache();
  calls = [];
  const idsRes = await next(get(`?ids=${encodeURIComponent("paper-00000000-0000-0000-0000-000000000001,news-00000000-0000-0000-0000-000000000002")}`));
  assert.equal(idsRes.status, 200);
  assertVisibility("ids", 1, 1, policy);

  // R3-02: 件数クエリの失敗は 0 をキャッシュしない(次回は取り直す)
  // (スタブで一時的に件数だけ 500 にする)
  const realFetch = globalThis.fetch;
  let failCount = true;
  globalThis.fetch = (async (input: any, init?: any) => {
    if (failCount && (init?.method ?? "GET") === "HEAD") return new Response("{}", { status: 500 });
    return realFetch(input, init);
  }) as typeof fetch;
  resetPoolSizeCache();
  await next(get("?limit=10"));
  failCount = false;
  calls = [];
  await next(get("?limit=10"));
  assert.equal(calls.filter((c) => c.head).length, 2, "failed counts must not be cached");
  globalThis.fetch = realFetch;

  // R3-02: 母数が古く窓が空のときは offset=0 で1回だけ取り直す
  resetPoolSizeCache();
  await next(get("?limit=10")); // キャッシュ(40/20)
  POOL.papers = 10;
  POOL.news = 6;
  Math.random = () => 0.99;
  calls = [];
  const staleRes = await next(get("?limit=10"));
  const staleBody = await staleRes.json();
  assert.ok(staleBody.items.length > 0, "empty window must be retried from offset 0");
  assert.ok(calls.some((c) => !c.head && c.url.searchParams.get("offset") === "0"), "retry at offset 0");
  POOL.papers = 40;
  POOL.news = 20;
  Math.random = () => 0.5;

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
