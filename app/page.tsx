"use client";

import { useEffect, useState } from "react";
import { PaperCard, type PaperCardData } from "@/components/PaperCard";
import { NewsCard, type NewsCardData } from "@/components/NewsCard";
import { useLanguage } from "@/components/LanguageProvider";
import { fetchLatestPapers } from "@/app/actions";

const CATEGORIES = [
    {
        id: "physics",
        ja: "物理学",
        en: "Physics",
        icon: "⚛️",
        sub: [
            { id: "astrophysics", ja: "天体物理学", en: "Astrophysics" },
            { id: "quantum", ja: "量子力学", en: "Quantum Mechanics" },
            { id: "particle", ja: "素粒子物理学", en: "Particle Physics" }
        ]
    },
    {
        id: "biology",
        ja: "生物学",
        en: "Biology",
        icon: "🧬",
        sub: [
            { id: "genetics", ja: "遺伝学", en: "Genetics" },
            { id: "neuroscience", ja: "神経科学", en: "Neuroscience" },
            { id: "ecology", ja: "生態学", en: "Ecology" }
        ]
    },
    {
        id: "computer_science",
        ja: "情報科学",
        en: "Computer Science",
        icon: "💻",
        sub: [
            { id: "ai", ja: "人工知能 (AI)", en: "Artificial Intelligence" },
            { id: "security", ja: "サイバーセキュリティ", en: "Cybersecurity" },
            { id: "hci", ja: "ヒューマンコンピュータインタラクション", en: "HCI" }
        ]
    },
    {
        id: "math",
        ja: "数学",
        en: "Mathematics",
        icon: "📐",
        sub: [
            { id: "algebra", ja: "代数学", en: "Algebra" },
            { id: "geometry", ja: "幾何学", en: "Geometry" },
            { id: "statistics", ja: "統計学", en: "Statistics" }
        ]
    },
    {
        id: "chemistry",
        ja: "化学",
        en: "Chemistry",
        icon: "🧪",
        sub: [
            { id: "organic", ja: "有機化学", en: "Organic Chemistry" },
            { id: "materials", ja: "材料科学", en: "Materials Science" },
            { id: "biochem", ja: "生化学", en: "Biochemistry" }
        ]
    }
];

const SCIENCE_NEWS: NewsCardData[] = [
    {
        id: "news-1",
        title: "Google DeepMind「AlphaFold 3」を発表 — すべての生命分子の構造・相互作用を高精度に予測可能に",
        source: "Nature",
        url: "https://www.nature.com/articles/s41586-024-07487-w",
        published_at: "2024-05-08",
        summary_general: "Google DeepMindが開発したAlphaFold 3は、タンパク質だけでなくDNA・RNA・リガンドなどあらゆる生体分子の3D構造と相互作用を高精度に予測できるAIモデル。創薬や生命科学研究に革命をもたらすと期待されている。",
        summary_expert: "AlphaFold 3は、拡散ベースのアーキテクチャを採用し、タンパク質、核酸、小分子、イオン、および修飾残基を含む広範な生体分子系の構造予測を可能にした。従来のAF2と比較し、タンパク質-リガンド相互作用や核酸構造の予測精度が大幅に向上しており、物理学的なポテンシャル学習とデータ駆動型アプローチを高度に融合させている。",
    },
    {
        id: "news-2",
        title: "2024年ノーベル物理学賞 — 人工ニューラルネットワークによる機械学習の基盤的発見に授与",
        source: "Nobel Prize",
        url: "https://www.nobelprize.org/prizes/physics/2024/",
        published_at: "2024-10-08",
        summary_general: "ジョン・ホップフィールドとジェフリー・ヒントンが受賞。ホップフィールドネットワークとボルツマンマシンという、現代の深層学習の礎となった発見が評価された。物理学賞がAI研究に与えられたのは異例。",
        summary_expert: "John Hopfieldは、物理学におけるスピン系の統計力学を応用し、連想記憶を実現するHopfieldネットワークを提唱した。一方、Geoffrey Hintonは統計物理学のエネルギーベースモデルを拡張し、多層的な特徴抽出を可能にするBoltzmannマシンを開発。これらの研究は、現在の生成AIや深層学習の数学的・概念的基盤を形成している。",
    },
    {
        id: "news-3",
        title: "Neuralink、初のヒト被験者への脳インプラント埋め込みに成功",
        source: "Neuralink Blog",
        url: "https://neuralink.com",
        published_at: "2024-01-30",
        summary_general: "イーロン・マスク率いるNeuralinkが、初めて人間の脳にブレイン・コンピュータ・インターフェース（BCI）チップを埋め込むことに成功。四肢麻痺の患者が思考だけでデバイスを操作できるようになることを目指す。",
        summary_expert: "Neuralinkの「N1」インプラントは、1024個の電極を持つ極薄のリード線を運動野に埋め込み、ニューロンのスパイク電位をリアルタイムでデジタル信号に変換する。低消費電力のカスタムASICによるオンチップ処理と無線充電・通信を実現しており、高帯域幅の双方向脳コンピュータインターフェースとしての臨床的有効性が注目されている。",
    },
];

export default function Home() {
    const { t } = useLanguage();
    const [papers, setPapers] = useState<PaperCardData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [activeTab, setActiveTab] = useState<"papers" | "news">("papers");

    const [onboardingStep, setOnboardingStep] = useState<1 | 2>(1);
    const [tempParentCategory, setTempParentCategory] = useState<string | null>(null);

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

        const load = async () => {
            console.log("[Home] Fetching papers... category:", selectedCategory);
            setIsLoading(true);
            setError("");
            try {
                // Fetch papers - we might handle category filtering here if needed,
                // but let's prioritize showing real data first.
                const data = await fetchLatestPapers(10);
                console.log("[Home] Data received:", data?.length, "rows");
                setPapers((data || []) as PaperCardData[]);
            } catch (err) {
                console.error("[Home] Fetch error:", err);
                setError(t("データの取得に失敗しました。しばらくしてから再度お試しください。", "Failed to fetch data. Please try again later."));
            }
            setIsLoading(false);
        };
        load();
    }, [selectedCategory, t]);

    const handleSelectParent = (id: string) => {
        if (id === "all") {
            handleFinalSelect("all");
            return;
        }
        setTempParentCategory(id);
        setOnboardingStep(2);
    };

    const handleFinalSelect = (id: string) => {
        localStorage.setItem("selectedCategory", id);
        setSelectedCategory(id);
        setShowOnboarding(false);
        setOnboardingStep(1);
    };

    return (
        <div className="min-h-screen text-slate-300 pb-32">
            {/* Onboarding Overlay */}
            {showOnboarding && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-6">
                    <div className="w-full max-w-3xl bg-[#030712]/90 border border-white/10 rounded-3xl p-8 sm:p-12 shadow-[0_0_50px_rgba(34,211,238,0.15)] relative text-center flex flex-col items-center">
                        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none"></div>

                        {onboardingStep === 1 ? (
                            <>
                                <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4 relative z-10">
                                    {t("興味のある分野は？", "What is your main interest?")}
                                </h2>
                                <p className="text-slate-400 mb-10 text-lg relative z-10">
                                    {t("大きな分野を選んでください。", "Select a broad field.")}
                                </p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full relative z-10">
                                    <button
                                        onClick={() => handleSelectParent("all")}
                                        className="px-4 py-6 flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 hover:bg-cyan-500/10 hover:border-cyan-500/50 hover:text-cyan-400 transition-all font-semibold text-lg"
                                    >
                                        <div className="text-2xl">🌍</div>
                                        {t("すべて", "All fields")}
                                    </button>
                                    {CATEGORIES.map((cat) => (
                                        <button
                                            key={cat.id}
                                            onClick={() => handleSelectParent(cat.id)}
                                            className="px-4 py-6 flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 hover:bg-cyan-500/10 hover:border-cyan-500/50 hover:text-cyan-400 transition-all font-semibold text-lg"
                                        >
                                            <div className="text-2xl">{cat.icon}</div>
                                            {t(cat.ja, cat.en)}
                                        </button>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() => setOnboardingStep(1)}
                                    className="absolute top-8 left-8 text-slate-400 hover:text-white transition-colors"
                                >
                                    ← {t("戻る", "Back")}
                                </button>
                                <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4 relative z-10">
                                    {t("さらに詳しく！", "More specifically!")}
                                </h2>
                                <p className="text-slate-400 mb-10 text-lg relative z-10">
                                    {t("より具体的なトピックを選んでください。", "Choose a more specific topic.")}
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl relative z-10">
                                    <button
                                        onClick={() => handleFinalSelect(tempParentCategory!)}
                                        className="px-4 py-5 rounded-2xl border border-white/10 bg-white/5 hover:bg-cyan-500/10 hover:border-cyan-500/50 hover:text-cyan-400 transition-all font-semibold text-lg"
                                    >
                                        {t("全体", "General")} {t(CATEGORIES.find(c => c.id === tempParentCategory)?.ja, CATEGORIES.find(c => c.id === tempParentCategory)?.en)}
                                    </button>
                                    {CATEGORIES.find(c => c.id === tempParentCategory)?.sub.map((sub) => (
                                        <button
                                            key={sub.id}
                                            onClick={() => handleFinalSelect(sub.id)}
                                            className="px-4 py-5 rounded-2xl border border-white/10 bg-white/5 hover:bg-cyan-500/10 hover:border-cyan-500/50 hover:text-cyan-400 transition-all font-semibold text-lg"
                                        >
                                            {t(sub.ja, sub.en)}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            <main className="mx-auto w-full max-w-4xl px-6 pt-12">
                {/* Hero */}
                <section className="mb-12">
                    <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white drop-shadow-md">
                        {t("最新の科学を探求しよう", "Explore the forefront of science")}
                    </h1>
                    <p className="mt-4 text-xl text-slate-400 font-medium">
                        {t("ワンクリックで科学の世界へ。", "Dive into the world of science with a single click.")}
                    </p>
                </section>

                {/* Tab Switcher */}
                <div className="flex items-center gap-2 mb-8">
                    <button
                        onClick={() => setActiveTab("papers")}
                        className={`px-6 py-3 rounded-full text-sm font-bold transition-all duration-300 ${activeTab === "papers"
                            ? "bg-cyan-500 text-white shadow-[0_0_20px_rgba(34,211,238,0.3)]"
                            : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white"
                            }`}
                    >
                        📄 {t("最新の論文", "Latest Papers")}
                    </button>
                    <button
                        onClick={() => setActiveTab("news")}
                        className={`px-6 py-3 rounded-full text-sm font-bold transition-all duration-300 ${activeTab === "news"
                            ? "bg-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                            : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white"
                            }`}
                    >
                        🔬 {t("科学ニュース", "Science News")}
                    </button>
                </div>

                {/* Content */}
                {activeTab === "papers" ? (
                    <>
                        {error && (
                            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-400 mb-6">
                                {error}
                            </div>
                        )}
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
                    </>
                ) : (
                    <div className="flex flex-col gap-6">
                        {SCIENCE_NEWS.map((news) => (
                            <NewsCard key={news.id} news={news} />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
