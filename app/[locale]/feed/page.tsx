"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { FeedCard, FeedItemData } from "../../../components/FeedCard";
import { Link } from "../../../i18n/routing";
import { ArrowLeft, RefreshCw } from "lucide-react";

const SESSION_KEY = "pocket_dive_session_id";
const PREFS_KEY = "pocket_dive_feed_prefs";

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

export default function FeedPage() {
  const [items, setItems] = useState<FeedItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [sessionId, setSessionId] = useState<string>("loading");
  const [activeIndex, setActiveIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const itemViewTimeRef = useRef<Record<string, number>>({});
  const observerRef = useRef<IntersectionObserver | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Initialize session
  useEffect(() => {
    setSessionId(getOrCreateSessionId());
  }, []);

  // Fetch initial feed
  const fetchFeed = useCallback(async (cursor?: string) => {
    try {
      const prefs = getPreferences();
      const params = new URLSearchParams({ limit: "10" });
      if (cursor) params.set("cursor", cursor);
      if (Object.keys(prefs).length > 0) {
        params.set("preferences", JSON.stringify(prefs));
      }

      const res = await fetch(`/api/feed?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load feed");
      const data = await res.json();
      return data;
    } catch (err) {
      throw err;
    }
  }, []);

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
  }, [items]);

  const handleSave = useCallback((id: string) => {
    const item = items.find((i) => i.id === id);
    if (item) updatePreference(item.category, 2);
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

      {/* Progress indicator */}
      <div className="absolute top-4 right-4 z-50 text-[10px] text-white/40 font-black">
        {activeIndex + 1} / {items.length}
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
                onLike={handleLike}
                onSave={handleSave}
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
