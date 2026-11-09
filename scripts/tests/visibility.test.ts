import assert from "node:assert/strict";
import {
  PAPER_VISIBILITY_OR,
  NEWS_ALLOWED_SOURCES,
  NEWS_EXCLUDED_REASONS,
  isPaperDisplayable,
  isAllowedNewsSource,
} from "../../lib/sources/policy";
import { applyNewsVisibility, applyPaperVisibility, fetchVisibleItemsByIds } from "../../lib/sources/visibility";

// --- R1-02: 許可リスト方式 ---
assert.equal(isPaperDisplayable({ source: "arXiv" }), true);
assert.equal(isPaperDisplayable({ source: "bioRxiv", license: "cc_by" }), true);
assert.equal(isPaperDisplayable({ source: "medRxiv", license: "cc0" }), true);
assert.equal(isPaperDisplayable({ source: "bioRxiv", license: "cc_by_nc" }), false);
assert.equal(isPaperDisplayable({ source: "bioRxiv", license: null }), false);
assert.equal(isPaperDisplayable({ source: "biorxiv", license: "cc_by_nc" }), false); // 小文字
assert.equal(isPaperDisplayable({ source: "biorxiv", license: "cc_by" }), false); // SQL(完全一致)と揃える
assert.equal(isPaperDisplayable({ source: "PubMed" }), false);
assert.equal(isPaperDisplayable({ source: null }), false);
assert.equal(isPaperDisplayable({}), false);
assert.equal(isPaperDisplayable({ source: "arxiv" }), false);
// SQL条件とJS判定が同じ source 集合を参照している
assert.ok(PAPER_VISIBILITY_OR.includes("source.eq.arXiv"));
assert.ok(PAPER_VISIBILITY_OR.includes("source.in.(bioRxiv,medRxiv)"));

// --- ニュース許可リスト(CERN除外) ---
assert.deepEqual([...NEWS_ALLOWED_SOURCES], ["NASA", "NSF"]);
assert.equal(isAllowedNewsSource("CERN"), false);
assert.ok(NEWS_EXCLUDED_REASONS["CERN"]);
assert.equal(isAllowedNewsSource("NASA"), true);

// --- 共通関数が条件を付ける ---
const calls: string[] = [];
const rec: any = { or: (f: string) => (calls.push("or:" + f), rec), in: (c: string, v: string[]) => (calls.push(`in:${c}:${v.join("|")}`), rec) };
applyPaperVisibility(rec);
applyNewsVisibility(rec);
assert.deepEqual(calls, ["or:" + PAPER_VISIBILITY_OR, "in:source_name:NASA|NSF"]);

// --- R1-01: 履歴取得でも非表示行を返さない(SQLが効かなくてもJS側で二重に落とす) ---
function fakeClient(rows: Record<string, any[]>, log: string[]) {
  return {
    schema: () => ({
      from: (table: string) => {
        const q: any = {
          select: (cols: string) => (log.push(`${table}:select:${cols}`), q),
          in: (c: string, v: string[]) => (log.push(`${table}:in:${c}`), q),
          or: (f: string) => (log.push(`${table}:or`), q),
          then: (res: any) => res({ data: rows[table] }),
        };
        return q;
      },
    }),
  };
}
(async () => {
  const log: string[] = [];
  const client = fakeClient(
    {
      papers: [
        { id: "p1", source: "arXiv", license: null, title: "ok" },
        { id: "p2", source: "bioRxiv", license: "cc_by_nc", title: "nc" },
        { id: "p3", source: "PubMed", license: null, title: "pm" },
        { id: "p4", source: "medRxiv", license: "cc_by", title: "med" },
      ],
      news: [
        { id: "n1", source_name: "NASA", title: "nasa" },
        { id: "n2", source_name: "Phys.org", title: "phys" },
        { id: "n3", source_name: "CERN", title: "cern" },
      ],
    },
    log
  );
  const items = await fetchVisibleItemsByIds(client, "public", ["p1", "p2", "p3", "p4"], ["n1", "n2", "n3"]);
  assert.deepEqual(items.map((i) => i.id).sort(), ["n1", "p1", "p4"]);
  assert.ok(items.every((i) => !("license" in i)));
  assert.equal(items.find((i) => i.id === "n1").source, "NASA");
  assert.ok(log.includes("papers:or") && log.some((l) => l.startsWith("news:in:source_name")));
  assert.ok(log.every((l) => !/news:select:.*\bsource\b(?!_)/.test(l.replace("source_name", ""))), "news select must use source_name");
  console.log("visibility: OK");
})();
