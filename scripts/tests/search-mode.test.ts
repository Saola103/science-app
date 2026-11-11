// /api/search: deep/drill 削除後は mode: "keyword" 以外を 400 にする(入力検証)。DB・外部通信なし。
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { NextRequest } from "next/server";

process.env.NEXT_PUBLIC_SUPABASE_URL = "http://stub.local";
process.env.SUPABASE_SERVICE_ROLE_KEY = "stub";
globalThis.fetch = (async () => { throw new Error("no network in this test"); }) as typeof fetch;

async function main() {
  const { POST } = await import("../../app/api/search/route");
  const post = (body: unknown) =>
    POST(new NextRequest("http://localhost/api/search", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } }));
  for (const mode of ["deep", "drill", "", "KEYWORD", undefined, 1, null]) {
    const r = await post({ mode, query: "brain" });
    assert.equal(r.status, 400, `mode=${String(mode)}`);
    assert.equal((await r.json()).error, "Invalid mode");
  }
  assert.equal((await post({ query: "brain" })).status, 400);
  assert.equal((await post({ mode: "keyword", query: 5 })).status, 400);
  const src = readFileSync("app/api/search/route.ts", "utf8");
  assert.ok(!/deep|drill|history/i.test(src), "deep/drill/history の処理が残っている");
  console.log("search-mode test OK");
}
main().catch((e) => { console.error(e); process.exit(1); });
