
"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PaperCard } from "../../../components/PaperCard";
import { type PaperCardData } from "../../../types";
import { useTranslations } from "next-intl";
import { Search, Clock, FileText, Loader2 } from "lucide-react";

// Removed unused interface
// interface Message { ... }

// カテゴリ定義 (Drill-down用) - 削除済み
// const CATEGORIES = { ... };

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-10 h-10 animate-spin text-sky-600" />
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}

function SearchContent() {
  const t = useTranslations("Search");
  const ct = useTranslations("Common");
  const searchParams = useSearchParams();

  const [query, setQuery] = useState("");
  const [timeRange, setTimeRange] = useState("all");
  const [format, setFormat] = useState<"title" | "summary" | "abstract">("summary");

  const [results, setResults] = useState<PaperCardData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setQuery(q);
      handleKeywordSearch(undefined, q);
    }
  }, [searchParams]);

  const handleKeywordSearch = async (e?: React.FormEvent, overrideQuery?: string) => {
    // 1. Prevent reload immediately
    if (e) {
      e.preventDefault();
    }
    
    const searchTerms = overrideQuery || query;
    if (!searchTerms.trim()) return;

    setIsLoading(true);
    setError("");
    setResults([]);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchTerms, timeRange, format, mode: "keyword" }),
      });

      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      
      // 2. Safe error handling
      if (!data.papers || data.papers.length === 0) {
        // Do not throw error, just set error state safely
        // Ensure t('noResults') exists by fallback
        const noResMsg = t("noResults"); 
        setError(noResMsg || "No papers found.");
        setResults([]);
      } else {
        setResults(data.papers);
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred during search.");
    } finally {
      setIsLoading(false);
    }
  };

  // Removed handleDeepSearchSubmit and handleDrillCategorySelect as they are no longer used in this file

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24">

      {/* Header */}
      <section className="pt-20 pb-8 px-6 bg-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto space-y-6">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight uppercase italic text-slate-900">
            {t("title")}
          </h1>
          <form onSubmit={(e) => handleKeywordSearch(e)} className="relative group">
            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-slate-300 group-focus-within:text-sky-500 transition-colors" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("placeholder")}
              className="w-full h-16 pl-14 pr-40 bg-white border-2 border-slate-100 rounded-2xl text-base font-medium outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all shadow-sm placeholder:text-slate-300"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="absolute right-2 top-2 bottom-2 px-7 bg-slate-900 text-white font-black text-xs uppercase tracking-[0.2em] rounded-xl hover:bg-sky-600 transition-all flex items-center gap-2 shadow-md disabled:opacity-50"
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /><span>{t("searching")}</span></>
              ) : (
                <><Search className="w-4 h-4" /><span>{ct("search")}</span></>
              )}
            </button>
          </form>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
              <Clock className="w-4 h-4 text-sky-400" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("filterTime")}</span>
              <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="bg-transparent text-xs font-bold text-slate-700 cursor-pointer outline-none">
                <option value="all">{t("anyTime")}</option>
                <option value="6mo">{t("last6mo")}</option>
                <option value="1yr">{t("last1yr")}</option>
                <option value="5yr">{t("last5yr")}</option>
                <option value="10yr">{t("last10yr")}</option>
              </select>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
              <FileText className="w-4 h-4 text-sky-400" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("filterFormat")}</span>
              <select value={format} onChange={(e) => setFormat(e.target.value as any)} className="bg-transparent text-xs font-bold text-slate-700 cursor-pointer outline-none">
                <option value="title">{t("formatTitle")}</option>
                <option value="summary">{t("formatSummary")}</option>
                <option value="abstract">{t("formatAbstract")}</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Results */}
      <div className="max-w-4xl mx-auto px-6 py-10">
        {error && (
          <div className="text-center text-rose-500 font-bold text-sm bg-rose-50 border border-rose-100 py-5 rounded-2xl mb-8">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map((paper) => (
            <PaperCard key={paper.id} paper={paper} showSummary={format === "summary"} showAbstract={format === "abstract"} />
          ))}
        </div>
        {results.length === 0 && !isLoading && !error && (
          <div className="flex flex-col items-center justify-center py-32 text-slate-300 space-y-4">
            <Search className="w-10 h-10" />
            <p className="font-bold tracking-wide text-sm">{t("emptyState")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
