
"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PaperCard, type PaperCardData } from "../../../components/PaperCard";
import { useTranslations } from "next-intl";
import { ChatInterface } from "../../../components/chat/ChatInterface";
import { Search, Sparkles, Clock, FileText, Loader2 } from "lucide-react";

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

  const [mode, setMode] = useState<"keyword" | "deep">("keyword");
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
      setMode("keyword");
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
    <div className="min-h-screen bg-white text-slate-900 pb-24">
      
      {/* Header Area */}
      <section className="pt-24 pb-8 px-6 border-b border-slate-50 bg-white/80 backdrop-blur-md sticky top-20 z-30">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h1 className="text-3xl md:text-5xl font-black tracking-tight uppercase italic">
            {t("title")}
          </h1>
          
          <div className="inline-flex p-1.5 bg-slate-100 rounded-2xl border border-slate-200 shadow-inner">
            <button
              onClick={() => setMode("keyword")}
              className={`flex items-center gap-2 px-4 md:px-8 py-2 md:py-3 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${mode === "keyword" ? "bg-white text-sky-600 shadow-md transform scale-105" : "text-slate-400 hover:text-slate-600"}`}
            >
              <Search size={14} />
              {t("modeKeyword")}
            </button>
            <button
              onClick={() => setMode("deep")}
              className={`flex items-center gap-2 px-4 md:px-8 py-2 md:py-3 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${mode === "deep" ? "bg-white text-sky-600 shadow-md transform scale-105" : "text-slate-400 hover:text-slate-600"}`}
            >
              <Sparkles size={14} />
              {t("modeDeep")}
            </button>
          </div>
        </div>
      </section>

      {/* --- Mode A: Keyword Search --- */}
      {mode === "keyword" && (
        <section className="max-w-6xl mx-auto px-6 py-12 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <form onSubmit={(e) => handleKeywordSearch(e)} className="max-w-3xl mx-auto relative group z-10">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("placeholder")}
              className="w-full h-16 pl-8 pr-32 bg-white border-2 border-slate-100 rounded-[2rem] text-lg font-bold outline-none focus:border-sky-600 focus:ring-4 focus:ring-sky-600/5 transition-all shadow-xl shadow-slate-200/40"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="absolute right-2 top-2 bottom-2 px-6 bg-slate-900 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-[1.5rem] hover:bg-sky-600 transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : ct("search")}
            </button>
          </form>

          {/* Filters */}
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 py-6 border-y border-slate-100">
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-sky-600" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("filterTime")}</span>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="bg-transparent text-[11px] font-bold text-slate-900 uppercase cursor-pointer outline-none border-b border-transparent hover:border-sky-600"
              >
                <option value="all">{t("anyTime")}</option>
                <option value="6mo">{t("last6mo")}</option>
                <option value="1yr">{t("last1yr")}</option>
                <option value="5yr">{t("last5yr")}</option>
                <option value="10yr">{t("last10yr")}</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-sky-600" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("filterFormat")}</span>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as any)}
                className="bg-transparent text-[11px] font-bold text-slate-900 uppercase cursor-pointer outline-none border-b border-transparent hover:border-sky-600"
              >
                <option value="title">{t("formatTitle")}</option>
                <option value="summary">{t("formatSummary")}</option>
                <option value="abstract">{t("formatAbstract")}</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="text-center text-red-500 font-bold text-sm bg-red-50 py-4 rounded-xl">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((paper) => (
              <PaperCard key={paper.id} paper={paper} showSummary={format === "summary"} showAbstract={format === "abstract"} />
            ))}
          </div>
          {results.length === 0 && !isLoading && !error && (
            <div className="text-center text-slate-400 font-bold py-20">
              Start your research journey by entering keywords above.
            </div>
          )}
        </section>
      )}

      {/* --- Mode B: Deep Search (Chat) --- */}
      {mode === "deep" && (
        <section className="max-w-4xl mx-auto px-6 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <ChatInterface />
        </section>
      )}
    </div>
  );
}
