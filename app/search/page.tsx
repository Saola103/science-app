"use client";

import { useState, useEffect } from "react";
import { PaperCard, type PaperCardData } from "@/components/PaperCard";
import { useLanguage } from "@/components/LanguageProvider";
import { fetchLatestPapers } from "@/app/actions";

export default function SearchPage() {
  const { t } = useLanguage();
  const [keyword, setKeyword] = useState("");
  const [papers, setPapers] = useState<PaperCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const data = await fetchLatestPapers(20);
        console.log("[Search] initial data:", data?.length);
        setPapers((data || []) as PaperCardData[]);
      } catch (err: unknown) {
        console.error("[Search] fetch error:", err);
        setError(t("データの取得に失敗しました。", "Failed to fetch data."));
      }
      setIsLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = keyword.trim();
    if (!q) {
      setHasSearched(false);
      setIsLoading(true);
      try {
        const data = await fetchLatestPapers(20);
        setPapers((data || []) as PaperCardData[]);
      } catch { /* ignore */ }
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError("");
    setHasSearched(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, limit: 10 }),
      });
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setPapers(data.papers || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-slate-300 pb-32">
      <main className="mx-auto w-full max-w-4xl px-6 pt-12 sm:pt-20">
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.2)] mb-8">
            Powered by Gemini 1.5 Flash &amp; Text Embedding 004
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl text-white">
            Search with AI
          </h1>
          <p className="mt-6 text-lg text-slate-400 max-w-2xl">
            {t(
              "自然言語でAIが論文の意味を理解して探し出します。「〇〇について知りたい」と入力してください。",
              "AI understands the meaning of papers and finds them using natural language."
            )}
          </p>
          <form onSubmit={handleSearch} className="mt-12 w-full max-w-3xl relative">
            <div className="absolute inset-0 -z-10 bg-cyan-500/20 blur-2xl rounded-full"></div>
            <div className="relative flex items-center rounded-[2rem] bg-white/5 border border-white/20 focus-within:ring-2 focus-within:ring-cyan-500 focus-within:border-cyan-500 overflow-hidden group backdrop-blur-xl">
              <div className="pl-8 text-slate-500 group-focus-within:text-cyan-400 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              </div>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder={t("例: 脳の可塑性に関する最新研究", "e.g., Latest research on brain plasticity")}
                className="w-full bg-transparent px-6 py-5 sm:py-6 text-base sm:text-xl text-white placeholder:text-slate-600 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="mr-3 rounded-[1.5rem] bg-gradient-to-r from-cyan-500 to-blue-600 px-8 py-3 sm:py-4 text-sm sm:text-base font-bold text-white shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 disabled:opacity-50 transition-all whitespace-nowrap"
              >
                {t("検索する", "Search")}
              </button>
            </div>
          </form>
        </div>
        <div className="mt-20">
          {error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-400 mb-8 max-w-3xl mx-auto">
              {error}
            </div>
          )}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-32 text-slate-400 gap-6">
              <div className="relative">
                <div className="w-12 h-12 rounded-full absolute border-4 border-slate-700"></div>
                <div className="w-12 h-12 rounded-full animate-spin absolute border-4 border-cyan-500 border-t-transparent"></div>
              </div>
              <p className="text-xl font-medium animate-pulse text-cyan-400 mt-6">{t("AIが論文を検索中...", "AI is searching papers...")}</p>
            </div>
          ) : papers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center bg-white/5 rounded-[2rem] border border-white/5 mt-8">
              <h3 className="text-2xl font-bold text-white">{t("検索結果が見つかりませんでした", "No results found")}</h3>
              <p className="mt-3 text-lg text-slate-400">{t("別の言葉で試してみてください。", "Please try different keywords.")}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto">
              <div className="text-sm font-semibold text-slate-500 flex items-center gap-4 uppercase tracking-widest">
                <div className="h-px bg-white/10 flex-1"></div>
                <span className="text-cyan-400">
                  {hasSearched ? t(`AI検索結果: ${papers.length}件`, `AI Results: ${papers.length}`) : t(`最新の論文: ${papers.length}件`, `Recent: ${papers.length}`)}
                </span>
                <div className="h-px bg-white/10 flex-1"></div>
              </div>
              {papers.map((paper) => (
                <PaperCard key={paper.id} paper={paper} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}