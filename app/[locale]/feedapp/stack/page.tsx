"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useProtoStore } from "../../../../lib/proto/store";
import { getCategoryLabel } from "../../../../lib/proto/mockData";
import { Article } from "../../../../lib/proto/types";
import { useArticles } from "../../../../lib/proto/useFeedData";
import { ArticleDetailSheet } from "../../../../components/proto/ArticleDetailSheet";
import { FeedScroll, zen, buildEndlessSlides } from "../../../../components/proto/FeedScroll";

function StackContent() {
  const params = useSearchParams();
  const router = useRouter();
  const t = useTranslations("Proto.stack");
  const tFeed = useTranslations("Proto.feed");
  const tContentType = useTranslations("Proto.contentType");
  const locale = useLocale();
  const q = params.get("q");
  const category = params.get("category");
  const [openArticle, setOpenArticle] = useState<Article | null>(null);
  const [atTop, setAtTop] = useState(true);
  const { saved, toggleSaved, markSeen, followed, toggleFollow, addViewSeconds, showToast } = useProtoStore();

  // A taxonomy category (lib/proto/mockData.ts) isn't a DB column, so it's
  // applied as a client-side filter on top of /api/feed's results — same
  // approach as feed/page.tsx. A free-text query, by contrast, IS forwarded
  // to /api/feed's own `q` param (real ilike search — see app/api/feed/route.ts).
  const categoryFilter = useCallback((a: Article) => (category ? a.category === category : true), [category]);
  const { articles, hasMore, loadMore, loading } = useArticles({
    q: q || undefined,
    pageSize: 30,
    filter: category ? categoryFilter : undefined,
  });

  const label = q ? t("searchResultsFor", { query: q }) : category ? getCategoryLabel(category, locale) : "";

  // Small real result sets (a narrow category, or an early-days search) get
  // the same repeat-and-shuffle treatment feed/page.tsx uses, so scrolling
  // doesn't dead-end after a couple of cards. Large sets rely on real
  // pagination via onNearEnd below instead.
  const SMALL_SET_THRESHOLD = 16;
  const slides = useMemo(() => {
    if (articles.length === 0) return [];
    if (!hasMore && articles.length < SMALL_SET_THRESHOLD) {
      return buildEndlessSlides(articles, `stack-${q ?? ""}-${category ?? ""}`);
    }
    return articles;
  }, [articles, hasMore, q, category]);

  const handleNearEnd = useCallback(() => {
    if (hasMore) loadMore();
  }, [hasMore, loadMore]);

  const followCategory = (cat: string) => {
    toggleFollow(cat);
    showToast(
      followed.includes(cat)
        ? tFeed("unfollowedToast", { category: getCategoryLabel(cat, locale) })
        : tFeed("followedToast", { category: getCategoryLabel(cat, locale) })
    );
  };

  return (
    <>
      {slides.length === 0 && loading ? (
        <div className="fixed inset-0 flex items-center justify-center">
          <p className="text-[13px] text-[#94A3B8]" style={zen}>読み込み中…</p>
        </div>
      ) : slides.length === 0 ? (
        <div className="fixed inset-0 flex items-center justify-center px-8 text-center">
          <p className="text-[13px] text-[#94A3B8]" style={zen}>見つかりませんでした</p>
        </div>
      ) : (
        <FeedScroll
          slides={slides}
          saved={saved}
          followed={followed}
          onVisible={markSeen}
          onDwell={addViewSeconds}
          onToggleSave={toggleSaved}
          onOpenDetail={setOpenArticle}
          onFollowCategory={followCategory}
          onNearEnd={handleNearEnd}
          t={tFeed}
          tContentType={tContentType}
          locale={locale}
          atTop={atTop}
          onAtTopChange={setAtTop}
          topOverlay={
            <div
              className="flex items-center gap-2 pl-1 pr-3 py-1.5 rounded-full"
              style={{ ...zen, background: "rgba(17,17,17,0.32)", maxWidth: "min(88vw, 420px)" }}
            >
              <button onClick={() => router.back()} className="p-1.5 text-white shrink-0" aria-label={t("back")}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 6 9 12l6 6" />
                </svg>
              </button>
              <span className="text-[13px] font-bold text-white truncate min-w-0">{label}</span>
              <span className="text-[11px] text-white/70 shrink-0 whitespace-nowrap">{t("count", { count: articles.length })}</span>
            </div>
          }
        />
      )}
      {openArticle && <ArticleDetailSheet article={openArticle} onClose={() => setOpenArticle(null)} />}
    </>
  );
}

export default function StackPage() {
  return (
    <Suspense fallback={null}>
      <StackContent />
    </Suspense>
  );
}
