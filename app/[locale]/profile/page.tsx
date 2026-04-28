"use client";

import { useEffect, useState, useCallback } from "react";
import { getSupabaseClient } from "../../../lib/supabase/client";
import { useRouter, useParams } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { Heart, LogOut, ChevronRight, ArrowRight, Play, X, Sparkles } from "lucide-react";
import { useStreak } from "../../../lib/hooks/useStreak";

const FOLLOWED_CATS_KEY = "pd_followed_cats";

type SavedItem = {
  id: string;
  type: "paper" | "news";
  title: string;
  summary_general?: string | null;
  category?: string | null;
  published_at?: string | null;
  url?: string | null;
  source?: string | null;
};

const CAT_LABELS: Record<string, string> = {
  physics: "物理学", biology: "生物学", medicine: "医学", chemistry: "化学",
  ai: "AI", it_ai: "AI・IT", machine_learning: "機械学習", astronomy: "天文学",
  quantum: "量子情報", math: "数学", mathematics: "数学",
  computer_science: "CS", neuroscience: "脳科学", neuro: "脳科学",
  "cell-biology": "細胞生物学", genetics: "遺伝学", "molecular-biology": "分子生物学",
  environment: "環境", general: "サイエンス",
};
function catLabel(c?: string | null) {
  if (!c) return "サイエンス";
  const lower = c.toLowerCase();
  for (const [k, v] of Object.entries(CAT_LABELS)) {
    if (lower.includes(k)) return v;
  }
  return c;
}

const CAT_EMOJIS: Record<string, string> = {
  neuro: "🧠", bio: "🧬", physics: "⚛️", ai: "🤖", astro: "🔭",
  medic: "🏥", chem: "🧪", math: "📐", climate: "🌍", gene: "🧬",
};
function catEmoji(c?: string | null): string {
  if (!c) return "🔬";
  const lower = c.toLowerCase();
  for (const [k, v] of Object.entries(CAT_EMOJIS)) {
    if (lower.includes(k)) return v;
  }
  return "🔬";
}

function ItemCard({ item }: { item: SavedItem }) {
  const headline = item.summary_general?.split(/[。！？\n]/)?.[0]?.replace(/^[•\-\*\+▍]\s*/, "")?.trim() || item.title;
  return (
    <a
      href={item.url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors"
    >
      <div className="flex-1 space-y-1.5 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-[8px] font-black tracking-widest uppercase px-2 py-0.5 rounded ${
            item.type === "paper" ? "bg-sky-500/20 text-sky-300" : "bg-amber-500/20 text-amber-300"
          }`}>
            {item.type === "paper" ? "論文" : "ニュース"}
          </span>
          <span className="text-[9px] text-white/30 font-bold">{catLabel(item.category)}</span>
        </div>
        <p className="text-sm font-bold text-white leading-tight line-clamp-2">{headline}</p>
        {item.source && <p className="text-[10px] text-white/30 font-bold uppercase">{item.source}</p>}
      </div>
      <ArrowRight className="w-4 h-4 text-white/20 shrink-0 mt-1" />
    </a>
  );
}

// ── Followed category mini-feed ──────────────────────────────────────────
function CategoryFeedSection({ category, onUnfollow, locale }: {
  category: string;
  onUnfollow: (cat: string) => void;
  locale: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/feed?category=${encodeURIComponent(category)}&limit=3`)
      .then(r => r.json())
      .then(d => setItems((d.items ?? []).slice(0, 3)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [category]);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => router.push(`/${locale}/feed?category=${encodeURIComponent(category)}`)}
          className="flex items-center gap-2"
        >
          <span className="text-xl">{catEmoji(category)}</span>
          <span className="text-sm font-black text-white">{catLabel(category)}</span>
          <ChevronRight className="w-3.5 h-3.5 text-white/40" />
        </button>
        <button
          onClick={() => onUnfollow(category)}
          className="text-white/25 hover:text-white/60 transition-colors p-1"
          aria-label="フォロー解除"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {loading ? (
        <div className="h-16 flex items-center">
          <div className="w-5 h-5 border border-white/20 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-xs text-white/25 italic">まだコンテンツがありません</p>
      ) : (
        <div className="space-y-2">
          {items.map(item => <ItemCard key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export default function ProfilePage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || "ja";

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [likedItems, setLikedItems] = useState<SavedItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  // Followed categories
  const [followedCats, setFollowedCats] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(FOLLOWED_CATS_KEY);
      return raw ? JSON.parse(raw) as string[] : [];
    } catch { return []; }
  });

  const { streak, todayCount, todayGoal } = useStreak();

  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    setItemsLoading(true);
    const supabase = getSupabaseClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const token = session?.access_token;
      if (!token) { setItemsLoading(false); return; }
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch("/api/user/interactions?action=like", { headers }).catch(() => null);
      const data = res ? await res.json().catch(() => ({ items: [] })) : { items: [] };
      setLikedItems(data.items || []);
      setItemsLoading(false);
    });
  }, [user]);

  const handleUnfollow = useCallback((cat: string) => {
    setFollowedCats(prev => {
      const next = prev.filter(c => c !== cat);
      try { localStorage.setItem(FOLLOWED_CATS_KEY, JSON.stringify(next)); } catch { /* */ }
      return next;
    });
  }, []);

  const handleLogout = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    router.push(`/${locale}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 gap-8">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-2">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" fill="white" opacity="0.8" />
              <path d="M4 20C4 16.69 7.58 14 12 14C16.42 14 20 16.69 20 20" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-white">マイページ</h1>
          <p className="text-sm text-white/50 font-medium leading-relaxed">
            ログインすると、いいねした<br />論文をここで確認できます。
          </p>
        </div>

        {/* Show streak even for non-logged-in */}
        {streak > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-center">
            <p className="text-3xl font-black text-white">🔥 {streak}日</p>
            <p className="text-xs text-white/40 font-bold mt-1">連続学習中</p>
          </div>
        )}

        <div className="w-full max-w-xs space-y-3">
          <button
            onClick={() => router.push(`/${locale}/login`)}
            className="w-full bg-sky-500 hover:bg-sky-400 text-white font-black text-sm uppercase tracking-widest py-4 rounded-2xl transition-colors"
          >
            ログイン / 新規登録
          </button>
          <button
            onClick={() => router.push(`/${locale}/feed`)}
            className="w-full border border-white/10 text-white/60 font-bold text-sm py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-white/5 transition-colors"
          >
            <Play className="w-4 h-4 fill-current" /> フィードを見る
          </button>
        </div>
      </div>
    );
  }

  // Logged in
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="px-5 pt-12 pb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-black tracking-widest text-white/30 uppercase">My Page</p>
            <h1 className="text-xl font-black mt-0.5">マイページ</h1>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-white/40 hover:text-white/80 transition-colors text-xs font-bold"
          >
            <LogOut className="w-4 h-4" /> ログアウト
          </button>
        </div>

        {/* User info card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 font-black text-lg uppercase">
            {user.email?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-white truncate">{user.email}</p>
            <p className="text-[10px] text-white/30 font-bold mt-0.5">
              {likedItems.length} いいね
            </p>
          </div>
        </div>
      </div>

      {/* Streak card */}
      <div className="px-5 mb-6">
        <div className="bg-gradient-to-r from-orange-900/40 to-amber-900/40 border border-orange-500/20 rounded-2xl p-4 flex items-center gap-4">
          <div className="text-4xl">🔥</div>
          <div className="flex-1">
            <p className="text-lg font-black text-white">{streak}日連続学習中</p>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex-1 bg-white/10 rounded-full h-1.5">
                <div
                  className="bg-orange-400 h-1.5 rounded-full transition-all"
                  style={{ width: `${Math.min((todayCount / todayGoal) * 100, 100)}%` }}
                />
              </div>
              <span className="text-[11px] text-white/50 font-bold whitespace-nowrap">
                {todayCount} / {todayGoal}本
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Followed categories */}
      <div className="px-5 mb-6">
        <h2 className="text-[11px] font-black tracking-widest text-white/40 uppercase mb-4">
          フォロー中のカテゴリ
        </h2>

        {followedCats.length === 0 ? (
          /* ── Follow hint ── */
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-black text-white">カテゴリをフォローしよう</p>
              <p className="text-xs text-white/50 leading-relaxed">
                フィードに表示されるカテゴリバッジ（例：<span className="text-white/70 font-bold">AI ＋</span>）をタップすると、そのカテゴリをフォローできます。フォローしたカテゴリの最新論文がここに表示されます。
              </p>
              <button
                onClick={() => router.push(`/${locale}/feed`)}
                className="flex items-center gap-1.5 text-sky-400 text-xs font-black mt-1 hover:text-sky-300 transition-colors"
              >
                <Play className="w-3 h-3 fill-current" /> フィードで試す <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        ) : (
          followedCats.map(cat => (
            <CategoryFeedSection
              key={cat}
              category={cat}
              onUnfollow={handleUnfollow}
              locale={locale}
            />
          ))
        )}
      </div>

      {/* Liked items */}
      <div className="px-5 pb-8">
        <h2 className="text-[11px] font-black tracking-widest text-white/40 uppercase mb-4 flex items-center gap-2">
          <Heart className="w-3.5 h-3.5 fill-rose-400 text-rose-400" />
          いいねした論文 {likedItems.length > 0 && (
            <span className="text-[10px] bg-rose-500 text-white px-1.5 rounded-full">{likedItems.length}</span>
          )}
        </h2>

        {itemsLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : likedItems.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <div className="text-5xl opacity-20">❤️</div>
            <p className="text-sm text-white/30 font-bold">まだいいねした論文がありません</p>
            <button
              onClick={() => router.push(`/${locale}/feed`)}
              className="flex items-center gap-2 text-sky-400 text-sm font-black mx-auto"
            >
              <Play className="w-4 h-4 fill-current" /> フィードを開く <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {likedItems.map((item) => <ItemCard key={item.id} item={item} />)}
          </div>
        )}
      </div>
    </div>
  );
}
