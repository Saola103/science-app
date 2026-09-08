"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArticleThumbnail } from "../../../../components/proto/ArticleThumbnail";
import { CATEGORIES, getCategoryLabel } from "../../../../lib/proto/mockData";
import { useArticles } from "../../../../lib/proto/useFeedData";

const RECENT_SEARCHES = ["量子コンピュータ", "老化", "系外惑星"];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || "ja";
  const t = useTranslations("Proto.search");

  // Real full-text search against /api/feed's `q` param (title/summary ilike
  // — see app/api/feed/route.ts). Only enabled once a query is submitted.
  const { articles: results, loading } = useArticles({ q: submitted || undefined, pageSize: 24, enabled: !!submitted });

  const runSearch = (kw: string) => {
    setQuery(kw);
    setSubmitted(kw);
  };

  const openStack = (kw: string) => router.push(`/${locale}/feedapp/stack?q=${encodeURIComponent(kw)}`);

  return (
    <div className="px-5 pt-4 pb-8">
      <div className="flex items-center gap-2 rounded-2xl px-4 py-3" style={{ background: "#F1F3F6" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runSearch(query)}
          placeholder={t("placeholder")}
          className="bg-transparent outline-none flex-1 text-[14px] text-[#1A1D29] placeholder:text-[#94A3B8]"
        />
      </div>

      {!submitted && (
        <div className="mt-6 space-y-6">
          <div>
            <p className="text-[12px] font-bold text-[#94A3B8] mb-2.5">{t("recent")}</p>
            <div className="flex flex-wrap gap-2">
              {RECENT_SEARCHES.map((kw) => (
                <button
                  key={kw}
                  onClick={() => runSearch(kw)}
                  className="text-[12.5px] font-medium px-3.5 py-2 rounded-full"
                  style={{ background: "#F1F3F6", color: "#374151" }}
                >
                  {kw}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[12px] font-bold text-[#94A3B8] mb-2.5">{t("byCategory")}</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => router.push(`/${locale}/feedapp/stack?category=${encodeURIComponent(cat)}`)}
                  className="text-[12.5px] font-medium px-3.5 py-2 rounded-full"
                  style={{ background: "#F1F3F6", color: "#374151" }}
                >
                  {getCategoryLabel(cat, locale)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {submitted && (
        <div className="mt-5">
          <p className="text-[12px] text-[#94A3B8] mb-3">
            「{submitted}」 {t("resultsCount", { count: results.length })}
          </p>
          {loading && results.length === 0 ? (
            <p className="text-[13px] text-[#94A3B8] text-center py-10">読み込み中…</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                {results.map((a) => (
                  <ArticleThumbnail key={a.id} article={a} onClick={() => openStack(submitted)} />
                ))}
              </div>
              {results.length === 0 && (
                <p className="text-[13px] text-[#94A3B8] text-center py-10">{t("noResults")}</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
