/**
 * API: Science TikTok Feed
 * GET /api/feed?cursor=...&limit=10&preferences={"biology":3}
 *
 * Returns a mixed feed of papers + news, ordered by recency,
 * with optional category-based personalization.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabase/serviceClient";
import { applyNewsVisibility, applyPaperVisibility } from "../../../lib/sources/visibility";
import { isNcPreprint } from "../../../lib/sources/policy";
import { cachedPoolSize } from "../../../lib/api/poolSizeCache";
import { parseLimit, sanitizeCategory } from "../../../lib/api/params";
import { buildKeywordOrFilter, tokenizeKeywordQuery } from "../../../lib/supabase/vectorSearch";

export const maxDuration = 30;

// Papers whose summary_updated_at is before this were summarized with the
// pre-rewrite prompt. Same value as app/api/cron/backfill-prompts.
const PROMPT_REWRITE_CUTOFF = "2026-09-22T00:00:00Z";

type FeedItem = {
  id: string;
  type: "paper" | "news";
  title: string;
  title_ja?: string | null;
  summary?: string | null;
  summary_ja?: string | null;
  summary_general?: string | null;
  summary_expert?: string | null;
  summary_general_ja?: string | null;
  category?: string | null;
  published_at?: string | null;
  url?: string | null;
  source?: string | null;
  journal?: string | null; // Europe PMC 経由の論文のみ(出典行用)
  license?: string | null; // bioRxiv/medRxiv の CC BY-NC 論文のみ(出典行の帰属表示用)
  authors?: string[] | null;
  arxiv_id?: string | null;
  image_url?: string | null;
};

function getCategoryGradient(category?: string | null): string {
  if (!category || category === "general") return "from-indigo-950 via-blue-950 to-slate-900";
  const cat = category.toLowerCase();
  if (cat.includes("neuro") || cat.includes("brain")) return "from-purple-900 via-violet-900 to-indigo-950";
  if (cat.includes("medicine") || cat.includes("health") || cat.includes("disease")) return "from-rose-900 via-red-900 to-pink-950";
  if (cat.includes("bio") || cat.includes("genetics") || cat.includes("cell") || cat.includes("gene")) return "from-emerald-900 via-green-800 to-teal-950";
  if (cat.includes("astro") || cat.includes("space") || cat.includes("cosmos")) return "from-indigo-900 via-blue-900 to-slate-950";
  if (cat.includes("physics")) return "from-blue-900 via-indigo-800 to-violet-950";
  if (cat.includes("math")) return "from-cyan-900 via-blue-900 to-indigo-950";
  if (cat.includes("chem") || cat.includes("material")) return "from-amber-900 via-orange-800 to-red-950";
  if (cat.includes("quantum")) return "from-violet-900 via-purple-800 to-fuchsia-950";
  if (cat.includes("ai") || cat.includes("computer") || cat.includes("machine") || cat.includes("robot")) return "from-violet-900 via-purple-900 to-fuchsia-950";
  if (cat.includes("climate") || cat.includes("ecology") || cat.includes("environment")) return "from-teal-900 via-emerald-800 to-green-950";
  if (cat.includes("energy") || cat.includes("solar")) return "from-yellow-900 via-amber-800 to-orange-950";
  if (cat.includes("psycho") || cat.includes("social") || cat.includes("cognitive")) return "from-pink-900 via-rose-800 to-purple-950";
  return "from-indigo-950 via-blue-950 to-slate-900";
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor"); // ISO timestamp for pagination
    // 20 -> 60: app/feedapp fetches larger batches (for client-side
    // personalization weighting and to keep infinite scroll from re-hitting
    // the API too often) than the original 10-20/page /feed route did (that
    // route, along with /papers, /news, /login, /profile, /proto, has since
    // been removed — /feedapp is now the only shipped feed UI). Remaining
    // callers (app/page.tsx's HomeContent, /search) pass limit<=20
    // explicitly, so this is additive — their behavior is unchanged.
    const limit = parseLimit(searchParams.get("limit"), 10, 1, 60); // R1-04: NaN/0/負数を防ぐ
    const preferencesStr = searchParams.get("preferences");
    const categoryFilter = sanitizeCategory(searchParams.get("category")); // optional category filter (R1-04: 無害化)
    const rawQ = searchParams.get("q")?.trim(); // optional free-text search (title/summary)
    // R1-04: .or() には keywordSearchPapers と同じトークン化済みの語だけを入れる
    const qTokens = rawQ ? tokenizeKeywordQuery(rawQ) : [];
    const q = rawQ || undefined;
    if (rawQ && qTokens.length === 0) {
      return NextResponse.json({ items: [], nextCursor: null, hasMore: false });
    }
    const idsParam = searchParams.get("ids"); // optional: fetch specific items by id, e.g. "paper-<uuid>,news-<uuid>"

    let preferences: Record<string, number> = {};
    if (preferencesStr) {
      try {
        preferences = JSON.parse(preferencesStr);
      } catch {
        // ignore invalid preferences
      }
    }

    const supabase = getSupabaseServerClient();

    // ids lookup mode: used by app/feedapp/mypage (saved articles),
    // which only has ids in localStorage, not full article data. Bypasses
    // cursor/category/q entirely — it's a direct fetch-by-id, not a feed page.
    if (idsParam) {
      const rawIds = idsParam.split(",").map((s) => s.trim()).filter(Boolean);
      const paperIds = rawIds.filter((id) => id.startsWith("paper-")).map((id) => id.slice("paper-".length));
      const newsIds = rawIds.filter((id) => id.startsWith("news-")).map((id) => id.slice("news-".length));

      const [papersRes, newsRes] = await Promise.allSettled([
        paperIds.length > 0
          ? applyPaperVisibility( // G4: 許可リスト+ライセンス(共通関数)
              supabase
                .from("papers")
                .select("id, title, summary, summary_general, summary_expert, category, published_at, url, authors, source, journal, license, image_url")
                .in("id", paperIds)
            )
          : Promise.resolve({ data: [] as never[] }),
        newsIds.length > 0
          ? applyNewsVisibility( // G4: 許可した情報源のみ(共通関数)
              supabase
                .from("news")
                .select("id, title, description, summary_general, category, published_at, url, source_name, image_url")
                .in("id", newsIds)
            )
          : Promise.resolve({ data: [] as never[] }),
      ]);

      const items: FeedItem[] = [];
      if (papersRes.status === "fulfilled" && papersRes.value.data) {
        for (const p of papersRes.value.data) {
          items.push({
            id: p.id, type: "paper", title: p.title,
            summary: p.summary_general || p.summary, summary_general: p.summary_general, summary_expert: p.summary_expert,
            category: p.category, published_at: p.published_at, url: p.url,
            authors: Array.isArray(p.authors) ? p.authors : [], source: p.source || "arXiv", image_url: p.image_url,
            ...(p.source === "EuropePMC" && p.journal ? { journal: p.journal } : {}),
            ...(isNcPreprint(p) ? { license: p.license } : {}),
          });
        }
      }
      if (newsRes.status === "fulfilled" && newsRes.value.data) {
        for (const n of newsRes.value.data) {
          items.push({
            id: n.id, type: "news", title: n.title,
            summary: n.summary_general || n.description, summary_general: n.summary_general,
            category: n.category, published_at: n.published_at, url: n.url, source: n.source_name, image_url: null, // G4: ニュースの外部画像は返さない
          });
        }
      }
      const resultItems = items.map((item) => ({ ...item, gradient: getCategoryGradient(item.category) }));
      return NextResponse.json({ items: resultItems, nextCursor: null, hasMore: false });
    }

    // Each type gets half the limit so both always appear
    const half = Math.ceil(limit / 2);

    // A plain "open the feed" request (no cursor, no filter, no search) used
    // to always return the same newest-first items on every refresh, even
    // though the DB has hundreds of collected items sitting unseen further
    // back. Randomize which chronological window of the backlog this first
    // page draws from — subsequent infinite-scroll pages (which pass a
    // `cursor`) continue strictly older than that window's last item, so
    // there's no skipping or duplication once a session has picked a window.
    const randomizeFirstPage = !cursor && !categoryFilter && !q;

    // Items with no AI-generated Japanese summary yet (summarization failed,
    // or backfill hasn't reached them), or whose summary_general exists but
    // is still in the pre-3-block-prompt "old format" (no short Japanese
    // headline on the first line), would otherwise fall back to showing the
    // raw (often English) DB title as the card headline — see
    // lib/proto/mapArticle.ts's `rawHeadline = headline || item.title`
    // fallback. `has_valid_headline` (see supabase/migrations/
    // 009_has_valid_headline.sql and lib/format/summaryText.ts's
    // hasValidHeadline()) is computed once at write time and captures both
    // conditions, so this filter — renamed from withJapaneseSummary to
    // reflect that it now checks headline validity, not just non-nullness —
    // never serves either case into the feed at all, not just on the
    // randomized first page.
    // How the three collection/repair/serving stages connect (2026-09-26):
    //   1. 新規収集 (lib/pipeline/collect.ts, /api/cron/collect): 新しく取得した
    //      記事は要約生成と同時に has_valid_headline を計算して書き込む
    //      (lib/supabase/serviceClient.ts の upsertPaperToSupabase/
    //      upsertNewsToSupabase)。つまり新規記事は基本的に最初から true になる。
    //   2. バックグラウンド再生成 (/api/cron/fix-summaries, /api/admin/fix-summaries,
    //      scripts/backfill.ts): has_valid_headline が false/null のレコード
    //      (旧フォーマットの壊れた要約、または要約自体が欠けているもの)を
    //      サーバー側のWHERE条件で直接拾い上げて再生成し、has_valid_headline を
    //      更新し直す。これが壊れたバックログを徐々に true へ倒していくループ。
    //   3. 表示 (このファイル): has_valid_headline = true のレコードだけを配信
    //      する。1・2の結果として「trueのものしか存在しない」プールから配信する
    //      構造なので、これ自体が「新フォーマットの記事を優先的に見せる」設計
    //      になっている——false/nullなレコードはそもそも母集団に入らない。
    // このため、trueの中でさらに「新フォーマットを上位に並べる」独自の優先度・
    // ランキングロジックは追加していない(全件が既にtrueのプールなので、そのような
    // ランキングは意味を持たない)。過剰な実装を避け、この3段の役割分担を明文化
    // するに留めた。
    function withValidHeadline(query: any): any {
      return query.eq("has_valid_headline", true);
    }

    // 2026-11-09: papers summarized before the prompt rewrite (see
    // cron/backfill-prompts, now paused to free Groq budget for public
    // traffic) have an older, lower-quality summary style even when their
    // headline is valid. Keep them out of the feed until they are rewritten.
    // The first filter above already hides invalid-headline rows; this one
    // additionally hides the old-prompt rows. Saved-article lookups (ids
    // mode, handled earlier) are unaffected.
    function withRewrittenPrompt(query: any): any {
      return query.gte("summary_updated_at", PROMPT_REWRITE_CUTOFF);
    }

    // Pool sizes only decide which random window the first page draws from, so
    // a short-lived per-instance cache is enough (it saves two exact-count
    // queries per feed open). Does not affect which rows a window may contain.
    async function randomOffset(table: "papers" | "news", sourceFilter?: string[]): Promise<number> {
      const poolSize = await cachedPoolSize(table, async () => {
        let countQuery = supabase.from(table).select("id", { count: "exact", head: true });
        if (sourceFilter) countQuery = applyPaperVisibility(countQuery);
        if (table === "news") countQuery = applyNewsVisibility(countQuery);
        countQuery = withValidHeadline(countQuery);
        if (table === "papers") countQuery = withRewrittenPrompt(countQuery);
        const { count } = await countQuery;
        return count;
      });
      const maxOffset = Math.max(0, poolSize - half);
      return maxOffset > 0 ? Math.floor(Math.random() * (maxOffset + 1)) : 0;
    }

    // Each stream (papers / news) is its own chain "count -> page query", and
    // the two chains run in parallel (previously both counts had to finish
    // before either page query started). An offset failure still rejects the
    // whole request (-> 500) as before; a page-query failure is still
    // tolerated per stream (allSettled semantics).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const settle = (q: any): Promise<PromiseSettledResult<any>> => Promise.allSettled([q]).then((r) => r[0]);

    const papersChain = (randomizeFirstPage ? randomOffset("papers", ["arXiv", "bioRxiv", "medRxiv"]) : Promise.resolve(0)).then((papersOffset) => {
      // Fetch papers — arXiv + bioRxiv + medRxiv (PubMed excluded: copyright risk)
      let papersQuery = withRewrittenPrompt(
        withValidHeadline(
          applyPaperVisibility(
            supabase
              .from("papers")
              .select("id, title, summary, summary_general, summary_expert, category, published_at, url, authors, source, journal, license, image_url")
          )
        )
      ).order("published_at", { ascending: false });

      if (randomizeFirstPage) {
        papersQuery = papersQuery.range(papersOffset, papersOffset + half - 1);
      } else {
        papersQuery = papersQuery.limit(categoryFilter || q ? limit : half);
        if (cursor) papersQuery = papersQuery.lt("published_at", cursor);
      }
      if (categoryFilter) papersQuery = papersQuery.ilike("category", `%${categoryFilter}%`);
      if (q) papersQuery = papersQuery.or(buildKeywordOrFilter(qTokens, ["title", "summary_general", "summary"]));
      return settle(papersQuery);
    });

    const newsChain = (randomizeFirstPage ? randomOffset("news") : Promise.resolve(0)).then((newsOffset) => {
      // Fetch news too (also filtered by category/q when set, same as papers)
      let newsQuery = withValidHeadline(
        applyNewsVisibility(
          supabase
            .from("news")
            .select("id, title, description, summary_general, category, published_at, url, source_name")
        )
      ).order("published_at", { ascending: false });

      if (randomizeFirstPage) {
        newsQuery = newsQuery.range(newsOffset, newsOffset + half - 1);
      } else {
        newsQuery = newsQuery.limit(half);
        if (cursor) newsQuery = newsQuery.lt("published_at", cursor);
      }
      if (categoryFilter) newsQuery = newsQuery.ilike("category", `%${categoryFilter}%`);
      if (q) newsQuery = newsQuery.or(buildKeywordOrFilter(qTokens, ["title", "summary_general", "description"]));
      return settle(newsQuery);
    });

    const [papersResult, newsResult] = await Promise.all([papersChain, newsChain]);

    const papers: FeedItem[] = [];
    if (papersResult.status === "fulfilled" && papersResult.value.data) {
      for (const p of papersResult.value.data) {
        papers.push({
          id: p.id,
          type: "paper",
          title: p.title,
          summary: p.summary_general || p.summary,
          summary_general: p.summary_general,
          summary_expert: p.summary_expert,
          category: p.category,
          published_at: p.published_at,
          url: p.url,
          authors: Array.isArray(p.authors) ? p.authors : [],
          source: p.source || "arXiv",
          image_url: p.image_url,
          ...(p.source === "EuropePMC" && p.journal ? { journal: p.journal } : {}),
          ...(isNcPreprint(p) ? { license: p.license } : {}),
        });
      }
    }

    const newsItems: FeedItem[] = [];
    if (newsResult.status === "fulfilled" && newsResult.value.data) {
      for (const n of newsResult.value.data) {
        newsItems.push({
          id: n.id,
          type: "news",
          title: n.title,
          summary: n.summary_general || n.description,
          summary_general: n.summary_general,
          category: n.category,
          published_at: n.published_at,
          url: n.url,
          source: n.source_name,
          image_url: null, // G4: ニュースの外部画像は返さない
        });
      }
    }

    // Sort each group by recency independently, then interleave paper/news/paper/news...
    papers.sort((a, b) => new Date(b.published_at ?? 0).getTime() - new Date(a.published_at ?? 0).getTime());
    newsItems.sort((a, b) => new Date(b.published_at ?? 0).getTime() - new Date(a.published_at ?? 0).getTime());

    // Apply personalization: boost preferred categories within each group
    if (Object.keys(preferences).length > 0) {
      const boost = (items: FeedItem[]) =>
        [...items].sort((a, b) => {
          const sa = a.category ? (preferences[a.category.toLowerCase()] ?? 0) : 0;
          const sb = b.category ? (preferences[b.category.toLowerCase()] ?? 0) : 0;
          if (sb !== sa) return sb - sa;
          return new Date(b.published_at ?? 0).getTime() - new Date(a.published_at ?? 0).getTime();
        });
      papers.splice(0, papers.length, ...boost(papers));
      newsItems.splice(0, newsItems.length, ...boost(newsItems));
    }

    // Interleave: paper, news, paper, news...
    const allItems: FeedItem[] = [];
    const maxLen = Math.max(papers.length, newsItems.length);
    for (let i = 0; i < maxLen && allItems.length < limit; i++) {
      if (i < papers.length) allItems.push(papers[i]);
      if (allItems.length < limit && i < newsItems.length) allItems.push(newsItems[i]);
    }

    const resultItems = allItems.map((item) => ({
      ...item,
      gradient: getCategoryGradient(item.category),
    }));

    // Compute next cursor (oldest item's date)
    const nextCursor = resultItems.length > 0
      ? resultItems[resultItems.length - 1].published_at
      : null;

    return NextResponse.json({
      items: resultItems,
      nextCursor,
      hasMore: resultItems.length === limit,
    });
  } catch (error) {
    console.error("[Feed API] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
