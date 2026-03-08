"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "./LanguageProvider";
import Image from "next/image";

export type NewsCardData = {
    id: string;
    title: string;
    source?: string | null;
    url?: string | null;
    published_at?: string | null;
    summary_general?: string | null;
    summary_expert?: string | null;
    image_url?: string | null;
    category?: string | null;
};

function formatDate(value?: string | null): string | null {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export function NewsCard({ news }: { news: NewsCardData }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [mode, setMode] = useState<"general" | "expert">("general");
    const { t } = useLanguage();
    const published = formatDate(news.published_at);

    const summary = useMemo(() => {
        if (mode === "general") return news.summary_general || t("要約がありません", "No summary available");
        return news.summary_expert || news.summary_general || t("要約がありません", "No summary available");
    }, [mode, news, t]);

    return (
        <article className="group flex flex-col bg-white overflow-hidden transition-all duration-500">
            {/* 1. Image Area (Nautilus style rectangular hero) */}
            <div
                className="relative aspect-[16/10] overflow-hidden cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {news.image_url ? (
                    <Image
                        src={news.image_url}
                        alt={news.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                ) : (
                    <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300">
                        NO IMAGE
                    </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-500"></div>
            </div>

            {/* 2. Content Area */}
            <div className="pt-6 space-y-3 pb-8">
                {/* Category Tag (Nautilus style small caps) */}
                {news.category && (
                    <div className="text-[10px] font-black tracking-[0.2em] text-cyan-600 uppercase italic">
                        {news.category}
                    </div>
                )}

                {/* Title (Bold, Sharp) */}
                <h2
                    className="text-2xl font-black tracking-tight text-slate-900 leading-[1.15] cursor-pointer hover:text-cyan-600 transition-colors"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    {news.title}
                </h2>

                {/* Short Metadata */}
                <div className="flex items-center gap-4 text-[9px] font-black text-slate-300 uppercase tracking-widest pt-1">
                    {news.source && <span>{news.source}</span>}
                    {published && <span>{published}</span>}
                </div>

                {/* 3. Expandable Summary Section */}
                <div className={`overflow-hidden transition-all duration-700 ease-in-out ${isExpanded ? 'max-h-[800px] opacity-100 mt-6' : 'max-h-0 opacity-0'}`}>
                    <div className="pt-6 border-t border-slate-100 space-y-6">
                        {/* Mode Toggle inside summary as requested? or simple switch */}
                        <div className="flex gap-4">
                            <button
                                onClick={() => setMode("general")}
                                className={`text-[10px] font-black tracking-widest uppercase ${mode === "general" ? "text-cyan-600 border-b-2 border-cyan-600" : "text-slate-300"}`}
                            >
                                {t("一般", "GENERAL")}
                            </button>
                            <button
                                onClick={() => setMode("expert")}
                                className={`text-[10px] font-black tracking-widest uppercase ${mode === "expert" ? "text-cyan-600 border-b-2 border-cyan-600" : "text-slate-300"}`}
                            >
                                {t("専門", "EXPERT")}
                            </button>
                        </div>

                        <div className="text-base leading-relaxed text-slate-700 font-medium whitespace-pre-wrap animate-in fade-in slide-in-from-top-2 duration-500">
                            {summary}
                        </div>

                        {news.url && (
                            <div className="pt-4">
                                <a
                                    href={news.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 text-[10px] font-black tracking-widest text-slate-900 hover:text-cyan-600 transition-colors uppercase border-b border-black hover:border-cyan-600 pb-1"
                                >
                                    {t("ソース元を読む", "READ ORIGINAL SOURCE")} &rarr;
                                </a>
                            </div>
                        )}
                    </div>
                </div>

                {/* Hint to expand if NOT expanded */}
                {!isExpanded && (
                    <button
                        onClick={() => setIsExpanded(true)}
                        className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-cyan-600 transition-colors flex items-center gap-2 pt-2"
                    >
                        {t("要約を読む", "READ SUMMARY")} <span className="text-lg leading-none">+</span>
                    </button>
                )}
            </div>
        </article>
    );
}
