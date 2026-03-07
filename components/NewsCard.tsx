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

    const shareOnX = () => {
        const text = encodeURIComponent(`${news.title} | Science News`);
        const url = encodeURIComponent(news.url || window.location.href);
        window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank');
    };

    const shareOnLine = () => {
        const url = encodeURIComponent(news.url || window.location.href);
        window.open(`https://social-plugins.line.me/lineit/share?url=${url}`, '_blank');
    };

    return (
        <article className="group relative rounded-[2.5rem] border border-slate-200 dark:border-white/5 bg-white/70 dark:bg-white/5 p-8 sm:p-10 backdrop-blur-md transition-all duration-500 hover:border-amber-500/30 dark:hover:border-amber-500/20 hover:shadow-[0_20px_50px_-20px_rgba(245,158,11,0.2)] overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-amber-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

            <div className="flex flex-col gap-8">
                <div className="flex flex-col-reverse lg:flex-row items-start justify-between gap-8">
                    <div className="min-w-0 flex-1 space-y-4">
                        <div className="flex items-center gap-3">
                            <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-[10px] font-black tracking-widest text-amber-600 dark:text-amber-400 uppercase border border-amber-500/20">
                                LATEST NEWS
                            </span>
                            <div className="h-px w-8 bg-slate-200 dark:bg-white/10"></div>
                            {news.source && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{news.source}</span>}
                            {published && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{published}</span>}
                        </div>

                        <h2 className="text-xl sm:text-2xl font-black leading-tight text-foreground tracking-tight line-clamp-3">
                            {news.url ? (
                                <a href={news.url} target="_blank" rel="noreferrer" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors drop-shadow-sm">
                                    {news.title}
                                </a>
                            ) : news.title}
                        </h2>
                    </div>

                    <div className="shrink-0 w-full sm:w-auto flex flex-col items-center sm:items-end gap-6">
                        <div className="inline-flex items-center rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-100/50 dark:bg-black/40 p-1.5 text-[10px] font-black tracking-widest uppercase shadow-inner backdrop-blur-md">
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

                        {/* Share Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={shareOnX}
                                className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-all text-foreground group/share"
                                title="Share on X"
                            >
                                <svg className="w-4 h-4 opacity-70 group-hover/share:opacity-100" fill="currentColor" viewBox="0 0 24 24"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932 6.064-6.932zm-1.294 19.497h2.039L6.482 3.239H4.293l13.314 17.411z" /></svg>
                            </button>
                            <button
                                onClick={shareOnLine}
                                className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-all text-[#06C755] group/share"
                                title="Share on LINE"
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 32 32"><path d="M26.7 13.5c-.1-5.1-4.7-9.3-10.2-9.3s-10.1 4.2-10.1 9.3c0 4.6 3.7 8.4 8.6 9.1.3 0 .8.2 1 .6l.3 1.5c.1.4 0 .9-.3 1.1-.1.1-.3.2-.5.2-.1 0-.3 0-.4-.1-1.1-.4-2.5-.9-2.5-.9-.4-.2-.8-.1-1.1.2s-.3.8-.1 1.1c.1.2 2.6 1 2.6 1 .3.1.6 0 .8-.1.6-.2 1.3-.8 1.4-1.7l.2-1.2h.1c5.2 0 9.4-4.2 9.4-9.3zM10.8 17H8.5c-.4 0-.7-.3-.7-.7v-5.6c0-.4.3-.7.7-.7s.7.3.7.7v4.9h1.6c.4 0 .7.3.7.7s-.3.7-.7.7zm4.2-.7c0 .4-.3.7-.7.7h-2.3c-.4 0-.7-.3-.7-.7v-5.6c0-.4.3-.7.7-.7s.7.3.7.7v5.6c.4 0 .7-.3.7-.7zm1.7 0c0 .4-.3.7-.7.7s-.7-.3-.7-.7v-5.6c0-.4.3-.7.7-.7s.7.3.7.7v5.6zm7.2 0h-2.3c-.4 0-.7-.3-.7-.7v-5.6c0-.4.3-.7.7-.7h2.3c.4 0 .7.3.7.7s-.3.7-.7.7h-1.6v1.4h1.6c.4 0 .7.3.7.7s-.3.7-.7.7h-1.6v1.4h1.6c.4 0 .7.3.7.7s-.3.7-.7.7z" /></svg>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="relative group/summary mt-2">
                    <div className="absolute -left-5 top-0 bottom-0 w-1.5 bg-gradient-to-b from-amber-500/50 to-transparent rounded-full opacity-30 group-hover/summary:opacity-100 transition-opacity"></div>
                    <p className="text-lg leading-relaxed text-slate-700 dark:text-slate-300 font-medium whitespace-pre-wrap transition-colors duration-300">
                        {summary}
                    </p>
                </div>
            </div>
        </article>
    );
}
