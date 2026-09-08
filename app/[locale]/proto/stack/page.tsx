"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { CardStack } from "../../../../components/proto/CardStack";
import { ARTICLES, TOPICS, searchArticles } from "../../../../lib/proto/mockData";

function StackContent() {
  const params = useSearchParams();
  const router = useRouter();
  const t = useTranslations("Proto.stack");
  const q = params.get("q");
  const topicId = params.get("topic");

  let articles = ARTICLES;
  let label = "";

  if (q) {
    articles = searchArticles(q);
    label = t("searchResultsFor", { query: q });
  } else if (topicId) {
    const topic = TOPICS.find((t) => t.id === topicId);
    if (topic) {
      articles = ARTICLES.filter((a) => a.category === topic.category);
      label = topic.name;
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 px-5 pt-4">
        <button onClick={() => router.back()} className="p-1 -ml-1 text-[#1A1D29]" aria-label={t("back")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 6 9 12l6 6" />
          </svg>
        </button>
        <span className="text-[14px] font-bold text-[#1A1D29]">{label}</span>
        <span className="text-[12px] text-[#94A3B8] ml-1">{t("count", { count: articles.length })}</span>
      </div>
      <CardStack articles={articles} stackKey={`${q ?? ""}-${topicId ?? ""}`} />
    </div>
  );
}

export default function StackPage() {
  return (
    <Suspense fallback={null}>
      <StackContent />
    </Suspense>
  );
}
