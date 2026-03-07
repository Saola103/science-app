"use client";

import { useEffect, useState } from "react";
import { PaperCard, type PaperCardData } from "@/components/PaperCard";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useLanguage } from "@/components/LanguageProvider";

export default function Home() {
    const { t } = useLanguage();
    const [papers, setPapers] = useState<PaperCardData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchLatest = async () => {
            setIsLoading(true);
            const supabase = getSupabaseClient();
            const { data, error } = await supabase
                .from("papers")
                .select("id, title, journal, url, published_at, summary, summary_general, summary_expert")
                .order("published_at", { ascending: false })
                .limit(10);

            if (!error && data) {
                setPapers(data);
            }
            setIsLoading(false);
        };

        fetchLatest();
    }, []);

    const newsItems = [
        {
            date: "2024-05-08",
            ja: "Google DeepMind、『AlphaFold 3』を発表。すべての生命分子の構造・相互作用を高精度に予測可能に",
            en: "Google DeepMind announces 'AlphaFold 3', predicting structures and interactions of all life molecules with unprecedented accuracy",
        },
        {
            date: "2024-03-22",
            ja: "AIによる意味検索機能を実装。Gemini 1.5 Flash を活用した高度な要約生成が利用可能になりました",
            en: "Semantic Search is now available. Advanced summaries powered by Gemini 1.5 Flash are now live.",
        },
        {
            date: "2023-01-11",
            ja: "ジェイムズ・ウェッブ宇宙望遠鏡（JWST）、太陽系外惑星の存在を初めて正式に確認",
            en: "James Webb Space Telescope (JWST) formally confirms the existence of an exoplanet for the first time",
        }
    ];

    return (
        <div className="min-h-screen text-slate-300 pb-32">
            <main className="mx-auto w-full max-w-5xl px-6 pt-16">
                {/* Welcome Section */}
                <section className="mb-16">
                    <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white drop-shadow-md">
                        {t("最新の科学を探求しよう", "Explore the forefront of science")}
                    </h1>
                    <p className="mt-4 text-xl sm:text-2xl text-slate-400 font-medium">
                        {t(
                            "ワンクリックで科学の世界へ。",
                            "Dive into the world of science with a single click."
                        )}
                    </p>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Main Content (Recent Papers) */}
                    <div className="lg:col-span-2">
                        <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
                            <h2 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-3">
                                <div className="w-1.5 h-6 bg-cyan-500 rounded-full"></div>
                                {t("最近の論文", "Recent Papers")}
                            </h2>
                        </div>

                        {isLoading ? (
                            <div className="flex justify-center py-24">
                                <div className="relative">
                                    <div className="w-12 h-12 rounded-full absolute border-4 border-slate-700"></div>
                                    <div className="w-12 h-12 rounded-full animate-spin absolute border-4 border-cyan-500 border-t-transparent"></div>
                                </div>
                            </div>
                        ) : papers.length === 0 ? (
                            <div className="py-24 text-center text-slate-500 bg-white/5 rounded-3xl border border-white/5">
                                {t("論文データがありません。", "No papers found.")}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-6">
                                {papers.map((paper) => (
                                    <PaperCard key={paper.id} paper={paper} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Sidebar (News) */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-28">
                            <div className="border border-white/10 bg-white/5 backdrop-blur-md rounded-[2rem] p-8 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-cyan-400">
                                        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 0 0 0-1.5h-3.75V6Z" clipRule="evenodd" />
                                    </svg>
                                    {t("科学ニュース", "Science News")}
                                </h2>
                                <ul className="flex flex-col gap-6">
                                    {newsItems.map((news, idx) => (
                                        <li key={idx} className="flex flex-col gap-1.5 p-4 rounded-xl hover:bg-white/5 transition border border-transparent hover:border-white/5">
                                            <span className="text-xs text-cyan-500 font-mono tracking-wider">{news.date}</span>
                                            <span className="text-sm font-medium text-slate-200 leading-relaxed">
                                                {t(news.ja, news.en)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
