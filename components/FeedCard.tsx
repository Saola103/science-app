"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Heart, Share2, Microscope, ChevronDown, ExternalLink, X, Plus, Check,
  Brain, Dna, Atom, Cpu, Telescope, HeartPulse, FlaskConical, Leaf, Sigma, Sparkles,
} from "lucide-react";
import { getSupabaseClient } from "../lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import { stripMarkdown, stripMarkdownExpert } from "../lib/format/summaryText";

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

/**
 * Category → flat single-hue {base, dark} pair (Duolingo-style: one saturated
 * scene color per field, not a gradient). `dark` backs the porthole well and
 * the bottom sheet; the accent (yellow) stays constant across every category
 * for brand consistency, same as Duolingo's own accent-vs-scene split.
 */
function getCategoryColors(category?: string | null): { base: string; dark: string } {
  const cat = (category ?? "").toLowerCase();
  if (cat.includes("neuro") || cat.includes("brain") || cat.includes("cognitive"))
    return { base: "#5B4FE8", dark: "#4A3FD8" };
  if (cat.includes("bio") || cat.includes("gene") || cat.includes("cell") || cat.includes("molecular"))
    return { base: "#1FAE73", dark: "#178F5D" };
  if (cat.includes("physics") || cat.includes("quantum"))
    return { base: "#2E86F5", dark: "#1E6FD9" };
  if (cat.includes("ai") || cat.includes("machine") || cat.includes("cs") || cat.includes("computer") || cat.includes("robot"))
    return { base: "#8B3FE8", dark: "#722ED1" };
  if (cat.includes("astro") || cat.includes("space") || cat.includes("cosmos"))
    return { base: "#2447B0", dark: "#1B3690" };
  if (cat.includes("medic") || cat.includes("health") || cat.includes("clinic"))
    return { base: "#F0506E", dark: "#D93A57" };
  if (cat.includes("chem") || cat.includes("material"))
    return { base: "#F2843C", dark: "#D96B26" };
  if (cat.includes("climate") || cat.includes("ecol") || cat.includes("environment"))
    return { base: "#17A398", dark: "#0F8A80" };
  if (cat.includes("math"))
    return { base: "#1AA6C9", dark: "#1189A8" };
  if (cat.includes("psych") || cat.includes("social"))
    return { base: "#E85BA0", dark: "#CC4088" };
  return { base: "#5B4FE8", dark: "#4A3FD8" };
}

const ACCENT = "#FFC95C";
const ACCENT_DARK = "#D9A53F";

/** Category → line icon shown in the porthole's default (non-mascot) state */
function CategoryIcon({ category, size = 28 }: { category?: string | null; size?: number }) {
  const cat = (category ?? "").toLowerCase();
  const props = { size, strokeWidth: 2.2 };
  if (cat.includes("neuro") || cat.includes("brain") || cat.includes("cognitive")) return <Brain {...props} />;
  if (cat.includes("bio") || cat.includes("gene") || cat.includes("cell") || cat.includes("molecular")) return <Dna {...props} />;
  if (cat.includes("physics") || cat.includes("quantum")) return <Atom {...props} />;
  if (cat.includes("ai") || cat.includes("machine") || cat.includes("cs") || cat.includes("computer") || cat.includes("robot")) return <Cpu {...props} />;
  if (cat.includes("astro") || cat.includes("space") || cat.includes("cosmos")) return <Telescope {...props} />;
  if (cat.includes("medic") || cat.includes("health") || cat.includes("clinic")) return <HeartPulse {...props} />;
  if (cat.includes("chem") || cat.includes("material")) return <FlaskConical {...props} />;
  if (cat.includes("climate") || cat.includes("ecol") || cat.includes("environment")) return <Leaf {...props} />;
  if (cat.includes("math")) return <Sigma {...props} />;
  if (cat.includes("psych") || cat.includes("social")) return <Sparkles {...props} />;
  return <Microscope {...props} />;
}

/** "Pocket Diver" mascot — only shown for the liked-card cameo, never by default */
function PocketDiverMascot() {
  return (
    <svg width="82" height="89" viewBox="0 0 118 128" fill="none" style={{ marginTop: 23 }}>
      <ellipse cx="59" cy="78" rx="42" ry="40" fill={ACCENT} stroke="#1a1a16" strokeWidth="4" />
      <path d="M22 62 A37 37 0 0 1 96 62" fill="#eaf6ff" stroke="#1a1a16" strokeWidth="4" />
      <circle cx="59" cy="60" r="3" fill="#1a1a16" />
      <circle cx="44" cy="78" r="7" fill="#1a1a16" />
      <circle cx="74" cy="78" r="7" fill="#1a1a16" />
      <circle cx="46" cy="75" r="2" fill="#fff" />
      <circle cx="76" cy="75" r="2" fill="#fff" />
      <path d="M48 94c5 6 17 6 22 0" stroke="#1a1a16" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Top-space visual: a submarine "porthole" with the category icon by default;
 * once the card is liked it becomes a one-off mascot cameo with a small badge.
 * Keeping the mascot tied to a real, infrequent moment (liking something) —
 * rather than showing it on every card — is deliberate: a recurring character
 * on every screen is exactly what made Duolingo's owl grate at scale.
 */
function TopSpaceVisual({ category, dark, liked }: { category?: string | null; dark: string; liked: boolean }) {
  return (
    <div className="flex flex-col items-center" style={{ marginTop: 8 }}>
      {liked && (
        <span
          className="font-black text-[11px] px-3.5 py-1.5 rounded-full mb-2 whitespace-nowrap"
          style={{ background: ACCENT, color: "#1a1a16", boxShadow: `0 3px 0 ${ACCENT_DARK}`, fontFamily: "var(--font-zen-maru), sans-serif" }}
        >
          気に入ってくれてありがとう！
        </span>
      )}
      <div
        className="rounded-full flex items-center justify-center overflow-hidden"
        style={{
          width: 108, height: 108,
          background: dark,
          border: `5px solid ${liked ? ACCENT : "rgba(255,255,255,0.25)"}`,
        }}
      >
        {liked ? (
          <PocketDiverMascot />
        ) : (
          <div className="w-[86px] h-[86px] rounded-full flex items-center justify-center" style={{ background: "#EAF6FF", color: dark }}>
            <CategoryIcon category={category} />
          </div>
        )}
      </div>
    </div>
  );
}

async function trackInteraction(
  sessionId: string,
  item: FeedItemData,
  action: "like" | "unlike" | "save" | "skip" | "view",
  userId?: string | null,
  accessToken?: string | null
) {
  try {
    await fetch("/api/feed/interact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Send JWT so the server can verify user identity server-side.
        // Never send user_id in body — the API derives it from this token.
        ...(accessToken ? { "Authorization": `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({
        item_id: item.id,
        item_type: item.type,
        action,
        session_id: sessionId,
        category: item.category,
        // user_id intentionally omitted — derived server-side from JWT
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
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [expertMode, setExpertMode] = useState(false);
  const [heartVisible, setHeartVisible] = useState(false);
  const viewTracked = useRef(false);
  const lastTapRef = useRef(0);

  // Sync initialLiked prop (loads after DB fetch)
  useEffect(() => {
    if (initialLiked !== undefined) setLiked(initialLiked);
  }, [initialLiked]);

  // Auth state — also track access_token to send in Authorization header
  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
      setAccessToken(session?.access_token ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
      setAccessToken(session?.access_token ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Track view + streak
  useEffect(() => {
    if (isActive && !viewTracked.current) {
      viewTracked.current = true;
      trackInteraction(sessionId, item, "view", userId, accessToken);
      onView?.();
    }
  }, [isActive, sessionId, item, userId, accessToken, onView]);

  const triggerLike = useCallback(() => {
    if (!userId) { setShowLoginPrompt(true); return; }
    if (liked) return; // double-tap only adds like, not toggles
    setLiked(true);
    setHeartVisible(true);
    setTimeout(() => setHeartVisible(false), 800);
    trackInteraction(sessionId, item, "like", userId, accessToken);
    onLike?.(item.id);
  }, [liked, userId, accessToken, sessionId, item, onLike]);

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
      trackInteraction(sessionId, item, "like", userId, accessToken);
      onLike?.(item.id);
    } else {
      // Unlike: delete the DB record
      trackInteraction(sessionId, item, "unlike", userId, accessToken);
    }
  }, [liked, userId, accessToken, sessionId, item, onLike]);

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
  // Apply appropriate stripping: casual = full strip, expert = light strip (keeps labels)
  const generalSummary = rawGeneral ? stripMarkdown(rawGeneral) : null;
  const expertSummary = rawExpert ? stripMarkdownExpert(rawExpert) : null;
  const hasExpert = item.type === "paper" && !!expertSummary;

  // --- Title extraction ---
  // New prompt format: title is on the FIRST LINE (before the first blank line).
  // Only treat as a Japanese title if it's short enough (10–40 chars) and looks like a headline.
  const rawHeadline = generalSummary?.split('\n')?.[0]?.trim() || null;

  const isGoodHeadline = (t: string) =>
    t.length >= 6 && t.length <= 40 &&
    !/^(3つの|▍|【|ダイブポイント|要点|専門的解説|魅力的|研究の目的|目的[：:]\s|手法[：:]\s|結果[：:]\s|意義[：:]\s)/.test(t) &&
    !/^[•\-\*\d]\s/.test(t) &&
    // Must contain at least one Japanese character to be a Japanese headline
    /[぀-ヿ一-鿿]/.test(t);

  const japaneseHeadline = rawHeadline && isGoodHeadline(rawHeadline)
    ? rawHeadline.trim()
    : null;

  // Remove the title line from the body to avoid showing it twice.
  const generalBody = japaneseHeadline && generalSummary
    ? generalSummary.slice(japaneseHeadline.length).replace(/^\s*\n+/, "").trim()
    : generalSummary;

  const displaySummary = expertMode && hasExpert ? expertSummary : (generalBody || expertSummary);
  const displayTitle = item.title_ja || japaneseHeadline || item.title;
  // Show English subtitle only when Japanese headline was successfully extracted
  const showEnglishSub = !item.title_ja && japaneseHeadline && item.title && item.title !== japaneseHeadline;
  const authorsText = item.authors?.slice(0, 2).join(", ") ?? "";
  const sourceText = item.type === "news" ? item.source : (item.source || "arXiv");

  const { base: baseColor, dark: darkColor } = getCategoryColors(item.category);
  const zenMaru = { fontFamily: "var(--font-zen-maru), sans-serif" };

  return (
    <>
      {showLoginPrompt && <LoginPrompt onClose={() => setShowLoginPrompt(false)} locale={locale} />}

      <div
        className="relative w-full h-svh flex-shrink-0 overflow-hidden select-none"
        style={{ scrollSnapAlign: "start", background: baseColor }}
      >
        {/* Double-tap heart burst */}
        <HeartBurst visible={heartVisible} />

        {/* Tap area (whole card, behind UI) */}
        <div className="absolute inset-0 z-10" onClick={handleTap} />

        {/* ── TOP BAR ── */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center gap-2 px-4 pt-12 pb-3 pr-[72px]">
          <span
            className="text-[10px] font-black tracking-widest px-2.5 py-1 rounded-full"
            style={item.type === "paper"
              ? { ...zenMaru, background: "#fff", color: baseColor }
              : { ...zenMaru, background: "rgba(255,255,255,0.14)", color: "#fff" }}
          >
            {item.type === "paper" ? "論文" : "ニュース"}
          </span>
          {/* Category badge with follow button */}
          <button
            onClick={handleFollowCategory}
            className="flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full transition-all active:scale-95"
            style={isFollowed
              ? { ...zenMaru, background: "rgba(255,255,255,0.2)", color: "#fff", border: "2px solid rgba(255,255,255,0.5)" }
              : { ...zenMaru, color: "rgba(255,255,255,0.75)", border: "2px solid rgba(255,255,255,0.28)" }}
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

        {/* ── TOP-SPACE VISUAL — porthole icon by default, mascot cameo once liked ── */}
        {!expanded && (
          <div className="absolute left-0 z-15 flex justify-center" style={{ top: 78, right: 72 }}>
            <TopSpaceVisual category={item.category} dark={darkColor} liked={liked} />
          </div>
        )}

        {/* ── RIGHT ACTION COLUMN — solid fill + hard offset shadow, no blur ── */}
        <div className="absolute right-3 bottom-28 z-20 flex flex-col items-center gap-5">
          {/* Like */}
          <button
            onClick={handleLike}
            className="flex flex-col items-center gap-1.5 group"
            aria-label="いいね"
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-150 active:translate-y-[2px]"
              style={{
                background: liked ? "#EF476F" : "rgba(255,255,255,0.16)",
                boxShadow: liked ? "0 3px 0 #C7355A" : "0 3px 0 rgba(0,0,0,0.18)",
              }}
            >
              <Heart className={`w-6 h-6 transition-all ${liked ? "fill-white text-white" : "text-white"}`} />
            </div>
            <span className="text-[10px] font-black text-white/70">
              {liked ? "♥" : "いいね"}
            </span>
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            className="flex flex-col items-center gap-1.5 group"
            aria-label="共有"
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-150 active:translate-y-[2px]"
              style={{ background: "rgba(255,255,255,0.16)", boxShadow: "0 3px 0 rgba(0,0,0,0.18)" }}
            >
              <Share2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-[10px] font-black text-white/70">
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
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-150 active:translate-y-[2px]"
                style={{ background: ACCENT, boxShadow: `0 3px 0 ${ACCENT_DARK}` }}
              >
                <Microscope className="w-6 h-6" style={{ color: "#1a1a16" }} />
              </div>
              <span className="text-[10px] font-black text-white/70 text-center leading-tight">
                深く潜る
              </span>
            </a>
          )}
        </div>

        {/* ── BOTTOM SHEET — flat single hue, one shade darker than the card ── */}
        <div
          className={`absolute bottom-0 left-0 right-0 z-20 px-4 rounded-t-[28px] ${nextItem ? "pb-12" : "pb-6"}`}
          style={{ background: darkColor, paddingTop: 20 }}
        >
          {/* Difficulty toggle */}
          {hasExpert && (
            <div className="flex items-center gap-2 mb-3" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setExpertMode(false)}
                className="text-[11px] font-black px-3.5 py-1.5 rounded-2xl transition-all"
                style={!expertMode
                  ? { ...zenMaru, background: ACCENT, color: "#1a1a16", boxShadow: `0 3px 0 ${ACCENT_DARK}` }
                  : { ...zenMaru, background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)" }}
              >
                やさしく
              </button>
              <button
                onClick={() => setExpertMode(true)}
                className="text-[11px] font-black px-3.5 py-1.5 rounded-2xl transition-all"
                style={expertMode
                  ? { ...zenMaru, background: ACCENT, color: "#1a1a16", boxShadow: `0 3px 0 ${ACCENT_DARK}` }
                  : { ...zenMaru, background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)" }}
              >
                くわしく
              </button>
            </div>
          )}

          {/* Title */}
          <h2 className="text-[22px] font-black text-white leading-[1.4] mb-1 line-clamp-3" style={zenMaru}>
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
              <p
                className={`text-sm text-white/85 leading-relaxed ${expanded ? "" : "line-clamp-2"}`}
                style={{ whiteSpace: expertMode ? "pre-line" : "normal" }}
              >
                {displaySummary}
              </p>
            ) : (
              <p className="text-xs text-white/35 italic">
                要約を準備中です…
              </p>
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
          <div
            className="absolute bottom-0 left-0 right-0 z-25 flex items-center justify-center gap-1.5 py-2 pointer-events-none"
            style={{ background: "rgba(0,0,0,0.22)" }}
          >
            <span className="text-[9px] text-white/40 font-bold uppercase tracking-widest">次</span>
            <span className="text-[11px] text-white/70 font-black">
              {getCategoryLabel(nextItem.category)}
            </span>
            <span className="text-[9px] text-white/40">▾</span>
          </div>
        )}
      </div>
    </>
  );
}
