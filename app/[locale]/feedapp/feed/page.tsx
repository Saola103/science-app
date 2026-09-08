"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { useProtoStore } from "../../../../lib/proto/store";
import { CATEGORIES, CATEGORY_STYLE, getCategoryLabel } from "../../../../lib/proto/mockData";
import { Article } from "../../../../lib/proto/types";
import { useArticles } from "../../../../lib/proto/useFeedData";
import { ArticleDetailSheet } from "../../../../components/proto/ArticleDetailSheet";
import { FeedScroll, zen, shuffle, weightedShuffle, hashSeed } from "../../../../components/proto/FeedScroll";

const ALL = "__all__";
const FILTERS = [ALL, ...CATEGORIES] as const;
// Below this many distinct real articles, an infinite-scroll feed dead-ends
// almost immediately (especially early on, before the collection pipeline has
// run for long — see lib/pipeline/collect.ts). In that case we fall back to
// repeating a freshly (weighted-)shuffled pass over what we do have, same as
// the original mock-data prototype did for its fixed 12-article set. Above
// this size, real pagination (via useArticles' loadMore) is enough on its own.
const SMALL_SET_THRESHOLD = 20;

// Personalization weight for a category: starts at 1 (everyone gets a fair
// baseline), then grows with three real signals — following it explicitly,
// having saved articles from it, and time actually spent reading it. Weight
// biases (but never fully excludes) how often a category's articles surface —
// see weightedShuffle() in components/proto/FeedScroll.tsx.
function categoryWeight(category: string, pool: Article[], followed: string[], saved: string[], viewSeconds: Record<string, number>): number {
  let w = 1;
  if (followed.includes(category)) w += 2;
  const savedInCategory = pool.filter((a) => a.category === category && saved.includes(a.id)).length;
  w += Math.min(savedInCategory, 3);
  const seconds = viewSeconds[category] ?? 0;
  w += Math.min(seconds / 30, 2);
  return w;
}

export default function FeedPage() {
  const [filter, setFilter] = useState<string>(ALL);
  const [filterOpen, setFilterOpen] = useState(false);
  const [openArticle, setOpenArticle] = useState<Article | null>(null);
  const [atTop, setAtTop] = useState(true);
  const { saved, toggleSaved, markSeen, followed, toggleFollow, viewSeconds, addViewSeconds, hydrated, showToast } = useProtoStore();
  const t = useTranslations("Proto.feed");
  const tDiscovery = useTranslations("Proto.discovery");
  const tContentType = useTranslations("Proto.contentType");
  const locale = useLocale();

  // Taxonomy categories (lib/proto/mockData.ts's mapDbCategoryToTaxonomy) live
  // client-side, not as a DB column — so a category filter is applied here,
  // not sent to /api/feed as a query param.
  const categoryFilterFn = useMemo(
    () => (filter === ALL ? undefined : (a: Article) => a.category === filter),
    [filter]
  );
  const { articles, hasMore, loadMore, loading } = useArticles({ pageSize: 30, filter: categoryFilterFn });

  // Personalization weights are snapshotted once per filter session (on filter
  // change, or once on mount after localStorage hydrates) rather than
  // recomputed live on every save/follow/dwell tick. Recomputing live was a
  // real bug we hit while dogfooding: the weighted pool's size changes with
  // the weights, so the whole shuffled feed reorders under the user's finger
  // mid-scroll — tapping save while scrolled 10 slides deep would silently
  // swap in unrelated articles at the same scroll position. Freezing the
  // snapshot means today's saves/follows/dwell time shape the NEXT time the
  // feed is (re)built, not the one currently underfoot.
  const weightsSnapshot = useRef<{ followed: string[]; saved: string[]; viewSeconds: Record<string, number> } | null>(null);
  const snapshotFilter = useRef<string | null>(null);
  if (hydrated && (snapshotFilter.current !== filter || weightsSnapshot.current === null)) {
    weightsSnapshot.current = { followed, saved, viewSeconds };
    snapshotFilter.current = filter;
  }

  // Slides are built incrementally, not re-derived wholesale from `articles`
  // on every render: only the NEWLY fetched chunk gets (weighted-)shuffled
  // and appended, so already-rendered slides never silently reorder under a
  // mid-scroll finger (same invariant the mock version relied on — see the
  // comment above weightsSnapshot).
  const [slides, setSlides] = useState<Article[]>([]);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const chunkRef = useRef(0);

  const weightOf = useCallback(
    (article: Article) => {
      if (filter !== ALL) return 1;
      const snap = weightsSnapshot.current ?? { followed: [], saved: [], viewSeconds: {} };
      return categoryWeight(article.category, articles, snap.followed, snap.saved, snap.viewSeconds);
    },
    [filter, articles]
  );

  // Reset the incremental slide list whenever the filter changes (useArticles
  // resets `articles` on its own for the same dependency).
  useEffect(() => {
    setSlides([]);
    knownIdsRef.current = new Set();
    chunkRef.current = 0;
  }, [filter]);

  useEffect(() => {
    const newOnes = articles.filter((a) => !knownIdsRef.current.has(a.id));
    if (newOnes.length === 0) return;
    for (const a of newOnes) knownIdsRef.current.add(a.id);
    const seed = hashSeed(`feed-${filter}-${chunkRef.current}`);
    chunkRef.current += 1;
    const ordered = filter === ALL ? weightedShuffle(newOnes, weightOf, seed) : shuffle(newOnes, seed);
    setSlides((prev) => [...prev, ...ordered]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articles, filter]);

  const nearEndLockRef = useRef(false);
  useEffect(() => {
    nearEndLockRef.current = false;
  }, [slides]);

  const handleNearEnd = useCallback(() => {
    if (nearEndLockRef.current) return;
    if (hasMore) {
      nearEndLockRef.current = true;
      loadMore();
      return;
    }
    if (articles.length > 0 && articles.length < SMALL_SET_THRESHOLD) {
      nearEndLockRef.current = true;
      const seed = hashSeed(`feed-${filter}-repeat-${chunkRef.current}`);
      chunkRef.current += 1;
      const ordered = filter === ALL ? weightedShuffle(articles, weightOf, seed) : shuffle(articles, seed);
      setSlides((prev) => [...prev, ...ordered]);
    }
  }, [hasMore, loadMore, articles, filter, weightOf]);

  const activeLabel = filter === ALL ? tDiscovery("filterAll") : getCategoryLabel(filter, locale);

  const followCategory = (category: string) => {
    toggleFollow(category);
    showToast(
      followed.includes(category)
        ? t("unfollowedToast", { category: getCategoryLabel(category, locale) })
        : t("followedToast", { category: getCategoryLabel(category, locale) })
    );
  };

  return (
    <>
      {slides.length === 0 && loading ? (
        <div className="fixed inset-0 flex items-center justify-center">
          <p className="text-[13px] text-[#94A3B8]" style={zen}>
            {tDiscovery("loading")}
          </p>
        </div>
      ) : slides.length === 0 ? (
        <div className="fixed inset-0 flex items-center justify-center px-8 text-center">
          <p className="text-[13px] text-[#94A3B8]" style={zen}>
            {tDiscovery("empty")}
          </p>
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
          t={t}
          tContentType={tContentType}
          locale={locale}
          atTop={atTop}
          onAtTopChange={setAtTop}
          topOverlay={
            <button
              onClick={() => setFilterOpen(true)}
              className="flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full shrink-0"
              style={{ ...zen, background: "rgba(17,17,17,0.32)" }}
              aria-label={tDiscovery("filterButtonAria")}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 6h16M7 12h10M10 18h4" />
              </svg>
              <span className="text-[12px] font-bold text-white">{activeLabel}</span>
            </button>
          }
        />
      )}

      <AnimatePresence>
        {filterOpen && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/35"
              onClick={() => setFilterOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 320 }}
              className="relative w-full bg-white rounded-t-3xl px-5 pb-8 pt-3"
              style={{ maxWidth: 480, ...zen }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center pb-4">
                <div className="w-9 h-1 rounded-full" style={{ background: "#E2E5EA" }} />
              </div>
              <h2 className="text-[15px] font-bold text-[#1A1D29] mb-4">{tDiscovery("filterSheetTitle")}</h2>
              <div className="flex flex-col gap-1.5">
                {FILTERS.map((f) => {
                  const active = filter === f;
                  const style = f === ALL ? undefined : CATEGORY_STYLE[f];
                  return (
                    <button
                      key={f}
                      onClick={() => {
                        setFilter(f);
                        setFilterOpen(false);
                      }}
                      className="flex items-center gap-3 px-3.5 py-3 rounded-2xl text-left"
                      style={active ? { background: "#EFF4FF" } : undefined}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: f === ALL ? "#2F6FED" : style?.text ?? "#94A3B8" }}
                      />
                      <span className="text-[14px] font-bold flex-1" style={{ color: active ? "#2F6FED" : "#1A1D29" }}>
                        {f === ALL ? tDiscovery("filterAll") : getCategoryLabel(f, locale)}
                      </span>
                      {active && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2F6FED" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {openArticle && <ArticleDetailSheet article={openArticle} onClose={() => setOpenArticle(null)} />}
    </>
  );
}
