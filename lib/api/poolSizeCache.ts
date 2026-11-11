/**
 * フィード初回ページのランダム窓の母数(exact count)を短時間だけ保持する。
 * 母数は「どの窓から引くか」を決めるだけなので、60秒の古さは表示内容の規則に影響しない。
 * サーバーレスのインスタンスごとのメモリ内キャッシュ(共有・永続化はしない)。
 */
const POOL_SIZE_TTL_MS = 60_000;
const cache = new Map<string, { at: number; value: number }>();

export async function cachedPoolSize(key: string, load: () => Promise<number | null>): Promise<number> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < POOL_SIZE_TTL_MS) return hit.value;
  const value = (await load()) ?? 0;
  cache.set(key, { at: Date.now(), value });
  return value;
}

/** テスト用: キャッシュを空にする */
export function resetPoolSizeCache(): void {
  cache.clear();
}
