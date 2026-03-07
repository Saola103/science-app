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
    if (mode === "general" && summary.includes("- ")) {
      const parts = summary.split("\n\n");
      const bullets = parts[0].split("\n").filter((l: string) => l.trim().startsWith("-"));
      const explanation = parts.slice(1).join("\n\n");

      if (bullets.length > 0) {
        return (
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              {bullets.map((b: string, i: number) => (
                <div key={i} className="flex gap-4 items-start p-3 bg-neutral-50 rounded-lg border border-neutral-100">
                  <span className="shrink-0 text-cyan-600 font-black text-xs">0{i + 1}</span>
                  <p className="text-sm font-bold text-black leading-tight tracking-tight">{b.replace(/^- /, "")}</p>
                </div>
              ))}
            </div>
            {explanation && (
              <p className="text-sm leading-relaxed text-neutral-600 font-medium whitespace-pre-wrap pt-2">
                {explanation}
              </p>
            )}
          </div>
        );
      }
    }
    return (
      <p className="text-sm leading-relaxed text-neutral-800 font-medium whitespace-pre-wrap">
        {summary}
      </p>
    );
  }, [summary, mode]);

  const published = formatDate(paper.published_at);

  const handleShare = async () => {
    const url = paper.url || window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: paper.title, url });
      } catch (err) { }
    } else {
      navigator.clipboard.writeText(url);
      alert(t("URLをコピーしました", "URL copied to clipboard"));
    }
  };

  const toggleBookmark = () => {
    if (!isUserLoggedIn) {
      alert(t("ブックマークにはログインが必要です", "Login required"));
      return;
    }
    setIsBookmarked(!isBookmarked);
  };

  return (
    <article className="pro-card shrink-0 w-[320px] sm:w-[380px] h-[520px] bg-white p-6 flex flex-col justify-between group">
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs-pro text-cyan-600">Paper</span>
            <div className="flex gap-2">
              <button onClick={handleShare} className="p-1 hover:text-cyan-600 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" /></svg>
              </button>
              <button onClick={toggleBookmark} className={`p-1 transition-all ${isBookmarked ? 'text-amber-500' : 'hover:text-amber-500'}`}>
                <svg className="w-4 h-4" fill={isBookmarked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>
              </button>
            </div>
          </div>
          <h2 className="text-xl font-black leading-tight line-clamp-3 text-black group-hover:underline underline-offset-4 decoration-1">
            {paper.url ? <a href={paper.url} target="_blank" rel="noreferrer">{paper.title}</a> : paper.title}
          </h2>
          <div className="flex gap-3 text-[10px] font-bold text-neutral-400 uppercase tracking-tighter">
            {paper.journal && <span className="truncate max-w-[150px]">{paper.journal}</span>}
            {published && <span>{published}</span>}
          </div>
        </div>

        <div className="overflow-y-auto max-h-[220px] hide-scrollbar">
          {summaryContent}
        </div>
      </div>

      <div className="pt-6 border-t border-neutral-100 mt-auto">
        <div className="grid grid-cols-2 gap-2 bg-neutral-100 p-1 rounded-lg">
          <button
            onClick={() => setMode("general")}
            className={`py-3 text-[10px] font-black tracking-widest uppercase transition-all rounded-md ${mode === 'general' ? 'bg-white text-black shadow-sm' : 'text-neutral-400 hover:text-black'}`}
          >
            {t("一般向け", "GENERAL")}
          </button>
          <button
            onClick={() => setMode("expert")}
            className={`py-3 text-[10px] font-black tracking-widest uppercase transition-all rounded-md ${mode === 'expert' ? 'bg-white text-black shadow-sm' : 'text-neutral-400 hover:text-black'}`}
          >
            {t("専門家向け", "EXPERT")}
          </button>
        </div>
      </div>
    </article>
  );
}