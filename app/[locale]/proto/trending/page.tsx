"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ARTICLES, TOPICS, CATEGORY_STYLE, getCategoryLabel } from "../../../../lib/proto/mockData";
import { getTrendingScore } from "../../../../lib/proto/trending";
import { useProtoStore } from "../../../../lib/proto/store";

export default function TrendingPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || "ja";
  const t = useTranslations("Proto.trending");
  const { saved, seen } = useProtoStore();

  // Interest signal from this user's own saves/reads (mock scope: no cross-user
  // aggregation backend yet, so this only reflects the current device).
  const categoryInterest = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const article of ARTICLES) {
      if (saved.includes(article.id)) counts[article.category] = (counts[article.category] ?? 0) + 3;
      else if (seen.includes(article.id)) counts[article.category] = (counts[article.category] ?? 0) + 1;
    }
    return counts;
  }, [saved, seen]);

  const boostOf = (category: string) => Math.min(15, categoryInterest[category] ?? 0);
  // Badge needs a real signal (a save, or 3+ reads in the category) — otherwise
  // a handful of unrelated skips lights up nearly every topic and the "your
  // interest" label stops meaning anything.
  const hasInterestBadge = (category: string) => (categoryInterest[category] ?? 0) >= 3;

  const sorted = [...TOPICS].sort(
    (a, b) => getTrendingScore(b.id, boostOf(b.category)) - getTrendingScore(a.id, boostOf(a.category))
  );

  return (
    <div className="px-5 pt-4 pb-8">
      <h1 className="text-[16px] font-bold text-[#1A1D29] mb-1">{t("heading")}</h1>
      <p className="text-[12.5px] text-[#94A3B8] mb-4">{t("subheading")}</p>

      <div className="flex flex-col gap-2.5">
        {sorted.map((topic) => {
          const catStyle = CATEGORY_STYLE[topic.category] ?? { bg: "#F1F5F9", text: "#475569" };
          return (
            <button
              key={topic.id}
              onClick={() => router.push(`/${locale}/proto/stack?topic=${topic.id}`)}
              className="text-left rounded-2xl px-4 py-4 flex items-center gap-3"
              style={{ border: "1px solid #EEF0F4", background: "#fff" }}
            >
              <span
                className="text-[10px] font-bold px-2 py-1 rounded-full shrink-0"
                style={{ background: catStyle.bg, color: catStyle.text }}
              >
                {getCategoryLabel(topic.category, locale)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[14.5px] font-bold text-[#1A1D29] truncate">{topic.name}</span>
                  <span
                    className="text-[10.5px] font-bold px-2 py-0.5 rounded-full shrink-0"
                    style={{ background: "#DCFCE7", color: "#16A34A" }}
                  >
                    +{topic.newCount}件 新着
                  </span>
                  {hasInterestBadge(topic.category) && (
                    <span
                      className="text-[10.5px] font-bold px-2 py-0.5 rounded-full shrink-0"
                      style={{ background: "#EFF4FF", color: "#2F6FED" }}
                    >
                      {t("interestBadge")}
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-[#94A3B8] mt-0.5">{topic.windowLabel}</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <path d="m9 6 6 6-6 6" />
              </svg>
            </button>
          );
        })}
      </div>
    </div>
  );
}
