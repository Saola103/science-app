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
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-2">
                            {bullets.map((b: string, i: number) => (
                                <div key={i} className="flex gap-4 items-start p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 transition-all">
                                    <span className="shrink-0 w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-black">{i + 1}</span>
                                    <p className="text-sm font-bold text-slate-800 leading-tight">{b.replace(/^- /, "")}</p>
                                </div>
                            ))}
                        </div>
                        {explanation && (
                            <p className="text-base leading-relaxed text-slate-600 font-medium whitespace-pre-wrap pt-4 border-t border-slate-100 italic">
                                {explanation}
                            </p>
                        )}
                    </div>
                );
            }
        }
        return (
            <p className="text-base leading-relaxed text-slate-700 font-medium whitespace-pre-wrap transition-colors duration-300">
                {summary}
            </p>
        );
    }, [summary, mode]);

    const handleShare = async () => {
        const url = news.url || window.location.href;
        if (navigator.share) {
            try {
                await navigator.share({ title: news.title, url });
            } catch (err) { }
        } else {
            navigator.clipboard.writeText(url);
            alert(t("URLをコピーしました", "URL copied to clipboard"));
        }
    };

    return (
        <article className="glass-card shrink-0 w-[300px] sm:w-[420px] h-[550px] rounded-[2.5rem] p-8 flex flex-col justify-between overflow-hidden relative group">
            <div className="space-y-6 overflow-y-auto hide-scrollbar flex-1 pb-6">
                <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-[10px] font-black tracking-widest text-amber-600 uppercase border border-amber-500/20">
                        News
                    </span>
                    <button onClick={handleShare} className="p-2 rounded-xl text-slate-300 hover:text-amber-500 hover:bg-slate-50 transition-all">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" /></svg>
                    </button>
                </div>

                <div className="space-y-3">
                    <h2 className="text-xl sm:text-2xl font-black leading-tight text-slate-900 tracking-tight group-hover:text-amber-600 transition-colors">
                        {news.url ? <a href={news.url} target="_blank" rel="noreferrer">{news.title}</a> : news.title}
                    </h2>
                    <div className="flex flex-wrap gap-4 text-[10px] font-black text-slate-400 tracking-widest uppercase">
                        {news.source && <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-slate-200"></span>{news.source}</span>}
                        {published && <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-slate-200"></span>{published}</span>}
                    </div>
                </div>

                <div className="relative mt-2">
                    {summaryContent}
                </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex-none">
                <div className="inline-flex w-full items-center rounded-2xl bg-slate-50 p-1.5 text-[10px] font-black tracking-widest uppercase shadow-inner border border-slate-100">
                    <button
                        onClick={() => setMode("general")}
                        className={`flex-1 rounded-xl py-3 transition-all duration-300 ${mode === "general" ? "bg-white text-amber-600 shadow-md" : "text-slate-400 hover:text-slate-900"}`}
                    >
                        {t("解説", "SUMMARY")}
                    </button>
                    <button
                        onClick={() => setMode("expert")}
                        className={`flex-1 rounded-xl py-3 transition-all duration-300 ${mode === "expert" ? "bg-white text-amber-600 shadow-md" : "text-slate-400 hover:text-slate-900"}`}
                    >
                        {t("詳細", "DETAILS")}
                    </button>
                </div>
            </div>

            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-amber-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </article>
    );
}
