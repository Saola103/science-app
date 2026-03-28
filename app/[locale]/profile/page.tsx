"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "../../../lib/supabase/client";
import { useRouter, useParams } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { Heart, Bookmark, LogOut, ChevronRight, ArrowRight, Play } from "lucide-react";

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
  ai: "AI", machine_learning: "機械学習", astronomy: "天文学", quantum: "量子情報",
  math: "数学", computer_science: "CS", neuroscience: "脳科学",
};
function catLabel(c?: string | null) {
  if (!c) return "サイエンス";
  for (const [k, v] of Object.entries(CAT_LABELS)) {
    if (c.toLowerCase().includes(k)) return v;
  }
  return c;
}

function ItemCard({ item }: { item: SavedItem }) {
  const headline = item.summary_general?.split(/[。！？\n]/)?.[0]?.trim() || item.title;
  return (
    <a
      href={item.url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors"
    >
      <div className="flex-1 space-y-2 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-[8px] font-black tracking-widest uppercase px-2 py-0.5 rounded ${item.type === "paper" ? "bg-sky-500/20 text-sky-300" : "bg-amber-500/20 text-amber-300"}`}>
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

export default function ProfilePage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || "ja";

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [likedItems, setLikedItems] = useState<SavedItem[]>([]);
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [activeTab, setActiveTab] = useState<"likes" | "saves">("likes");
  const [itemsLoading, setItemsLoading] = useState(false);

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
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const [likes, saves] = await Promise.all([
        fetch("/api/user/interactions?action=like", { headers }).then(r => r.json()).catch(() => ({ items: [] })),
        fetch("/api/user/interactions?action=save", { headers }).then(r => r.json()).catch(() => ({ items: [] })),
      ]);
      setLikedItems(likes.items || []);
      setSavedItems(saves.items || []);
      setItemsLoading(false);
    });
  }, [user]);

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
            ログインすると、いいね・保存した<br />論文をここで確認できます。
          </p>
        </div>

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
  const displayItems = activeTab === "likes" ? likedItems : savedItems;

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
              {likedItems.length}いいね　{savedItems.length}保存
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-5 mb-4">
        <div className="flex bg-white/5 rounded-2xl p-1">
          <button
            onClick={() => setActiveTab("likes")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all ${activeTab === "likes" ? "bg-white/10 text-white" : "text-white/40"}`}
          >
            <Heart className={`w-4 h-4 ${activeTab === "likes" ? "fill-rose-400 text-rose-400" : ""}`} />
            いいね {likedItems.length > 0 && <span className="text-[10px] bg-rose-500 text-white px-1.5 rounded-full">{likedItems.length}</span>}
          </button>
          <button
            onClick={() => setActiveTab("saves")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all ${activeTab === "saves" ? "bg-white/10 text-white" : "text-white/40"}`}
          >
            <Bookmark className={`w-4 h-4 ${activeTab === "saves" ? "fill-amber-400 text-amber-400" : ""}`} />
            保存 {savedItems.length > 0 && <span className="text-[10px] bg-amber-500 text-white px-1.5 rounded-full">{savedItems.length}</span>}
          </button>
        </div>
      </div>

      {/* Items list */}
      <div className="px-5 pb-8 space-y-3">
        {itemsLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : displayItems.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <div className="text-5xl opacity-20">{activeTab === "likes" ? "❤️" : "🔖"}</div>
            <p className="text-sm text-white/30 font-bold">
              {activeTab === "likes" ? "いいねした論文がありません" : "保存した論文がありません"}
            </p>
            <button
              onClick={() => router.push(`/${locale}/feed`)}
              className="mt-2 flex items-center gap-2 text-sky-400 text-sm font-black mx-auto"
            >
              <Play className="w-4 h-4 fill-current" /> フィードを開く <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          displayItems.map((item) => <ItemCard key={item.id} item={item} />)
        )}
      </div>
    </div>
  );
}
