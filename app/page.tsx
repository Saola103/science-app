"use client";

import { useEffect, useState, useMemo } from "react";
import { PaperCard, type PaperCardData } from "@/components/PaperCard";
import { NewsCard, type NewsCardData } from "@/components/NewsCard";
import { useLanguage } from "@/components/LanguageProvider";
import { fetchLatestPapers } from "@/app/actions";

const CATEGORIES = [
    { id: "physics", ja: "物理学", en: "Physics", icon: "⚛️" },
    { id: "biology", ja: "生物学", en: "Biology", icon: "🧬" },
    { id: "chemistry", ja: "化学", en: "Chemistry", icon: "🧪" },
    { id: "computer_science", ja: "情報科学", en: "Computer Science", icon: "💻" },
    { id: "neuroscience", ja: "神経科学", en: "Neuroscience", icon: "🧠" },
    { id: "medicine", ja: "医学", en: "Medicine", icon: "🏥" },
    { id: "math", ja: "数学", en: "Mathematics", icon: "📐" },
    { id: "astronomy", ja: "天文学", en: "Astronomy", icon: "🪐" },
    { id: "energy", ja: "エネルギー", en: "Energy", icon: "⚡" },
    { id: "environment", ja: "環境・生態", en: "Environment", icon: "🌱" }
];

const LATEST_NEWS_2026: (NewsCardData & { tags: string[] })[] = [
    {
        id: "news-2026-1",
        title: "核融合発電の商用化へ決定的な一歩 — 日本のベンチャーが世界初、定常運転100時間を達成",
        source: "Global Energy Review",
        url: "#",
        published_at: "2026-03-05",
        summary_general: "日本のスタートアップ企業が、小型トカマク型核融合炉において、商用化の指標とされる100時間の連続定常運転に世界で初めて成功しました。これにより、安価でクリーンな電力を無限に供給できる未来へ、大きく近づきました。",
        summary_expert: "高温超電導(HTS)磁石を用いた高ベータ運転において、プラズマの不安定性を克服し、非誘導的な電流駆動による100時間の定常燃焼を維持することに成功。炉心工学における磁気リミッタの熱負荷管理と、AIによるリアルタイムフィードバック制御の高度化が鍵となりました。",
        tags: ["physics", "energy", "environment"]
    },
    {
        id: "news-2026-2",
        title: "AIによる完全なタンパク質設計が可能に — 既存の生命体には存在しない「新機能酵素」をゼロから作成",
        source: "Synthetic Biology Today",
        url: "#",
        published_at: "2026-02-28",
        summary_general: "最新の生成AIが、自然界には存在しない新しい酵素の設計に成功しました。この酵素はプラスチックを数分で完全に分解する能力を持っており、深刻な海洋汚染問題の解決に革命的な役割を果たすと期待されています。",
        summary_expert: "拡散モデルを発展させた構造生成AIにより、特定の基質（PETおよび低密度ポリエチレン）に対する高い触媒活性を持つ新規フォールドをde novoで設計。実験的なX線結晶構造解析により、AIが予測した活性中心のアミノ酸配置が0.5オングストローム以下の精度で一致していることが確認されました。",
        tags: ["biology", "chemistry", "ai", "environment"]
    },
    {
        id: "news-2026-3",
        title: "脳情報の無線伝送、ついに光速に近い速度へ。神経インターフェースの「超高速化」に成功",
        source: "NeuroTech Chronicle",
        url: "#",
        published_at: "2026-01-15",
        summary_general: "埋め込み型の神経デバイスにおいて、数テラビットの脳データを低遅延で無線送信する技術が開発されました。これにより、義手や義足を自分自身の身体のように、全くタイムラグなく操作できるようになります。",
        summary_expert: "6G以降のテラヘルツ波通信技術と、脳表配置型の極低電力増幅回路を統合。1ミリ秒以下のエンド・ツー・エンド遅延で10,000チャンネル以上の高周波電位信号を同時伝送可能。スパイクソーティングをオンチップで並列処理することで、通信帯域を動的に最適化しています。",
        tags: ["neuroscience", "medicine", "ai"]
    }
];

export default function Home() {
    const { t } = useLanguage();
    const [papers, setPapers] = useState<PaperCardData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [newsletterEmail, setNewsletterEmail] = useState("");
    const [newsletterStatus, setNewsletterStatus] = useState<"idle" | "loading" | "success">("idle");

    useEffect(() => {
        const stored = localStorage.getItem("selectedCategories");
        if (!stored) {
            setShowOnboarding(true);
        } else {
            setSelectedCategories(JSON.parse(stored));
        }
    }, []);

    useEffect(() => {
        if (selectedCategories.length === 0 && !showOnboarding) return;

        const load = async () => {
            setIsLoading(true);
            setError("");
            try {
                const data = await fetchLatestPapers(5);
                setPapers((data || []) as PaperCardData[]);
            } catch (err) {
                setError(t("データの取得に失敗しました。", "Failed to fetch data."));
            }
            setIsLoading(false);
        };
        load();
    }, [selectedCategories, t, showOnboarding]);

    const toggleCategory = (id: string) => {
        if (id === "all") {
            setSelectedCategories(["all"]);
            return;
        }
        const next = selectedCategories.filter(c => c !== "all");
        if (next.includes(id)) {
            setSelectedCategories(next.filter(c => c !== id));
        } else {
            setSelectedCategories([...next, id]);
        }
    };

    const saveOnboarding = () => {
        if (selectedCategories.length === 0) return;
        localStorage.setItem("selectedCategories", JSON.stringify(selectedCategories));
        setShowOnboarding(false);
    };

    const handleNewsletter = (e: React.FormEvent) => {
        e.preventDefault();
        setNewsletterStatus("loading");
        setTimeout(() => {
            setNewsletterStatus("success");
            setNewsletterEmail("");
        }, 1500);
    };

    const filteredNews = useMemo(() => {
        if (selectedCategories.includes("all") || selectedCategories.length === 0) return LATEST_NEWS_2026;
        return LATEST_NEWS_2026.filter(news =>
            news.tags.some(tag => selectedCategories.includes(tag))
        );
    }, [selectedCategories]);

    return (
        <div className="min-h-screen pb-32">
            {/* SearchGate/AlphaSignal Inspired Hero */}
            <section className="relative px-6 pt-24 pb-32 overflow-hidden">
                <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.1),transparent_70%)]"></div>
                <div className="mx-auto max-w-4xl text-center space-y-10">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-[10px] font-black tracking-[0.2em] text-cyan-600 dark:text-cyan-400 uppercase">
                        {t("最新の知を、リアルタイムで。", "ACCESS THE UNKNOWN IN REALTIME.")}
                    </div>
                    <h1 className="text-5xl sm:text-7xl font-black tracking-tight text-foreground leading-[0.9]">
                        Navigating the<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-600">Infinite Frontier.</span>
                    </h1>
                    <p className="mx-auto max-w-2xl text-xl sm:text-2xl text-slate-500 dark:text-slate-100 font-medium leading-relaxed">
                        {t("AIが科学を解き放つ。高校生からエキスパートまで、知への最短ルートを。", "AI-powered science democratization. The shortest path to knowledge for everyone.")}
                    </p>

                    <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-6">
                        <button
                            onClick={() => setShowOnboarding(true)}
                            className="px-10 py-5 rounded-2xl bg-foreground text-background font-black tracking-widest text-sm hover:scale-105 transition-all shadow-xl shadow-foreground/10"
                        >
                            {t("興味のある分野をカスタマイズ", "CUSTOMIZE YOUR INTEREST")}
                        </button>
                    </div>
                </div>
            </section>

            {/* Main Content Grid */}
            <div className="mx-auto max-w-7xl px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
                {/* News Column */}
                <section className="space-y-10">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 flex items-center justify-center text-3xl">🗃️</div>
                            <h2 className="text-2xl font-black tracking-widest text-foreground uppercase">{t("最新ニュース", "Breaking News 2026")}</h2>
                        </div>
                    </div>
                    <div className="space-y-8">
                        {filteredNews.map(news => <NewsCard key={news.id} news={news} />)}
                    </div>

                    {/* Newsletter Box */}
                    <div className="mt-16 p-8 sm:p-12 rounded-[2.5rem] bg-gradient-to-br from-cyan-600 to-blue-700 text-white shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
                        <div className="relative z-10 space-y-6">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-[10px] font-black tracking-widest uppercase mb-4">Newsletter</div>
                            <h3 className="text-3xl font-black leading-tight tracking-tight">{t("最新論文を、毎週メールで受け取る。", "Weekly digest delivered to your desk.")}</h3>
                            <p className="text-white/80 font-medium">{t("AIが厳選したあなたの興味に合う最新研究を、毎週月曜日にお届けします。", "AI-curated research items matching your interests, every Monday morning.")}</p>
                            <form onSubmit={handleNewsletter} className="flex flex-col sm:flex-row gap-3 pt-4">
                                <input
                                    type="email"
                                    value={newsletterEmail}
                                    onChange={(e) => setNewsletterEmail(e.target.value)}
                                    placeholder="email@example.com"
                                    required
                                    className="flex-1 px-6 py-4 rounded-xl bg-white/10 border border-white/20 placeholder-white/50 text-white focus:outline-none focus:bg-white/20 transition-all font-bold"
                                />
                                <button
                                    type="submit"
                                    disabled={newsletterStatus !== 'idle'}
                                    className="px-8 py-4 rounded-xl bg-white text-blue-700 font-black text-xs tracking-widest uppercase hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {newsletterStatus === 'loading' ? '...' : newsletterStatus === 'success' ? t("登録完了", "DONE") : t("購読する", "SUBSCRIBE")}
                                </button>
                            </form>
                            {newsletterStatus === 'success' && <p className="text-xs font-bold animate-pulse">{t("確認メールを送信しました。", "Confirmation email has been sent.")}</p>}
                        </div>
                    </div>
                </section>

                {/* Papers Column */}
                <section className="space-y-10">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 dark:bg-cyan-500/20 border border-cyan-500/20 flex items-center justify-center text-3xl">📄</div>
                            <h2 className="text-2xl font-black tracking-widest text-foreground uppercase">{t("注目論文", "Featured Papers")}</h2>
                        </div>
                        <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 tracking-widest uppercase">TOP 5 LATEST</div>
                    </div>

                    {isLoading ? (
                        <div className="py-24 flex flex-col items-center gap-6 text-foreground">
                            <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-xs font-black tracking-widest opacity-50 uppercase animate-pulse">{t("学術データベースにアクセス中", "Accessing Database")}</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {papers.map(paper => <PaperCard key={paper.id} paper={paper} />)}
                        </div>
                    )}
                </section>
            </div>

            {/* Multiple Choice Onboarding Overlay */}
            {showOnboarding && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/95 dark:bg-black/95 backdrop-blur-2xl p-6 overflow-y-auto">
                    <div className="w-full max-w-4xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-[3rem] p-8 sm:p-20 shadow-2xl text-center space-y-12">
                        <div className="space-y-4">
                            <h2 className="text-4xl sm:text-6xl font-black text-foreground tracking-tight leading-none group">
                                {t("あなたの領域を選択してください", "Select Your Realms")}
                            </h2>
                            <p className="text-slate-500 dark:text-slate-200 font-bold uppercase tracking-widest text-xs">
                                {t("複数選択可能です。", "You can select multiple fields to personalize your desk.")}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <button
                                onClick={() => toggleCategory("all")}
                                className={`p-6 sm:p-10 rounded-3xl border transition-all font-black text-[10px] tracking-widest uppercase group ${selectedCategories.includes("all")
                                        ? "bg-foreground text-background border-foreground shadow-2xl shadow-foreground/20"
                                        : "bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5 text-slate-500 dark:text-slate-300 hover:border-cyan-500/50"
                                    }`}
                            >
                                <div className={`text-4xl mb-4 transition-transform group-hover:scale-110`}>🌍</div>
                                {t("すべて", "ALL")}
                            </button>
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => toggleCategory(cat.id)}
                                    className={`p-6 sm:p-10 rounded-3xl border transition-all font-black text-[10px] tracking-widest uppercase group ${selectedCategories.includes(cat.id)
                                            ? "bg-cyan-500 text-white border-cyan-500 shadow-2xl shadow-cyan-500/20"
                                            : "bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5 text-slate-500 dark:text-slate-300 hover:border-cyan-500/50"
                                        }`}
                                >
                                    <div className={`text-4xl mb-4 transition-transform group-hover:scale-110`}>{cat.icon}</div>
                                    {t(cat.ja, cat.en)}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={saveOnboarding}
                            disabled={selectedCategories.length === 0}
                            className="w-full max-w-sm py-6 rounded-2xl bg-foreground text-background font-black tracking-widest text-sm hover:scale-105 transition-all shadow-xl shadow-foreground/20 disabled:opacity-30 disabled:scale-100"
                        >
                            {t("この設定で開始する", "READY TO EXPLORE")}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
