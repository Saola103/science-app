/**
 * 表示可否(G4 法務整備)の共通適用関数。
 * フィード・保存/いいね履歴・サイトマップなど「DBから記事を取り出す経路」は、
 * 個別に条件を書かず必ずここを通す(R1-01/R1-02: 経路ごとに基準がずれるのを防ぐ)。
 * 基準そのものは lib/sources/policy.ts にある。
 */

import { NEWS_ALLOWED_SOURCES, PAPER_VISIBILITY_OR, isAllowedNewsSource, isPaperDisplayable } from "./policy";

/** papers のクエリに可視性条件(許可リスト+ライセンス)を付ける。 */
export function applyPaperVisibility<T>(query: T): T {
  // 型の再帰が深くなるのを避けるため T をそのまま返す(PostgRESTのビルダーは this を返す)
  return (query as unknown as { or(f: string): T }).or(PAPER_VISIBILITY_OR);
}

/** news のクエリに可視性条件(許可した情報源のみ)を付ける。 */
export function applyNewsVisibility<T>(query: T): T {
  return (query as unknown as { in(c: string, v: readonly string[]): T }).in("source_name", NEWS_ALLOWED_SOURCES);
}

const PAPER_COLUMNS = "id, title, summary_general, category, published_at, url, authors, source, license";
const NEWS_COLUMNS = "id, title, summary_general, category, published_at, url, source_name";

/**
 * いいね/保存履歴のID群から、表示してよい記事だけを返す。
 * SQL側の条件に加え、取得後も isPaperDisplayable / isAllowedNewsSource で二重に絞る。
 * license は判定にだけ使い、返却には含めない。
 */
export async function fetchVisibleItemsByIds(
  supabase: any,
  schema: string,
  paperIds: string[],
  newsIds: string[]
): Promise<any[]> {
  const results: any[] = [];

  if (paperIds.length > 0) {
    const { data: papers } = await applyPaperVisibility(
      supabase.schema(schema).from("papers").select(PAPER_COLUMNS).in("id", paperIds)
    );
    for (const p of (papers ?? []) as any[]) {
      if (!isPaperDisplayable(p)) continue;
      const { license: _license, ...rest } = p;
      results.push({ ...rest, type: "paper" });
    }
  }

  if (newsIds.length > 0) {
    const { data: news } = await applyNewsVisibility(
      supabase.schema(schema).from("news").select(NEWS_COLUMNS).in("id", newsIds)
    );
    for (const n of (news ?? []) as any[]) {
      if (!isAllowedNewsSource(n.source_name)) continue;
      results.push({ ...n, source: n.source_name, type: "news" });
    }
  }

  return results;
}
