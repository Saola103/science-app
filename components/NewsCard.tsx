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
                        <div className="flex flex-col gap-2">
                            {bullets.map((b: string, i: number) => (
                                <div key={i} className="flex gap-4 items-start p-3 bg-neutral-50 rounded-lg border border-neutral-100">
                                    <span className="shrink-0 text-amber-600 font-black text-xs">0{i + 1}</span>
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
        <article className="pro-card shrink-0 w-[320px] sm:w-[380px] h-[520px] bg-white p-6 flex flex-col justify-between group">
            <div className="space-y-6">
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs-pro text-amber-600">News</span>
                        <button onClick={handleShare} className="p-1 hover:text-amber-600 transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" /></svg>
                        </button>
                    </div>
                    <h2 className="text-xl font-black leading-tight line-clamp-3 text-black group-hover:underline underline-offset-4 decoration-1">
                        {news.url ? <a href={news.url} target="_blank" rel="noreferrer">{news.title}</a> : news.title}
                    </h2>
                    <div className="flex gap-3 text-[10px] font-bold text-neutral-400 uppercase tracking-tighter">
                        {news.source && <span className="truncate max-w-[150px]">{news.source}</span>}
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
                        {t("解説", "SUMMARY")}
                    </button>
                    <button
                        onClick={() => setMode("expert")}
                        className={`py-3 text-[10px] font-black tracking-widest uppercase transition-all rounded-md ${mode === 'expert' ? 'bg-white text-black shadow-sm' : 'text-neutral-400 hover:text-black'}`}
                    >
                        {t("詳細", "DETAILS")}
                    </button>
                </div>
            </div>
        </article>
    );
}
