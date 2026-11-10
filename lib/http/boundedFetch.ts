/**
 * 外部サービス取得用の安全な fetch(R2-05)。
 *  - 全体(接続+本文の読み込み)に1つのタイムアウト
 *  - 応答サイズ上限(Content-Length と、実際に読んだバイト数の両方)。超えたら読み込みを中止して例外
 *  - リダイレクトは手動(最大 MAX_REDIRECTS 回)。移動先は https かつ元と同じサイト
 *    (ホスト名の末尾2ラベルが同じ)のときだけ追う。それ以外は拒否
 * 取得先は全て固定ホスト(外部入力でURLが変わらない)。ここは「許可済みの発信元が壊れた/乗っ取られた
 * 応答を返した場合」にサーバーを止めないための防御。
 */

export const MAX_REDIRECTS = 3;

export class FetchLimitError extends Error {}

export type BoundedOptions = {
  timeoutMs: number;
  maxBytes: number;
  headers?: Record<string, string>;
};

/** 'www.eso.org' と 'eso.org'、'export.arxiv.org' と 'export.arxiv.org' は同じサイト */
export function isSameSite(a: URL, b: URL): boolean {
  const key = (u: URL) => u.hostname.toLowerCase().split(".").slice(-2).join(".");
  return key(a) === key(b);
}

/** 移動先を解決して検証する。許可できなければ null。 */
export function resolveRedirect(from: URL, location: string): URL | null {
  let to: URL;
  try {
    to = new URL(location, from);
  } catch {
    return null;
  }
  if (to.protocol !== "https:") return null;
  if (!isSameSite(from, to)) return null;
  return to;
}

/** 本文を maxBytes までだけ読む(超えたら中止して FetchLimitError)。 */
export async function readBodyLimited(res: Response, maxBytes: number): Promise<string> {
  const declared = Number(res.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    await res.body?.cancel().catch(() => {});
    throw new FetchLimitError(`response too large (content-length ${declared} > ${maxBytes})`);
  }
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      throw new FetchLimitError(`response too large (> ${maxBytes} bytes)`);
    }
    chunks.push(value);
  }
  return new TextDecoder("utf-8").decode(Buffer.concat(chunks));
}

/** GET して本文(テキスト)を返す。status が 2xx でなければ例外(HTTP <status>)。 */
export async function fetchTextBounded(url: string, opts: BoundedOptions): Promise<string> {
  const signal = AbortSignal.timeout(opts.timeoutMs);
  let current = new URL(url);
  for (let hop = 0; ; hop++) {
    const res = await fetch(current, { headers: opts.headers, signal, redirect: "manual" });
    if (res.status >= 300 && res.status < 400) {
      await res.body?.cancel().catch(() => {});
      const loc = res.headers.get("location");
      const next = loc ? resolveRedirect(current, loc) : null;
      if (!next || hop >= MAX_REDIRECTS) throw new FetchLimitError(`redirect refused (HTTP ${res.status})`);
      current = next;
      continue;
    }
    if (!res.ok) {
      await res.body?.cancel().catch(() => {});
      throw new Error(`HTTP ${res.status}`);
    }
    return readBodyLimited(res, opts.maxBytes);
  }
}

export async function fetchJsonBounded<T>(url: string, opts: BoundedOptions): Promise<T> {
  return JSON.parse(await fetchTextBounded(url, opts)) as T;
}
