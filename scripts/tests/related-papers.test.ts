// 関連論文(/api/papers/similar)の復元分の検証。スタブfetchでSupabaseを模す(実DB・外部通信なし)。
//  - 可視性ルール(isPaperDisplayable)を通らない論文は返さない / 自分自身は除く
//  - リンク先(/api/feed?ids=paper-<id>)は可視性条件つきで取得され、NC論文には license が付く(出典行用)
import assert from "node:assert/strict";
import { NextRequest } from "next/server";

process.env.NEXT_PUBLIC_SUPABASE_URL = "http://stub.local";
process.env.SUPABASE_SERVICE_ROLE_KEY = "stub";

const SELF = "self-1";
const rows = [
  { id: SELF, source: "arXiv", license: null },
  { id: "a1", source: "arXiv", license: null },
  { id: "nc1", source: "bioRxiv", license: "cc_by_nc" },
  { id: "ncnd", source: "bioRxiv", license: "cc_by_nc_nd" },
  { id: "pm", source: "PubMed", license: null },
  { id: "epmc-ok", source: "EuropePMC", license: "cc_by" },
  { id: "epmc-null", source: "EuropePMC", license: null },
  { id: "brx-null", source: "medRxiv", license: null },
].map((r) => ({ ...r, title: r.id, summary_general: `見出し ${r.id}\n本文`, similarity: 0.9 }));

const urls: string[] = [];
globalThis.fetch = (async (input: any, init?: any) => {
  const url = new URL(typeof input === "string" ? input : input.url);
  urls.push(url.pathname + url.search);
  const json = (b: unknown) => new Response(JSON.stringify(b), { status: 200, headers: { "content-type": "application/json" } });
  if (url.pathname.endsWith("/rpc/match_papers")) return json(rows);
  if (url.pathname.endsWith("/papers") && url.searchParams.get("select") === "summary_embedding") return json({ summary_embedding: "[0.1,0.2]" });
  if (url.pathname.endsWith("/papers") && url.searchParams.has("id")) {
    return json([{ id: "nc1", title: "t", summary_general: "見出し\n本文", summary: "s", summary_expert: "e", category: "biology", published_at: "2026-11-01", url: "https://x.org", authors: [], source: "bioRxiv", journal: null, license: "cc_by_nc", image_url: null }]);
  }
  return json([]);
}) as typeof fetch;

async function main() {
  const { POST } = await import("../../app/api/papers/similar/route");
  const res = await POST(new NextRequest("http://localhost/api/papers/similar", { method: "POST", body: JSON.stringify({ paperId: SELF, limit: 5 }), headers: { "content-type": "application/json" } }));
  assert.equal(res.status, 200);
  const ids = ((await res.json()).papers as { id: string }[]).map((p) => p.id).sort();
  assert.deepEqual(ids, ["a1", "epmc-ok", "nc1"], "表示可のものだけ(自分・PubMed・NC-ND・ライセンス無しは除く)");

  const bad = await POST(new NextRequest("http://localhost/api/papers/similar", { method: "POST", body: JSON.stringify({}), headers: { "content-type": "application/json" } }));
  assert.equal(bad.status, 400);

  // 飛び先: /api/feed?ids=paper-nc1 が可視性条件つきで引かれ、NC には license が付く
  urls.length = 0;
  const { GET } = await import("../../app/api/feed/route");
  const { PAPER_VISIBILITY_OR } = await import("../../lib/sources/policy");
  const fr = await GET(new NextRequest("http://localhost/api/feed?ids=paper-nc1"));
  const item = (await fr.json()).items[0];
  assert.equal(item.license, "cc_by_nc");
  const q = urls.find((u) => u.includes("/papers") && u.includes("id=in."))!;
  assert.ok(q && new URL("http://x" + q).searchParams.getAll("or").includes(`(${PAPER_VISIBILITY_OR})`), "ids取得に可視性条件が付く");
  console.log("related-papers test OK");
}
main().catch((e) => { console.error(e); process.exit(1); });
