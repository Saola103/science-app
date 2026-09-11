"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Brain, Atom, Dna, FlaskConical, Telescope, HeartPulse, Cpu, Leaf, Sigma, Sparkles } from "lucide-react";
import { getCategoryLabel } from "../../lib/proto/mockData";
import { Article } from "../../lib/proto/types";
import { HEADER_H, NAV_H } from "../../lib/proto/layoutMetrics";
import { useProtoStore } from "../../lib/proto/store";

export const zen = { fontFamily: "var(--font-zen-maru), sans-serif" };

// Full-saturation scene color per category, one hue each — mirrors the flat
// color language already shipped in components/FeedCard.tsx (getCategoryColors),
// just re-keyed to this prototype's Japanese category names.
const CATEGORY_VIVID: Record<string, { base: string; dark: string; Icon: typeof Brain }> = {
  神経科学: { base: "#5B4FE8", dark: "#4A3FD8", Icon: Brain },
  物理学: { base: "#2E86F5", dark: "#1E6FD9", Icon: Atom },
  生物学: { base: "#1FAE73", dark: "#178F5D", Icon: Dna },
  化学: { base: "#F2843C", dark: "#D96B26", Icon: FlaskConical },
  天文学: { base: "#2447B0", dark: "#1B3690", Icon: Telescope },
  医学: { base: "#E0506E", dark: "#C43A57", Icon: HeartPulse },
  情報学: { base: "#0D9488", dark: "#0B7A70", Icon: Cpu },
  環境科学: { base: "#65A30D", dark: "#4D7C0F", Icon: Leaf },
  数学: { base: "#475569", dark: "#334155", Icon: Sigma },
  その他: { base: "#64748B", dark: "#475569", Icon: Sparkles },
};
const DEFAULT_VIVID = { base: "#5B4FE8", dark: "#4A3FD8", Icon: Brain };
export function getVivid(category: string) {
  return CATEGORY_VIVID[category] ?? DEFAULT_VIVID;
}

// Seeded, not Math.random() — identical output on server and client avoids a
// React hydration mismatch (same issue and same fix as the swipe deck's CardStack).
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hashSeed(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (Math.imul(31, h) + key.charCodeAt(i)) | 0;
  return h;
}
export function shuffle<T>(list: T[], seed: number): T[] {
  const rand = mulberry32(seed);
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Weighted random ordering without literal duplication (Efraimidis–Spirakis
// A-ES algorithm): each item gets a random key raised to 1/weight, sorted
// descending. Higher-weight items tend to land earlier/more often across
// repeated calls with different seeds, but nothing is ever duplicated and
// low-weight items still surface — unlike a plain "sort by weight" (which
// would front-load favorites and kill diversity) or literal repetition
// (which works for a tiny fixed mock set but not a large real one).
export function weightedShuffle<T>(items: T[], weightOf: (item: T) => number, seed: number): T[] {
  const rand = mulberry32(seed);
  return items
    .map((item) => {
      const w = Math.max(weightOf(item), 0.0001);
      const key = Math.pow(rand(), 1 / w);
      return { item, key };
    })
    .sort((a, b) => b.key - a.key)
    .map((x) => x.item);
}

// Plain endless feed: shuffles the given articles and repeats the cycle so
// scrolling never visibly dead-ends. No personalization weighting — used by
// topic/search result feeds, which are already a deliberate, narrow slice.
export function buildEndlessSlides(articles: Article[], seedKey: string, repeats = 6): Article[] {
  const out: Article[] = [];
  for (let r = 0; r < repeats; r++) out.push(...shuffle(articles, hashSeed(`${seedKey}-${r}`)));
  return out;
}

function RailButton({ onClick, active, label, children }: { onClick: () => void; active?: boolean; label: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1">
      <div
        className="w-11 h-11 rounded-2xl flex items-center justify-center"
        style={{ background: "rgba(255,255,255,0.18)", boxShadow: "0 3px 0 rgba(0,0,0,0.18)" }}
      >
        {children}
      </div>
      <span className="text-[10px] font-extrabold" style={{ ...zen, color: active ? "#FFC95C" : "rgba(255,255,255,0.75)" }}>{label}</span>
    </button>
  );
}

function ScrollHint({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute left-1/2 -translate-x-1/2 pointer-events-none z-10 flex flex-col items-center gap-1"
          style={{ bottom: 14 }}
        >
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 1.3, repeat: 3, ease: "easeInOut" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </motion.div>
          <span className="text-[11px] font-extrabold" style={{ ...zen, color: "rgba(255,255,255,0.85)" }}>次へスクロール</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function FeedSlide({
  article,
  isSaved,
  isFollowed,
  showHint,
  onVisible,
  onDwell,
  onToggleSave,
  onOpenDetail,
  onFollowCategory,
  t,
  tContentType,
  locale,
}: {
  article: Article;
  isSaved: boolean;
  isFollowed: boolean;
  showHint: boolean;
  onVisible: (id: string) => void;
  onDwell: (category: string, seconds: number) => void;
  onToggleSave: () => void;
  onOpenDetail: () => void;
  onFollowCategory: () => void;
  t: (key: string) => string;
  tContentType: (key: string) => string;
  locale: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const seenRef = useRef(false);
  const enteredAtRef = useRef<number | null>(null);
  const lastTapRef = useRef(0);
  const [burst, setBurst] = useState(false);
  const { base, dark, Icon } = getVivid(article.category);

  // TikTok-style double-tap-to-save: two taps on the card body within 300ms.
  // Only ever SAVES (never un-saves) on a double tap, mirroring TikTok's own
  // double-tap-to-like — an accidental double tap while scrolling should
  // never silently remove something the user already saved.
  const handleContentTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      lastTapRef.current = 0;
      if (!isSaved) onToggleSave();
      setBurst(true);
      setTimeout(() => setBurst(false), 650);
    } else {
      lastTapRef.current = now;
    }
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            if (!seenRef.current) {
              seenRef.current = true;
              onVisible(article.id);
            }
            enteredAtRef.current = Date.now();
          } else if (enteredAtRef.current !== null) {
            const seconds = (Date.now() - enteredAtRef.current) / 1000;
            enteredAtRef.current = null;
            onDwell(article.category, seconds);
          }
        }
      },
      { threshold: [0.6] }
    );
    observer.observe(el);
    return () => {
      if (enteredAtRef.current !== null) {
        onDwell(article.category, (Date.now() - enteredAtRef.current) / 1000);
        enteredAtRef.current = null;
      }
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article.id]);

  // Real articles carry the actual source URL; mock ARTICLES don't, so fall
  // back to a search link built from source+summary in that case.
  const originalHref = article.url || `https://www.google.com/search?q=${encodeURIComponent(`${article.source} ${article.summary}`)}`;

  const { showToast } = useProtoStore();
  // No stopPropagation needed: the rail sits in its own sibling div, outside
  // the content div that handles double-tap-to-save (see handleContentTap),
  // so rail button clicks never reach it in the first place.
  const handleShare = async () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    // Papers get the OG-tag-rich share landing page (app/[locale]/paper) so a
    // recipient sees the real headline/summary as a link preview and lands
    // back in the app, not the raw source; news has no equivalent page yet,
    // so it shares the feed itself. Article.id is `${type}-${rawId}` (see
    // lib/proto/mapArticle.ts) — strip the known prefix to recover rawId.
    const shareUrl =
      article.contentType === "paper"
        ? `${origin}/${locale}/paper?id=${encodeURIComponent(article.id.replace(/^paper-/, ""))}`
        : `${origin}/${locale}/feedapp/feed`;
    const shareData = { title: article.summary, text: article.leadText, url: shareUrl };

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled the native share sheet — not an error, no toast.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast(t("shareCopiedToast"));
    } catch {
      showToast(t("shareFailedToast"));
    }
  };

  return (
    <div
      ref={ref}
      className="relative w-full shrink-0 overflow-hidden"
      style={{ height: "100%", scrollSnapAlign: "start", scrollSnapStop: "always", background: base }}
    >
      {/* Deliberately clipped, never internally scrollable: any scrollable
          region nested inside a scroll-snap slide risks swallowing the
          finger-swipe that's supposed to advance to the NEXT slide — a real
          bug hit twice while dogfooding (once with an unconditional inner
          scroll region, once with a conditional one that still activated on
          most real articles because the padding budget was too generous).
          A swipe must always move the feed, full stop — so unusually long
          articles are clipped here instead, with the fade-out gradient below
          as the visual cue; the full text is always one tap away via the
          "詳しく" rail button's explanation sheet. */}
      <div className="absolute inset-0 overflow-hidden px-6 pt-14 pb-8" onClick={handleContentTap}>
        <div className="flex items-center gap-2 pr-16">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFollowCategory();
            }}
            className="flex items-center gap-1.5 text-[11px] font-extrabold px-3 py-1.5 rounded-full"
            style={isFollowed ? { ...zen, background: "#fff", color: base } : { ...zen, background: "rgba(255,255,255,0.18)", color: "#fff" }}
          >
            {getCategoryLabel(article.category, locale)}
            {!isFollowed && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            )}
          </button>
          <span className="text-[11px] font-bold px-2.5 py-1.5 rounded-full" style={{ ...zen, background: "rgba(255,255,255,0.16)", color: "#fff" }}>
            {article.contentType === "paper" ? tContentType("paper") : tContentType("news")}
          </span>
        </div>

        <div className="flex items-start gap-3 pt-4 pr-14">
          <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.18)" }}>
            <Icon size={22} color="#fff" strokeWidth={2.2} />
          </div>
          <h2 className="text-[21px] font-black leading-[1.42] text-white pt-1" style={zen}>{article.summary}</h2>
        </div>

        <p className="pt-4 pr-14 text-[14.5px] leading-[1.8]" style={{ ...zen, color: "rgba(255,255,255,0.9)" }}>{article.leadText}</p>

        <div className="pt-4 pr-14 space-y-2.5">
          {article.divePoints.map((dp) => (
            <div key={dp.label} className="flex gap-2 text-[13.5px] leading-[1.65]" style={zen}>
              <span className="font-extrabold shrink-0" style={{ color: "#FFC95C" }}>{dp.label}：</span>
              <span style={{ color: "rgba(255,255,255,0.85)" }}>{dp.text}</span>
            </div>
          ))}
        </div>

        <p className="pt-5 pr-14 text-[12px] font-bold" style={{ ...zen, color: "rgba(255,255,255,0.55)" }}>
          {article.source} ・ {article.author} ・ {article.publishedAt}
        </p>
      </div>

      {/* Double-tap-to-save burst — the bookmark icon (matching the save
          rail button, not a heart) pops and fades over the card. */}
      <AnimatePresence>
        {burst && (
          <motion.div
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1.15 }}
            exit={{ opacity: 0, scale: 1.35 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
          >
            <svg width="104" height="104" viewBox="0 0 24 24" fill="#FFC95C" stroke="#1a1a16" strokeWidth="1" strokeLinejoin="round" style={{ filter: "drop-shadow(0 4px 14px rgba(0,0,0,0.35))" }}>
              <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1Z" />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shorts/TikTok-style action rail — outside the scrollable content, so
          it always stays put regardless of how long the article text runs. */}
      <div className="absolute right-3 bottom-8 flex flex-col items-center gap-4 z-10">
        <RailButton onClick={onToggleSave} active={isSaved} label={isSaved ? t("savedLabel") : t("saveLabel")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill={isSaved ? "#FFC95C" : "none"} stroke={isSaved ? "#FFC95C" : "#fff"} strokeWidth="2" strokeLinejoin="round">
            <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1Z" />
          </svg>
        </RailButton>
        <RailButton onClick={onOpenDetail} label={t("detailLabel")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-4-1L3 20l1-5.5a8.38 8.38 0 0 1-1-4A8.5 8.5 0 0 1 11.5 2a8.38 8.38 0 0 1 8.5 8.5Z" />
          </svg>
        </RailButton>
        <RailButton onClick={handleShare} label={t("shareLabel")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        </RailButton>
        <a href={originalHref} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: "#FFC95C", boxShadow: "0 3px 0 #D9A53F" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a1a16" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 5h5v5M19 5l-9 9M8 5H6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2" />
            </svg>
          </div>
          <span className="text-[10px] font-extrabold" style={{ ...zen, color: "rgba(255,255,255,0.75)" }}>{t("originalLabel")}</span>
        </a>
      </div>

      <ScrollHint visible={showHint} />
      <div className="absolute inset-x-0 bottom-0 pointer-events-none" style={{ height: "30%", background: `linear-gradient(to bottom, rgba(0,0,0,0) 0%, ${dark}55 100%)` }} />
    </div>
  );
}

export function FeedScroll({
  slides,
  saved,
  followed,
  onVisible,
  onDwell,
  onToggleSave,
  onOpenDetail,
  onFollowCategory,
  t,
  tContentType,
  locale,
  topOverlay,
  atTop,
  onAtTopChange,
  onNearEnd,
}: {
  slides: Article[];
  saved: string[];
  followed: string[];
  onVisible: (id: string) => void;
  onDwell: (category: string, seconds: number) => void;
  onToggleSave: (id: string) => void;
  onOpenDetail: (article: Article) => void;
  onFollowCategory: (category: string) => void;
  t: (key: string) => string;
  tContentType: (key: string) => string;
  locale: string;
  topOverlay?: React.ReactNode;
  atTop: boolean;
  onAtTopChange: (atTop: boolean) => void;
  // Optional: called (repeatedly, on each qualifying scroll event) once the
  // user has scrolled within ~3 slide-heights of the end of `slides` — lets a
  // caller backed by real, paginated data (feedapp/feed, /stack, /trending)
  // fetch and append the next page. Unused by /proto's fixed mock deck.
  onNearEnd?: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      onAtTopChange(el.scrollTop < 24);
      if (onNearEnd) {
        const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
        if (remaining < el.clientHeight * 3) onNearEnd();
      }
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onNearEnd]);

  return (
    <div
      className="fixed inset-x-0 flex justify-center z-0"
      style={{
        top: `calc(${HEADER_H}px + env(safe-area-inset-top))`,
        bottom: `calc(${NAV_H}px + env(safe-area-inset-bottom))`,
      }}
    >
      <div className="relative w-full h-full" style={{ maxWidth: 480 }}>
        <div
          ref={scrollRef}
          className="h-full w-full overflow-y-scroll"
          style={{ scrollSnapType: "y mandatory", overscrollBehaviorY: "contain" }}
        >
          {/* topOverlay used to be rendered as a sibling of this scroll container,
              positioned on top with `position: absolute`. That looked fine but was
              a real swipe-eating dead zone: a touch that starts on a sibling never
              bubbles to trigger scroll on this element, no matter what CSS you put
              on it, because native touch-scroll dispatch only walks up the DOM
              ancestor chain from the touch target — and a sibling is never an
              ancestor. Confirmed by hand: a swipe starting exactly on the filter
              chip (/feedapp/feed) or the back-button pill (/feedapp/stack) failed
              to advance the feed 3/3 times, every device profile tested. Rendering
              it as a zero-height `position: sticky` child INSIDE the scroll
              container instead — the same trick that already makes the action
              rail's buttons swipe-through-safe — makes it a true descendant, so
              the exact same native bubbling applies and the dead zone disappears,
              while it still stays visually pinned to the top as slides scroll by. */}
          {topOverlay && (
            <div className="sticky top-0 left-0 z-20" style={{ height: 0, overflow: "visible" }}>
              <div style={{ paddingTop: `calc(12px + env(safe-area-inset-top))`, paddingLeft: 16 }}>
                {topOverlay}
              </div>
            </div>
          )}
          {slides.map((article, i) => (
            <FeedSlide
              key={`${article.id}-${i}`}
              article={article}
              isSaved={saved.includes(article.id)}
              isFollowed={followed.includes(article.category)}
              showHint={i === 0 && atTop}
              onVisible={onVisible}
              onDwell={onDwell}
              onToggleSave={() => onToggleSave(article.id)}
              onOpenDetail={() => onOpenDetail(article)}
              onFollowCategory={() => onFollowCategory(article.category)}
              t={t}
              tContentType={tContentType}
              locale={locale}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
