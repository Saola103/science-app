/**
 * migration 015(CC BY-NC を表示対象に追加)のテスト。実行: npx tsx scripts/tests/migration015.test.ts
 *  - 015 の SQL 文は「papers_public_read の再作成」だけで、USING が policy.ts の現行定数から生成した文字列と完全一致すること。
 *  - SQL の USING と PAPER_VISIBILITY_OR / isPaperDisplayable を、表記ゆれ込みの source × license 総当たりで比較。
 *  - cc_by_nc_nd / cc_by_nd / cc_by_nc_sa / cc_no / 'CC BY' / NULL は SQL もアプリも非表示のまま。
 *  - 014 との差分は bioRxiv/medRxiv のライセンス一覧に 'cc_by_nc' が増えただけ。
 *  - 変異テスト: リテラルのずれ・ND系の混入・余計な文を検出できること。
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  PAPER_ALLOWED_SOURCES,
  LICENSE_CHECKED_PAPER_SOURCES,
  OPEN_ACCESS_PAPER_SOURCES,
  OPEN_ACCESS_ALLOWED_LICENSES,
  PREPRINT_ALLOWED_LICENSES,
  PAPER_VISIBILITY_OR,
  isPaperDisplayable,
} from "../../lib/sources/policy";
import { q, splitStatements, evalSqlUsing, evalPostgrest } from "./helpers/migrationSql";

const ARXIV = PAPER_ALLOWED_SOURCES.filter(
  (s) => !LICENSE_CHECKED_PAPER_SOURCES.includes(s) && !OPEN_ACCESS_PAPER_SOURCES.includes(s),
);
assert.deepEqual([...ARXIV], ["arXiv"]);
const PAPERS_USING =
  `source = ${q(ARXIV)} ` +
  `OR (source IN (${q(LICENSE_CHECKED_PAPER_SOURCES)}) AND license IN (${q(PREPRINT_ALLOWED_LICENSES)})) ` +
  `OR (source IN (${q(OPEN_ACCESS_PAPER_SOURCES)}) AND license IN (${q(OPEN_ACCESS_ALLOWED_LICENSES)}))`;

// 全文を1トランザクション(BEGIN; ... COMMIT;)で囲む。中の3文はリテラル完全一致のまま検証する。
const EXPECTED_STATEMENTS = [
  "BEGIN",
  "ALTER TABLE public.papers ENABLE ROW LEVEL SECURITY",
  `DROP POLICY IF EXISTS "papers_public_read" ON public.papers`,
  `CREATE POLICY "papers_public_read" ON public.papers FOR SELECT TO anon, authenticated USING (${PAPERS_USING})`,
  "COMMIT",
];

// 現行ルールの固定(policy.ts を変えたら、意図した変更かここで気づく)
assert.deepEqual([...PREPRINT_ALLOWED_LICENSES], ["cc_by", "cc0", "cc0_ng", "cc_by_nc"]);

function checkMigration(sql: string): void {
  assert.deepEqual(splitStatements(sql), EXPECTED_STATEMENTS, "015 の SQL 文が policy.ts から生成した期待と完全一致しない");
  assert.ok(/ROLLBACK \(comment/.test(sql) && /VERIFY/.test(sql), "ROLLBACK/VERIFY がない");
  assert.ok(/014[^\n]*(applied|APPLIED)/.test(sql), "「014 適用済みが前提」の明記がない");
  assert.ok(!/\bGRANT\b/.test(sql.replace(/--[^\n]*/g, "")), "実行文に GRANT がある");
}

const NON_NC_BAD = ["cc_by_nc_nd", "cc_by_nd", "cc_by_nc_sa", "cc_no", "CC BY", "CC_BY_NC", "cc_by_nc ", " cc_by_nc", "cc by-nc", "cc-by-nc", "", null];

function bruteForce(sql: string): number {
  const st = splitStatements(sql).find((s) => s.startsWith('CREATE POLICY "papers_public_read"'))!;
  const using = st.slice(st.indexOf("USING (") + 7, -1);
  const variants = (xs: readonly string[]) => {
    const set = new Set<string | null>([null, "", " ", "x", "PubMed", "pubmed", "cc by", "CC0", ...NON_NC_BAD]);
    for (const x of xs) for (const v of [x, x.toLowerCase(), x.toUpperCase(), ` ${x}`, `${x} `, `${x}\n`, x.slice(0, -1), `${x}x`]) set.add(v);
    return [...set];
  };
  let n = 0;
  for (const source of variants(PAPER_ALLOWED_SOURCES)) {
    for (const license of variants([...PREPRINT_ALLOWED_LICENSES, ...OPEN_ACCESS_ALLOWED_LICENSES])) {
      const row = { source, license };
      const sqlVisible = evalSqlUsing(using, row) === true;
      const appFilter = evalPostgrest(PAPER_VISIBILITY_OR, row);
      assert.equal(sqlVisible, appFilter, `SQL と PAPER_VISIBILITY_OR が不一致: ${JSON.stringify(row)}`);
      assert.equal(sqlVisible, isPaperDisplayable(row), `SQL と isPaperDisplayable が不一致: ${JSON.stringify(row)}`);
      n++;
    }
  }
  return n;
}

const sql = readFileSync(new URL("../../supabase/migrations/015_allow_cc_by_nc.sql", import.meta.url), "utf8");
checkMigration(sql);
const total = bruteForce(sql);
assert.ok(total > 1000, "総当たりの件数が少なすぎる");

// 個別に明示: bioRxiv/medRxiv の NC 単独だけ見える。ND/SA 付き・補完値は見えない(SQL・アプリ両方)
const using = (() => {
  const st = splitStatements(sql).find((s) => s.startsWith('CREATE POLICY "papers_public_read"'))!;
  return st.slice(st.indexOf("USING (") + 7, -1);
})();
for (const source of ["bioRxiv", "medRxiv"]) {
  assert.equal(evalSqlUsing(using, { source, license: "cc_by_nc" }), true);
  assert.equal(isPaperDisplayable({ source, license: "cc_by_nc" }), true);
  for (const license of ["cc_by_nc_nd", "cc_by_nd", "cc_by_nc_sa", "cc_no", "CC BY", null]) {
    assert.notEqual(evalSqlUsing(using, { source, license }), true, `${source}/${license}`);
    assert.equal(isPaperDisplayable({ source, license }), false, `${source}/${license}`);
  }
}
// NC は bioRxiv/medRxiv 以外では見えない(EuropePMC 等は cc_by のみ)
for (const source of ["EuropePMC", "FrontiersYoungMinds", "PLOS", "arXiv-x", "PubMed"]) {
  assert.notEqual(evalSqlUsing(using, { source, license: "cc_by_nc" }), true, source);
  assert.equal(isPaperDisplayable({ source, license: "cc_by_nc" }), false, source);
}

// 014 との差分は 'cc_by_nc' の追加だけ(014 の papers_public_read を現行に置き換えるだけ)
const sql014 = readFileSync(new URL("../../supabase/migrations/014_sources_expansion_rls.sql", import.meta.url), "utf8");
const pol014 = splitStatements(sql014).find((s) => s.startsWith('CREATE POLICY "papers_public_read"'))!;
assert.equal(pol014.replace("'cc0_ng')", "'cc0_ng', 'cc_by_nc')"), `CREATE POLICY "papers_public_read" ON public.papers FOR SELECT TO anon, authenticated USING (${PAPERS_USING})`);

// ── 変異テスト ─────────────────────────────────────────────────────────────
function mutate(name: string, from: string | RegExp, to: string) {
  const m = sql.replace(from, to);
  assert.notEqual(m, sql, `mutation did not change the SQL: ${name}`);
  assert.throws(() => checkMigration(m), `変異が検出されなかった: ${name}`);
}
mutate("cc_by_nc を外す", /AND license IN \('cc_by', 'cc0', 'cc0_ng', 'cc_by_nc'\)/, "AND license IN ('cc_by', 'cc0', 'cc0_ng')");
mutate("ND 系の混入", /AND license IN \('cc_by', 'cc0', 'cc0_ng', 'cc_by_nc'\)/, "AND license IN ('cc_by', 'cc0', 'cc0_ng', 'cc_by_nc', 'cc_by_nc_nd')");
mutate("cc_by_nd の混入", /AND license IN \('cc_by', 'cc0', 'cc0_ng', 'cc_by_nc'\)/, "AND license IN ('cc_by', 'cc0', 'cc0_ng', 'cc_by_nc', 'cc_by_nd')");
mutate("SA 系の混入", /AND license IN \('cc_by', 'cc0', 'cc0_ng', 'cc_by_nc'\)/, "AND license IN ('cc_by', 'cc0', 'cc0_ng', 'cc_by_nc', 'cc_by_nc_sa')");
mutate("大文字化", /AND license IN \('cc_by', 'cc0', 'cc0_ng', 'cc_by_nc'\)/, "AND license IN ('cc_by', 'cc0', 'cc0_ng', 'CC_BY_NC')");
mutate("OR true", /USING \(\n/, "USING (\n    true OR\n");
mutate("EuropePMC に NC を許可", /('PLOS'\) AND license IN \('cc_by')\)\)\n  \);/, "$1, 'cc_by_nc'))\n  );");
mutate("余計な文(GRANT)", /ALTER TABLE public\.papers ENABLE ROW LEVEL SECURITY;/, "GRANT ALL ON public.papers TO anon;\nALTER TABLE public.papers ENABLE ROW LEVEL SECURITY;");
mutate("DROP 文の削除", /\nDROP POLICY IF EXISTS "papers_public_read" ON public\.papers;/, "\n");
mutate("COMMIT の削除", /\nCOMMIT;/, "\n");
mutate("BEGIN の削除", /\nBEGIN;/, "\n");
mutate("014 前提の明記の削除", /PREREQUISITE: 014 MUST ALREADY BE APPLIED/, "PREREQUISITE: none");
// 総当たりは USING を広げる変異を拾う
const widened = sql.replace(/license IN \('cc_by', 'cc0', 'cc0_ng', 'cc_by_nc'\)/, "license IS NOT NULL");
assert.notEqual(widened, sql);
assert.throws(() => bruteForce(widened), "総当たりが USING の拡大を検出できない");

console.log(`migration015: OK (statements ${EXPECTED_STATEMENTS.length}, brute-force ${total} rows, 12 mutations caught)`);
