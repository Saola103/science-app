"use client";

import { useEffect, useState, useMemo } from "react";
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

const SCIENCE_NEWS: (NewsCardData & { tags: string[] })[] = [
    {
        id: "news-1",
        title: "Google DeepMind「AlphaFold 3」を発表 — すべての生命分子の構造・相互作用を高精度に予測可能に",
        source: "Nature",
        url: "https://www.nature.com/articles/s41586-024-07487-w",
        published_at: "2024-05-08",
        summary_general: "Google DeepMindが開発したAlphaFold 3は、タンパク質だけでなくDNA・RNA・リガンドなどあらゆる生体分子の3D構造と相互作用を高精度に予測できるAIモデル。創薬や生命科学研究に革命をもたらすと期待されている。",
        summary_expert: "AlphaFold 3は、拡散ベースのアーキテクチャを採用し、タンパク質、核酸、小分子、イオン、および修飾残基を含む広範な生体分子系の構造予測を可能にした。従来のAF2と比較し、タンパク質-リガンド相互作用や核酸構造の予測精度が大幅に向上しており、物理学的なポテンシャル学習とデータ駆動型アプローチを高度に融合させている。",
        tags: ["biology", "biochem", "ai", "computer_science"]
    },
    {
        id: "news-2",
        title: "2024年ノーベル物理学賞 — 人工ニューラルネットワークによる機械学習の基盤的発見に授与",
        source: "Nobel Prize",
        url: "https://www.nobelprize.org/prizes/physics/2024/",
        published_at: "2024-10-08",
        summary_general: "ジョン・ホップフィールドとジェフリー・ヒントンが受賞。ホップフィールドネットワークとボルツマンマシンという、現代の深層学習の礎となった発見が評価された。物理学賞がAI研究に与えられたのは異例。",
        summary_expert: "John Hopfieldは、物理学におけるスピン系の統計力学を応用し、連想記憶を実現するHopfieldネットワークを提唱した。一方、Geoffrey Hintonは統計物理学のエネルギーベースモデルを拡張し、多層的な特徴抽出を可能にする Boltzmannマシンを開発。これらの研究は、現在の生成AIや深層学習の数学的・概念的基盤を形成している。",
        tags: ["physics", "ai", "computer_science"]
    },
    {
        id: "news-3",
        title: "Neuralink、初のヒト被験者への脳インプラント埋め込みに成功",
        source: "Neuralink Blog",
        url: "https://neuralink.com",
        published_at: "2024-01-30",
        summary_general: "イーロン・マスク率いるNeuralinkが、初めて人間の脳にブレイン・コンピュータ・インターフェース（BCI）チップを埋め込むことに成功。四肢麻痺の患者が思考だけでデバイスを操作できるようになることを目指す。",
        summary_expert: "Neuralinkの「N1」インプラントは、1024個の電極を持つ極薄のリード線を運動野に埋め込み、ニューロンのスパイク電位をリアルタイムでデジタル信号に変換する。低消費電力のカスタムASICによるオンチップ処理と無線充電・通信を実現しており、高帯域幅の双方向脳コンピュータインターフェースとしての臨床的有効性が注目されている。",
        tags: ["neuroscience", "biology", "hci"]
    },
    {
        id: "news-4",
        title: "Google、量子コンピュータチップ「Willow」を発表 — エラー訂正で飛躍的性能向上",
        source: "Google Research",
        url: "https://blog.google/technology/research/google-willow-quantum-chip/",
        published_at: "2024-12-09",
        summary_general: "Googleの最新量子チップ「Willow」は、量子ビット数を増やすほどエラー率が下がるという量子誤り訂正のブレイクスルーを達成。従来のスーパーコンピュータで10の25乗年かかる計算を5分未満で実行できる。",
        summary_expert: "GoogleのWillowチップは、サーフェスコードを用いた量子誤り訂正において、システムのサイズ拡大（スケーリング）に伴いエラー抑制能力が向上することを示す限界閾値を超えた。これにより、実用的な耐故障性量子コンピュータの実現に向けた最大の物理的障壁の一つを突破したと言える。",
        tags: ["physics", "quantum", "computer_science"]
    },
    {
        id: "news-5",
        title: "ジェイムズ・ウェッブ宇宙望遠鏡、初期宇宙に巨大なブラックホールを発見",
        source: "NASA",
        url: "https://www.nasa.gov",
        published_at: "2024-03-20",
        summary_general: "JWSTの観測により、ビッグバンからわずか数億年後の初期宇宙に、予想を遥かに超える巨大なブラックホールが存在していたことが判明。宇宙の進化の謎を解く大きな手がかりになると期待されている。",
        summary_expert: "JWSTのNIRSpec観測により、赤方偏移z>10の銀河において、すでに太陽質量の数百万倍から数千万倍に達する超巨大ブラックホールの存在が確認された。これは初期宇宙におけるブラックホールの「種」の急成長メカニズムに関する、従来の直接崩壊モデルや超大質量星モデルを再考させる重要な発見である。",
        tags: ["astrophysics", "physics"]
    }
];

export default function Home() {
    const { t } = useLanguage();
    const [papers, setPapers] = useState<PaperCardData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [showOnboarding, setShowOnboarding] = useState(false);

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
                // Fetch papers - prioritize showing real data
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

    const clearCategory = () => {
        localStorage.removeItem("selectedCategory");
        setSelectedCategory(null);
        setShowOnboarding(true);
    };

    const filteredNews = useMemo(() => {
        if (!selectedCategory || selectedCategory === "all") return SCIENCE_NEWS;
        return SCIENCE_NEWS.filter(news => news.tags.includes(selectedCategory) || news.tags.includes(tempParentCategory || ""));
    }, [selectedCategory, tempParentCategory]);

    const categoryLabel = useMemo(() => {
        if (!selectedCategory || selectedCategory === "all") return t("すべて", "All Fields");
        const found = CATEGORIES.find(c => c.id === selectedCategory);
        if (found) return t(found.ja, found.en);
        for (const parent of CATEGORIES) {
            const sub = parent.sub.find(s => s.id === selectedCategory);
            if (sub) return `${t(parent.ja, parent.en)} > ${t(sub.ja, sub.en)}`;
        }
        return selectedCategory;
    }, [selectedCategory, t]);

    return (
        <div className="min-h-screen text-slate-300 pb-32 selection:bg-cyan-500/30">
            {/* Onboarding Overlay */}
            {showOnboarding && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-6">
                    <div className="w-full max-w-3xl bg-[#030712]/90 border border-white/10 rounded-[2.5rem] p-8 sm:p-12 shadow-[0_0_80px_rgba(34,211,238,0.2)] relative text-center flex flex-col items-center overflow-hidden">
                        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-purple-500/10 blur-[100px] rounded-full pointer-events-none"></div>

                        {onboardingStep === 1 ? (
                            <>
                                <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 text-xs font-bold text-cyan-400 tracking-widest uppercase">
                                    Personalize Your Experience
                                </div>
                                <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4 relative z-10 leading-tight">
                                    {t("興味のある分野は？", "Discover What Matters to You")}
                                </h2>
                                <p className="text-slate-400 mb-10 text-lg relative z-10 max-w-lg">
                                    {t("大きな分野を選んで、あなたに最適化された最新情報を手に入れましょう。", "Select a broad field to get personalized updates on the latest science.")}
                                </p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full relative z-10">
                                    <button
                                        onClick={() => handleSelectParent("all")}
                                        className="px-4 py-8 flex flex-col items-center justify-center gap-4 rounded-3xl border border-white/10 bg-white/5 hover:bg-cyan-500/20 hover:border-cyan-500/50 hover:text-cyan-300 transition-all group"
                                    >
                                        <div className="text-4xl transition-transform group-hover:scale-125 duration-300">🌍</div>
                                        <div className="font-bold text-lg">{t("すべて", "All fields")}</div>
                                    </button>
                                    {CATEGORIES.map((cat) => (
                                        <button
                                            key={cat.id}
                                            onClick={() => handleSelectParent(cat.id)}
                                            className="px-4 py-8 flex flex-col items-center justify-center gap-4 rounded-3xl border border-white/10 bg-white/5 hover:bg-cyan-500/20 hover:border-cyan-500/50 hover:text-cyan-300 transition-all group"
                                        >
                                            <div className="text-4xl transition-transform group-hover:scale-125 duration-300">{cat.icon}</div>
                                            <div className="font-bold text-lg">{t(cat.ja, cat.en)}</div>
                                        </button>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() => setOnboardingStep(1)}
                                    className="absolute top-8 left-8 text-slate-400 hover:text-white transition-colors flex items-center gap-2 font-medium"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                                    </svg>
                                    {t("戻る", "Back")}
                                </button>
                                <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4 relative z-10">
                                    {t("さらに詳しく！", "Dive Deeper")}
                                </h2>
                                <p className="text-slate-400 mb-10 text-lg relative z-10">
                                    {t("より具体的なトピックを選んでください。", "Choose a more specific topic to focus on.")}
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl relative z-10">
                                    <button
                                        onClick={() => handleFinalSelect(tempParentCategory!)}
                                        className="px-6 py-6 rounded-2xl border border-white/10 bg-white/5 hover:bg-cyan-500/20 hover:border-cyan-500/50 hover:text-cyan-300 transition-all font-bold text-xl"
                                    >
                                        {t("全体", "General")} {t(CATEGORIES.find(c => c.id === tempParentCategory)?.ja, CATEGORIES.find(c => c.id === tempParentCategory)?.en)}
                                    </button>
                                    {CATEGORIES.find(c => c.id === tempParentCategory)?.sub.map((sub) => (
                                        <button
                                            key={sub.id}
                                            onClick={() => handleFinalSelect(sub.id)}
                                            className="px-6 py-6 rounded-2xl border border-white/10 bg-white/5 hover:bg-cyan-500/20 hover:border-cyan-500/50 hover:text-cyan-300 transition-all font-bold text-xl"
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

            <main className="mx-auto w-full max-w-6xl px-6 pt-12">
                {/* Hero */}
                <section className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div className="max-w-xl">
                        <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/10 text-[10px] font-bold text-cyan-400 tracking-widest uppercase">
                            Science Information Platform
                        </div>
                        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
                            {t("最前線の知を、", "Cutting-edge Science,")} <br />
                            <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                                {t("すべての人に。", "For Everyone.")}
                            </span>
                        </h1>
                        <p className="mt-6 text-xl text-slate-400 font-medium leading-relaxed">
                            {t("AIが論文を要約。高校生から研究者まで、ワンクリックで最新の科学に触れられる場所。", "AI-summarized papers and news. A place where everyone from students to researchers can access the latest science.")}
                        </p>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                        <div className="flex items-center gap-3 px-6 py-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t("現在の分野", "Selected Field")}</span>
                            <span className="px-3 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold text-sm">
                                {categoryLabel}
                            </span>
                            <button
                                onClick={clearCategory}
                                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 transition-colors"
                                title={t("分野を変更", "Change Field")}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
                    {/* News Section */}
                    <section>
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(245,158,11,0.15)]">
                                🔬
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white tracking-tight">{t("最新ニュース", "Science News")}</h2>
                                <p className="text-sm text-slate-500 font-medium">{t("世界を揺るがす大きな発見", "Big discoveries shaking the world")}</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-6">
                            {filteredNews.length === 0 ? (
                                <div className="py-20 text-center text-slate-500 bg-white/5 rounded-3xl border border-white/5 border-dashed">
                                    {t("該当するニュースがありません。", "No news found for this field.")}
                                </div>
                            ) : (
                                filteredNews.map((news) => (
                                    <NewsCard key={news.id} news={news} />
                                ))
                            )}
                        </div>
                    </section>

                    {/* Papers Section */}
                    <section>
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(34,211,238,0.15)]">
                                📄
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white tracking-tight">{t("最新の論文", "Research Papers")}</h2>
                                <p className="text-sm text-slate-500 font-medium">{t("学術界の最新動向をチェック", "Latest trends in academia")}</p>
                            </div>
                        </div>

                        {error && (
                            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-100 mb-6 flex gap-3">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-red-400 shrink-0">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                                </svg>
                                {error}
                            </div>
                        )}

                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-24 gap-6">
                                <div className="relative">
                                    <div className="w-14 h-14 rounded-full absolute border-4 border-slate-800"></div>
                                    <div className="w-14 h-14 rounded-full animate-spin absolute border-4 border-cyan-500 border-t-transparent shadow-[0_0_15px_rgba(34,211,238,0.4)]"></div>
                                </div>
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">{t("論文をロード中...", "Loading Papers...")}</p>
                            </div>
                        ) : papers.length === 0 ? (
                            <div className="py-20 text-center text-slate-500 bg-white/5 rounded-3xl border border-white/5 border-dashed">
                                {t("論文データがありません。", "No papers found.")}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-6">
                                {papers.map((paper) => (
                                    <PaperCard key={paper.id} paper={paper} />
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
}
