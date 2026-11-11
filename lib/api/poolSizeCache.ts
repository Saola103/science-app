/**
 * フィード初回ページのランダム窓の母数(exact count)を短時間だけ保持する。
 * 母数は「どの窓から引くか」を決めるだけなので、30秒の古さは表示内容の規則に影響しない。
 * サーバーレスのインスタンスごとのメモリ内キャッシュ(共有・永続化はしない)。
 */
const POOL_SIZE_TTL_MS = 30_000;
const cache = new Map<string, { at: number; value: number }>();

export async function cachedPoolSize(key: string, load: () => Promise<number | null>): Promise<number> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < POOL_SIZE_TTL_MS) return hit.value;
  const loaded = await load();
  // 件数クエリが失敗した(null)ときは 0 を固定化しない。今回だけ 0 として扱う。
  if (loaded === null) return 0;
  cache.set(key, { at: Date.now(), value: loaded });
  return loaded;
}

/** 窓が空だったときなど、母数が古い疑いがあるときに捨てる */
export function invalidatePoolSize(key: string): void {
  cache.delete(key);
}

/** テスト用: キャッシュを空にする */
export function resetPoolSizeCache(): void {
  cache.clear();
}
