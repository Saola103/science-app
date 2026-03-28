"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Heart, Bookmark, Share2, Microscope, ChevronDown, ExternalLink, X } from "lucide-react";
import { getSupabaseClient } from "../lib/supabase/client";
import { useParams, useRouter } from "next/navigation";

export type FeedItemData = {
  id: string;
  type: "paper" | "news";
  title: string;
  title_ja?: string | null;
  summary?: string | null;
  summary_ja?: string | null;
  summary_general?: string | null;
  summary_general_ja?: string | null;
  category?: string | null;
  published_at?: string | null;
  url?: string | null;
  source?: string | null;
  authors?: string[] | null;
  arxiv_id?: string | null;
  image_url?: string | null;
  gradient?: string;
};

interface FeedCardProps {
  item: FeedItemData;
  sessionId: string;
  isActive: boolean;
  onLike?: (id: string) => void;
  onSave?: (id: string) => void;
}

function formatDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ja-JP", { month: "short", day: "numeric", year: "numeric" });
}

function getCategoryLabel(category?: string | null): string {
  if (!category) return "サイエンス";
  const cat = category.toLowerCase();
  const labels: Record<string, string> = {
    general: "サイエンス", science: "サイエンス",
    biology: "生物学", bio: "生物学", neuroscience: "脳科学",
    medicine: "医学", genetics: "遺伝学", bio_tech: "バイオテック",
    physics: "物理学", chemistry: "化学", math: "数学",
    astronomy: "天文学", material_science: "材料科学",
    computer_science: "コンピュータ科学", machine_learning: "機械学習",
    ai: "AI", quantum: "量子情報", robotics: "ロボティクス",
    climate: "気候変動", ecology: "生態学", energy: "エネルギー",
    geology: "地質学", psychology: "心理学",
  };
  for (const [key, label] of Object.entries(labels)) {
    if (cat.includes(key)) return label;
  }
  return category;
}

async function trackInteraction(
  sessionId: string,
  item: FeedItemData,
  action: "like" | "save" | "skip" | "view",
  userId?: string | null
) {
  try {
    await fetch("/api/feed/interact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item_id: item.id,
        item_type: item.type,
        action,
        session_id: sessionId,
        category: item.category,
        user_id: userId || null,
      }),
    });
  } catch {
    // Non-critical
  }
}

// Login prompt modal
function LoginPrompt({ onClose, locale }: { onClose: () => void; locale: string }) {
  const router = useRouter();
  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-[430px] bg-zinc-900 border border-white/10 rounded-t-3xl p-8 space-y-6 animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto" />
        <div className="text-center space-y-2">
          <div className="text-4xl">❤️</div>
          <h3 className="text-lg font-black text-white">ログインが必要です</h3>
          <p className="text-sm text-white/50 font-medium">
            いいね・保存はアカウントに紐づけて管理されます。<br />
            マイページから確認できます。
          </p>
        </div>
        <div className="space-y-3">
          <button
            onClick={() => router.push(`/${locale}/login`)}
            className="w-full bg-sky-500 hover:bg-sky-400 text-white font-black text-sm uppercase tracking-widest py-4 rounded-2xl transition-colors"
          >
            ログイン / 新規登録
          </button>
          <button
            onClick={onClose}
            className="w-full text-white/40 font-bold text-sm py-2"
          >
            後で
          </button>
        </div>
      </div>
    </div>
  );
}

export function FeedCard({ item, sessionId, isActive, onLike, onSave }: FeedCardProps) {
  const params = useParams();
  const locale = (params?.locale as string) || "ja";

  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(Math.floor(Math.random() * 300) + 10);
  const [saveCount, setSaveCount] = useState(Math.floor(Math.random() * 80) + 3);
  const [expanded, setExpanded] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const viewTracked = useRef(false);

  // Check auth state
  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Track view
  useEffect(() => {
    if (isActive && !viewTracked.current) {
      viewTracked.current = true;
      trackInteraction(sessionId, item, "view", userId);
    }
  }, [isActive, sessionId, item, userId]);

  const handleLike = useCallback(() => {
    if (!userId) { setShowLoginPrompt(true); return; }
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount((c) => (newLiked ? c + 1 : c - 1));
    if (newLiked) {
      trackInteraction(sessionId, item, "like", userId);
      onLike?.(item.id);
    }
  }, [liked, sessionId, item, onLike, userId]);

  const handleSave = useCallback(() => {
    if (!userId) { setShowLoginPrompt(true); return; }
    const newSaved = !saved;
    setSaved(newSaved);
    setSaveCount((c) => (newSaved ? c + 1 : c - 1));
    if (newSaved) {
      trackInteraction(sessionId, item, "save", userId);
      onSave?.(item.id);
    }
  }, [saved, sessionId, item, onSave, userId]);

  const handleShare = useCallback(async () => {
    const text = item.title || "科学記事";
    const url = item.url || window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: text, url }); } catch { /* cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setShareMessage("コピーしました");
        setTimeout(() => setShareMessage(null), 2000);
      } catch {
        setShareMessage("共有できません");
        setTimeout(() => setShareMessage(null), 2000);
      }
    }
  }, [item]);

  const gradient = item.gradient || "from-indigo-950 via-slate-900 to-zinc-900";
  const japaneseSummary = item.summary_general_ja || item.summary_general || item.summary_ja || item.summary;
  const japaneseHeadline = japaneseSummary?.split(/[。！？\n]/)?.[0]?.trim() || null;
  const displayTitle = item.title_ja || japaneseHeadline || item.title;
  const showEnglishSub = !item.title_ja && japaneseHeadline && item.title;
  const displaySummary = japaneseSummary;
  const authorsText = item.authors?.slice(0, 2).join(", ") ?? "";
  const sourceText = item.type === "news" ? item.source : (item.source || "arXiv");

  return (
    <>
      {showLoginPrompt && (
        <LoginPrompt onClose={() => setShowLoginPrompt(false)} locale={locale} />
      )}

      <div
        className={`relative w-full h-svh flex-shrink-0 bg-gradient-to-b ${gradient} overflow-hidden`}
        style={{ scrollSnapAlign: "start" }}
      >
        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-5 pt-12 pb-3 bg-gradient-to-b from-black/50 to-transparent">
          <span className="text-[10px] font-black tracking-[0.2em] uppercase text-white/70 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
            {getCategoryLabel(item.category)}
          </span>
          <span className="text-[10px] font-bold text-white/50">
            {formatDate(item.published_at)}
          </span>
        </div>

        {/* Main content — click to expand */}
        <div
          className="absolute inset-0 flex flex-col justify-end cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

          <div className="relative z-10 px-5 pb-24">
            <div className="mb-3">
              <span className={`text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded ${item.type === "paper" ? "bg-sky-500/30 text-sky-300" : "bg-amber-500/30 text-amber-300"}`}>
                {item.type === "paper" ? "論文" : "ニュース"}
              </span>
            </div>

            <h2 className="text-xl md:text-2xl font-black text-white leading-tight mb-2 line-clamp-3 drop-shadow-lg">
              {displayTitle}
            </h2>
            {showEnglishSub && (
              <p className="text-[11px] text-white/40 font-medium mb-3 line-clamp-1 tracking-wide">
                {item.title}
              </p>
            )}

            <div className={`transition-all duration-500 ease-in-out overflow-hidden ${expanded ? "max-h-96" : "max-h-20"}`}>
              {displaySummary ? (
                <p className={`text-sm text-white/80 leading-relaxed font-medium ${expanded ? "" : "line-clamp-3"}`}>
                  {displaySummary}
                </p>
              ) : (
                <p className="text-sm text-white/50 italic">要約はありません</p>
              )}
            </div>

            {!expanded && (
              <button
                onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
                className="flex items-center gap-1 text-[10px] font-black text-white/40 uppercase tracking-widest mt-2 hover:text-white/80 transition-colors"
              >
                もっと見る <ChevronDown className="w-3 h-3" />
              </button>
            )}

            {expanded && (
              <div className="mt-4 space-y-3 animate-in fade-in duration-300">
                {authorsText && (
                  <p className="text-xs text-white/60 font-medium">
                    <span className="text-white/40 uppercase tracking-widest text-[9px] font-black">著者: </span>
                    {authorsText}
                    {(item.authors?.length ?? 0) > 2 && ` 他${(item.authors?.length ?? 0) - 2}名`}
                  </p>
                )}
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-sky-400 hover:text-sky-300 transition-colors border-b border-sky-400/40 pb-0.5"
                  >
                    原文を読む <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
                  className="flex items-center gap-1 text-[9px] text-white/30 hover:text-white/60 transition-colors uppercase tracking-widest"
                >
                  <X className="w-3 h-3" /> 閉じる
                </button>
              </div>
            )}

            <div className="flex items-center gap-3 mt-4 pt-3 border-t border-white/10">
              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest truncate">
                {sourceText}
              </span>
            </div>
          </div>
        </div>

        {/* Right action column */}
        <div className="absolute right-4 bottom-28 flex flex-col items-center gap-6 z-20">
          <button
            onClick={(e) => { e.stopPropagation(); handleLike(); }}
            className="flex flex-col items-center gap-1 group"
            aria-label="いいね"
          >
            <div className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-sm transition-all duration-200 ${liked ? "bg-rose-500 scale-110" : "bg-white/15 group-hover:bg-white/25"}`}>
              <Heart className={`w-5 h-5 transition-all ${liked ? "text-white fill-white" : "text-white"}`} />
            </div>
            <span className="text-[10px] font-black text-white/70">{likeCount}</span>
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); handleSave(); }}
            className="flex flex-col items-center gap-1 group"
            aria-label="保存"
          >
            <div className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-sm transition-all duration-200 ${saved ? "bg-amber-500 scale-110" : "bg-white/15 group-hover:bg-white/25"}`}>
              <Bookmark className={`w-5 h-5 transition-all ${saved ? "text-white fill-white" : "text-white"}`} />
            </div>
            <span className="text-[10px] font-black text-white/70">{saveCount}</span>
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); handleShare(); }}
            className="flex flex-col items-center gap-1 group"
            aria-label="共有"
          >
            <div className="w-11 h-11 rounded-full flex items-center justify-center bg-white/15 backdrop-blur-sm group-hover:bg-white/25 transition-all duration-200">
              <Share2 className="w-5 h-5 text-white" />
            </div>
            {shareMessage ? (
              <span className="text-[9px] font-black text-green-400 max-w-12 text-center leading-tight">{shareMessage}</span>
            ) : (
              <span className="text-[10px] font-black text-white/70">共有</span>
            )}
          </button>

          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex flex-col items-center gap-1 group"
              aria-label="深く潜る"
            >
              <div className="w-11 h-11 rounded-full flex items-center justify-center bg-sky-500/30 backdrop-blur-sm group-hover:bg-sky-500/50 transition-all duration-200 border border-sky-400/30">
                <Microscope className="w-5 h-5 text-sky-300" />
              </div>
              <span className="text-[9px] font-black text-sky-300/80 text-center leading-tight">深く<br />潜る</span>
            </a>
          )}
        </div>
      </div>
    </>
  );
}
