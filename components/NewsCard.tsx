"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "./LanguageProvider";

export type NewsCardData = {
    id: string;
    title: string;
    source?: string | null;
    url?: string | null;
    published_at?: string | null;
    summary_general?: string | null;
    summary_expert?: string | null;
};

function formatDate(value?: string | null): string | null {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export function NewsCard({ news }: { news: NewsCardData }) {
    const [mode, setMode] = useState<"general" | "expert">("general");
    const { t } = useLanguage();
    const published = formatDate(news.published_at);

    const summary = useMemo(() => {
        if (mode === "general") return news.summary_general || t("要約がありません", "No summary available");
        return news.summary_expert || news.summary_general || t("要約がありません", "No summary available");
    }, [mode, news, t]);

    const summaryContent = useMemo(() => {
        if (!summary) return null;

        if (mode === "general" && summary.includes("- ")) {
            const parts = summary.split("\n\n");
            const bullets = parts[0].split("\n").filter((l: string) => l.trim().startsWith("-"));
            const explanation = parts.slice(1).join("\n\n");

            if (bullets.length > 0) {
                return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-3">
                            {bullets.map((b: string, i: number) => (
                                <div key={i} className="flex gap-4 items-start p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 transition-all dark:bg-white/5">
                                    <span className="shrink-0 w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px] font-black">{i + 1}</span>
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
            <p className="text-lg leading-relaxed text-slate-700 dark:text-slate-100 font-medium whitespace-pre-wrap transition-colors duration-300">
                {summary}
            </p>
        );
    }, [summary, mode]);

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: news.title,
                    text: summary.slice(0, 100) + "...",
                    url: news.url || window.location.href,
                });
            } catch (err) {
                console.log("Share failed", err);
            }
        } else {
            navigator.clipboard.writeText(news.url || window.location.href);
            alert(t("URLをコピーしました", "URL copied to clipboard"));
        }
    };

    return (
        <article className="group relative rounded-[2.5rem] border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-8 sm:p-10 backdrop-blur-md transition-all duration-500 hover:border-amber-500/30 dark:hover:border-white/20 hover:shadow-[0_20px_50px_-20px_rgba(245,158,11,0.2)] overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-amber-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

            <div className="flex flex-col gap-8">
                <div className="flex flex-col-reverse lg:flex-row items-start justify-between gap-8">
                    <div className="min-w-0 flex-1 space-y-4">
                        <div className="flex items-center gap-3">
                            <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-[10px] font-black tracking-widest text-amber-600 dark:text-amber-400 uppercase border border-amber-500/20">
                                LATEST NEWS
                            </span>
                            <div className="h-px w-8 bg-slate-200 dark:bg-white/10"></div>
                            {news.source && <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{news.source}</span>}
                            {published && <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{published}</span>}
                        </div>

                        <h2 className="text-xl sm:text-2xl font-black leading-tight text-foreground tracking-tight line-clamp-3">
                            {news.url ? (
                                <a href={news.url} target="_blank" rel="noreferrer" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                                    {news.title}
                                </a>
                            ) : news.title}
                        </h2>
                    </div>

                    <div className="shrink-0 w-full sm:w-auto flex flex-col items-center sm:items-end gap-6">
                        <div className="inline-flex items-center rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-100/50 dark:bg-black p-1.5 text-[10px] font-black tracking-widest uppercase shadow-inner backdrop-blur-md">
                            <button
                                onClick={() => setMode("general")}
                                className={`rounded-xl px-5 py-2.5 transition-all duration-500 flex items-center gap-2 ${mode === "general" ? "bg-white dark:bg-white/10 text-amber-600 dark:text-amber-400 shadow-lg" : "text-slate-500 dark:text-slate-400 hover:text-foreground"}`}
                            >
                                {t("解説", "SUMMARY")}
                            </button>
                            <button
                                onClick={() => setMode("expert")}
                                className={`rounded-xl px-5 py-2.5 transition-all duration-500 flex items-center gap-2 ${mode === "expert" ? "bg-white dark:bg-white/10 text-orange-600 dark:text-orange-400 shadow-lg" : "text-slate-500 dark:text-slate-400 hover:text-foreground"}`}
                            >
                                {t("詳細", "DETAILS")}
                            </button>
                        </div>

                        <button
                            onClick={handleShare}
                            className="p-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-amber-500/10 transition-all text-foreground"
                        >
                            {/* Arrow-curve-up icon */}
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="relative group/summary mt-2">
                    <div className="absolute -left-5 top-0 bottom-0 w-1.5 bg-gradient-to-b from-amber-500/50 to-transparent rounded-full opacity-30 group-hover/summary:opacity-100 transition-opacity"></div>
                    {summaryContent}
                </div>
            </div>
        </article>
    );
}
