import assert from "node:assert/strict";
import { tokenizeKeywordQuery } from "../../lib/supabase/vectorSearch";

assert.deepEqual(tokenizeKeywordQuery("麻酔と意識"), ["麻酔", "意識"]);
assert.deepEqual(tokenizeKeywordQuery("anesthesia consciousness"), ["anesthesia", "consciousness"]);
assert.deepEqual(tokenizeKeywordQuery("the role of sleep"), ["role", "sleep"]);
// filter-special characters must never survive into the PostgREST .or() string
for (const t of tokenizeKeywordQuery('a",b) title.ilike.%x% (y)*_\\')) {
  assert.ok(!/[,()%*_\\"]/.test(t), `unsafe token: ${t}`);
}
assert.deepEqual(tokenizeKeywordQuery("%%%"), []);
console.log("keyword-tokenize: OK");
