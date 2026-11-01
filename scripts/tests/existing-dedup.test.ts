/**
 * Minimal test for the already-processed classification (no test framework in
 * this repo). Run: npx tsx scripts/tests/existing-dedup.test.ts
 */
import assert from "node:assert/strict";
import { classifyCandidates, isProcessedRow, isSafeId, fetchExistingRowsWith, type ChunkQuery } from "../../lib/pipeline/existing";
import { computeStatus } from "../../lib/health/collectionHealth";

const good = "光る脳の謎\n\n本文です。\n\nやさしい説明。";
const longEnglishHead = "This is a long English first line that is not a Japanese headline at all";

// papers
assert.equal(isProcessedRow("papers", { id: "a", summary_general: good, summary_expert: "目的: x" }), true);
assert.equal(isProcessedRow("papers", { id: "a", summary_general: good, summary_expert: null }), false);
assert.equal(isProcessedRow("papers", { id: "a", summary_general: null, summary_expert: "x" }), false);
assert.equal(isProcessedRow("papers", { id: "a", summary_general: longEnglishHead, summary_expert: "x" }), false);
// news (expert not required)
assert.equal(isProcessedRow("news", { id: "n", summary_general: good }), true);
assert.equal(isProcessedRow("news", { id: "n", summary_general: "" }), false);

const c = classifyCandidates(
  "papers",
  ["ok", "broken", "missing", "ok", "noexpert"],
  [
    { id: "ok", summary_general: good, summary_expert: "e" },
    { id: "broken", summary_general: longEnglishHead, summary_expert: "e" },
    { id: "noexpert", summary_general: good, summary_expert: null },
    { id: "unrelated", summary_general: good, summary_expert: "e" },
  ]
);
assert.deepEqual(c.skipIds, ["ok"]);
assert.deepEqual(c.repairIds, ["broken", "noexpert"]);
assert.deepEqual(c.newIds, ["missing"]);

// health status
assert.equal(computeStatus({ papersAgeHours: 5, newsAgeHours: 5, todayRatio: 0.5 }).status, "ok");
assert.equal(computeStatus({ papersAgeHours: 37, newsAgeHours: 5, todayRatio: 0.1 }).status, "stale");
assert.equal(computeStatus({ papersAgeHours: 36, newsAgeHours: 19, todayRatio: 0.1 }).status, "stale");
assert.equal(computeStatus({ papersAgeHours: 5, newsAgeHours: 5, todayRatio: 0.81 }).status, "budget_high");
assert.equal(computeStatus({ papersAgeHours: 5, newsAgeHours: 5, todayRatio: 0.8 }).status, "ok");
assert.equal(computeStatus({ papersAgeHours: null, newsAgeHours: 5, todayRatio: 0 }).status, "stale");

// ID validation: real-world formats pass, filter-breaking ids do not
for (const id of [
  "http://arxiv.org/abs/2401.01234v1",
  "https://arxiv.org/abs/hep-th/9901001v2",
  "biorxiv:10.1101/2024.01.02.573900",
  "medrxiv:10.1101/2024.01.02.24300001",
  "rss-1a2b3c4d",
  "rss-https://example.com/a~b+c_d",
]) assert.equal(isSafeId(id), true, id);
for (const id of ['a",b', "a b", "a)", "a(b", "a\nb", "", "a'b", "a,b"]) assert.equal(isSafeId(id), false, JSON.stringify(id));

async function run() {
  // invalid id excluded and never queried
  const seen: string[][] = [];
  const q1: ChunkQuery = async (ids) => {
    seen.push(ids);
    return { data: ids.map((id) => ({ id, summary_general: good })), error: null };
  };
  const r1 = await fetchExistingRowsWith(q1, ["ok1", 'a",b', "ok2"]);
  assert.deepEqual(r1.invalidIds, ['a",b']);
  assert.deepEqual(r1.rows.map((r) => r.id), ["ok1", "ok2"]);
  assert.equal(seen.flat().includes('a",b'), false);

  // chunk fails -> per-id retry; only "bad" stays failed
  const calls: string[][] = [];
  const q2: ChunkQuery = async (ids) => {
    calls.push(ids);
    if (ids.length > 1 || ids[0] === "bad") return { data: null, error: { message: "boom" } };
    return { data: [{ id: ids[0], summary_general: good }], error: null };
  };
  const r2 = await fetchExistingRowsWith(q2, ["x1", "bad", "x2"]);
  assert.deepEqual(r2.failedIds, ["bad"]);
  assert.deepEqual(r2.rows.map((r) => r.id), ["x1", "x2"]);
  assert.equal(calls.length, 1 + 3);

  // >50 ids: only the failing chunk is retried individually
  const many = Array.from({ length: 60 }, (_, i) => `id${i}`);
  let n = 0;
  const q3: ChunkQuery = async (ids) => {
    n++;
    if (n === 1) return { data: null, error: { message: "boom" } };
    return { data: ids.map((id) => ({ id, summary_general: good })), error: null };
  };
  const r3 = await fetchExistingRowsWith(q3, many);
  assert.equal(r3.failedIds.length, 0);
  assert.equal(r3.rows.length, 60);
  assert.equal(n, 1 + 50 + 1);

  console.log("existing-dedup tests passed");
}
run();
