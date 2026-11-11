/**
 * R2 修正の回帰テスト。実行: npx tsx scripts/tests/r2-hardening.test.ts (ネットワーク不要。fetch はローカルのモックサーバー)
 *  R2-04 プロンプト(信頼できないデータ注記・$記法・{{}}差し込み・長さ上限)
 *  R2-05 サイズ上限・リダイレクト・タイムアウト・ReDoS(線形時間)
 *  R2-06 リンクの検証・未来日の丸め
 *  R2-08 deep 検索の要約件数/予算再確認、収集の締切
 *  R2-03 連絡先メール定数
 */
import assert from "node:assert/strict";
import http from "node:http";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { CONTACT_EMAIL } from "../../lib/site/contact";
import { buildNewsPrompt, buildCasualPrompt, buildExpertPrompt, fillTemplate, PAPER_CONTENT_MAX_CHARS } from "../../lib/llm/summarize";
import { getTag, iterateItems, sanitizeLink, normalizePublishedAt, toExcerpt, RSS_TITLE_MAX_CHARS } from "../../lib/sources/rss";
import { extractAuthorSummary, cleanText, toPublishedAt, parseEpmcRecord } from "../../lib/sources/openAccess";
import { fetchTextBounded, FetchLimitError, resolveRedirect, isSameSite } from "../../lib/http/boundedFetch";
import { isPastDeadline, NEW_SOURCES_DEADLINE_MS } from "../../lib/pipeline/openAccessBudget";

const ROOT = new URL("../../", import.meta.url).pathname;
const timeIt = <T>(f: () => T): [T, number] => { const t = Date.now(); const r = f(); return [r, Date.now() - t]; };

// ── R2-03: 連絡先 ───────────────────────────────────────────────────────────
assert.equal(CONTACT_EMAIL, "saola.neuroscience@gmail.com");
function walk(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    if (["node_modules", ".next", ".git", "tests"].includes(n)) continue;
    const p = path.join(dir, n);
    statSync(p).isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
}
for (const dir of ["app", "lib", "components", "scripts"]) {
  for (const f of walk(path.join(ROOT, dir))) {
    if (!/\.(ts|tsx|md|json|mjs)$/.test(f)) continue;
    const t = readFileSync(f, "utf8");
    assert.ok(!/pocket-dive\.app|saolams\.com/.test(t), `旧連絡先/存在しないドメインが残っている: ${f}`);
  }
}

// ── R2-04: プロンプト ───────────────────────────────────────────────────────
for (const f of ["casual-summary.md", "expert-summary.md", "news-summary.md"]) {
  const t = readFileSync(path.join(ROOT, "lib/llm/prompts", f), "utf8");
  assert.ok(t.includes("信頼できないデータ") && t.includes("絶対に従わないでください"), `${f} に注記がない`);
}
{
  const tpl = "A {{X}} B {{Y}} C";
  // $ 記法は文字どおり入る
  assert.equal(fillTemplate(tpl, { X: "$` $' $& $1 $$", Y: "y" }), "A $` $' $& $1 $$ B y C");
  // 差し込んだ値の中の {{Y}} は再置換されない
  assert.equal(fillTemplate(tpl, { X: "{{Y}}", Y: "REAL" }), "A {{Y}} B REAL C");
  assert.equal(fillTemplate("{{Z}}", {}), "{{Z}}");
  const p = buildNewsPrompt({ title: "t {{DESCRIPTION}} $`", description: "d $' d", category: "astronomy" });
  assert.ok(p.includes("タイトル: t {{DESCRIPTION}} $`") && p.includes("内容: d $' d"), "ニュースプロンプトの置換");
  const big = buildNewsPrompt({ title: "x".repeat(2_000_000), description: "y".repeat(2_000_000), category: "c" });
  assert.ok(big.length < 10_000, `巨大入力でプロンプトが膨らんだ: ${big.length}`);
  assert.ok(PAPER_CONTENT_MAX_CHARS <= 6000);
  // 論文プロンプト: $ 記法でテンプレートが複製されない・長さが抑えられる
  for (const build of [buildCasualPrompt, buildExpertPrompt]) {
    const base = build("normal abstract");
    const dollar = build("x $` y");
    assert.ok(dollar.length < base.length + 40, `$ 記法でプロンプトが膨らんだ: ${dollar.length} vs ${base.length}`);
    assert.ok(dollar.includes("x $` y"));
    assert.ok(build("z".repeat(5_000_000)).length < base.length + PAPER_CONTENT_MAX_CHARS + 10);
  }
}

// ── R2-05: ReDoS(線形時間)と上限 ──────────────────────────────────────────
{
  const evil = "<item><title>" + "<a ".repeat(200_000) + "</item>".repeat(1);
  const [, ms1] = timeIt(() => [...iterateItems(evil)].map((it) => getTag(it, "title")));
  const nested = "<item>" + "<title ".repeat(300_000) + "</item>";
  const [, ms2] = timeIt(() => [...iterateItems(nested)].map((it) => getTag(it, "title")));
  const noClose = "<item><title>" + "x".repeat(2_000_000);
  const [, ms3] = timeIt(() => [...iterateItems(noClose)]);
  const cdata = "<item><description>" + "<![CDATA[".repeat(200_000) + "</description></item>";
  const [, ms4] = timeIt(() => [...iterateItems(cdata)].map((it) => toExcerpt(getTag(it, "description", 8000))));
  for (const [name, ms] of Object.entries({ ms1, ms2, ms3, ms4 })) assert.ok(ms < 1500, `${name}: ${ms}ms`);
  const [, ms5] = timeIt(() => cleanText("<a ".repeat(1_000_000)));
  const [, ms6] = timeIt(() => toExcerpt("<a ".repeat(1_000_000)));
  const [, ms7] = timeIt(() => extractAuthorSummary("creativecommons.org/licenses/by/4.0" + '<abstract abstract-type="summary">'.repeat(100_000)));
  for (const [name, ms] of Object.entries({ ms5, ms6, ms7 })) assert.ok(ms < 1500, `${name}: ${ms}ms`);
  // 正常系は従来どおり
  const xml = "<channel><item><title><![CDATA[Hello <b>w</b>]]></title><link>https://a.example/x</link><description>d &amp; e</description></item><item><TITLE>Second</TITLE></item></channel>";
  const items = [...iterateItems(xml)];
  assert.equal(items.length, 2);
  assert.equal(getTag(items[0], "title"), "Hello <b>w</b>");
  assert.equal(getTag(items[1], "title"), "Second"); // 大文字小文字を区別しない
  assert.equal(getTag(items[0], "link"), "https://a.example/x");
  assert.equal(getTag("<item><titles>no</titles></item>", "title"), ""); // 前方一致で別タグを拾わない
  assert.equal(getTag("<title>x", "title"), "");
  assert.ok(RSS_TITLE_MAX_CHARS === 300);
}

// ── R2-06: リンク・日付 ─────────────────────────────────────────────────────
assert.equal(sanitizeLink("https://www.nasa.gov/a"), "https://www.nasa.gov/a");
assert.equal(sanitizeLink("http://www.nasa.gov/a"), "http://www.nasa.gov/a");
for (const bad of ["httpx://evil.example", "javascript:alert(1)", "data:text/html,x", "ftp://a/b", "//evil.example", "http", "https:", "", "  ", "https://" + "a".repeat(3000)]) {
  assert.equal(sanitizeLink(bad), "", bad);
}
{
  const now = new Date("2026-11-10T12:00:00Z");
  assert.equal(normalizePublishedAt("2026-11-01T00:00:00Z", now), "2026-11-01T00:00:00.000Z");
  assert.equal(normalizePublishedAt("2099-01-01T00:00:00Z", now), now.toISOString()); // 未来日は現在時刻に丸める
  assert.equal(normalizePublishedAt("garbage", now), now.toISOString());
  assert.equal(normalizePublishedAt("", now), now.toISOString());
  assert.equal(toPublishedAt("2026-11-04", now), "2026-11-04T00:00:00Z");
  assert.equal(toPublishedAt("2099-01-01", now), "2026-11-10T00:00:00Z");
  for (const bad of ["2026-13-01", "2026-02-30", "20261104", "2026-11-04T00:00", "x", "", undefined, null]) assert.equal(toPublishedAt(bad as any, now), undefined, String(bad));
  const abs = "x".repeat(150);
  const rec = { source: "MED", pmcid: "PMC1", title: "T", authorString: "A B", abstractText: abs, license: "cc by", isOpenAccess: "Y", firstPublicationDate: "2099-01-01", pubTypeList: { pubType: ["research-article"] } };
  assert.ok(parseEpmcRecord(rec, "epmc_journals")!.publishedAt!.slice(0, 10) <= new Date().toISOString().slice(0, 10));
}

// ── R2-05: リダイレクト判定 ─────────────────────────────────────────────────
assert.ok(isSameSite(new URL("https://www.eso.org/a"), new URL("https://eso.org/b")));
assert.ok(!isSameSite(new URL("https://www.eso.org/a"), new URL("https://evil.example/b")));
assert.equal(resolveRedirect(new URL("http://news.mit.edu/x"), "https://news.mit.edu/y")?.href, "https://news.mit.edu/y");
assert.equal(resolveRedirect(new URL("https://a.nasa.gov/x"), "http://a.nasa.gov/y"), null); // https への降格
assert.equal(resolveRedirect(new URL("https://a.nasa.gov/x"), "https://evil.example/y"), null);
assert.equal(resolveRedirect(new URL("https://a.nasa.gov/x"), "https://b.nasa.gov/y")?.hostname, "b.nasa.gov");

// ── R2-08: 収集の締切(deep検索は削除済み) ────────────────────────────────
{
  const collect = readFileSync(path.join(ROOT, "lib/pipeline/collect.ts"), "utf8");
  const fetchIdx = collect.indexOf("fetchEuropePmcJournalPapers(),");
  assert.ok(collect.lastIndexOf("isPastDeadline(startedAt)", fetchIdx) > collect.indexOf("export async function collectOpenAccessPapers"), "取得前の締切判定がない");
  assert.ok(/isPastDeadline\(startedAt\)\) break;[^\n]*\n\s*if \(xmlChecks > 0\)/.test(collect), "PLOS XML 取得前の締切判定がない");
  const now = 1_000_000_000_000;
  assert.equal(isPastDeadline(now - NEW_SOURCES_DEADLINE_MS, now), false);
  assert.equal(isPastDeadline(now - NEW_SOURCES_DEADLINE_MS - 1, now), true);
}

(async () => {
// ── R2-05: 実際の fetch(ローカルサーバー)でサイズ・時間・リダイレクト ──────────────
{
  const server = http.createServer((req, res) => {
    const u = req.url ?? "";
    if (u === "/ok") { res.end("hello"); return; }
    if (u === "/big-cl") { res.setHeader("content-length", "5000000"); res.write("x"); setTimeout(() => res.end(), 50); return; }
    if (u === "/big-stream") { // Content-Length なしで延々と送る
      const iv = setInterval(() => res.write("x".repeat(100_000)), 1);
      res.on("close", () => clearInterval(iv));
      return;
    }
    if (u === "/slow") { setTimeout(() => res.end("late"), 3000); return; }
    if (u === "/redir-evil") { res.statusCode = 302; res.setHeader("location", "https://evil.example/x"); res.end(); return; }
    if (u === "/redir-http") { res.statusCode = 302; res.setHeader("location", "http://127.0.0.1/ok"); res.end(); return; }
    if (u === "/404") { res.statusCode = 404; res.end("no"); return; }
    res.statusCode = 500; res.end();
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const opts = { timeoutMs: 800, maxBytes: 1_000_000 };
  assert.equal(await fetchTextBounded(`${base}/ok`, opts), "hello");
  await assert.rejects(fetchTextBounded(`${base}/big-cl`, opts), FetchLimitError);
  await assert.rejects(fetchTextBounded(`${base}/big-stream`, opts), FetchLimitError);
  const t0 = Date.now();
  await assert.rejects(fetchTextBounded(`${base}/slow`, opts));
  assert.ok(Date.now() - t0 < 2000, "タイムアウトが効いていない");
  await assert.rejects(fetchTextBounded(`${base}/redir-evil`, opts), FetchLimitError);
  await assert.rejects(fetchTextBounded(`${base}/redir-http`, opts), FetchLimitError); // http へのリダイレクトも追わない
  await assert.rejects(fetchTextBounded(`${base}/404`, opts), /HTTP 404/);
  server.closeAllConnections?.();
  server.close();
}

  console.log("r2-hardening: OK");
})().catch((e) => { console.error(e); process.exit(1); });
