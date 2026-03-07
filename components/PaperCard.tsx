"use client";

import { useMemo, useState, useEffect } from "react";
import { useLanguage } from "./LanguageProvider";
import { getSupabaseClient } from "@/lib/supabase/client";

export type PaperCardData = {
  id: string;
  title: string;
  journal?: string | null;
  url?: string | null;
  published_at?: string | null;
  summary?: string | null;
  summary_general?: string | null;
  summary_expert?: string | null;
};

function formatDate(value?: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export function PaperCard({ paper }: { paper: PaperCardData }) {
  const [mode, setMode] = useState<"general" | "expert">("general");
  const { t } = useLanguage();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsUserLoggedIn(!!user);
    });
  }, []);

  const summary = useMemo(() => {
    if (mode === "general") return paper.summary_general || paper.summary || t("要約がありません", "No summary available");
    return paper.summary_expert || paper.summary || t("要約がありません", "No summary available");
  }, [mode, paper, t]);

  const summaryContent = useMemo(() => {
    if (!summary) return null;

    // Detect bullet points (starts with - or contains list)
    if (mode === "general" && summary.includes("- ")) {
      const parts = summary.split("\n\n");
      const bullets = parts[0].split("\n").filter((l: string) => l.trim().startsWith("-"));
      const explanation = parts.slice(1).join("\n\n");

      if (bullets.length > 0) {
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-3">
              {bullets.map((b: string, i: number) => (
                <div key={i} className="flex gap-4 items-start p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/10 transition-all dark:bg-white/5">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-cyan-500 text-white flex items-center justify-center text-[10px] font-black">{i + 1}</span>
                  <p className="text-base font-bold text-slate-800 dark:text-slate-100 leading-tight">{b.replace(/^- /, "")}</p>
                </div>
              ))}
            </div>
            {explanation && (
              <p className="text-lg leading-relaxed text-slate-700 dark:text-slate-300 font-medium whitespace-pre-wrap pt-4 border-t border-slate-200 dark:border-white/5">
                {explanation}
              </p>
            )}
          </div>
        );
      }
    }

    return (
      <p className="text-lg leading-relaxed text-slate-700 dark:text-slate-100 font-medium whitespace-pre-wrap">
        {summary}
      </p>
    );
  }, [summary, mode]);

  const published = formatDate(paper.published_at);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: paper.title,
          text: summary.slice(0, 100) + "...",
          url: paper.url || window.location.href,
        });
      } catch (err) {
        console.log("Share failed", err);
      }
    } else {
      // Fallback
      navigator.clipboard.writeText(paper.url || window.location.href);
      alert(t("URLをコピーしました", "URL copied to clipboard"));
    }
  };

  const toggleBookmark = () => {
    if (!isUserLoggedIn) {
      alert(t("ブックマークにはログインが必要です", "Login required for bookmarks"));
      return;
    }
    setIsBookmarked(!isBookmarked);
  };

  return (
    <article className="group relative rounded-[2.5rem] border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-8 sm:p-10 backdrop-blur-md transition-all duration-500 hover:border-cyan-500/30 dark:hover:border-white/20 hover:shadow-[0_20px_50px_-20px_rgba(34,211,238,0.2)] overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

      <div className="flex flex-col gap-10">
        <div className="flex flex-col-reverse lg:flex-row items-start justify-between gap-8">
          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 dark:bg-cyan-500/20 text-[10px] font-black tracking-widest text-cyan-600 dark:text-cyan-400 uppercase border border-cyan-500/20">
                PAPER
              </span>
              <div className="h-px w-8 bg-slate-200 dark:bg-white/10"></div>
              {paper.journal && <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{paper.journal}</span>}
              {published && <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{published}</span>}
            </div>

            <h2 className="text-2xl sm:text-3xl font-black leading-tight text-foreground tracking-tight line-clamp-3">
              {paper.url ? (
                <a href={paper.url} target="_blank" rel="noreferrer" className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
                  {paper.title}
                </a>
              ) : paper.title}
            </h2>
          </div>

          <div className="shrink-0 w-full sm:w-auto flex flex-col items-center sm:items-end gap-6">
            <div className="inline-flex items-center rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-100/50 dark:bg-black p-1.5 text-[10px] font-black tracking-widest uppercase shadow-inner backdrop-blur-md">
              <button
                onClick={() => setMode("general")}
                className={`rounded-xl px-5 py-2.5 transition-all duration-500 flex items-center gap-2 ${mode === "general" ? "bg-white dark:bg-white/10 text-cyan-600 dark:text-cyan-400 shadow-lg" : "text-slate-500 dark:text-slate-400 hover:text-foreground"}`}
              >
                {t("一般向け", "GENERAL")}
              </button>
              <button
                onClick={() => setMode("expert")}
                className={`rounded-xl px-5 py-2.5 transition-all duration-500 flex items-center gap-2 ${mode === "expert" ? "bg-white dark:bg-white/10 text-indigo-600 dark:text-indigo-400 shadow-lg" : "text-slate-500 dark:text-slate-400 hover:text-foreground"}`}
              >
                {t("専門家向け", "EXPERT")}
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleShare}
                className="p-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-cyan-500/10 transition-all text-foreground"
                title="Share"
              >
                {/* Arrow-curve-up icon for share */}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
                </svg>
              </button>

              <button
                onClick={toggleBookmark}
                className={`p-3 rounded-2xl border border-slate-200 dark:border-white/10 transition-all group/bookmark ${isBookmarked ? 'bg-amber-500 text-white border-amber-500' : 'bg-slate-50 dark:bg-white/5 text-foreground hover:bg-amber-500/10'}`}
                title="Bookmark"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill={isBookmarked ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-5 h-5 transition-transform ${isBookmarked ? 'scale-110' : 'group-hover/bookmark:scale-110'}`}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="relative group/summary mt-2">
          <div className="absolute -left-5 top-0 bottom-0 w-1.5 bg-gradient-to-b from-cyan-500/50 to-transparent rounded-full opacity-30 group-hover/summary:opacity-100 transition-opacity"></div>
          {summaryContent}
        </div>
      </div>
    </article>
  );
}