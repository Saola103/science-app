import assert from "node:assert/strict";
import { parseLimit, sanitizeCategory, validateCategoryString, validateIdString } from "../../lib/api/params";
import { buildKeywordOrFilter, tokenizeKeywordQuery } from "../../lib/supabase/vectorSearch";
import { readJsonLimited } from "../../lib/api/readJson";

// R1-04 limit
assert.equal(parseLimit("abc", 10), 10);
assert.equal(parseLimit(null, 10), 10);
assert.equal(parseLimit("", 10), 10);
assert.equal(parseLimit("NaN", 10), 10);
assert.equal(parseLimit("Infinity", 10), 10);
assert.equal(parseLimit("0", 10, 1, 60), 1);
assert.equal(parseLimit("-5", 10, 1, 60), 1);
assert.equal(parseLimit("99999", 10, 1, 60), 60);
assert.equal(parseLimit("6", 10, 1, 60), 6);
assert.equal(parseLimit("6.9", 10, 1, 60), 6);

// R1-04 q: 特殊文字入りでも .or() 文字列に新しい条件を作れない
const evil = 'x),and(source.eq.PubMed %,id.not.is.null "a\\b*c_d';
const filter = buildKeywordOrFilter(tokenizeKeywordQuery(evil), ["title", "summary_general", "summary"]);
for (const part of filter.split(",")) {
  assert.match(part, /^(title|summary_general|summary)\.ilike\.%[^,()%*_\\"]+%$/, `unsafe part: ${part}`);
}
assert.deepEqual(tokenizeKeywordQuery("%,)"), []);

// category
assert.equal(sanitizeCategory("neuro),and(x"), "neuroandx");
assert.equal(sanitizeCategory("%%%"), null);
assert.equal(sanitizeCategory("a".repeat(100))?.length, 40);
assert.equal(sanitizeCategory("神経科学"), "神経科学");
assert.equal(validateCategoryString("it_ai"), "it_ai");
assert.equal(validateCategoryString({}), null);
assert.equal(validateCategoryString("a,b"), null);
assert.equal(validateCategoryString("a".repeat(41)), null);

// R1-05 id
assert.equal(validateIdString("paper-1234-abcd"), "paper-1234-abcd");
assert.equal(validateIdString("hep-th/9901001"), "hep-th/9901001");
assert.equal(validateIdString({}), null);
assert.equal(validateIdString(["a"]), null);
assert.equal(validateIdString(""), null);
assert.equal(validateIdString("a".repeat(201)), null);
assert.equal(validateIdString("a b"), null);
assert.equal(validateIdString("a,b)"), null);

// R1-05 サイズ制限・不正JSON
(async () => {
  const mk = (body: string, headers: Record<string, string> = {}) =>
    new Request("http://x/", { method: "POST", body, headers });
  assert.equal((await readJsonLimited(mk("{}"))).status, null);
  assert.equal((await readJsonLimited(mk("{bad"))).status, 400);
  assert.deepEqual(await readJsonLimited(mk("null")), { status: null, body: null }); // 呼び出し側でnullを400にする
  assert.equal((await readJsonLimited(mk(JSON.stringify({ m: "a".repeat(40_000) })))).status, 413);
  assert.equal((await readJsonLimited(mk("{}", { "content-length": "999999" }))).status, 413);
  console.log("params: OK");
})();
