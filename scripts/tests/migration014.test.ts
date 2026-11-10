/**
 * migration 014 の厳密テスト(R2-01)。実行: npx tsx scripts/tests/migration014.test.ts
 *  - 014 の全 SQL 文を「許可リスト」と完全一致で比較(policy.ts の定数から生成した文字列)。
 *    想定外の文・改変(OR true / OR source='PubMed' / REVOKE 削除 / ALTER FUNCTION 削除)は失敗する。
 *  - SQL の USING と PAPER_VISIBILITY_OR を、表記ゆれを含む source × license の総当たりで評価して一致を確認。
 *  - 変異テスト: 014 のコピーを改変し、checkMigration が必ず失敗することを確認。
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  NEWS_ALLOWED_SOURCES,
  PAPER_ALLOWED_SOURCES,
  LICENSE_CHECKED_PAPER_SOURCES,
  OPEN_ACCESS_PAPER_SOURCES,
  OPEN_ACCESS_ALLOWED_LICENSES,
  PREPRINT_ALLOWED_LICENSES,
  PAPER_VISIBILITY_OR,
} from "../../lib/sources/policy";

const norm = (s: string) => s.replace(/\s+/g, " ").replace(/\( /g, "(").replace(/ \)/g, ")").trim();
const q = (xs: readonly string[]) => xs.map((x) => `'${x}'`).join(", ");

// ── policy.ts から期待文字列を生成 ───────────────────────────────────────────
const ARXIV = PAPER_ALLOWED_SOURCES.filter(
  (s) => !LICENSE_CHECKED_PAPER_SOURCES.includes(s) && !OPEN_ACCESS_PAPER_SOURCES.includes(s),
);
assert.deepEqual([...ARXIV], ["arXiv"]);
export const PAPERS_USING =
  `source = ${q(ARXIV)} ` +
  `OR (source IN (${q(LICENSE_CHECKED_PAPER_SOURCES)}) AND license IN (${q(PREPRINT_ALLOWED_LICENSES)})) ` +
  `OR (source IN (${q(OPEN_ACCESS_PAPER_SOURCES)}) AND license IN (${q(OPEN_ACCESS_ALLOWED_LICENSES)}))`;
export const NEWS_USING = `source_name IN (${q(NEWS_ALLOWED_SOURCES)})`;

/** 014 に存在してよい SQL 文(正規化後)の全件。これ以外の文があれば失敗する */
const DROP_FOREIGN_DO =
  "DO $$ DECLARE r record; BEGIN FOR r IN SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('papers', 'news') AND permissive = 'PERMISSIVE' AND cmd IN ('SELECT', 'ALL') AND policyname NOT IN ('papers_public_read', 'news_public_read') AND NOT (policyname IN ('papers_service_only_write', 'news_service_only_write') AND qual = 'false') LOOP EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename); RAISE NOTICE 'dropped extra policy % on %.%', r.policyname, r.schemaname, r.tablename; END LOOP; END $$";
const REVOKE_LOOP_DO =
  "DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['api_daily_usage', 'feedback', 'groq_daily_usage', 'subscribers'] LOOP IF to_regclass('public.' || t) IS NOT NULL THEN EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', t); END IF; END LOOP; END $$";
export const EXPECTED_STATEMENTS: string[] = [
  DROP_FOREIGN_DO,
  "ALTER TABLE public.papers ENABLE ROW LEVEL SECURITY",
  `DROP POLICY IF EXISTS "papers_public_read" ON public.papers`,
  `CREATE POLICY "papers_public_read" ON public.papers FOR SELECT TO anon, authenticated USING (${PAPERS_USING})`,
  "ALTER TABLE public.news ENABLE ROW LEVEL SECURITY",
  `DROP POLICY IF EXISTS "news_public_read" ON public.news`,
  `CREATE POLICY "news_public_read" ON public.news FOR SELECT TO anon, authenticated USING (${NEWS_USING})`,
  `DROP POLICY IF EXISTS "interactions_read_own" ON public.feed_interactions`,
  `CREATE POLICY "interactions_read_own" ON public.feed_interactions FOR SELECT TO authenticated USING (user_id = auth.uid())`,
  `DROP POLICY IF EXISTS "interactions_insert_authenticated" ON public.feed_interactions`,
  `CREATE POLICY "interactions_insert_authenticated" ON public.feed_interactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND length(coalesce(item_id::text, '')) <= 200 AND length(coalesce(session_id::text, '')) <= 200 AND length(coalesce(category::text, '')) <= 40 AND length(coalesce(item_type::text, '')) <= 20 AND length(coalesce(action::text, '')) <= 20)`,
  "REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.papers, public.news FROM anon, authenticated",
  REVOKE_LOOP_DO,
  "ALTER FUNCTION public.increment_api_daily_usage(date, text, bigint) SET search_path = public, pg_temp",
];

/** コメント(-- ...)を除き、$$ ... $$ を考慮して ; で文に分割し、正規化して返す */
export function splitStatements(sql: string): string[] {
  const code = sql.replace(/--[^\n]*/g, "");
  const out: string[] = [];
  let cur = "";
  let inDollar = false;
  for (let i = 0; i < code.length; i++) {
    if (code.startsWith("$$", i)) {
      inDollar = !inDollar;
      cur += "$$";
      i++;
      continue;
    }
    if (code[i] === ";" && !inDollar) {
      if (norm(cur)) out.push(norm(cur));
      cur = "";
      continue;
    }
    cur += code[i];
  }
  assert.ok(!inDollar, "unterminated $$ block");
  if (norm(cur)) out.push(norm(cur));
  return out;
}

/** 014 の検査。問題があれば throw する */
export function checkMigration(sql: string): void {
  const stmts = splitStatements(sql);
  assert.deepEqual(stmts, EXPECTED_STATEMENTS, "014 の SQL 文が policy.ts から生成した期待と完全一致しない");
  // コメント内の運用情報(ロールバック・VERIFY・REVOKE/GRANT 方針)の存在
  assert.ok(/ROLLBACK \(comment/.test(sql) && /VERIFY after applying/.test(sql), "ROLLBACK/VERIFY がない");
  assert.ok(/RAISE NOTICE/.test(sql), "DROP の RAISE NOTICE がない");
  assert.ok(!/\bGRANT\b/.test(sql.split("-- ROLLBACK")[0].replace(/--[^\n]*/g, "")), "実行文に GRANT がある");
}

// ── SQL 式と PostgREST 条件の評価器(総当たり用) ──────────────────────────────
type Row = { source: string | null; license: string | null };
type Tri = boolean | null;

function evalSqlUsing(expr: string, row: Row): Tri {
  const toks = [...expr.matchAll(/'([^']*)'|([A-Za-z_]+)|(=|\(|\)|,)/g)].map((m) => (m[1] !== undefined ? { s: m[1] } : { t: (m[2] ?? m[3]) }));
  let i = 0;
  const peek = () => toks[i] as { s?: string; t?: string } | undefined;
  const isT = (v: string) => peek()?.t?.toUpperCase() === v;
  const take = (v: string) => { assert.ok(isT(v), `expected ${v} at ${i}`); i++; };
  const col = (c: string) => (row as Record<string, string | null>)[c];
  const or = (): Tri => {
    let v = and();
    while (isT("OR")) { i++; const r = and(); v = v === true || r === true ? true : v === null || r === null ? null : false; }
    return v;
  };
  const and = (): Tri => {
    let v = atom();
    while (isT("AND")) { i++; const r = atom(); v = v === false || r === false ? false : v === null || r === null ? null : true; }
    return v;
  };
  const atom = (): Tri => {
    if (isT("(")) { i++; const v = or(); take(")"); return v; }
    const name = peek()!.t!; i++;
    const c = col(name);
    if (isT("=")) { i++; const lit = peek()!.s!; i++; return c == null ? null : c === lit; }
    if (isT("IN")) {
      i++; take("(");
      const vals: string[] = [];
      while (!isT(")")) { vals.push(peek()!.s!); i++; if (isT(",")) i++; }
      take(")");
      return c == null ? null : vals.includes(c);
    }
    throw new Error("unsupported SQL expr at token " + i);
  };
  const v = or();
  assert.equal(i, toks.length, "trailing tokens in SQL expr");
  return v;
}

function splitTop(s: string): string[] {
  const out: string[] = []; let d = 0, cur = "";
  for (const ch of s) {
    if (ch === "(") d++;
    if (ch === ")") d--;
    if (ch === "," && d === 0) { out.push(cur); cur = ""; } else cur += ch;
  }
  out.push(cur);
  return out;
}
/** トップレベルのカンマ = OR(PostgREST の or=(...) と同じ) */
function evalPostgrest(or: string, row: Row): boolean {
  const term = (t: string): boolean => {
    let m = t.match(/^and\(([\s\S]*)\)$/);
    if (m) return splitTop(m[1]).every(term);
    m = t.match(/^or\(([\s\S]*)\)$/);
    if (m) return splitTop(m[1]).some(term);
    m = t.match(/^(\w+)\.eq\.([\s\S]*)$/);
    if (m) { const c = (row as Record<string, string | null>)[m[1]]; return c != null && c === m[2]; }
    m = t.match(/^(\w+)\.in\.\(([\s\S]*)\)$/);
    if (m) { const c = (row as Record<string, string | null>)[m[1]]; return c != null && m[2].split(",").includes(c); }
    throw new Error("unsupported PostgREST term: " + t);
  };
  return splitTop(or).some(term);
}

function bruteForce(sql: string): number {
  const stmts = splitStatements(sql);
  const st = stmts.find((s) => s.startsWith('CREATE POLICY "papers_public_read"'))!;
  const using = st.slice(st.indexOf("USING (") + 7, -1);
  const variants = (xs: readonly string[]) => {
    const set = new Set<string | null>([null, "", " ", "x", "PubMed", "pubmed", "Phys.org", "cc by", "CC BY", "cc_by_nc", "cc0_ng ", "CC0"]);
    for (const x of xs) for (const v of [x, x.toLowerCase(), x.toUpperCase(), ` ${x}`, `${x} `, `${x}\n`, x.slice(0, -1), `${x}x`]) set.add(v);
    return [...set];
  };
  const sources = variants(PAPER_ALLOWED_SOURCES);
  const licenses = variants([...PREPRINT_ALLOWED_LICENSES, ...OPEN_ACCESS_ALLOWED_LICENSES]);
  let n = 0;
  for (const source of sources) for (const license of licenses) {
    const row = { source, license };
    const a = evalSqlUsing(using, row) === true;
    const b = evalPostgrest(PAPER_VISIBILITY_OR, row);
    assert.equal(a, b, `SQL と PAPER_VISIBILITY_OR が不一致: ${JSON.stringify(row)} sql=${a} app=${b}`);
    n++;
  }
  return n;
}

function bruteForceNews(sql: string) {
  const stmts = splitStatements(sql);
  const st = stmts.find((s) => s.startsWith('CREATE POLICY "news_public_read"'))!;
  const using = st.slice(st.indexOf("USING (") + 7, -1);
  const names = new Set<string | null>([null, "", "CERN", "nasa", "Phys.org", "NASA ", " NSF"]);
  for (const x of NEWS_ALLOWED_SOURCES) for (const v of [x, x.toLowerCase(), x.toUpperCase(), `${x} `, x.slice(1)]) names.add(v);
  for (const name of names) {
    const row = { source: name, license: null };
    const a = evalSqlUsing(using.replace(/source_name/g, "source"), row) === true;
    assert.equal(a, name != null && NEWS_ALLOWED_SOURCES.includes(name), `news: ${name}`);
  }
}

// ── 実ファイル ─────────────────────────────────────────────────────────────
const sql = readFileSync(new URL("../../supabase/migrations/014_sources_expansion_rls.sql", import.meta.url), "utf8");
checkMigration(sql);
const total = bruteForce(sql);
assert.ok(total > 1000, "総当たりの件数が少なすぎる");
bruteForceNews(sql);

// ── 変異テスト: 014 のコピーを改変すると checkMigration が失敗すること ────────────────────
function mutate(name: string, from: string | RegExp, to: string) {
  const m = sql.replace(from, to);
  assert.notEqual(m, sql, `mutation did not change the SQL: ${name}`);
  assert.throws(() => checkMigration(m), `変異が検出されなかった: ${name}`);
  return m;
}
mutate("papers に OR source = 'PubMed'", /OR \(source IN \('EuropePMC'/, "OR source = 'PubMed'\n    OR (source IN ('EuropePMC'");
mutate("papers に OR true", /^(CREATE POLICY "papers_public_read"[\s\S]*?USING \(\n)/m, "$1    true OR\n");
mutate("news に OR true", /^(CREATE POLICY "news_public_read"[\s\S]*?USING \()/m, "$1true OR ");
mutate("REVOKE 削除", /REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER\n  ON TABLE public.papers, public.news FROM anon, authenticated;/, "");
mutate("bioRxiv 節に ILIKE", /OR \(source IN \('bioRxiv', 'medRxiv'\)/, "OR (source ILIKE 'biorxiv') OR (source IN ('bioRxiv', 'medRxiv')");
mutate("ALTER FUNCTION 削除", /ALTER FUNCTION public\.increment_api_daily_usage\(date, text, bigint\) SET search_path = public, pg_temp;/, "");
mutate("ライセンス追加", /license IN \('cc_by', 'cc0', 'cc0_ng'\)/, "license IN ('cc_by', 'cc0', 'cc0_ng', 'cc_by_nc')");
mutate("他名ポリシー DROP ブロック削除", /DO \$\$\nDECLARE r record;[\s\S]*?END \$\$;/, "");
mutate("feed_interactions に IS NULL を戻す", /USING \(user_id = auth\.uid\(\)\);/, "USING (user_id = auth.uid() OR user_id IS NULL);");
mutate("insert の長さ制限を外す", /\n    AND length\(coalesce\(category::text, ''\)\) <= 40/, "");
mutate("想定外の GRANT 追加", /ALTER FUNCTION public\.increment_api_daily_usage/, "GRANT ALL ON public.papers TO anon;\nALTER FUNCTION public.increment_api_daily_usage");
// 総当たりは「ポリシーだけ書き換えて USING が広がった」ケースも拾う(完全一致テストとは独立の確認)
const widened = sql.replace(/AND license IN \('cc_by', 'cc0', 'cc0_ng'\)/, "AND license IS NOT NULL");
assert.notEqual(widened, sql);
assert.throws(() => bruteForce(widened), "総当たりが USING の拡大を検出できない");

console.log(`migration014: OK (statements ${EXPECTED_STATEMENTS.length}, brute-force ${total} rows, 11 mutations caught)`);
