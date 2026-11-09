import assert from "node:assert/strict";
import { toExcerpt } from "../../lib/sources/rss";
import { NEWS_DESCRIPTION_MAX_CHARS } from "../../lib/sources/policy";

assert.equal(NEWS_DESCRIPTION_MAX_CHARS, 300);
const long = "<p>Hello&#160;<b>world</b> &amp; more</p>" + "x".repeat(1000);
const ex = toExcerpt(long);
assert.ok(ex.length <= 300);
assert.ok(!/[<>]/.test(ex));
assert.ok(ex.startsWith("Hello world & more"));
assert.equal(toExcerpt("a [&#8230;]"), "a […]");
console.log("rss-excerpt: OK");
