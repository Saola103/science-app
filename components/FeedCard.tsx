"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Heart, Share2, Microscope, ChevronDown, ExternalLink, X, Plus, Check } from "lucide-react";
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
  summary_expert?: string | null;
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
  initialLiked?: boolean;
  nextItem?: { category?: string | null; type: "paper" | "news" } | null;
  followedCategories?: Set<string>;
  onLike?: (id: string) => void;
  onFollowCategory?: (category: string, followed: boolean) => void;
  onView?: () => void;
}

function formatDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
}

function getCategoryLabel(category?: string | null): string {
  if (!category) return "サイエンス";
  const cat = category.toLowerCase();
  const labels: Record<string, string> = {
    neuroscience: "脳科学", neuro: "脳科学", cognitive: "認知科学",
    "animal-behavior": "行動科学", behavior: "行動科学",
    biology: "生物学", bio: "生物学",
    "cell-biology": "細胞生物学", "molecular-biology": "分子生物学",
    genetics: "遺伝学", genomics: "ゲノム科学", biophysics: "生物物理学",
    "systems-biology": "システム生物学",
    medicine: "医学", neurology: "神経科学", bio_tech: "バイオテック",
    general: "サイエンス", science: "サイエンス",
    physics: "物理学", chemistry: "化学", math: "数学",
    astronomy: "天文学", material_science: "材料科学",
    computer_science: "CS", machine_learning: "機械学習",
    ai: "AI", quantum: "量子", robotics: "ロボティクス",
    climate: "気候変動", ecology: "生態学", energy: "エネルギー",
    geology: "地質学", psychology: "心理学",
  };
  for (const [key, label] of Object.entries(labels)) {
    if (cat.includes(key)) return label;
  }
  return category;
}

/** Category → vivid gradient for Instagram Reels / YouTube Shorts style */
function getCategoryGradient(category?: string | null): string {
  const cat = (category ?? "").toLowerCase();
  if (cat.includes("neuro") || cat.includes("brain") || cat.includes("cognitive"))
    return "from-violet-700 via-purple-800 to-indigo-900";
  if (cat.includes("bio") || cat.includes("gene") || cat.includes("cell") || cat.includes("molecular"))
    return "from-emerald-600 via-teal-700 to-cyan-900";
  if (cat.includes("physics") || cat.includes("quantum"))
    return "from-sky-600 via-blue-700 to-indigo-900";
  if (cat.includes("ai") || cat.includes("machine") || cat.includes("cs") || cat.includes("computer") || cat.includes("robot"))
    return "from-indigo-600 via-violet-700 to-purple-900";
  if (cat.includes("astro") || cat.includes("space") || cat.includes("cosmos"))
    return "from-blue-800 via-indigo-800 to-slate-900";
  if (cat.includes("medic") || cat.includes("health") || cat.includes("clinic"))
    return "from-rose-600 via-pink-700 to-red-900";
  if (cat.includes("chem") || cat.includes("material"))
    return "from-amber-600 via-orange-700 to-red-800";
  if (cat.includes("climate") || cat.includes("ecol") || cat.includes("environment"))
    return "from-green-600 via-emerald-700 to-teal-900";
  if (cat.includes("math"))
    return "from-cyan-600 via-sky-700 to-blue-900";
  if (cat.includes("psych") || cat.includes("social"))
    return "from-pink-600 via-rose-700 to-purple-900";
  // news default: warm blue
  return "from-blue-600 via-sky-700 to-indigo-900";
}

/** Strip markdown syntax and internal metadata for clean display */
function stripMarkdown(text: string): string {
  return text
    // section headers (▍見出し, ##見出し, old 【...】headers that became "xxx：")
    .replace(/^▍[^\n]*/gm, "")
    .replace(/^3つの[ダ要][イブポイント点]+[：:][^\n]*/gm, "")
    .replace(/^(研究の目的|手法|主要な結果|科学的意義|専門的解説|魅力的な解説)[と：:。\s]/gm, "")
    .replace(/#{1,6}\s*/g, "")
    // bold / italic
    .replace(/\*\*(.+?)\*\*/gs, "$1")
    .replace(/\*(.+?)\*/gs, "$1")
    // category tags like [biology] [it_ai] at end of casual summary
    .replace(/\n?\[(?:physics|biology|it_ai|medicine|astronomy|chemistry|environment|mathematics|other)\]\s*$/i, "")
    // any remaining [...] tag
    .replace(/\[[\w_]+\]/g, "")
    // 【カテゴリ】: ... lines
    .replace(/【カテゴリ】[^\n]*/g, "")
    .replace(/【([^】]+)】/g, "$1：")
    // Second pass: 【...】→"xxx：" conversion above may have created new section headers
    // e.g. 【3つのダイブポイント】 → "3つのダイブポイント：" must now be removed
    .replace(/^(?:3つのダイブポイント|3つの要点|研究の目的と背景|研究の目的|手法|主要な結果|科学的意義|専門的解説|魅力的な解説|核心的貢献)[：:][^\n]*/gm, "")
    // "カテゴリ：" at end
    .replace(/\nカテゴリ：\s*\S+\s*$/i, "")
    // bullet list markers
    .replace(/^\s*[-*+•]\s*/gm, "• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Category → emoji */
function getCategoryEmoji(category?: string | null): string {
  const cat = (category ?? "").toLowerCase();
  if (cat.includes("neuro") || cat.includes("brain") || cat.includes("cognitive")) return "🧠";
  if (cat.includes("bio") || cat.includes("gene") || cat.includes("cell") || cat.includes("molecular")) return "🧬";
  if (cat.includes("physics") || cat.includes("quantum")) return "⚛️";
  if (cat.includes("ai") || cat.includes("machine") || cat.includes("cs") || cat.includes("computer") || cat.includes("robot")) return "🤖";
  if (cat.includes("astro") || cat.includes("space") || cat.includes("cosmos")) return "🔭";
  if (cat.includes("medic") || cat.includes("health") || cat.includes("neuro")) return "🏥";
  if (cat.includes("chem") || cat.includes("material")) return "🧪";
  if (cat.includes("math")) return "📐";
  if (cat.includes("climate") || cat.includes("ecol") || cat.includes("environment")) return "🌍";
  return "🔬";
}

async function trackInteraction(
  sessionId: string,
  item: FeedItemData,
  action: "like" | "unlike" | "save" | "skip" | "view",
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
  } catch { /* non-critical */ }
}

function LoginPrompt({ onClose, locale }: { onClose: () => void; locale: string }) {
  const router = useRouter();
  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-[430px] bg-white/10 backdrop-blur-xl border border-white/20 rounded-t-3xl p-8 space-y-6 animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-white/30 rounded-full mx-auto" />
        <div className="text-center space-y-2">
          <div className="text-4xl">❤️</div>
          <h3 className="text-lg font-black text-white">ログインが必要です</h3>
          <p className="text-sm text-white/70 font-medium">
            いいね・保存はアカウントに紐づいて管理されます。
          </p>
        </div>
        <div className="space-y-3">
          <button
            onClick={() => router.push(`/${locale}/login`)}
            className="w-full bg-white text-indigo-700 font-black text-sm uppercase tracking-widest py-4 rounded-2xl transition-all hover:bg-white/90 active:scale-95"
          >
            ログイン / 新規登録
          </button>
          <button onClick={onClose} className="w-full text-white/50 font-bold text-sm py-2">
            後で
          </button>
        </div>
      </div>
    </div>
  );
}

/** Heart burst animation on double-tap like */
function HeartBurst({ visible }: { visible: boolean }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 flex items-center justify-center z-50 transition-all duration-300 ${
        visible ? "opacity-100 scale-100" : "opacity-0 scale-50"
      }`}
    >
      <Heart className="w-32 h-32 fill-white text-white drop-shadow-2xl" />
    </div>
  );
}

export function FeedCard({
  item, sessionId, isActive, initialLiked, nextItem,
  followedCategories, onLike, onFollowCategory, onView,
}: FeedCardProps) {
  const params = useParams();
  const locale = (params?.locale as string) || "ja";

  const [liked, setLiked] = useState(initialLiked ?? false);
  const [expanded, setExpanded] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [expertMode, setExpertMode] = useState(false);
  const [heartVisible, setHeartVisible] = useState(false);
  const viewTracked = useRef(false);
  const lastTapRef = useRef(0);

  // Sync initialLiked prop (loads after DB fetch)
  useEffect(() => {
    if (initialLiked !== undefined) setLiked(initialLiked);
  }, [initialLiked]);

  // Auth state
  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Track view + streak
  useEffect(() => {
    if (isActive && !viewTracked.current) {
      viewTracked.current = true;
      trackInteraction(sessionId, item, "view", userId);
      onView?.();
    }
  }, [isActive, sessionId, item, userId, onView]);

  const triggerLike = useCallback(() => {
    if (!userId) { setShowLoginPrompt(true); return; }
    if (liked) return; // double-tap only adds like, not toggles
    setLiked(true);
    setHeartVisible(true);
    setTimeout(() => setHeartVisible(false), 800);
    trackInteraction(sessionId, item, "like", userId);
    onLike?.(item.id);
  }, [liked, userId, sessionId, item, onLike]);

  // Double-tap to like, single tap to expand
  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      triggerLike();
    } else {
      setExpanded((e) => !e);
    }
    lastTapRef.current = now;
  }, [triggerLike]);

  const handleLike = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) { setShowLoginPrompt(true); return; }
    const next = !liked;
    setLiked(next);
    if (next) {
      setHeartVisible(true);
      setTimeout(() => setHeartVisible(false), 800);
      trackInteraction(sessionId, item, "like", userId);
      onLike?.(item.id);
    } else {
      // Unlike: delete the DB record
      trackInteraction(sessionId, item, "unlike", userId);
    }
  }, [liked, userId, sessionId, item, onLike]);

  const isFollowed = followedCategories?.has((item.category ?? "").toLowerCase()) ?? false;
  const handleFollowCategory = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const cat = (item.category ?? "").toLowerCase();
    if (!cat) return;
    onFollowCategory?.(cat, !isFollowed);
  }, [item.category, isFollowed, onFollowCategory]);

  const handleShare = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = item.title || "科学記事";

    // Share a POCKET DIVE page link (not the raw paper URL)
    const appBase = typeof window !== "undefined" ? window.location.origin : "https://scienceapp-alpha.vercel.app";
    const shareUrl = item.type === "paper" && item.id
      ? `${appBase}/${locale}/paper?id=${encodeURIComponent(item.id)}`
      : (item.url || `${appBase}/${locale}/feed`);

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${text} | POCKET DIVE`,
          text: "科学論文をスワイプで発見 🔬",
          url: shareUrl,
        });
      } catch { /* cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setShareMessage("コピー！");
        setTimeout(() => setShareMessage(null), 2000);
      } catch {
        setShareMessage("共有不可");
        setTimeout(() => setShareMessage(null), 2000);
      }
    }
  }, [item, locale]);

  // Derived content
  const rawGeneral = item.summary_general_ja || item.summary_general || item.summary_ja || item.summary;
  const rawExpert = item.summary_expert;
  const generalSummary = rawGeneral ? stripMarkdown(rawGeneral) : null;
  const expertSummary = rawExpert ? stripMarkdown(rawExpert) : null;
  const hasExpert = item.type === "paper" && !!expertSummary;
  const displaySummary = expertMode && hasExpert ? expertSummary : (generalSummary || expertSummary);
  const rawHeadline = generalSummary?.split(/[。！？\n]/)?.[0]?.trim() || null;
  // Discard headlines that are prompt-format artifacts from old data
  const isPromptArtifact = (t: string) =>
    /^(3つの|▍|【|ダイブポイント|要点：|専門的解説|魅力的な解説|研究の目的|手法：|結果：|科学的意義)/.test(t);
  const japaneseHeadline =
    rawHeadline && !isPromptArtifact(rawHeadline)
      ? rawHeadline.replace(/^[•\-\*\+]\s*/, "")
      : null;
  const displayTitle = item.title_ja || japaneseHeadline || item.title;
  const showEnglishSub = !item.title_ja && japaneseHeadline && item.title;
  const authorsText = item.authors?.slice(0, 2).join(", ") ?? "";
  const sourceText = item.type === "news" ? item.source : (item.source || "arXiv");

  const gradient = getCategoryGradient(item.category);

  return (
    <>
      {showLoginPrompt && <LoginPrompt onClose={() => setShowLoginPrompt(false)} locale={locale} />}

      <div
        className={`relative w-full h-svh flex-shrink-0 bg-gradient-to-b ${gradient} overflow-hidden select-none`}
        style={{ scrollSnapAlign: "start" }}
      >
        {/* Double-tap heart burst */}
        <HeartBurst visible={heartVisible} />

        {/* Tap area (whole card, behind UI) */}
        <div className="absolute inset-0 z-10" onClick={handleTap} />

        {/* ── TOP BAR ── */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center gap-2 px-4 pt-12 pb-3 pr-[72px]">
          <span className={`text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full ${
            item.type === "paper"
              ? "bg-white/25 text-white"
              : "bg-white/15 text-white/80"
          }`}>
            {item.type === "paper" ? "📄 論文" : "📰 ニュース"}
          </span>
          {/* Category badge with follow button */}
          <button
            onClick={handleFollowCategory}
            className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm transition-all active:scale-95 ${
              isFollowed
                ? "bg-white/25 text-white border border-white/40"
                : "bg-white/10 text-white/70 border border-transparent"
            }`}
          >
            {getCategoryLabel(item.category)}
            {isFollowed
              ? <Check className="w-2.5 h-2.5 ml-0.5" />
              : <Plus className="w-2.5 h-2.5 ml-0.5 opacity-60" />
            }
          </button>
          <span className="ml-auto text-[10px] font-bold text-white/50">
            {formatDate(item.published_at)}
          </span>
        </div>

        {/* ── RIGHT ACTION COLUMN ── */}
        <div className="absolute right-3 bottom-28 z-20 flex flex-col items-center gap-6">
          {/* Like */}
          <button
            onClick={handleLike}
            className="flex flex-col items-center gap-1.5 group"
            aria-label="いいね"
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 active:scale-90 ${
              liked
                ? "bg-red-500 scale-110 shadow-red-500/40"
                : "bg-white/20 backdrop-blur-md border border-white/30 group-hover:bg-white/30"
            }`}>
              <Heart className={`w-6 h-6 transition-all ${liked ? "fill-white text-white" : "text-white"}`} />
            </div>
            <span className={`text-[10px] font-black ${liked ? "text-red-300" : "text-white/60"}`}>
              {liked ? "♥" : "いいね"}
            </span>
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            className="flex flex-col items-center gap-1.5 group"
            aria-label="共有"
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/20 backdrop-blur-md border border-white/30 shadow-lg transition-all duration-200 group-hover:bg-white/30 active:scale-90">
              <Share2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-[10px] font-black text-white/60">
              {shareMessage || "シェア"}
            </span>
          </button>

          {/* Deep Dive */}
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              aria-label="原文を読む"
              className="flex flex-col items-center gap-1.5 group"
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/20 backdrop-blur-md border border-white/30 shadow-lg transition-all duration-200 group-hover:bg-white/30 active:scale-90">
                <Microscope className="w-6 h-6 text-white" />
              </div>
              <span className="text-[10px] font-black text-white/60 text-center leading-tight">
                深く潜る
              </span>
            </a>
          )}
        </div>

        {/* ── BOTTOM GRADIENT FADE ── */}
        <div className="absolute bottom-0 left-0 right-0 h-80 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none z-15" />

        {/* ── BOTTOM CONTENT — stays left of action column ── */}
        <div className="absolute bottom-0 left-0 z-20 px-4 pb-6" style={{ right: "72px" }}>
          {/* Difficulty toggle */}
          {hasExpert && (
            <div className="flex items-center gap-2 mb-3" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setExpertMode(false)}
                className={`text-[11px] font-black px-3 py-1.5 rounded-full border transition-all ${
                  !expertMode
                    ? "bg-white text-gray-900 border-white shadow-lg"
                    : "border-white/30 text-white/50 hover:border-white/50"
                }`}
              >
                やさしく
              </button>
              <button
                onClick={() => setExpertMode(true)}
                className={`text-[11px] font-black px-3 py-1.5 rounded-full border transition-all ${
                  expertMode
                    ? "bg-white text-gray-900 border-white shadow-lg"
                    : "border-white/30 text-white/50 hover:border-white/50"
                }`}
              >
                くわしく
              </button>
            </div>
          )}

          {/* Title */}
          <h2 className="text-[22px] font-black text-white leading-snug mb-1 drop-shadow-lg line-clamp-3">
            {displayTitle}
          </h2>

          {/* English subtitle */}
          {showEnglishSub && (
            <p className="text-[11px] text-white/45 font-medium mb-2 line-clamp-1">
              {item.title}
            </p>
          )}

          {/* Summary */}
          <div
            className={`overflow-hidden transition-all duration-500 ${expanded ? "max-h-52" : "max-h-14"}`}
            onClick={(e) => e.stopPropagation()}
          >
            {displaySummary ? (
              <p className={`text-sm text-white/85 leading-relaxed drop-shadow ${expanded ? "" : "line-clamp-2"}`}>
                {displaySummary}
              </p>
            ) : (
              <p className="text-sm text-white/40 italic">要約を生成中...</p>
            )}
          </div>

          {/* Expand / collapse */}
          {displaySummary && (
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
              className="flex items-center gap-1 text-[11px] font-bold text-white/60 mt-1 hover:text-white transition-colors"
            >
              {expanded ? (
                <><X className="w-3 h-3" /> 閉じる</>
              ) : (
                <>続きを読む <ChevronDown className="w-3 h-3" /></>
              )}
            </button>
          )}

          {/* Expanded extras */}
          {expanded && (
            <div className="mt-3 space-y-2 animate-in fade-in duration-300" onClick={(e) => e.stopPropagation()}>
              {authorsText && (
                <p className="text-xs text-white/50">
                  <span className="text-white/30 uppercase text-[9px] font-black tracking-widest mr-1">著者</span>
                  {authorsText}
                  {(item.authors?.length ?? 0) > 2 && ` +${(item.authors?.length ?? 0) - 2}`}
                </p>
              )}
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-black text-white/80 hover:text-white transition-colors underline underline-offset-2"
                >
                  原文を読む <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}

          {/* Source bar */}
          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/15">
            <span className="text-[11px] font-black text-white/45 uppercase tracking-widest">
              {sourceText}
            </span>
          </div>
        </div>

        {/* ── NEXT CARD PREVIEW ── */}
        {nextItem && (
          <div className="absolute bottom-0 left-0 right-0 z-25 flex items-center justify-center gap-1.5 py-2 bg-black/50 backdrop-blur-sm pointer-events-none">
            <span className="text-[9px] text-white/35 font-bold uppercase tracking-widest">次</span>
            <span className="text-[11px] text-white/65 font-black">
              {getCategoryEmoji(nextItem.category)} {getCategoryLabel(nextItem.category)}
            </span>
            <span className="text-[9px] text-white/35">▾</span>
          </div>
        )}
      </div>
    </>
  );
}
