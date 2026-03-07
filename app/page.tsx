"use client";

import { useEffect, useState } from "react";
import { PaperCard, type PaperCardData } from "@/components/PaperCard";
import { useLanguage } from "@/components/LanguageProvider";
import { fetchLatestPapers } from "@/app/actions";

const CATEGORIES = [
    { id: "all", ja: "すべて", en: "All fields" },
    { id: "physics", ja: "物理学", en: "Physics" },
    { id: "biology", ja: "生物学", en: "Biology" },
    { id: "computer_science", ja: "計算機科学", en: "Computer Science" },
    { id: "medicine", ja: "医学", en: "Medicine" },
    { id: "chemistry", ja: "化学", en: "Chemistry" }
];

export default function Home() {
    const { t } = useLanguage();
    const [papers, setPapers] = useState<PaperCardData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [showOnboarding, setShowOnboarding] = useState(false);

    useEffect(() => {
        const storedCategory = localStorage.getItem("selectedCategory");
        if (!storedCategory) {
            setShowOnboarding(true);
        } else {
            setSelectedCategory(storedCategory);
        }
    }, []);

    useEffect(() => {
        if (selectedCategory === null) return;

        const fetchPapers = async () => {
            setIsLoading(true);
            try {
                if (selectedCategory === "all") {
                    const data = await fetchLatestPapers(10);
                    setPapers(data as PaperCardData[]);
                } else {
                    const categoryObj = CATEGORIES.find(c => c.id === selectedCategory);
                    const q = categoryObj ? categoryObj.ja : selectedCategory;
                    const res = await fetch("/api/search", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ query: `${q}の研究`, limit: 10 }),
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setPapers(data.papers || []);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch papers:", err);
            }
            setIsLoading(false);
        };

        fetchPapers();
    }, [selectedCategory]);

    const handleSelectCategory = (id: string) => {
        localStorage.setItem("selectedCategory", id);
        setSelectedCategory(id);
        setShowOnboarding(false);
    };

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
            {/* Onboarding Overlay */}
            {showOnboarding && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-6">
                    <div className="w-full max-w-2xl bg-[#030712]/90 border border-white/10 rounded-3xl p-8 sm:p-12 shadow-[0_0_50px_rgba(34,211,238,0.15)] relative overflow-hidden text-center">
                        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none"></div>

                        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
                            {t("あなたの興味は？", "What are you interested in?")}
                        </h2>
                        <p className="text-slate-400 mb-10 text-lg">
                            {t("興味のある分野を選ぶと、パーソナライズされた論文をお届けします。", "Select a field of interest to get personalized paper recommendations.")}
                        </p>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {CATEGORIES.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => handleSelectCategory(cat.id)}
                                    className="px-4 py-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-cyan-500/10 hover:border-cyan-500/50 hover:text-cyan-400 transition-all font-semibold text-lg"
                                >
                                    {t(cat.ja, cat.en)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <main className="mx-auto w-full max-w-5xl px-6 pt-16">
                {/* Welcome Section */}
                <section className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-16 gap-6">
                    <div>
                        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white drop-shadow-md">
                            {t("最新の科学を探求しよう", "Explore the forefront of science")}
                        </h1>
                        <p className="mt-4 text-xl sm:text-2xl text-slate-400 font-medium">
                            {t(
                                "ワンクリックで科学の世界へ。",
                                "Dive into the world of science with a single click."
                            )}
                        </p>
                    </div>
                    {selectedCategory && (
                        <button
                            onClick={() => setShowOnboarding(true)}
                            className="shrink-0 px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-sm font-medium transition-colors flex items-center gap-2"
                        >
                            <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                            {t("興味のある分野: ", "Interest: ")}
                            {t(CATEGORIES.find(c => c.id === selectedCategory)?.ja || "すべて", CATEGORIES.find(c => c.id === selectedCategory)?.en || "All")}
                        </button>
                    )}
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Main Content (Recent Papers) */}
                    <div className="lg:col-span-2">
                        <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
                            <h2 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-3">
                                <div className="w-1.5 h-6 bg-cyan-500 rounded-full"></div>
                                {selectedCategory === "all" ? t("最近の論文", "Recent Papers") : t("おすすめの論文", "Recommended Papers")}
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

                            {/* Editor's Pick or Tip */}
                            <div className="mt-8 border border-white/5 bg-cyan-950/20 rounded-[2rem] p-8 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-3xl"></div>
                                <h2 className="text-lg font-semibold text-cyan-400 mb-3">{t("💡 Tips", "💡 Tips")}</h2>
                                <p className="text-sm text-slate-400 leading-relaxed">
                                    {t("上部のナビゲーションから「AI検索」を使うと、自然言語でピンポイントな論文を探すことができます。AIが文脈を汲み取って回答します。", "Use 'AI Search' in the top navigation to find specific papers using natural language. The AI understands the context to deliver accurate results.")}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
