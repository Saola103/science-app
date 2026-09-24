"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "../../../lib/i18n/ja";
import { useProtoStore } from "../../../lib/proto/store";
import { CATEGORIES, CATEGORY_STYLE, getCategoryLabel } from "../../../lib/proto/mockData";
import { mapFeedItemToArticle, FeedApiItem } from "../../../lib/proto/mapArticle";
import { ArticleIllustration } from "../../../components/proto/illustrations";
import { ArticleDetailSheet } from "../../../components/proto/ArticleDetailSheet";
import { Article } from "../../../lib/proto/types";

function FireIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#FF9640">
      <path d="M12.5 2c.4 2.4-.6 3.9-2 5.4-1.6 1.7-3 3.3-3 5.8a4.5 4.5 0 0 0 9 0c0-1-.3-1.8-.7-2.5.9.5 1.7 1.5 1.7 3a5.5 5.5 0 1 1-11 0c0-4.2 3-6.1 4.6-8.2C11.9 4.5 12.3 3.3 12.5 2Z" />
    </svg>
  );
}

function StatsGrid({ streak, seenToday, saved, seenLabel, savedLabel, streakLabel }: { streak: number; seenToday: number; saved: number; seenLabel: string; savedLabel: string; streakLabel: string }) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      <div className="rounded-2xl px-3.5 py-3.5" style={{ background: streak > 0 ? "#FFF4EA" : "#F7F9FC" }}>
        <div className="flex items-center gap-1">
          <FireIcon size={16} />
          <p className="text-[18px] font-bold text-[#1A1D29] leading-none">{streak}</p>
        </div>
        <p className="text-[11px] text-[#94A3B8] mt-1.5">{streakLabel}</p>
      </div>
      <div className="rounded-2xl px-3.5 py-3.5" style={{ background: "#F7F9FC" }}>
        <p className="text-[18px] font-bold text-[#1A1D29] leading-none">{seenToday}</p>
        <p className="text-[11px] text-[#94A3B8] mt-1.5">{seenLabel}</p>
      </div>
      <div className="rounded-2xl px-3.5 py-3.5" style={{ background: "#F7F9FC" }}>
        <p className="text-[18px] font-bold text-[#1A1D29] leading-none">{saved}</p>
        <p className="text-[11px] text-[#94A3B8] mt-1.5">{savedLabel}</p>
      </div>
    </div>
  );
}

const POINT_MILESTONES = [10, 25, 50, 100, 200, 400, 800, 1500];

function PointsProgress({ points, label, toGoLabel }: { points: number; label: string; toGoLabel: (n: number) => string }) {
  const next = POINT_MILESTONES.find((m) => m > points) ?? points;
  const prev = POINT_MILESTONES[POINT_MILESTONES.indexOf(next) - 1] ?? 0;
  const ratio = next === prev ? 1 : Math.min(1, (points - prev) / (next - prev));
  return (
    <div className="rounded-2xl px-4 py-3.5 mb-5" style={{ background: "#F7F9FC" }}>
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-[12px] font-bold text-[#4B5563]">{label}</span>
        <span className="text-[11px] text-[#94A3B8]">{next > points ? toGoLabel(next - points) : ""}</span>
      </div>
      <div className="rounded-full overflow-hidden" style={{ height: 6, background: "#E7EAF0" }}>
        <div className="h-full rounded-full" style={{ width: `${ratio * 100}%`, background: "#2F6FED", transition: "width 0.4s ease" }} />
      </div>
    </div>
  );
}

function FollowedCategories({ followed, onToggle, heading, desc, emptyHint }: { followed: string[]; onToggle: (category: string) => void; heading: string; desc: string; emptyHint: string }) {
  const locale = useLocale();
  return (
    <div className="mb-5">
      <div className="flex items-baseline gap-2 mb-1">
        <h2 className="text-[14.5px] font-bold text-[#1A1D29]">{heading}</h2>
        <span className="text-[12px] text-[#94A3B8]">{followed.length}</span>
      </div>
      <p className="text-[11.5px] text-[#94A3B8] mb-2.5">{desc}</p>
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((category) => {
          const isFollowed = followed.includes(category);
          const style = CATEGORY_STYLE[category] ?? { bg: "#F1F5F9", text: "#64748B" };
          return (
            <button
              key={category}
              onClick={() => onToggle(category)}
              className="text-[12px] font-bold px-3 py-1.5 rounded-full transition-opacity"
              style={
                isFollowed
                  ? { background: style.bg, color: style.text }
                  : { background: "#F7F9FC", color: "#B0B8C4", border: "1px solid #EEF0F4" }
              }
            >
              {getCategoryLabel(category, locale)}
            </button>
          );
        })}
      </div>
      {followed.length === 0 && <p className="text-[11px] text-[#B0B8C4] mt-2">{emptyHint}</p>}
    </div>
  );
}

const BADGE_MILESTONES: { threshold: number; label: string }[] = [
  { threshold: 10, label: "はじめの一歩" },
  { threshold: 50, label: "好奇心の芽" },
  { threshold: 100, label: "探究者" },
  { threshold: 300, label: "深海ダイバー" },
  { threshold: 500, label: "知識のマスター" },
  { threshold: 1000, label: "伝説の探究者" },
];

function currentBadge(readCount: number) {
  let current: { threshold: number; label: string } | null = null;
  for (const m of BADGE_MILESTONES) {
    if (readCount >= m.threshold) current = m;
  }
  return current;
}

function BadgeProgress({ readCount, label, toGoLabel, unearnedLabel }: { readCount: number; label: (name: string) => string; toGoLabel: (n: number) => string; unearnedLabel: string }) {
  const next = BADGE_MILESTONES.find((m) => m.threshold > readCount) ?? BADGE_MILESTONES[BADGE_MILESTONES.length - 1];
  const prevIndex = BADGE_MILESTONES.findIndex((m) => m.threshold === next.threshold) - 1;
  const prevThreshold = prevIndex >= 0 ? BADGE_MILESTONES[prevIndex].threshold : 0;
  const ratio = next.threshold === prevThreshold ? 1 : Math.min(1, (readCount - prevThreshold) / (next.threshold - prevThreshold));
  const badge = currentBadge(readCount);

  return (
    <div className="rounded-2xl px-4 py-3.5 mb-5" style={{ background: "#F7F9FC" }}>
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-[12px] font-bold text-[#4B5563]">{badge ? label(badge.label) : unearnedLabel}</span>
        <span className="text-[11px] text-[#94A3B8]">{readCount < next.threshold ? toGoLabel(next.threshold - readCount) : ""}</span>
      </div>
      <div className="rounded-full overflow-hidden" style={{ height: 6, background: "#E7EAF0" }}>
        <div className="h-full rounded-full" style={{ width: `${ratio * 100}%`, background: "#FF9640", transition: "width 0.4s ease" }} />
      </div>
    </div>
  );
}

function FeedbackForm() {
  const t = useTranslations("Proto.mypage");
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || status === "sending") return;
    setStatus("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim() }),
      });
      if (!res.ok) throw new Error("failed");
      setStatus("sent");
      setText("");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="rounded-2xl px-4 py-4 mt-6" style={{ background: "#F7F9FC" }}>
      <h2 className="text-[14.5px] font-bold text-[#1A1D29] mb-1">{t("feedbackHeading")}</h2>
      <p className="text-[11.5px] text-[#94A3B8] mb-3">{t("feedbackDesc")}</p>
      <form onSubmit={handleSubmit}>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (status === "sent" || status === "error") setStatus("idle");
          }}
          maxLength={1000}
          rows={3}
          placeholder={t("feedbackPlaceholder")}
          className="w-full rounded-xl px-3.5 py-3 text-[13px] text-[#1A1D29] placeholder:text-[#B0B8C4] outline-none resize-none"
          style={{ background: "#FFFFFF", border: "1px solid #E7EAF0" }}
        />
        <div className="flex items-center justify-between mt-2.5">
          <span className="text-[11px]" style={{ color: status === "error" ? "#E24C4C" : status === "sent" ? "#2F9E5B" : "#94A3B8" }}>
            {status === "sent" ? t("feedbackSent") : status === "error" ? t("feedbackError") : ""}
          </span>
          <button
            type="submit"
            disabled={!text.trim() || status === "sending"}
            className="text-[13px] font-bold px-4 py-2 rounded-full disabled:opacity-40"
            style={{ background: "#2F6FED", color: "#FFFFFF" }}
          >
            {status === "sending" ? t("feedbackSending") : t("feedbackSubmit")}
          </button>
        </div>
      </form>
    </div>
  );
}

function SavedRow({ article, onOpen, onRemove, removeLabel }: { article: Article; onOpen: () => void; onRemove: () => void; removeLabel: string }) {
  const locale = useLocale();
  const catStyle = CATEGORY_STYLE[article.category] ?? { bg: "#F1F5F9", text: "#475569" };
  return (
    <div className="flex items-center gap-3 py-3" style={{ borderBottom: "1px solid #F1F3F6" }}>
      <button onClick={onOpen} className="shrink-0 rounded-xl overflow-hidden flex items-center justify-center" style={{ width: 56, height: 56, background: "#F7F9FC" }}>
        <div style={{ width: "70%", height: "70%" }}>
          <ArticleIllustration type={article.illustration} />
        </div>
      </button>
      <button onClick={onOpen} className="flex-1 min-w-0 text-left">
        <span
          className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-1"
          style={{ background: catStyle.bg, color: catStyle.text }}
        >
          {getCategoryLabel(article.category, locale)}
        </span>
        <p className="text-[13px] font-bold text-[#1A1D29] leading-snug line-clamp-2">{article.summary}</p>
      </button>
      <button onClick={onRemove} className="shrink-0 p-2 text-[#CBD5E1]" aria-label={removeLabel}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0-.7 12.1a1 1 0 0 1-1 .9H8.7a1 1 0 0 1-1-.9L7 7" />
        </svg>
      </button>
    </div>
  );
}

export default function MyPage() {
  const { saved, seen, streak, totalPoints, readCount, followed, toggleFollow, removeSaved, hydrated, showToast } = useProtoStore();
  const [openArticle, setOpenArticle] = useState<Article | null>(null);
  const [items, setItems] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const t = useTranslations("Proto.mypage");

  // Celebrate a newly-crossed badge threshold with a toast, once per crossing
  // (not on every render) — mirrors the existing feed follow/unfollow toasts.
  const lastBadgeRef = useRef<string | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    const badge = currentBadge(readCount);
    if (badge && lastBadgeRef.current !== null && lastBadgeRef.current !== badge.label) {
      showToast(t("badgeEarnedToast", { name: badge.label }));
    }
    lastBadgeRef.current = badge?.label ?? lastBadgeRef.current;
  }, [readCount, hydrated, showToast, t]);

  // Saved ids in localStorage (lib/proto/store.tsx) reference real DB rows —
  // fetch their current data by id rather than looking them up in the old
  // static mock ARTICLES array (see app/api/feed/route.ts's `ids` param).
  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    // Both branches resolve through a promise chain (rather than calling
    // setState synchronously at the top of the effect) so a `saved` list
    // that goes empty and one that has ids to fetch are handled uniformly.
    Promise.resolve()
      .then(() => {
        if (cancelled) return null;
        setLoading(true);
        if (saved.length === 0) return { items: [] as FeedApiItem[] };
        return fetch(`/api/feed?ids=${encodeURIComponent(saved.join(","))}`).then((res) => res.json());
      })
      .then((data: { items: FeedApiItem[] } | null) => {
        if (cancelled || !data) return;
        const byId = new Map((data.items ?? []).map((raw) => {
          const article = mapFeedItemToArticle(raw);
          return [article.id, article] as const;
        }));
        // Preserve the user's own save order, drop ids the API didn't return
        // (e.g. an item since removed from the DB).
        setItems(saved.map((id) => byId.get(id)).filter((a): a is Article => !!a));
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [saved, hydrated]);

  return (
    <div className="px-5 pt-5 pb-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-[16px] font-bold text-[#1A1D29]">{t("title")}</h1>
      </div>

      <div className="mb-2.5">
        <StatsGrid
          streak={streak}
          seenToday={seen.length}
          saved={saved.length}
          seenLabel={t("statsSeenToday")}
          savedLabel={t("statsSaved")}
          streakLabel={t("statsStreak")}
        />
      </div>

      <PointsProgress
        points={totalPoints}
        label={t("pointsLabel", { points: totalPoints })}
        toGoLabel={(n) => t("pointsToGo", { points: n })}
      />

      <BadgeProgress
        readCount={readCount}
        label={(name) => t("badgeLabel", { name })}
        toGoLabel={(n) => t("badgeToGo", { count: n })}
        unearnedLabel={t("badgeUnearned")}
      />

      <FollowedCategories
        followed={followed}
        onToggle={toggleFollow}
        heading={t("followHeading")}
        desc={t("followDesc")}
        emptyHint={t("followEmptyHint")}
      />

      <div className="flex items-baseline gap-2 mb-1">
        <h2 className="text-[14.5px] font-bold text-[#1A1D29]">{t("savedHeading")}</h2>
        <span className="text-[12px] text-[#94A3B8]">{items.length}</span>
      </div>

      {items.length === 0 && loading ? (
        <p className="text-[12.5px] text-[#94A3B8] py-10 text-center rounded-2xl mt-3" style={{ background: "#F7F9FC" }}>
          読み込み中…
        </p>
      ) : items.length === 0 ? (
        <p className="text-[12.5px] text-[#94A3B8] py-10 text-center rounded-2xl mt-3" style={{ background: "#F7F9FC" }}>
          {t("emptySaved")}
        </p>
      ) : (
        <div className="mt-1">
          {items.map((a) => (
            <SavedRow key={a.id} article={a} onOpen={() => setOpenArticle(a)} onRemove={() => removeSaved(a.id)} removeLabel={t("removeAria")} />
          ))}
        </div>
      )}

      <FeedbackForm />

      {openArticle && <ArticleDetailSheet article={openArticle} onClose={() => setOpenArticle(null)} />}
    </div>
  );
}
