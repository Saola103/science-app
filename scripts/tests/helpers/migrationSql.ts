/** migration テスト共通のヘルパ(SQL 文の分割と、SQL 式 / PostgREST 条件の評価器)。このファイル自体はテストではない */
import assert from "node:assert/strict";

export const norm = (s: string) => s.replace(/\s+/g, " ").replace(/\( /g, "(").replace(/ \)/g, ")").trim();
export const q = (xs: readonly string[]) => xs.map((x) => `'${x}'`).join(", ");

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


export type Row = { source: string | null; license: string | null };
export type Tri = boolean | null;

export function evalSqlUsing(expr: string, row: Row): Tri {
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
export function evalPostgrest(or: string, row: Row): boolean {
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
