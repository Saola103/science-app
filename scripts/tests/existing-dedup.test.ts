/**
 * Minimal test for the already-processed classification (no test framework in
 * this repo). Run: npx tsx scripts/tests/existing-dedup.test.ts
 */
import assert from "node:assert/strict";
import { classifyCandidates, isProcessedRow } from "../../lib/pipeline/existing";
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

console.log("existing-dedup tests passed");
