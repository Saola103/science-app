/**
 * CC BY 新ソース(ESO/ESA、Europe PMC、Frontiers for Young Minds、PLOS)のテスト。
 * 実行: npx tsx scripts/tests/sources-expansion.test.ts (ネットワーク・DB不要)
 *  - ライセンスは完全一致のみ、訂正記事は除外
 *  - Groq枠ガードの判定
 */
import assert from "node:assert/strict";
import {
  NEWS_CC_BY_SOURCES,
  OPEN_ACCESS_PAPER_SOURCES,
  isPaperDisplayable,
  isAllowedNewsSource,
  attributionFor,
  sourceLabelWithJournal,
  sourceDisplayName,
} from "../../lib/sources/policy";
import {
  cleanText,
  isCorrectionLike,
  isEuropePmcLicenseAllowed,
  hasCrossrefCcBy4,
  parseEpmcRecord,
  parseCrossrefItem,
  extractAuthorSummary,
  buildJournalsQuery,
  buildTopicsQuery,
} from "../../lib/sources/openAccess";
import { toExcerpt } from "../../lib/sources/rss";
import {
  decideGate,
  applyCaps,
  NewSourceGate,
  NEW_SOURCES_USAGE_CEILING,
  NEW_SOURCES_DEADLINE_MS,
  UNKNOWN_USAGE_MAX_ITEMS,
  OPEN_ACCESS_PAPERS_PER_RUN,
  OPEN_ACCESS_STREAM_CAPS,
} from "../../lib/pipeline/openAccessBudget";

// ── 1. policy.ts と migration 014 の一致は scripts/tests/migration014.test.ts ──────────

// ── 2. 表示判定(許可リスト・ライセンス完全一致) ──────────────────────────────
for (const src of OPEN_ACCESS_PAPER_SOURCES) {
  assert.equal(isPaperDisplayable({ source: src, license: "cc_by" }), true, src);
  assert.equal(isPaperDisplayable({ source: src, license: "cc by" }), false); // 生値は保存しない
  assert.equal(isPaperDisplayable({ source: src, license: "CC_BY" }), false);
  assert.equal(isPaperDisplayable({ source: src, license: " cc_by" }), false);
  assert.equal(isPaperDisplayable({ source: src, license: "cc_by_nc" }), false);
  assert.equal(isPaperDisplayable({ source: src, license: null }), false);
  assert.equal(isPaperDisplayable({ source: src }), false);
}
assert.equal(isPaperDisplayable({ source: "europepmc", license: "cc_by" }), false); // 大文字小文字も完全一致
assert.equal(isPaperDisplayable({ source: "arXiv" }), true); // 既存は不変
assert.equal(isPaperDisplayable({ source: "bioRxiv", license: "cc_by" }), true);
assert.equal(isPaperDisplayable({ source: "bioRxiv", license: "cc_by_nc" }), false);
for (const n of NEWS_CC_BY_SOURCES) assert.equal(isAllowedNewsSource(n), true);
assert.deepEqual([...NEWS_CC_BY_SOURCES], ["ESO", "ESA/Webb", "ESA/Hubble"]);
assert.equal(isAllowedNewsSource("国立天文台"), false); // 確認連絡が未決のため追加しない
assert.equal(isAllowedNewsSource("NAOJ"), false);
assert.equal(isAllowedNewsSource("CERN"), false);
assert.equal(isAllowedNewsSource("Phys.org"), false);

// ── 3. 帰属表示(既存の出典行に足す文言のみ) ──────────────────────────────────
assert.equal(attributionFor("NASA"), null);
assert.equal(attributionFor("NSF"), null);
// 出典行: Europe PMC 経由は元の雑誌名を添える。取れなければ従来どおり
assert.equal(sourceLabelWithJournal("EuropePMC", "J Neurosci"), "J Neurosci(Europe PMC経由)");
assert.equal(sourceLabelWithJournal("EuropePMC", ""), "Europe PMC");
assert.equal(sourceLabelWithJournal("EuropePMC", null), "Europe PMC");
assert.equal(sourceLabelWithJournal("arXiv", "Some Journal"), "arXiv");
assert.equal(sourceLabelWithJournal("PLOS", "PLoS Comput Biol"), "PLOS");
assert.equal(attributionFor("arXiv"), null);
assert.equal(attributionFor(null), null);
for (const s of ["ESO", "ESA/Webb", "ESA/Hubble", "FrontiersYoungMinds"]) {
  const a = attributionFor(s)!;
  assert.ok(a.includes("CC BY 4.0") && a.includes("https://creativecommons.org/licenses/by/4.0/") && a.includes("変更あり"), s);
}
for (const s of ["EuropePMC", "PLOS"]) {
  const a = attributionFor(s)!;
  assert.ok(a.includes("CC BY") && a.includes("変更あり"), s);
}
assert.ok(attributionFor("ESO")!.includes("推奨を意味しません"));
assert.equal(sourceDisplayName("EuropePMC"), "Europe PMC");
assert.equal(sourceDisplayName("NASA"), "NASA");

// ── 4. ライセンスゲート(取り込み時の完全一致) ────────────────────────────────
assert.equal(isEuropePmcLicenseAllowed("cc by"), true);
for (const bad of ["CC BY", "cc by ", "cc by-nc", "cc by-nd", "cc by-sa", "cc by-nc-nd", "cc0", "", undefined, null, "cc_by"]) {
  assert.equal(isEuropePmcLicenseAllowed(bad as any), false, String(bad));
}
assert.equal(hasCrossrefCcBy4([{ URL: "https://creativecommons.org/licenses/by/4.0/" }]), true);
assert.equal(hasCrossrefCcBy4([{ URL: "https://creativecommons.org/licenses/by-nc/4.0/" }]), false);
assert.equal(hasCrossrefCcBy4([{ URL: "https://creativecommons.org/licenses/by/3.0/" }]), false);
assert.equal(hasCrossrefCcBy4([]), false);
assert.equal(hasCrossrefCcBy4(undefined), false);

const abs = "x".repeat(150);
const baseEpmc = {
  source: "MED", pmcid: "PMC123", doi: "10.1523/eneuro.0001-26.2026", title: "A good paper", authorString: "Smith J, Lee K.",
  abstractText: abs, license: "cc by", isOpenAccess: "Y", firstPublicationDate: "2026-11-04",
  pubTypeList: { pubType: ["research-article", "Journal Article"] }, journalInfo: { journal: { title: "eNeuro" } },
};
const ok = parseEpmcRecord(baseEpmc, "epmc_journals")!;
assert.equal(ok.id, "epmc:PMC123");
assert.equal(ok.license, "cc_by");
assert.equal(ok.source, "EuropePMC");
assert.deepEqual(ok.authors, ["Smith J", "Lee K"]);
assert.equal(ok.url, "https://doi.org/10.1523/eneuro.0001-26.2026");
assert.equal(ok.publishedAt, "2026-11-04T00:00:00Z");
assert.equal(parseEpmcRecord(baseEpmc, "plos_author_summary")!.id, "plos:PMC123");
assert.equal(parseEpmcRecord(baseEpmc, "plos_author_summary")!.source, "PLOS");
assert.equal(parseEpmcRecord({ ...baseEpmc, license: "cc by-nc" }, "epmc_journals"), null);
assert.equal(parseEpmcRecord({ ...baseEpmc, license: undefined }, "epmc_journals"), null);
assert.equal(parseEpmcRecord({ ...baseEpmc, source: "PPR" }, "epmc_journals"), null); // プレプリント
assert.equal(parseEpmcRecord({ ...baseEpmc, isOpenAccess: "N" }, "epmc_journals"), null);
assert.equal(parseEpmcRecord({ ...baseEpmc, pmcid: undefined }, "epmc_journals"), null);
assert.equal(parseEpmcRecord({ ...baseEpmc, abstractText: "short" }, "epmc_journals"), null);
assert.equal(parseEpmcRecord({ ...baseEpmc, title: "Correction: A good paper" }, "epmc_journals"), null);
assert.equal(parseEpmcRecord({ ...baseEpmc, pubTypeList: { pubType: ["Published Erratum"] } }, "epmc_journals"), null);
assert.equal(parseEpmcRecord({ ...baseEpmc, pubTypeList: { pubType: ["Comment", "Editorial"] } }, "epmc_journals"), null);
// 固定語(意識・麻酔・睡眠)検索だけ症例報告を除外。誌名リスト検索は対象外
const caseReport = { ...baseEpmc, pubTypeList: { pubType: ["Journal Article", "Case Reports"] } };
assert.equal(parseEpmcRecord(caseReport, "epmc_topics"), null);
assert.ok(parseEpmcRecord(caseReport, "epmc_journals"));
assert.ok(buildTopicsQuery(14, new Date("2026-11-10T00:00:00Z")).includes('AND NOT PUB_TYPE:"Case Reports"'));
assert.ok(!buildJournalsQuery(14, new Date("2026-11-10T00:00:00Z")).includes("Case Reports"));
assert.equal(isCorrectionLike("Erratum to: x", undefined), true);
assert.equal(isCorrectionLike("Retraction notice: x", undefined), true);
assert.equal(isCorrectionLike("Corrections in the cortex", undefined), false);

const baseCr = {
  DOI: "10.3389/frym.2026.1900102", title: ["How a <i>Stroke</i> Can Make Half of the World Seem to Disappear"], type: "journal-article",
  abstract: "<jats:p>" + "y".repeat(150) + "</jats:p>", license: [{ URL: "https://creativecommons.org/licenses/by/4.0/", "content-version": "vor" }],
  author: [{ given: "Eugénie", family: "Cataldo" }], "container-title": ["Frontiers for Young Minds"], published: { "date-parts": [[2026, 10, 28]] },
};
const fy = parseCrossrefItem(baseCr)!;
assert.equal(fy.id, "frym:10.3389/frym.2026.1900102");
assert.equal(fy.title, "How a Stroke Can Make Half of the World Seem to Disappear");
assert.equal(fy.abstract, "y".repeat(150));
assert.equal(fy.publishedAt, "2026-10-28T00:00:00Z");
assert.equal(fy.source, "FrontiersYoungMinds");
assert.deepEqual(fy.authors, ["Eugénie Cataldo"]);
assert.equal(parseCrossrefItem({ ...baseCr, license: [{ URL: "https://creativecommons.org/licenses/by-nc/4.0/" }] }), null);
assert.equal(parseCrossrefItem({ ...baseCr, license: [] }), null);
assert.equal(parseCrossrefItem({ ...baseCr, "container-title": ["Frontiers in Neuroscience"] }), null); // container-title の曖昧一致対策
assert.equal(parseCrossrefItem({ ...baseCr, title: ["Correction: x"] }), null);
assert.equal(parseCrossrefItem({ ...baseCr, DOI: "10.3389/x y" }), null);

// 本文は保存しない: 全文XMLからは Author summary だけを取り出し、XMLそのものは返さない
const xml = `<article><license><ali:license_ref>https://creativecommons.org/licenses/by/4.0/</ali:license_ref></license>
<abstract><p>normal abstract</p></abstract>
<abstract abstract-type="summary"><title>Author summary</title><p>${"z".repeat(150)} &amp; <italic>more</italic></p></abstract>
<body><p>FULL TEXT SECRET</p></body></article>`;
const sm = extractAuthorSummary(xml)!;
assert.ok(sm.startsWith("zzz") && sm.endsWith("& more") && !sm.includes("FULL TEXT") && !sm.includes("Author summary"));
assert.equal(extractAuthorSummary(xml.replace("licenses/by/4.0", "licenses/by-nc/4.0")), null);
assert.equal(extractAuthorSummary("<article><license>https://creativecommons.org/licenses/by/4.0/</license><body/></article>"), null);
assert.equal(cleanText("A &lt;i&gt;b&lt;/i&gt; p &lt; 0.05 &amp; c"), "A b p < 0.05 & c");

// クエリは固定語のみ(ユーザー入力・個人情報なし)・ライセンスはcc byに限定
for (const q of [buildJournalsQuery(14, new Date("2026-11-10T00:00:00Z")), buildTopicsQuery(14, new Date("2026-11-10T00:00:00Z"))]) {
  assert.ok(q.includes('LICENSE:"cc by"') && q.includes("OPEN_ACCESS:y") && q.includes("SRC:MED"));
  assert.ok(q.includes("FIRST_PDATE:[2026-10-27 TO 2026-11-10]"));
}
assert.ok(buildJournalsQuery().includes('JOURNAL:"Neurosci Conscious"'));

// ── 5. ニュースの抜粋(画像タグがエスケープされて入るESA/Webb形式) ─────────────────
const webb = '&lt;img src="https://www.esawebb.org/media/a.jpg"\n style="text-align: left;"\n alt="Cat’s Head"/&gt;The NASA/ESA Hubble and Webb telescopes stared at a scene.';
const ex = toExcerpt(webb + " lorem".repeat(200));
assert.ok(ex.startsWith("The NASA/ESA Hubble and Webb") && ex.length <= 300 && !/img|src=|&lt;|&gt;/.test(ex));

// ── 6. Groq枠ガード ─────────────────────────────────────────────────────────────
const g = (o: Partial<Parameters<typeof decideGate>[0]> = {}) =>
  decideGate({ processed: 0, cap: 6, elapsedMs: 1000, estTokens: 3500, usage: { tokensUsed: 50_000, available: true }, ...o });
assert.deepEqual(g(), { ok: true });
assert.deepEqual(g({ processed: 6 }), { ok: false, reason: "cap" });
assert.deepEqual(g({ elapsedMs: NEW_SOURCES_DEADLINE_MS + 1 }), { ok: false, reason: "deadline" });
assert.deepEqual(g({ usage: { tokensUsed: NEW_SOURCES_USAGE_CEILING, available: true } }), { ok: false, reason: "usage" });
assert.deepEqual(g({ usage: { tokensUsed: NEW_SOURCES_USAGE_CEILING - 3500, available: true } }), { ok: true }); // ちょうど収まる
assert.deepEqual(g({ usage: { tokensUsed: NEW_SOURCES_USAGE_CEILING - 3499, available: true } }), { ok: false, reason: "usage" });
assert.deepEqual(g({ usage: { tokensUsed: 0, available: false }, processed: UNKNOWN_USAGE_MAX_ITEMS }), { ok: false, reason: "usage" });
assert.deepEqual(g({ usage: { tokensUsed: 0, available: false }, processed: UNKNOWN_USAGE_MAX_ITEMS - 1 }), { ok: true });
// 最悪ケースでも日次枠に収まる: 天井 + 1件ぶん < 200k、かつ 1日2回の最大消費の見積もり
assert.ok(NEW_SOURCES_USAGE_CEILING + 3500 < 200_000);
assert.ok(NEW_SOURCES_DEADLINE_MS < 300_000);
assert.ok(Object.values(OPEN_ACCESS_STREAM_CAPS).reduce((a, b) => a + b, 0) >= OPEN_ACCESS_PAPERS_PER_RUN);

const items = [
  ...Array.from({ length: 5 }, (_, i) => ({ stream: "epmc_journals", n: i })),
  ...Array.from({ length: 5 }, (_, i) => ({ stream: "epmc_topics", n: i })),
  { stream: "frontiers_young_minds", n: 0 },
  { stream: "frontiers_young_minds", n: 1 },
  { stream: "unknown", n: 0 },
];
const capped = applyCaps(items, OPEN_ACCESS_STREAM_CAPS, OPEN_ACCESS_PAPERS_PER_RUN);
assert.equal(capped.length, OPEN_ACCESS_PAPERS_PER_RUN);
assert.equal(capped.filter((c) => c.stream === "epmc_journals").length, 3);
assert.equal(capped.filter((c) => c.stream === "epmc_topics").length, 2);
assert.equal(capped.filter((c) => c.stream === "frontiers_young_minds").length, 1);
assert.equal(capped.filter((c) => c.stream === "unknown").length, 0);

(async () => {
  // NewSourceGate: 件数上限で止まり、一度止まったら再開しない。毎回使用量を読む。
  let reads = 0;
  const gate = new NewSourceGate(Date.now(), 2, 3500, async () => (reads++, { tokensUsed: 10_000, available: true }));
  assert.equal(await gate.allow(), true);
  assert.equal(await gate.allow(), true);
  assert.equal(await gate.allow(), false);
  assert.equal(gate.stoppedBy, "cap");
  assert.equal(await gate.allow(), false);
  assert.equal(gate.count, 2);
  assert.equal(reads, 3);
  // 使用量が天井に近づいたら止まる
  let used = 100_000;
  const gate2 = new NewSourceGate(Date.now(), 10, 3500, async () => ({ tokensUsed: (used += 10_000), available: true }));
  assert.equal(await gate2.allow(), true); // 110k+3.5k <= 120k
  assert.equal(await gate2.allow(), false); // 120k+3.5k > 120k
  assert.equal(gate2.stoppedBy, "usage");
  // 開始から時間が経ちすぎていたら始めない
  const gate3 = new NewSourceGate(Date.now() - NEW_SOURCES_DEADLINE_MS - 1000, 5, 3500, async () => ({ tokensUsed: 0, available: true }));
  assert.equal(await gate3.allow(), false);
  assert.equal(gate3.stoppedBy, "deadline");
  console.log("sources-expansion: OK");
})();
