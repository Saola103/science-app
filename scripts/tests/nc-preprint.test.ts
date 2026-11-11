/**
 * bioRxiv/medRxiv の CC BY-NC 論文を表示対象に含める変更(2026-11-12、法務整備書 第7章)のテスト。
 * 実行: CRON_SECRET=x npx tsx scripts/tests/nc-preprint.test.ts
 *  - 収集(fetchBiorxivPapers)は cc_by_nc 単独だけ新たに取り込み、ND/SA系・補完値・空欄は取り込まない。
 *  - 表示判定・可視性フィルタ・出典行(帰属)は NC のときだけ文言を出す。cc_by / cc0 の既存表示は不変。
 */
import assert from "node:assert/strict";
import { fetchBiorxivPapers } from "../../lib/sources/biorxiv";
import {
  PAPER_VISIBILITY_OR,
  attributionFor,
  isNcPreprint,
  isPaperDisplayable,
  isPreprintLicenseAllowed,
} from "../../lib/sources/policy";
import { mapFeedItemToArticle } from "../../lib/proto/mapArticle";

(async () => {
  // ── 収集側: スタブfetchでbioRxiv APIを模す ──────────────────────────────────
  const LICENSES = ["cc_by", "cc0", "cc0_ng", "cc_by_nc", "cc_by_nc_nd", "cc_by_nd", "cc_by_nc_sa", "cc_no", "CC BY", "CC_BY_NC", " cc_by_nc", "cc_by_nc ", "", "none"];
  const collection = LICENSES.map((license, i) => ({
    doi: `10.1101/2026.01.${String(i).padStart(2, "0")}.000001`,
    title: `T${i}`,
    authors: "A B; C D",
    author_corresponding: "A B",
    date: "2026-11-10",
    abstract: "abstract ".repeat(20),
    category: "neuroscience",
    server: "bioRxiv",
    license,
  }));
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ messages: [{ status: "ok" }], collection }), { status: 200, headers: { "content-type": "application/json" } })) as typeof fetch;
  try {
    const got = await fetchBiorxivPapers("biorxiv", "neuroscience", 2, 100);
    assert.deepEqual(got.map((p) => p.license), ["cc_by", "cc0", "cc0_ng", "cc_by_nc"]); // ND/SA/補完値/大文字/空白付き/空欄は収集しない
    for (const p of got) assert.equal(isPaperDisplayable(p), true); // 収集したものは必ず表示側も通る(収集と表示の整合)
  } finally {
    globalThis.fetch = realFetch;
  }

  // ── 表示側: 完全一致のみ ────────────────────────────────────────────────────
  for (const license of LICENSES) {
    const expected = ["cc_by", "cc0", "cc0_ng", "cc_by_nc"].includes(license);
    assert.equal(isPreprintLicenseAllowed(license), expected, license);
    for (const source of ["bioRxiv", "medRxiv"]) assert.equal(isPaperDisplayable({ source, license }), expected, `${source}/${license}`);
  }
  assert.equal(isPaperDisplayable({ source: "arXiv", license: "cc_by_nc" }), true); // arXiv は従来どおり(license 不問)
  assert.equal(isPaperDisplayable({ source: "EuropePMC", license: "cc_by_nc" }), false);
  assert.ok(PAPER_VISIBILITY_OR.includes("license.in.(cc_by,cc0,cc0_ng,cc_by_nc)"));
  for (const bad of ["cc_by_nc_nd", "cc_by_nd", "cc_by_nc_sa", "cc_no", "CC BY"]) assert.ok(!PAPER_VISIBILITY_OR.includes(bad), bad);

  // ── 出典行: NC のときだけ ──────────────────────────────────────────────────
  assert.equal(isNcPreprint({ source: "bioRxiv", license: "cc_by_nc" }), true);
  assert.equal(isNcPreprint({ source: "medRxiv", license: "cc_by_nc" }), true);
  assert.equal(isNcPreprint({ source: "bioRxiv", license: "cc_by" }), false);
  assert.equal(isNcPreprint({ source: "bioRxiv", license: "cc_by_nc_nd" }), false);
  assert.equal(isNcPreprint({ source: "EuropePMC", license: "cc_by_nc" }), false);
  for (const source of ["bioRxiv", "medRxiv"]) {
    const a = attributionFor(source, "cc_by_nc")!;
    assert.ok(a.includes("CC BY-NC") && a.includes("https://creativecommons.org/licenses/by-nc/4.0/") && a.includes("変更あり") && a.includes("プレプリント") && a.includes(`${source}の推奨を意味しません`), a);
    assert.equal(attributionFor(source, "cc_by"), null); // 既存の表示は不変
    assert.equal(attributionFor(source, "cc0"), null);
    assert.equal(attributionFor(source, undefined), null);
    assert.equal(attributionFor(source, "cc_by_nc_nd"), null);
  }
  assert.equal(attributionFor("arXiv", "cc_by_nc"), null);
  assert.ok(attributionFor("ESO")!.includes("CC BY 4.0")); // 既存の CC BY 帰属は不変

  // カード・詳細(mapFeedItemToArticle → article.attribution)
  const base = { id: "p9", type: "paper" as const, title: "t", summary_general: "要約", url: "https://www.biorxiv.org/content/x", authors: ["A"] };
  const nc = mapFeedItemToArticle({ ...base, source: "bioRxiv", license: "cc_by_nc" });
  assert.ok(nc.attribution && nc.attribution.includes("CC BY-NC") && nc.attribution.includes("変更あり"));
  assert.equal(mapFeedItemToArticle({ ...base, source: "bioRxiv" }).attribution, undefined);
  assert.equal(mapFeedItemToArticle({ ...base, source: "bioRxiv", license: "cc_by" }).attribution, undefined);

  console.log("nc-preprint: OK");
})();
