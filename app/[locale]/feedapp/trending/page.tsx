"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CATEGORY_STYLE, getCategoryLabel } from "../../../../lib/proto/mockData";
import { useArticles } from "../../../../lib/proto/useFeedData";
import { useProtoStore } from "../../../../lib/proto/store";

// A window large enough to give every real category a fair sample without
// paginating repeatedly just for a summary screen.
const SAMPLE_SIZE = 60;

export default function TrendingPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || "ja";
  const t = useTranslations("Proto.trending");
  const { saved, seen } = useProtoStore();

  // No cross-user aggregation backend exists yet (see lib/pipeline/collect.ts —
  // collection is a scheduled cron, not a user-interaction pipeline), so
  // "trending" here means real, honest signals we do have: how many items
  // per taxonomy category have actually been collected recently, plus this
  // device's own save/read history as an interest boost.
  const { articles, loading } = useArticles({ pageSize: SAMPLE_SIZE });

  // Article.publishedAt is already human-formatted ("2026年6月"), not sortable —
  // tally counts straight from the fetch order, which /api/feed already
  // returns newest-first.
  const categoryStats = useMemo(() => {
    const byCategory = new Map<string, number>();
    const order: string[] = [];
    for (const a of articles) {
      if (!byCategory.has(a.category)) order.push(a.category);
      byCategory.set(a.category, (byCategory.get(a.category) ?? 0) + 1);
    }
    return { byCategory, order };
  }, [articles]);

  // Interest signal from this user's own saves/reads among the sampled
  // articles (device-local only — see comment above).
  const categoryInterest = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const article of articles) {
      if (saved.includes(article.id)) counts[article.category] = (counts[article.category] ?? 0) + 3;
      else if (seen.includes(article.id)) counts[article.category] = (counts[article.category] ?? 0) + 1;
    }
    return counts;
  }, [articles, saved, seen]);

  const hasInterestBadge = (category: string) => (categoryInterest[category] ?? 0) >= 3;

  const sortedCategories = useMemo(() => {
    return categoryStats.order
      .map((cat) => ({ category: cat, count: categoryStats.byCategory.get(cat)! }))
      .sort((a, b) => {
        const interestDiff = (categoryInterest[b.category] ?? 0) - (categoryInterest[a.category] ?? 0);
        if (interestDiff !== 0 && (categoryInterest[a.category] || categoryInterest[b.category])) return interestDiff;
        return b.count - a.count;
      });
  }, [categoryStats, categoryInterest]);

  const oldestAndNewest = useMemo(() => {
    // articles arrive newest-first (see /api/feed's ordering)
    if (articles.length === 0) return null;
    return { newest: articles[0].publishedAt, oldest: articles[articles.length - 1].publishedAt };
  }, [articles]);

  return (
    <div className="px-5 pt-4 pb-8">
      <h1 className="text-[16px] font-bold text-[#1A1D29] mb-1">{t("heading")}</h1>
      <p className="text-[12.5px] text-[#94A3B8] mb-4">{t("subheading")}</p>

      {loading && sortedCategories.length === 0 ? (
        <p className="text-[12.5px] text-[#94A3B8] py-10 text-center">読み込み中…</p>
      ) : sortedCategories.length === 0 ? (
        <p className="text-[12.5px] text-[#94A3B8] py-10 text-center">まだデータがありません</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {sortedCategories.map(({ category, count }) => {
            const catStyle = CATEGORY_STYLE[category] ?? { bg: "#F1F5F9", text: "#475569" };
            const windowLabel = oldestAndNewest
              ? `${oldestAndNewest.oldest} 〜 ${oldestAndNewest.newest} の${count}件`
              : `${count}件`;
            return (
              <button
                key={category}
                onClick={() => router.push(`/${locale}/feedapp/stack?category=${encodeURIComponent(category)}`)}
                className="text-left rounded-2xl px-4 py-4 flex items-center gap-3"
                style={{ border: "1px solid #EEF0F4", background: "#fff" }}
              >
                <span
                  className="text-[10px] font-bold px-2 py-1 rounded-full shrink-0"
                  style={{ background: catStyle.bg, color: catStyle.text }}
                >
                  {getCategoryLabel(category, locale)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[14.5px] font-bold text-[#1A1D29] truncate">{getCategoryLabel(category, locale)}</span>
                    <span
                      className="text-[10.5px] font-bold px-2 py-0.5 rounded-full shrink-0"
                      style={{ background: "#DCFCE7", color: "#16A34A" }}
                    >
                      {count}件
                    </span>
                    {hasInterestBadge(category) && (
                      <span
                        className="text-[10.5px] font-bold px-2 py-0.5 rounded-full shrink-0"
                        style={{ background: "#EFF4FF", color: "#2F6FED" }}
                      >
                        {t("interestBadge")}
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-[#94A3B8] mt-0.5">{windowLabel}</p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
