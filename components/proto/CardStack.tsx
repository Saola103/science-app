"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Article } from "../../lib/proto/types";
import { SwipeCard, SwipeDirection } from "./SwipeCard";
import { useProtoStore } from "../../lib/proto/store";

const VISIBLE_DEPTH = 2;
const HINT_SEEN_KEY = "pd_proto_swipe_hint_seen";

// Seeded (not Math.random()) so server-rendered HTML and the client's first
// render produce the identical card order — plain Math.random() here caused a
// React hydration mismatch (different shuffle each time it runs).
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

function hashSeed(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (Math.imul(31, h) + key.charCodeAt(i)) | 0;
  return h;
}

function shuffle<T>(list: T[], seed: number): T[] {
  const rand = mulberry32(seed);
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function SwipeHint({ label }: { label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.3 }}
      className="absolute left-1/2 bottom-5 z-30 flex items-center gap-2 px-4 py-2 rounded-full"
      style={{ transform: "translateX(-50%)", background: "rgba(26,29,41,0.72)", backdropFilter: "blur(4px)", pointerEvents: "none" }}
    >
      <motion.span
        animate={{ x: [0, -4, 0] }}
        transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
        className="text-white text-[13px] leading-none"
      >
        ←
      </motion.span>
      <span className="text-[11.5px] font-bold text-white whitespace-nowrap">{label}</span>
      <motion.span
        animate={{ x: [0, 4, 0] }}
        transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
        className="text-white text-[13px] leading-none"
      >
        →
      </motion.span>
    </motion.div>
  );
}

export function CardStack({
  articles,
  stackKey,
  fill = false,
}: {
  articles: Article[];
  stackKey: string;
  /** Fill mode: the stack occupies its parent's full height (used by Discovery). */
  fill?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const { seen, markSeen, toggleSaved, showToast } = useProtoStore();
  const t = useTranslations("Proto");

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem(HINT_SEEN_KEY)) {
      setShowHint(true);
    }
  }, []);

  // The mock set is small (a dozen articles), so a strict "never repeat" queue
  // runs dry fast and forces a hard "that's it for today" wall — exactly what
  // we don't want a discovery feed to do. Unseen articles come first (so a
  // fresh visit is still a full, non-repeating pass); once those run out the
  // deck loops the shuffled set indefinitely via modulo indexing, so swiping
  // never actually terminates. A real deployment would swap this for the
  // production pipeline's live article pool instead of the 12-item mock set.
  const cycle = useMemo(() => {
    const unseen = articles.filter((a) => !seen.includes(a.id));
    const rest = articles.filter((a) => seen.includes(a.id));
    const seed = hashSeed(stackKey);
    return [...shuffle(unseen, seed), ...shuffle(rest, seed + 1)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articles, stackKey]);

  useEffect(() => {
    setIndex(0);
  }, [stackKey]);

  const cardAt = (i: number) => (cycle.length > 0 ? cycle[i % cycle.length] : undefined);

  const handleSwiped = (direction: SwipeDirection, id: string) => {
    if (direction === "right") toggleSaved(id);
    const isNewSeen = !seen.includes(id);
    markSeen(id);
    if (isNewSeen) {
      const newCount = seen.length + 1;
      if (newCount % 5 === 0) showToast(t("swipe.milestone", { count: newCount }));
    }
    if (showHint) {
      setShowHint(false);
      localStorage.setItem(HINT_SEEN_KEY, "1");
    }
    setIndex((i) => i + 1);
  };

  const visible = Array.from({ length: Math.min(VISIBLE_DEPTH, cycle.length) }, (_, k) => ({
    article: cardAt(index + k)!,
    position: index + k,
  }));

  return (
    <div className={fill ? "h-full flex flex-col" : undefined}>
      <div
        className={fill ? "relative flex-1 min-h-0 px-4 pb-3" : "relative px-5 pt-4"}
        style={fill ? undefined : { height: 560 + 16 }}
      >
        <div className="relative" style={fill ? { height: "100%" } : { height: 560 }}>
          {visible.length === 0 ? (
            <div
              className="absolute inset-0 rounded-3xl flex flex-col items-center justify-center gap-3 text-center px-8"
              style={{ background: "#F7F9FC", border: "1px solid #EEF0F4" }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.8">
                <path d="M9 12.5 11 14.5 15.5 9.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="9" />
              </svg>
              <p className="text-[14px] font-bold text-[#1A1D29]">{t("swipe.emptyTitle")}</p>
              <p className="text-[12.5px] text-[#94A3B8] leading-relaxed">{t("swipe.emptySubtitle")}</p>
            </div>
          ) : (
            visible.map(({ article, position }, i) => (
              <SwipeCard
                key={`${article.id}-${position}`}
                article={article}
                isTop={i === 0}
                depth={i}
                onSwiped={handleSwiped}
              />
            ))
          )}
          {showHint && index === 0 && visible.length > 0 && <SwipeHint label={t("swipe.hint")} />}
        </div>
      </div>
    </div>
  );
}
