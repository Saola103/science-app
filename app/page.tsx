"use client";

import { useEffect, useState } from "react";
import { PaperCard, type PaperCardData } from "@/components/PaperCard";
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

// 分野ごとのニュース
const NEWS_BY_CATEGORY: Record<string, { date: string; ja: string; en: string }[]> = {
    all: [
        { date: "2024-10-10", ja: "2024年ノーベル化学賞、タンパク質設計とタンパク質構造予測の研究に授与", en: "2024 Nobel Prize in Chemistry awarded for protein design and protein structure prediction" },
        { date: "2024-10-08", ja: "2024年ノーベル物理学賞、人工ニューラルネットワークによる機械学習の基盤的発見に授与", en: "2024 Nobel Prize in Physics for foundational discoveries enabling machine learning with artificial neural networks" },
        { date: "2024-05-08", ja: "Google DeepMind『AlphaFold 3』を発表。生命分子の構造と相互作用を高精度に予測", en: "Google DeepMind announces AlphaFold 3, predicting structures and interactions of all life molecules" },
    ],
    physics: [
        { date: "2024-10-08", ja: "2024年ノーベル物理学賞、人工ニューラルネットワークによる機械学習を可能にした基盤的発見に授与", en: "2024 Nobel Prize in Physics for foundational discoveries enabling machine learning with artificial neural networks" },
        { date: "2024-04-10", ja: "CERN、大型ハドロン衝突型加速器(LHC) Run 3 で新たな粒子崩壊モードを観測", en: "CERN observes new particle decay modes in LHC Run 3" },
        { date: "2023-10-03", ja: "アト秒パルスの生成法の研究が2023年ノーベル物理学賞を受賞", en: "2023 Nobel Prize in Physics for attosecond pulse generation methods" },
    ],
    biology: [
        { date: "2024-10-07", ja: "2024年ノーベル生理学・医学賞、マイクロRNAの発見とその遺伝子制御メカニズムの解明に授与", en: "2024 Nobel Prize in Physiology or Medicine for the discovery of microRNA and its role in gene regulation" },
        { date: "2024-05-08", ja: "AlphaFold 3 が全生命分子のタンパク質構造予測を可能に", en: "AlphaFold 3 enables protein structure prediction for all life molecules" },
        { date: "2024-01-15", ja: "ヒトゲノムの完全解読から新たなテロメア領域の発見が報告される", en: "New telomere region discoveries reported from the complete human genome sequencing" },
    ],
    neuroscience: [
        { date: "2024-10-07", ja: "2024年ノーベル生理学・医学賞、マイクロRNAの発見が神経発生研究にも波及", en: "2024 Nobel Prize in Physiology or Medicine: microRNA discovery impacts neurodevelopment research" },
        { date: "2024-06-12", ja: "脳オルガノイドを用いた意識研究の倫理ガイドラインが国際学会で採択", en: "International ethics guidelines adopted for consciousness research using brain organoids" },
        { date: "2024-03-01", ja: "Neuralink、初のヒト被験者への脳インプラント埋め込みに成功と発表", en: "Neuralink announces successful first human brain implant" },
    ],
    computer_science: [
        { date: "2024-12-11", ja: "Google、量子コンピュータチップ「Willow」を発表。エラー訂正で飛躍的性能向上", en: "Google announces quantum computing chip 'Willow' with breakthrough error correction" },
        { date: "2024-10-08", ja: "2024年ノーベル物理学賞が機械学習の基盤技術に授与され、CS分野で話題に", en: "2024 Nobel Physics Prize for ML foundations sparks discussion in CS community" },
        { date: "2024-02-15", ja: "OpenAI Sora 発表、テキストから高品質動画を生成するAIモデル", en: "OpenAI announces Sora, an AI model generating high-quality videos from text" },
    ],
    math: [
        { date: "2024-07-01", ja: "フィールズ賞候補の研究がラングランズ予想の一部を解決と報告", en: "Fields Medal candidate research reportedly solves part of the Langlands conjecture" },
        { date: "2024-03-14", ja: "円周率の日：AIを活用した新たな円周率計算手法が105兆桁を達成", en: "Pi Day: New AI-powered computation method reaches 105 trillion digits of Pi" },
        { date: "2023-11-20", ja: "DeepMind AlphaGeometry、数学オリンピックレベルの幾何学問題を解くAIを開発", en: "DeepMind develops AlphaGeometry AI solving Math Olympiad geometry problems" },
    ],
    chemistry: [
        { date: "2024-10-10", ja: "2024年ノーベル化学賞、タンパク質設計と構造予測AI（AlphaFold等）の研究に授与", en: "2024 Nobel Prize in Chemistry for protein design and AI structure prediction (AlphaFold)" },
        { date: "2024-06-20", ja: "室温超伝導体の再現実験が複数の研究グループで進む", en: "Room-temperature superconductor replication experiments progress across multiple research groups" },
        { date: "2024-01-22", ja: "プラスチック分解酵素の改良型が開発され、循環型経済への期待が高まる", en: "Improved plastic-degrading enzymes developed, raising hopes for circular economy" },
    ],
};

function getNewsForCategory(categoryId: string) {
    if (categoryId === "all") return NEWS_BY_CATEGORY.all;
    // Check if direct match
    if (NEWS_BY_CATEGORY[categoryId]) return NEWS_BY_CATEGORY[categoryId];
    // Find parent category for sub-categories
    for (const cat of CATEGORIES) {
        for (const sub of cat.sub) {
            if (sub.id === categoryId) {
                return NEWS_BY_CATEGORY[cat.id] || NEWS_BY_CATEGORY.all;
            }
        }
    }
    return NEWS_BY_CATEGORY.all;
}

function getCategoryLabel(id: string): { ja: string; en: string } {
    if (id === "all") return { ja: "すべて", en: "All" };
    for (const cat of CATEGORIES) {
        if (cat.id === id) return { ja: cat.ja, en: cat.en };
        for (const sub of cat.sub) {
            if (sub.id === id) return { ja: sub.ja, en: sub.en };
        }
    }
    return { ja: "すべて", en: "All" };
}

export default function Home() {
    const { t } = useLanguage();
    const [papers, setPapers] = useState<PaperCardData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [showOnboarding, setShowOnboarding] = useState(false);

    // Onboarding UI state
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

        const fetchPapers = async () => {
            console.log("Fetching papers... category:", selectedCategory);
            setIsLoading(true);
            setError("");
            try {
                const data = await fetchLatestPapers(10);
                console.log("Data received:", data);
                setPapers(data as PaperCardData[]);
            } catch (err) {
                console.error("Failed to fetch papers:", err);
                setError(t("データの取得に失敗しました。", "Failed to fetch data."));
            }
            setIsLoading(false);
        };

        fetchPapers();
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

    const newsItems = getNewsForCategory(selectedCategory || "all");
    const catLabel = getCategoryLabel(selectedCategory || "all");

    return (
        <div className="min-h-screen pb-32">
            {/* Onboarding Overlay */}
            {showOnboarding && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/90 backdrop-blur-md p-6">
                    <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 shadow-2xl relative text-center flex flex-col items-center">
                        {onboardingStep === 1 ? (
                            <>
                                <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
                                    {t("興味のある分野は？", "What interests you?")}
                                </h2>
                                <p className="text-slate-500 mb-10 text-lg">
                                    {t("分野を選ぶと、関連する論文とニュースをお届けします。", "Select a field to get related papers and news.")}
                                </p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full">
                                    <button
                                        onClick={() => handleSelectParent("all")}
                                        className="px-4 py-6 flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-cyan-50 hover:border-cyan-300 transition-all font-semibold text-lg text-slate-700"
                                    >
                                        <div className="text-2xl">🌍</div>
                                        {t("すべて", "All fields")}
                                    </button>
                                    {CATEGORIES.map((cat) => (
                                        <button
                                            key={cat.id}
                                            onClick={() => handleSelectParent(cat.id)}
                                            className="px-4 py-6 flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-cyan-50 hover:border-cyan-300 transition-all font-semibold text-lg text-slate-700"
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
                                    className="absolute top-8 left-8 text-slate-400 hover:text-slate-900 transition-colors font-medium"
                                >
                                    ← {t("戻る", "Back")}
                                </button>
                                <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
                                    {t("さらに詳しく！", "More specifically!")}
                                </h2>
                                <p className="text-slate-500 mb-10 text-lg">
                                    {t("より具体的なトピックを選んでください。", "Choose a more specific topic.")}
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
                                    <button
                                        onClick={() => handleFinalSelect(tempParentCategory!)}
                                        className="px-4 py-5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-cyan-50 hover:border-cyan-300 transition-all font-semibold text-lg text-slate-700"
                                    >
                                        {t("全体", "General")} {t(CATEGORIES.find(c => c.id === tempParentCategory)?.ja, CATEGORIES.find(c => c.id === tempParentCategory)?.en)}
                                    </button>
                                    {CATEGORIES.find(c => c.id === tempParentCategory)?.sub.map((sub) => (
                                        <button
                                            key={sub.id}
                                            onClick={() => handleFinalSelect(sub.id)}
                                            className="px-4 py-5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-cyan-50 hover:border-cyan-300 transition-all font-semibold text-lg text-slate-700"
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

            <main className="mx-auto w-full max-w-5xl px-6 pt-12">
                {/* Welcome Section */}
                <section className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-12 gap-6">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
                            {t("最新の科学を探求しよう", "Explore the forefront of science")}
                        </h1>
                        <p className="mt-2 text-lg text-slate-500 font-medium">
                            {t("ワンクリックで科学の世界へ。", "Dive into the world of science with a single click.")}
                        </p>
                    </div>
                    {selectedCategory && (
                        <button
                            onClick={() => setShowOnboarding(true)}
                            className="shrink-0 px-4 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium transition-colors flex items-center gap-2 text-slate-700 shadow-sm"
                        >
                            <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                            {t("分野: ", "Field: ")}{t(catLabel.ja, catLabel.en)}
                        </button>
                    )}
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    {/* Main Content (Recent Papers) */}
                    <div className="lg:col-span-2">
                        <div className="flex items-center justify-between mb-6 border-b border-slate-200 pb-3">
                            <h2 className="text-xl font-semibold text-slate-900 tracking-tight flex items-center gap-3">
                                <div className="w-1 h-5 bg-cyan-500 rounded-full"></div>
                                {t("最近の論文", "Recent Papers")}
                            </h2>
                        </div>

                        {error && (
                            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 mb-6">
                                {error}
                            </div>
                        )}

                        {isLoading ? (
                            <div className="flex justify-center py-24">
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-full absolute border-4 border-slate-200"></div>
                                    <div className="w-10 h-10 rounded-full animate-spin absolute border-4 border-cyan-500 border-t-transparent"></div>
                                </div>
                            </div>
                        ) : papers.length === 0 ? (
                            <div className="py-20 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                                {t("論文データがありません。", "No papers found.")}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-5">
                                {papers.map((paper) => (
                                    <PaperCard key={paper.id} paper={paper} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-24 space-y-6">
                            {/* News */}
                            <div className="border border-slate-200 bg-white rounded-2xl p-6 shadow-sm">
                                <h2 className="text-lg font-bold text-slate-900 mb-5 flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-cyan-500">
                                        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 0 0 0-1.5h-3.75V6Z" clipRule="evenodd" />
                                    </svg>
                                    {t("科学ニュース", "Science News")}
                                </h2>
                                <ul className="flex flex-col gap-4">
                                    {newsItems.map((news, idx) => (
                                        <li key={idx} className="flex flex-col gap-1 p-3 rounded-xl hover:bg-slate-50 transition border border-transparent hover:border-slate-100">
                                            <span className="text-xs text-cyan-600 font-mono tracking-wider">{news.date}</span>
                                            <span className="text-sm font-medium text-slate-700 leading-relaxed">
                                                {t(news.ja, news.en)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Tips */}
                            <div className="border border-cyan-100 bg-cyan-50/50 rounded-2xl p-6">
                                <h2 className="text-base font-semibold text-cyan-700 mb-2">💡 {t("ヒント", "Tip")}</h2>
                                <p className="text-sm text-slate-600 leading-relaxed">
                                    {t(
                                        "上部の「AI検索」を使うと、自然言語でピンポイントな論文を探せます。例: 「脳の可塑性について知りたい」",
                                        "Use 'AI Search' in the navigation to find papers with natural language. e.g. 'I want to learn about brain plasticity'"
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
