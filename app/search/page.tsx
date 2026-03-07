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
    try {
      const data = await fetchLatestPapers(20);
      setPapers(data as PaperCardData[]);
      setError("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchInitial();
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
      setPapers(data.papers || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-slate-300 pb-32">
      <main className="mx-auto w-full max-w-4xl px-6 pt-16 sm:pt-24 lg:pt-32">
        {/* Search Header */}
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.2)] mb-8">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M9.315 7.584C12.195 3.883 16.695 1.5 21.5 1.5c-4.468 0-8.736 2.684-12.04 8.182C7.022 13.91 5.08 18.062 1.5 21.5c3.984-1.127 8.243-3.66 11.385-8.583C15.932 7.846 17.848 3.633 21.5 1.5c-3.985 1.13-8.245 3.67-11.393 8.601-.035.056-.07.111-.104.167-.324.516-.62 1.05-.888 1.597V11.5c0-.62-.178-1.205-.487-1.7-.35-.558-1.503-1.638-3.376-2.583-.058-.029-.115-.057-.17-.084-.336-.166-.673-.309-1.002-.428.182-.244.383-.48.59-.7A16.48 16.48 0 0 1 9.315 7.584Z" clipRule="evenodd" />
            </svg>
            {t("Powered by Gemini 1.5 Flash & Text Embedding 004", "Powered by Gemini 1.5 Flash & Text Embedding 004")}
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-white drop-shadow-md">
            {t("Search with AI", "Search with AI")}
          </h1>
          <p className="mt-6 text-lg sm:text-lg leading-8 text-slate-400 max-w-2xl">
            {t(
              "自然言語でAIが論文の意味を理解して探し出します。「〇〇について知りたい」と入力してください。",
              "AI understands the meaning of papers and finds them using natural language. Try 'I want to know about...'"
            )}
          </p>

          <form onSubmit={handleSearch} className="mt-12 w-full max-w-3xl relative">
            {/* Glowing background behind search bar */}
            <div className="absolute inset-0 -z-10 bg-cyan-500/20 blur-2xl rounded-full"></div>

            <div className="relative flex items-center shadow-2xl transition-all duration-300 rounded-[2rem] bg-white/5 border border-white/20 focus-within:ring-2 focus-within:ring-cyan-500 focus-within:border-cyan-500 overflow-hidden group backdrop-blur-xl">
              <div className="pl-8 text-slate-500 group-focus-within:text-cyan-400 transition-colors duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              </div>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder={t(
                  "例: 深層学習を用いた画像認識の最新動向について知りたい",
                  "e.g., Latest trends in image recognition using deep learning"
                )}
                className="w-full bg-transparent px-6 py-5 sm:py-6 text-base sm:text-xl text-white placeholder:text-slate-600 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="mr-3 rounded-[1.5rem] bg-gradient-to-r from-cyan-500 to-blue-600 px-8 py-3 sm:py-4 text-sm sm:text-base font-bold text-white shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 transition-all duration-300 whitespace-nowrap"
              >
                {t("検索する", "Search")}
              </button>
            </div>
          </form>
        </div>

        {/* Results Section */}
        <div className="mt-20">
          {error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-400 mb-8 max-w-3xl mx-auto shadow-sm backdrop-blur-sm">
              <div className="flex gap-3 items-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-red-400">
                  <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                </svg>
                <div className="font-medium">{t("検索中にエラーが発生しました", "An error occurred during the search")}</div>
              </div>
              <p className="mt-2 text-red-300 font-mono text-xs pl-8">{error}</p>
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-32 text-slate-400 gap-6">
              <div className="relative flex justify-center items-center">
                <div className="absolute animate-ping inline-flex h-16 w-16 rounded-full bg-cyan-500/40 opacity-75"></div>
                <div className="w-12 h-12 rounded-full absolute border-4 border-slate-700"></div>
                <div className="w-12 h-12 rounded-full animate-spin absolute border-4 border-cyan-500 border-t-transparent shadow-[0_0_15px_rgba(34,211,238,0.5)]"></div>
              </div>
              <p className="text-xl font-medium tracking-tight animate-pulse text-cyan-400 mt-6">{t("AIが論文ネットワークを検索中...", "AI is traversing the paper network...")}</p>
            </div>
          ) : papers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center bg-white/5 backdrop-blur-md rounded-[2rem] border border-white/5 mt-8">
              <div className="rounded-full bg-white/5 p-6 mb-6 border border-white/10 text-slate-400 shadow-inner">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight">{t("検索結果が見つかりませんでした", "No results found")}</h3>
              <p className="mt-3 text-lg text-slate-400 max-w-md">{t("別の言葉で試してみてください。より具体的なキーワードや、違う表現を使うと見つかるかもしれません。", "Please try another keyword. Using more specific terms or different expressions might help.")}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto">
              <div className="text-sm font-semibold text-slate-500 pl-2 flex items-center gap-4 uppercase tracking-widest">
                <div className="h-px bg-white/10 flex-1"></div>
                <span className="text-cyan-400">
                  {hasSearched
                    ? t(`AIによる検索結果: ${papers.length}件`, `AI Search Results: ${papers.length} papers`)
                    : t(`最新の論文: ${papers.length}件`, `Recent Papers: ${papers.length} papers`)
                  }
                </span>
                <div className="h-px bg-white/10 flex-1"></div>
              </div>
              <div className="grid grid-cols-1 gap-8 mt-4">
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