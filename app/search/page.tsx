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

  const fetchInitial = async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await fetchLatestPapers(20);
      console.log("Search initial data:", data);
      setPapers(data as PaperCardData[]);
    } catch (err: unknown) {
      console.error("Search fetch error:", err);
      setError(t("データの取得に失敗しました。", "Failed to fetch data."));
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = keyword.trim();
    if (!q) {
      setHasSearched(false);
      fetchInitial();
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
      if (!res.ok) {
        throw new Error("Failed to fetch search results");
      }
      const data = await res.json();
      console.log("Search results:", data.papers);
      setPapers(data.papers || []);
    } catch (err: unknown) {
      console.error("Search error:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-32">
      <main className="mx-auto w-full max-w-4xl px-6 pt-12 sm:pt-20">
        {/* Search Header */}
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-xs font-semibold text-cyan-700 mb-8">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M15.98 1.804a1 1 0 0 0-1.96 0l-.24 1.192a1 1 0 0 1-.784.785l-1.192.238a1 1 0 0 0 0 1.962l1.192.238a1 1 0 0 1 .785.785l.238 1.192a1 1 0 0 0 1.962 0l.238-1.192a1 1 0 0 1 .785-.785l1.192-.238a1 1 0 0 0 0-1.962l-1.192-.238a1 1 0 0 1-.785-.785l-.238-1.192ZM6.949 5.684a1 1 0 0 0-1.898 0l-.683 2.051a1 1 0 0 1-.633.633l-2.051.683a1 1 0 0 0 0 1.898l2.051.684a1 1 0 0 1 .633.632l.683 2.051a1 1 0 0 0 1.898 0l.683-2.051a1 1 0 0 1 .633-.633l2.051-.683a1 1 0 0 0 0-1.898l-2.051-.683a1 1 0 0 1-.633-.633L6.95 5.684Z" />
            </svg>
            Powered by Gemini 1.5 Flash &amp; Text Embedding 004
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-slate-900">
            Search with AI
          </h1>
          <p className="mt-4 text-base sm:text-lg leading-8 text-slate-500 max-w-2xl">
            {t(
              "自然言語でAIが論文の意味を理解して探し出します。「〇〇について知りたい」と入力してください。",
              "AI understands the meaning of papers and finds them using natural language. Try typing what you want to learn about."
            )}
          </p>

          <form onSubmit={handleSearch} className="mt-10 w-full max-w-3xl">
            <div className="relative flex items-center shadow-sm transition-all duration-200 rounded-2xl bg-white border border-slate-200 focus-within:ring-2 focus-within:ring-cyan-400 focus-within:border-cyan-400 overflow-hidden group">
              <div className="pl-6 text-slate-400 group-focus-within:text-cyan-500 transition-colors duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              </div>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder={t(
                  "例: 脳の可塑性に関する最新研究",
                  "e.g., Latest research on brain plasticity"
                )}
                className="w-full bg-transparent px-4 py-4 sm:py-5 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="mr-2 rounded-xl bg-cyan-500 px-6 py-2.5 sm:py-3 text-sm font-bold text-white shadow-sm hover:bg-cyan-600 disabled:opacity-50 transition-all whitespace-nowrap"
              >
                {t("検索する", "Search")}
              </button>
            </div>
          </form>
        </div>

        {/* Results Section */}
        <div className="mt-16">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 mb-6 max-w-3xl mx-auto">
              <div className="flex gap-2 items-center font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-500">
                  <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                </svg>
                {t("検索中にエラーが発生しました", "An error occurred during the search")}
              </div>
              <p className="mt-1 text-red-500 text-xs pl-6">{error}</p>
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-4">
              <div className="relative">
                <div className="w-10 h-10 rounded-full absolute border-4 border-slate-200"></div>
                <div className="w-10 h-10 rounded-full animate-spin absolute border-4 border-cyan-500 border-t-transparent"></div>
              </div>
              <p className="text-base font-medium text-slate-400 mt-8">
                {t("AIが論文を検索中...", "AI is searching papers...")}
              </p>
            </div>
          ) : papers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-slate-200 mt-6">
              <div className="rounded-full bg-slate-100 p-4 mb-4 text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900">{t("検索結果が見つかりませんでした", "No results found")}</h3>
              <p className="mt-2 text-slate-500 max-w-md">{t("別の言葉で試してみてください。", "Please try different keywords.")}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-5 w-full max-w-3xl mx-auto">
              <div className="text-sm font-medium text-slate-400 flex items-center gap-4">
                <div className="h-px bg-slate-200 flex-1"></div>
                <span className="text-cyan-600">
                  {hasSearched
                    ? t(`AI検索結果: ${papers.length}件`, `AI Results: ${papers.length} papers`)
                    : t(`最新の論文: ${papers.length}件`, `Recent: ${papers.length} papers`)
                  }
                </span>
                <div className="h-px bg-slate-200 flex-1"></div>
              </div>
              <div className="grid grid-cols-1 gap-5 mt-2">
                {papers.map((paper) => (
                  <PaperCard key={paper.id} paper={paper} />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}