"use client";

import { useMemo, useState } from "react";

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
    const published = formatDate(news.published_at);

    const summary = useMemo(() => {
        if (mode === "general") return news.summary_general || "要約がありません";
        return news.summary_expert || news.summary_general || "要約がありません";
    }, [mode, news]);

    return (
        <article className="group relative rounded-[2rem] border border-white/5 bg-white/5 p-6 sm:p-8 backdrop-blur-sm transition-all duration-300 hover:border-amber-500/30 hover:bg-white/10 hover:shadow-[0_0_30px_rgba(245,158,11,0.1)] overflow-hidden">
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"></div>

            <div className="flex flex-col-reverse items-start justify-between gap-6 sm:flex-row">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-semibold">
                            NEWS
                        </span>
                        {news.source && <span className="text-xs text-slate-500">{news.source}</span>}
                        {published && <span className="text-xs text-slate-500">{published}</span>}
                    </div>
                    <h2 className="text-pretty text-lg font-bold leading-relaxed text-white">
                        {news.url ? (
                            <a href={news.url} target="_blank" rel="noreferrer" className="hover:text-amber-400 transition-colors">
                                {news.title}
                            </a>
                        ) : news.title}
                    </h2>
                </div>
                <div className="shrink-0 self-end sm:self-start">
                    <div className="inline-flex items-center rounded-full border border-white/10 bg-black/40 p-1 text-xs font-medium text-slate-400 backdrop-blur shadow-inner">
                        <button
                            onClick={() => setMode("general")}
                            className={`rounded-full px-4 py-2 transition-all duration-300 ${mode === "general" ? "bg-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.3)]" : "hover:text-white hover:bg-white/5"}`}
                        >
                            一般向け
                        </button>
                        <button
                            onClick={() => setMode("expert")}
                            className={`rounded-full px-4 py-2 transition-all duration-300 ${mode === "expert" ? "bg-orange-600 text-white shadow-[0_0_15px_rgba(234,88,12,0.3)]" : "hover:text-white hover:bg-white/5"}`}
                        >
                            専門家向け
                        </button>
                    </div>
                </div>
            </div>

            <div className="mt-6 relative">
                <div className="absolute -left-3 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-500/50 to-transparent rounded-full opacity-50"></div>
                <p className="text-pretty text-[15px] leading-8 text-slate-300 whitespace-pre-wrap">
                    {summary}
                </p>
            </div>
        </article>
    );
}
