// G4: /api/search の「DBヒット5件未満 → arXiv/PubMed ライブ取得」経路が公開ポリシーを通ること。
// PubMed(source "PubMed"・license 未検証)は取得も返却もしない。外部通信はスタブ。
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { NextRequest } from "next/server";

process.env.NEXT_PUBLIC_SUPABASE_URL = "http://stub.local";
process.env.SUPABASE_SERVICE_ROLE_KEY = "stub";

const ATOM = `<feed><entry><id>https://arxiv.org/abs/2601.00001v1</id><title>Live Arxiv Paper</title><summary>abs</summary><published>2026-01-01T00:00:00Z</published><author><name>A</name></author></entry></feed>`;
const urls: string[] = [];
globalThis.fetch = (async (input: any) => {
  const u = String(typeof input === "string" ? input : input?.url ?? input);
  urls.push(u);
  if (u.includes("export.arxiv.org")) return new Response(ATOM, { status: 200, headers: { "content-type": "application/atom+xml" } });
  throw new Error("blocked in test: " + u); // PubMed(eutils/ncbi)・Supabase・Groq など
}) as typeof fetch;

async function main() {
  const { POST } = await import("../../app/api/search/route");
  const { isPaperDisplayable } = await import("../../lib/sources/policy");
  let n = 0;
  const post = (body: unknown) =>
    POST(new NextRequest("http://localhost/api/search", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json", "x-forwarded-for": `9.9.9.${n++}` } }));

  // ポリシー: PubMed は表示不可(license 文字列によらない)
  for (const license of ["PMC Open Access", "PubMed", "cc_by", "open access"]) {
    assert.equal(isPaperDisplayable({ source: "PubMed", license }), false, `PubMed/${license}`);
  }

  // source=all: arXiv だけ返り、PubMed へは一切アクセスしない
  urls.length = 0;
  let r = await post({ mode: "keyword", query: "neuron", source: "all" });
  assert.equal(r.status, 200);
  let j = await r.json();
  assert.ok(j.papers.length >= 1);
  assert.ok(j.papers.every((p: any) => p.source === "arXiv" && isPaperDisplayable(p)), "arXiv 以外が混ざっている");
  assert.ok(!urls.some((u) => /ncbi|eutils|pubmed/i.test(u)), "PubMed へ通信している: " + urls.join(","));

  // source=pubmed: 0件(外部取得なし)
  urls.length = 0;
  r = await post({ mode: "keyword", query: "neuron", source: "pubmed" });
  assert.equal(r.status, 200);
  j = await r.json();
  assert.deepEqual(j.papers, []);
  assert.ok(!urls.some((u) => /arxiv|ncbi|eutils|pubmed/i.test(u)), "source=pubmed で外部通信している");

  // ソース上も PubMed 取得が残っていない
  assert.ok(!/fetchPubMedPapers/.test(readFileSync("app/api/search/route.ts", "utf8")));
  console.log("search-live-policy: OK");
}
main().catch((e) => { console.error(e); process.exit(1); });
