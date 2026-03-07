"use client";

import { useEffect, useState, useMemo } from "react";
import { PaperCard, type PaperCardData } from "@/components/PaperCard";
import { NewsCard, type NewsCardData } from "@/components/NewsCard";
import { useLanguage } from "@/components/LanguageProvider";
import { fetchLatestPapers } from "@/app/actions";

const CATEGORIES = [
    { id: "physics", ja: "物理学", en: "Physics", icon: "⚛️", sub: [{ id: "astrophysics", ja: "天体物理学", en: "Astrophysics" }, { id: "quantum", ja: "量子力学", en: "Quantum Mechanics" }, { id: "particle", ja: "素粒子物理学", en: "Particle Physics" }] },
    { id: "biology", ja: "生物学", en: "Biology", icon: "🧬", sub: [{ id: "genetics", ja: "遺伝学", en: "Genetics" }, { id: "neuroscience", ja: "神経科学", en: "Neuroscience" }, { id: "ecology", ja: "生態学", en: "Ecology" }] },
    { id: "computer_science", ja: "情報科学", en: "Computer Science", icon: "💻", sub: [{ id: "ai", ja: "人工知能 (AI)", en: "Artificial Intelligence" }, { id: "security", ja: "サイバーセキュリティ", en: "Cybersecurity" }, { id: "hci", ja: "ヒューマンコンピュータインタラクション", en: "HCI" }] },
    { id: "math", ja: "数学", en: "Mathematics", icon: "📐", sub: [{ id: "algebra", ja: "代数学", en: "Algebra" }, { id: "geometry", ja: "幾何学", en: "Geometry" }, { id: "statistics", ja: "統計学", en: "Statistics" }] },
    { id: "chemistry", ja: "化学", en: "Chemistry", icon: "🧪", sub: [{ id: "organic", ja: "有機化学", en: "Organic Chemistry" }, { id: "materials", ja: "材料科学", en: "Materials Science" }, { id: "biochem", ja: "生化学", en: "Biochemistry" }] }
];

const SCIENCE_NEWS: (NewsCardData & { tags: string[] })[] = [
    { id: "news-1", title: "Google DeepMind「AlphaFold 3」を発表 — 生命分子の全容解明へ", source: "Nature", url: "https://www.nature.com/articles/s41586-024-07487-w", published_at: "2024-05-08", summary_general: "AlphaFold 3は、タンパク質だけでなく、DNA、RNA、低分子リガンドなど、あらゆる生体分子の立体構造とそれらの相互作用を予測できる画期的なAIモデルです。これにより、新薬の開発や基本的な生命現象の理解が飛躍的に加速すると期待されています。", summary_expert: "AlphaFold 3は拡散ベースの生成モデルを採用し、タンパク質複合物、核酸、小分子、イオン、および修飾残基を高精度にモデリングします。従来のAF2が多重配列整列(MSA)に依存していたのに対し、AF3は原子レベルのポテンシャルを直接学習することで、リガンド結合部位などの予測精度を大幅に向上させました。", tags: ["biology", "biochem", "ai", "computer_science"] },
    { id: "news-2", title: "2024年ノーベル物理学賞 — AIの基礎を築いた二氏に", source: "Nobel Prize", url: "https://www.nobelprize.org/prizes/physics/2024/", published_at: "2024-10-08", summary_general: "今年のノーベル物理学賞は、現代のニューラルネットワークの基礎となる「ホップフィールド・ネットワーク」と「ボルツマンマシン」を開発したジョン・ホップフィールド氏とジェフリー・ヒントン氏に贈られました。物理学の視点が、現在のAI革命の種を蒔いたことが公式に認められた形です。", summary_expert: "Hopfieldはイジング模型などの統計物理学の概念を連想記憶モデルに導入し、Hintonはエネルギーベースの確率モデルであるボルツマンマシンを構築しました。これらは誤差逆伝播法の発展と並び、現代の深層学習の数学的・概念的フレームワークを決定づけた重要な研究成果です。", tags: ["physics", "ai", "computer_science"] },
    { id: "news-3", title: "Neuralink、ヒトへの脳インプラント埋め込みに成功", source: "Neuralink", url: "https://neuralink.com", published_at: "2024-01-30", summary_general: "Neuralink社は、四肢麻痺を持つ患者に脳インプラント「N1」を埋め込み、思考だけでコンピュータのマウスを操作することに成功しました。これは、脳と機械が直接対話する次世代の医療技術における重要な第一歩となります。", summary_expert: "N1インプラントは1024個の電極を持つ柔軟なスレッドを運動野に配置し、ニューロンのスパイク電位をリアルタイムでデコードします。低消費電力ICによるオンチップスパイクソートと、ワイヤレス給電・通信を実現しており、長期的な埋め込み安定性と高帯域幅のBCIとしての臨床評価が進められています。", tags: ["neuroscience", "biology", "hci"] },
    { id: "news-4", title: "Googleの量子チップ「Willow」、エラー訂正で新たな地平を拓く", source: "Google", url: "https://blog.google/technology/research/google-willow-quantum-chip/", published_at: "2024-12-09", summary_general: "Googleが発表した新しい量子チップ「Willow」は、量子計算最大の課題である「計算エラー」を、計算規模を大きくすることで逆に減らせることを実証しました。これにより、ついに実用的な量子コンピュータの実現が現実味を帯びてきました。", summary_expert: "Willowチップは、量子誤り訂正符号の一種であるサーフェスコードにおいて、スケール増大に伴うエラー抑制（Logical Errorの低減）に成功しました。これは耐故障性量子計算（Fault-Tolerant Quantum Computing）の実現に不可欠な特性であり、従来の超伝導方式における大きなマイルストーンとなります。", tags: ["physics", "quantum", "computer_science"] }
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
        const stored = localStorage.getItem("selectedCategory");
        if (!stored) setShowOnboarding(true);
        else setSelectedCategory(stored);
    }, []);

    useEffect(() => {
        if (selectedCategory === null) return;
        const load = async () => {
            setIsLoading(true);
            setError("");
            try {
                const data = await fetchLatestPapers(10);
                setPapers((data || []) as PaperCardData[]);
            } catch (err) {
                setError(t("データの取得に失敗しました。", "Failed to fetch data."));
            }
            setIsLoading(false);
        };
        load();
    }, [selectedCategory, t]);

    const handleFinalSelect = (id: string) => {
        localStorage.setItem("selectedCategory", id);
        setSelectedCategory(id);
        setShowOnboarding(false);
        setOnboardingStep(1);
    };

    const filteredNews = useMemo(() => {
        if (!selectedCategory || selectedCategory === "all") return SCIENCE_NEWS;
        return SCIENCE_NEWS.filter(news => news.tags.includes(selectedCategory) || (tempParentCategory && news.tags.includes(tempParentCategory)));
    }, [selectedCategory, tempParentCategory]);

    const categoryLabel = useMemo(() => {
        if (!selectedCategory || selectedCategory === "all") return t("すべて", "All Fields");
        const found = CATEGORIES.find(c => c.id === selectedCategory);
        if (found) return t(found.ja, found.en);
        for (const p of CATEGORIES) {
            const s = p.sub.find(sub => sub.id === selectedCategory);
            if (s) return `${t(p.ja, p.en)} / ${t(s.ja, s.en)}`;
        }
        return selectedCategory;
    }, [selectedCategory, t]);

    return (
        <div className="min-h-screen pb-32 transition-colors duration-500">
            {/* SearchGate/AlphaSignal Inspired Hero */}
            <section className="relative px-6 pt-24 pb-32 overflow-hidden">
                <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.1),transparent_70%)]"></div>
                <div className="mx-auto max-w-4xl text-center space-y-10">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-[10px] font-black tracking-[0.2em] text-cyan-600 dark:text-cyan-400 uppercase">
                        STAY ON TOP OF THE LATEST
                    </div>
                    <h1 className="text-5xl sm:text-7xl font-black tracking-tight text-foreground leading-[0.9]">
                        Discover the<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-600">Frontier of Science.</span>
                    </h1>
                    <p className="mx-auto max-w-2xl text-xl sm:text-2xl text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                        {t("AIが論文を高度に要約。高校生からエキスパートまで、知への最短ルートを。", "AI-powered summaries for everyone from students to researchers. The shortest path to knowledge.")}
                    </p>

                    <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-6">
                        <button
                            onClick={() => setShowOnboarding(true)}
                            className="px-10 py-5 rounded-2xl bg-foreground text-background font-black tracking-widest text-sm hover:scale-105 transition-all shadow-xl shadow-foreground/10"
                        >
                            {t("興味のある分野を変更", "CHANGE YOUR INTEREST")}
                        </button>
                        <div className="flex items-center gap-3 text-sm font-bold opacity-60">
                            <span className="w-8 h-px bg-slate-300 dark:bg-white/20"></span>
                            {t("現在:", "CURRENT:")} <span className="text-cyan-500 uppercase">{categoryLabel}</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Main Content Grid */}
            <div className="mx-auto max-w-7xl px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
                {/* News Column */}
                <section className="space-y-10">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-3xl">🗃️</div>
                            <h2 className="text-2xl font-black tracking-widest text-foreground uppercase">{t("最新ニュース", "Breaking News")}</h2>
                        </div>
                        <div className="text-[10px] font-black text-slate-400 tracking-widest uppercase">{filteredNews.length} UPDATES</div>
                    </div>
                    <div className="space-y-8">
                        {filteredNews.map(news => <NewsCard key={news.id} news={news} />)}
                    </div>
                </section>

                {/* Papers Column */}
                <section className="space-y-10">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-3xl">📄</div>
                            <h2 className="text-2xl font-black tracking-widest text-foreground uppercase">{t("注目論文", "Featured Papers")}</h2>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="py-24 flex flex-col items-center gap-6">
                            <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-xs font-black tracking-widest text-slate-500 uppercase animate-pulse">{t("学術データベースにアクセス中", "Accessing Database")}</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {papers.map(paper => <PaperCard key={paper.id} paper={paper} />)}
                        </div>
                    )}
                </section>
            </div>

            {/* Onboarding Overlay */}
            {showOnboarding && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/80 dark:bg-black/80 backdrop-blur-2xl p-6">
                    <div className="w-full max-w-3xl bg-white dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-[3rem] p-10 sm:p-20 shadow-2xl relative text-center">
                        {onboardingStep === 1 ? (
                            <div className="space-y-12">
                                <h2 className="text-4xl sm:text-5xl font-black text-foreground tracking-tight leading-none">
                                    {t("あなたの領域を選択してください", "Select Your Realm")}
                                </h2>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    <button onClick={() => handleFinalSelect("all")} className="p-8 rounded-3xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 hover:bg-cyan-500/10 hover:border-cyan-500/50 transition-all font-black text-xs tracking-widest uppercase">
                                        <div className="text-4xl mb-4">🏠</div> {t("すべて", "ALL")}
                                    </button>
                                    {CATEGORIES.map(cat => (
                                        <button key={cat.id} onClick={() => { setTempParentCategory(cat.id); setOnboardingStep(2); }} className="p-8 rounded-3xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 hover:bg-cyan-500/10 hover:border-cyan-500/50 transition-all font-black text-xs tracking-widest uppercase">
                                            <div className="text-4xl mb-4">{cat.icon}</div> {t(cat.ja, cat.en)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-12">
                                <button onClick={() => setOnboardingStep(1)} className="absolute top-10 left-10 text-xs font-black tracking-widest opacity-50 hover:opacity-100 transition-opacity">← {t("戻る", "BACK")}</button>
                                <h2 className="text-4xl sm:text-5xl font-black text-foreground">{t("専門分野を絞り込む", "Refine Field")}</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <button onClick={() => handleFinalSelect(tempParentCategory!)} className="p-8 rounded-3xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 hover:bg-cyan-500/10 font-bold uppercase tracking-widest text-sm">{t("すべて", "GENERAL")} {t(CATEGORIES.find(c => c.id === tempParentCategory)?.ja, "")}</button>
                                    {CATEGORIES.find(c => c.id === tempParentCategory)?.sub.map(s => (
                                        <button key={s.id} onClick={() => handleFinalSelect(s.id)} className="p-8 rounded-3xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 hover:bg-cyan-500/10 font-bold uppercase tracking-widest text-sm">{t(s.ja, s.en)}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
