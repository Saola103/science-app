"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { FeedCard, FeedItemData } from "../../../components/FeedCard";
import { Link } from "../../../i18n/routing";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useStreak, DAILY_GOAL } from "../../../lib/hooks/useStreak";
import { getSupabaseClient } from "../../../lib/supabase/client";
import { useParams, useSearchParams } from "next/navigation";

const SESSION_KEY = "pocket_dive_session_id";
const PREFS_KEY = "pocket_dive_feed_prefs";
const FOLLOWED_CATS_KEY = "pd_followed_cats";

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function getPreferences(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function updatePreference(category: string | null | undefined, delta: number) {
  if (!category || typeof window === "undefined") return;
  try {
    const prefs = getPreferences();
    const cat = category.toLowerCase();
    prefs[cat] = (prefs[cat] || 0) + delta;
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

function FeedPageInner() {
  const params = useParams();
  const locale = (params?.locale as string) || "ja";
  const searchParams = useSearchParams();
  const categoryParam = searchParams?.get("category") || null;

  const [items, setItems] = useState<FeedItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [sessionId, setSessionId] = useState<string>("loading");
  const [activeIndex, setActiveIndex] = useState(0);

  // Liked IDs (loaded from DB after auth)
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  // Followed categories (localStorage)
  const [followedCats, setFollowedCats] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = localStorage.getItem(FOLLOWED_CATS_KEY);
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch { return new Set(); }
  });

  // Streak
  const { streak, todayCount, todayGoal, todayDone, recordRead } = useStreak();
  const [showDoneScreen, setShowDoneScreen] = useState(false);
  const doneShownThisSession = useRef(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const itemViewTimeRef = useRef<Record<string, number>>({});
  const observerRef = useRef<IntersectionObserver | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Initialize session
  useEffect(() => {
    setSessionId(getOrCreateSessionId());
  }, []);

  // Load liked IDs for logged-in user
  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.access_token) return;
      try {
        const res = await fetch("/api/user/interactions?action=like&idsOnly=true", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();
        if (data.ids) setLikedIds(new Set(data.ids as string[]));
      } catch { /* non-critical */ }
    });
  }, []);

  // Category follow handler
  const handleFollowCategory = useCallback((category: string, follow: boolean) => {
    setFollowedCats((prev) => {
      const next = new Set(prev);
      if (follow) next.add(category);
      else next.delete(category);
      try { localStorage.setItem(FOLLOWED_CATS_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  }, []);

  // Streak: record view
  const handleView = useCallback(() => {
    if (doneShownThisSession.current) return;
    const goalJustMet = recordRead();
    if (goalJustMet) {
      doneShownThisSession.current = true;
      setShowDoneScreen(true);
    }
  }, [recordRead]);

  // Fetch initial feed
  const fetchFeed = useCallback(async (cursor?: string) => {
    try {
      const prefs = getPreferences();
      const urlParams = new URLSearchParams({ limit: "10" });
      if (cursor) urlParams.set("cursor", cursor);
      if (Object.keys(prefs).length > 0) {
        urlParams.set("preferences", JSON.stringify(prefs));
      }
      if (categoryParam) urlParams.set("category", categoryParam);

      const res = await fetch(`/api/feed?${urlParams.toString()}`);
      if (!res.ok) throw new Error("Failed to load feed");
      const data = await res.json();
      return data;
    } catch (err) {
      throw err;
    }
  }, [categoryParam]);

  useEffect(() => {
    setLoading(true);
    fetchFeed()
      .then((data) => {
        setItems(data.items || []);
        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore);
      })
      .catch(() => setError("フィードを読み込めませんでした"))
      .finally(() => setLoading(false));
  }, [fetchFeed]);

  // Load more when near end
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !nextCursor) return;
    setLoadingMore(true);
    try {
      const data = await fetchFeed(nextCursor);
      setItems((prev) => [...prev, ...(data.items || [])]);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch {
      // silently fail
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, nextCursor, fetchFeed]);

  // Track active card via IntersectionObserver
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = cardRefs.current.indexOf(entry.target as HTMLDivElement);
          if (index === -1) continue;

          const itemId = items[index]?.id;
          if (!itemId) continue;

          if (entry.isIntersecting) {
            setActiveIndex(index);
            itemViewTimeRef.current[itemId] = Date.now();

            // Load more when near the end
            if (index >= items.length - 3) {
              loadMore();
            }
          } else {
            // Track skip if viewed < 2 seconds
            const viewStart = itemViewTimeRef.current[itemId];
            if (viewStart) {
              const elapsed = Date.now() - viewStart;
              if (elapsed < 2000 && items[index]) {
                updatePreference(items[index].category, -1);
              }
              delete itemViewTimeRef.current[itemId];
            }
          }
        }
      },
      {
        root: containerRef.current,
        threshold: 0.6,
      }
    );

    const currentRefs = cardRefs.current;
    currentRefs.forEach((ref) => {
      if (ref) observerRef.current!.observe(ref);
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [items, loadMore]);

  // Keyboard arrow navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        const next = Math.min(activeIndex + 1, items.length - 1);
        cardRefs.current[next]?.scrollIntoView({ behavior: "smooth" });
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        const prev = Math.max(activeIndex - 1, 0);
        cardRefs.current[prev]?.scrollIntoView({ behavior: "smooth" });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, items.length]);

  const handleLike = useCallback((id: string) => {
    const item = items.find((i) => i.id === id);
    if (item) updatePreference(item.category, 2);
    // Optimistically update liked set
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, [items]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-[100]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-white/60 text-sm font-bold tracking-widest uppercase">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error || items.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-[100]">
        <div className="text-center space-y-6 px-8">
          <div className="text-6xl">🔬</div>
          <p className="text-white font-bold text-xl">
            {error || "まだコンテンツがありません"}
          </p>
          <p className="text-white/50 text-sm">
            {error ? "しばらく後にもう一度お試しください" : "後でまた確認してみてください"}
          </p>
          <div className="flex items-center gap-4 justify-center">
            <Link
              href="/"
              className="flex items-center gap-2 text-white/60 hover:text-white text-sm font-bold uppercase tracking-widest transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> ホームへ
            </Link>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 text-sky-400 hover:text-sky-300 text-sm font-bold uppercase tracking-widest transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> 再試行
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-[100]">
      {/* 🎉 Daily goal completion screen */}
      {showDoneScreen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="text-center space-y-5 px-8 animate-in zoom-in duration-300">
            <div className="text-7xl">🔥</div>
            <div>
              <p className="text-3xl font-black text-white">{streak}日連続！</p>
              <p className="text-lg font-bold text-white/70 mt-1">今日の{todayGoal}本 達成</p>
            </div>
            <div className="bg-white/10 rounded-2xl px-6 py-3 inline-block">
              <p className="text-sm text-white/60 font-bold">今日は {todayCount} 本読んだ 📖</p>
            </div>
            <button
              onClick={() => setShowDoneScreen(false)}
              className="block w-full max-w-xs mx-auto bg-white text-black font-black text-sm uppercase tracking-widest py-4 rounded-2xl active:scale-95 transition-all"
            >
              続ける
            </button>
          </div>
        </div>
      )}

      {/* Back button overlay */}
      <div className="absolute top-4 left-4 z-50">
        <Link
          href="/"
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors bg-black/30 backdrop-blur-sm rounded-full px-3 py-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">ホーム</span>
        </Link>
      </div>

      {/* Progress indicator + streak */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        {streak > 1 && (
          <span className="text-[10px] font-black text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded-full">
            🔥 {streak}
          </span>
        )}
        <span className="text-[10px] text-white/40 font-black">
          {activeIndex + 1} / {items.length}
        </span>
      </div>

      {/* Feed container - centered, max width for desktop */}
      <div className="h-full flex justify-center">
        <div
          ref={containerRef}
          className="relative w-full max-w-[430px] h-full overflow-y-scroll"
          style={{
            scrollSnapType: "y mandatory",
            scrollBehavior: "smooth",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {items.map((item, index) => (
            <div
              key={`${item.type}-${item.id}`}
              ref={(el) => { cardRefs.current[index] = el; }}
              style={{ scrollSnapAlign: "start", height: "100svh" }}
            >
              <FeedCard
                item={item}
                sessionId={sessionId}
                isActive={index === activeIndex}
                initialLiked={likedIds.has(item.id)}
                nextItem={items[index + 1] ?? null}
                followedCategories={followedCats}
                onLike={handleLike}
                onFollowCategory={handleFollowCategory}
                onView={handleView}
              />
            </div>
          ))}

          {/* Loading more indicator */}
          {loadingMore && (
            <div
              className="flex items-center justify-center bg-black"
              style={{ height: "100svh", scrollSnapAlign: "start" }}
            >
              <div className="text-center space-y-4">
                <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-white/40 text-xs font-bold uppercase tracking-widest">次を読み込み中...</p>
              </div>
            </div>
          )}

          {/* End of feed */}
          {!hasMore && !loadingMore && (
            <div
              className="flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-black gap-6"
              style={{ height: "100svh", scrollSnapAlign: "start" }}
            >
              <div className="text-5xl">🌌</div>
              <p className="text-white/60 font-bold text-lg tracking-tight">フィードの最後です</p>
              <p className="text-white/30 text-sm">また後で確認してください</p>
              <button
                onClick={() => {
                  containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                  setActiveIndex(0);
                }}
                className="flex items-center gap-2 text-sky-400 hover:text-sky-300 transition-colors text-sm font-black uppercase tracking-widest"
              >
                <RefreshCw className="w-4 h-4" /> 最初に戻る
              </button>
            </div>
          )}
        </div>

        {/* Desktop side decoration */}
        <div className="hidden lg:flex items-center justify-center w-full max-w-[calc(50%-215px)] text-white/10 text-xs font-bold uppercase tracking-widest absolute left-0 top-0 bottom-0 pointer-events-none">
          <div className="rotate-90 whitespace-nowrap">Science TikTok — Pocket Dive</div>
        </div>
      </div>
    </div>
  );
}

export default function FeedPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <FeedPageInner />
    </Suspense>
  );
}
