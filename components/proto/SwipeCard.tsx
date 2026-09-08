"use client";

import { useRef, useState } from "react";
import { motion, useAnimation, useMotionValue, useTransform } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { Article } from "../../lib/proto/types";
import { CATEGORY_STYLE, getCategoryLabel } from "../../lib/proto/mockData";
import { ArticleDetailSheet } from "./ArticleDetailSheet";

export type SwipeDirection = "left" | "right";

// Tinder's card is "photo + name + age" — the minimum needed for a 0.5-second
// like/pass call. Everything else (lead text, dive points, source/author) used
// to live here, forcing a read before a swipe; it now lives on the tap-to-open
// detail sheet instead, so the card surface is just label + headline + visual.
export function CardFrontContent({ article }: { article: Article }) {
  const t = useTranslations("Proto.contentType");
  const locale = useLocale();
  const catStyle = CATEGORY_STYLE[article.category] ?? { bg: "#F1F5F9", text: "#475569" };
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-5 pt-5 shrink-0">
        <span
          className="text-[11px] font-bold px-2.5 py-1 rounded-full"
          style={{ background: catStyle.bg, color: catStyle.text }}
        >
          {getCategoryLabel(article.category, locale)}
        </span>
        <span
          className="ml-auto text-[11px] font-bold px-2.5 py-1 rounded-full"
          style={{ background: "#F1F3F6", color: "#6B7280" }}
        >
          {article.contentType === "paper" ? t("paper") : t("news")}
        </span>
      </div>

      <h2 className="px-5 pt-4 text-[19px] font-bold leading-[1.5] text-[#1A1D29] shrink-0">
        {article.summary}
      </h2>

      <div className="px-5 mt-4 flex-1 min-h-0 overflow-hidden">
        <p className="text-[13px] leading-[1.75] text-[#4B5563]">{article.leadText}</p>
        <div className="mt-4 space-y-2.5 pb-5">
          {article.divePoints.map((dp) => (
            <div key={dp.label} className="flex gap-2 text-[13px] leading-[1.6]">
              <span className="font-bold text-[#2F6FED] shrink-0">{dp.label}：</span>
              <span className="text-[#374151]">{dp.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TapHint({ label }: { label: string }) {
  return (
    <div className="absolute left-1/2 bottom-3 z-10 flex flex-col items-center gap-0.5" style={{ transform: "translateX(-50%)", pointerEvents: "none" }}>
      <motion.svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#CBD5E1"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 0.9, repeat: 2, repeatType: "loop", ease: "easeInOut" }}
      >
        <path d="m6 15 6-6 6 6" />
      </motion.svg>
      <span className="text-[10px] font-bold" style={{ color: "#B4BBC6" }}>{label}</span>
    </div>
  );
}

function OverlayBadge({
  style,
  opacity,
  color,
  children,
}: {
  style: React.CSSProperties;
  opacity: ReturnType<typeof useTransform<number, number>>;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      style={{ ...style, opacity, background: color, pointerEvents: "none" }}
      className="absolute w-16 h-16 rounded-full flex items-center justify-center z-20"
    >
      {children}
    </motion.div>
  );
}

export function SwipeCard({
  article,
  isTop,
  depth,
  onSwiped,
}: {
  article: Article;
  isTop: boolean;
  depth: number;
  onSwiped: (direction: SwipeDirection, id: string) => void;
}) {
  const controls = useAnimation();
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-260, 260], [-14, 14]);
  const leftOpacity = useTransform(x, [-140, -30], [1, 0]);
  const rightOpacity = useTransform(x, [30, 140], [0, 1]);

  const cardRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const t = useTranslations("Proto.discovery");

  const handleDragEnd = async (
    _e: MouseEvent | TouchEvent | PointerEvent,
    info: { offset: { x: number; y: number }; velocity: { x: number; y: number } }
  ) => {
    const width = cardRef.current?.offsetWidth ?? 375;
    const { offset, velocity } = info;

    const passes = Math.abs(offset.x) > width * 0.3 || Math.abs(velocity.x) > 650;
    const direction: SwipeDirection | null = passes ? (offset.x > 0 ? "right" : "left") : null;

    if (direction) {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate?.(50);
      }
      const target = direction === "left" ? { x: -width * 1.6, rotate: -20 } : { x: width * 1.6, rotate: 20 };
      await controls.start({ ...target, opacity: 0, transition: { duration: 0.28, ease: "easeIn" } });
      onSwiped(direction, article.id);
    } else {
      controls.start({ x: 0, rotate: 0, transition: { type: "spring", stiffness: 400, damping: 30 } });
    }
  };

  // Tinted (rather than plain white) and shifted down enough that its bottom
  // edge actually clears the front card's bottom edge — a naive center-scale
  // + small translateY leaves the peek card fully contained behind the front
  // one, invisible. The container reserves a few px below itself for this.
  const peekScale = 1 - depth * 0.06;
  const peekY = depth * 28;
  const peekBg = depth === 1 ? "#E4E8EE" : "#D2D8E1";

  if (!isTop) {
    return (
      <div
        className="absolute inset-0 rounded-3xl overflow-hidden"
        style={{
          background: peekBg,
          boxShadow: "0 1px 3px rgba(16,24,40,0.06)",
          border: "1px solid #E2E5EA",
          transform: `translateY(${peekY}px) scale(${peekScale})`,
          transition: "transform 0.25s ease",
          zIndex: 10 - depth,
        }}
      />
    );
  }

  return (
    <>
      <motion.div
        ref={cardRef}
        drag="x"
        dragElastic={0.7}
        animate={controls}
        onDragEnd={handleDragEnd}
        // framer-motion's own tap gesture (not a native onClick) — onClick paired
        // with a manually-tracked drag-distance ref was unreliable here: framer's
        // PanSession can swallow the native click on a fast tap while `drag` is
        // active, so the detail sheet sometimes silently failed to open. onTap is
        // framer's supported way to combine tap-to-open with a draggable element.
        onTap={() => setOpen(true)}
        className="absolute inset-0 rounded-3xl bg-white overflow-hidden cursor-grab active:cursor-grabbing"
        style={{
          x,
          rotate,
          boxShadow: "0 8px 24px rgba(16,24,40,0.10)",
          border: "1px solid #EEF0F4",
          zIndex: 10,
        }}
      >
        <CardFrontContent article={article} />
        <TapHint label={t("tapHint")} />

        <OverlayBadge style={{ top: 20, left: 20 }} opacity={leftOpacity} color="rgba(239,68,68,0.9)">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </OverlayBadge>
        <OverlayBadge style={{ top: 20, right: 20 }} opacity={rightOpacity} color="rgba(47,111,237,0.9)">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff" stroke="#fff" strokeWidth="1">
            <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1Z" />
          </svg>
        </OverlayBadge>
      </motion.div>

      {open && <ArticleDetailSheet article={article} onClose={() => setOpen(false)} />}
    </>
  );
}
