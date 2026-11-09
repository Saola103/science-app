/**
 * クエリパラメータの検証ヘルパー(R1-03/R1-04)。
 * PostgRESTの条件文字列や limit に外部入力をそのまま渡さないために使う。
 */

/** 整数の limit を [min, max] に丸める。数値でない・非有限なら既定値。 */
export function parseLimit(raw: string | number | null | undefined, fallback: number, min = 1, max = 60): number {
  const n = typeof raw === "number" ? raw : raw == null || raw.trim() === "" ? NaN : Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.trunc(n), min), max);
}

/**
 * カテゴリ名を無害化する。英数字・日本語・`_`・`-`・空白のみ残し、40文字まで。
 * 空になったら null(=絞り込みなし扱いは呼び出し側で決める)。
 */
export function sanitizeCategory(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}_ -]/gu, "")
    .trim()
    .slice(0, 40);
  return cleaned.length > 0 ? cleaned : null;
}

/** item_id / session_id 用: 文字種(英数字・`-_:./`)と長さ(1〜200)を検証。不正なら null。 */
export function validateIdString(raw: unknown, maxLen = 200): string | null {
  if (typeof raw !== "string") return null;
  if (raw.length < 1 || raw.length > maxLen) return null;
  return /^[A-Za-z0-9_:./\-]+$/.test(raw) ? raw : null;
}

/** category 用: 文字列で40文字以内、文字・数字・`_`・`-`・空白のみ。 */
export function validateCategoryString(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  if (raw.length < 1 || raw.length > 40) return null;
  return /^[\p{L}\p{N}_ -]+$/u.test(raw) ? raw : null;
}
