"use client";

import { useState } from "react";
import { PaperCard, type PaperCardData } from "@/components/PaperCard";
import { useLanguage } from "@/components/LanguageProvider";

export default function SearchPage() {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PaperCardData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setError("");
    setResults([]);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, limit: 12 }),
      });

      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setResults(data.papers || []);
      if (data.papers?.length === 0) {
        setError(t("該当する論文が見つかりませんでした。", "No matching papers found."));
      }
    } catch (err) {
      console.error(err);
      setError(t("検索中にエラーが発生しました。", "An error occurred during search."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-32">
      <section className="mx-auto max-w-4xl px-6 pt-24 pb-16 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-[10px] font-black tracking-widest text-cyan-600 dark:text-cyan-400 uppercase">
          AI POWERED SEARCH
        </div>
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-foreground leading-[1.1]">
          {t("知のリサーチを、", "Research with")}<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-600">{t("もっとダイレクトに。", "AI Intelligence.")}</span>
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
          {t("キーワードだけでなく「意味」で論文を検索。あなたの問いに対する最適な学術的回答を見つけます。", "Search papers by meaning, not just keywords. Find the best academic answers to your questions.")}
        </p>

        <form onSubmit={handleSearch} className="relative mt-12 max-w-2xl mx-auto group">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("興味のあるテーマを入力...", "Enter a theme or question...")}
            className="w-full rounded-[2rem] border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 px-8 py-6 text-lg font-bold text-foreground placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 dark:focus:border-cyan-400 backdrop-blur-md transition-all transition-duration-500"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="absolute right-3 top-3 bottom-3 rounded-[1.5rem] bg-foreground text-background px-8 font-black text-xs tracking-widest uppercase hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all shadow-xl shadow-foreground/10"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-background border-t-transparent rounded-full animate-spin"></div>
            ) : (
              t("検索", "SEARCH")
            )}
          </button>
          <div className="absolute inset-0 -z-10 bg-cyan-500/10 blur-3xl opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
        </form>
      </section>

      <main className="mx-auto max-w-6xl px-6">
        {error && (
          <div className="mx-auto max-w-2xl text-center p-8 rounded-[2rem] bg-red-500/10 border border-red-500/20 text-red-500 font-bold mb-12">
            {error}
          </div>
        )}

        {results.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {results.map((paper) => (
              <PaperCard key={paper.id} paper={paper} />
            ))}
          </div>
        )}

        {!isLoading && results.length === 0 && !error && query === "" && (
          <div className="py-24 text-center space-y-4 opacity-30">
            <div className="text-6xl">🔍</div>
            <p className="text-xs font-black tracking-[0.3em] uppercase text-slate-500 dark:text-slate-400">WAITING FOR YOUR QUERY</p>
          </div>
        )}
      </main>
    </div>
  );
}