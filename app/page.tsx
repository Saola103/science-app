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
        summary_general: "- 日本のスタートアップが核融合炉の100時間連続運転に成功\n- 安価でクリーンな電力を無限に提供できる可能性\n- 未来のエネルギー問題解決へ向けた歴史的一歩\n\n商用化の指標とされる100時間の連続定常運転に世界で初めて成功しました。これにより、安価でクリーンな電力を無限に供給できる未来へ、大きく近づきました。",
        summary_expert: "高温超電導(HTS)磁石を用いた高ベータ運転において、プラズマの不安定性を克服し、非誘導的な電流駆動による100時間の定常燃焼を維持することに成功。炉心工学における磁気リミッタの熱負荷管理と、AIによるリアルタイムフィードバック制御の高度化が鍵となりました。",
        tags: ["physics", "energy", "environment"]
    },
    {
        id: "news-2026-2",
        title: "AIによる完全なタンパク質設計が可能に — 既存の生命体には存在しない「新機能酵素」をゼロから作成",
        source: "Synthetic Biology Today",
        url: "#",
        published_at: "2026-02-28",
        summary_general: "- 生成AIが自然界に存在しない新しい酵素の設計に成功\n- 数分でプラスチックを完全に分解する能力を持つ\n- 海洋汚染問題の解決に革命的な役割を果たす期待\n\n最新の生成AIが、自然界には存在しない新しい酵素の設計に成功しました。実験により、AIが予測した活性中心のアミノ酸配置が極めて高い精度で一致していることが確認されました。",
        summary_expert: "拡散モデルを発展させた構造生成AIにより、特定の基質（PETおよび低密度ポリエチレン）に対する高い触媒活性を持つ新規フォールドをde novoで設計。実験的なX線結晶構造解析により精度が確認されました。",
        tags: ["biology", "chemistry", "ai", "environment"]
    }
];

export default function Home() {
    const { t } = useLanguage();
    const [papers, setPapers] = useState<PaperCardData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
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
            try {
                const data = await fetchLatestPapers(10, selectedCategories);
                setPapers((data || []) as PaperCardData[]);
            } catch (err) { }
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
        <div className="min-h-screen bg-white">
            {/* Minimal Pro Hero */}
            <section className="px-6 pt-20 pb-12 border-b border-neutral-100">
                <div className="mx-auto max-w-6xl">
                    <div className="flex flex-col gap-8">
                        <div className="text-xs-pro text-neutral-400">{t("科学の最前線を、あなたのデスクに。", "SCIENCE AT YOUR DESK.")}</div>
                        <h1 className="text-5xl sm:text-8xl font-black tracking-tighter leading-[0.85] uppercase">
                            Modern<br />
                            <span className="text-cyan-600">Research.</span>
                        </h1>
                        <p className="max-w-xl text-lg font-bold leading-tight text-neutral-500">
                            {t("AIが論文の深淵を解き明かす。高校生から専門家まで、全ての知への最短経路。", "Deciphering the depths of research with AI. The ultimate path to knowledge.")}
                        </p>
                    </div>
                </div>
            </section>

            {/* Horizontal Feed Sections */}
            <main className="py-12 space-y-24">

                {/* News Section */}
                <section className="space-y-8">
                    <div className="mx-auto max-w-6xl px-6 flex items-end justify-between">
                        <div className="space-y-1">
                            <div className="text-xs-pro text-amber-600">Flash</div>
                            <h2 className="text-3xl font-black uppercase tracking-tighter">{t("最新ニュース", "Breaking News")}</h2>
                        </div>
                        <div className="text-[10px] font-black text-neutral-300 uppercase tracking-widest">Scroll &rarr;</div>
                    </div>
                    <div className="flex gap-6 overflow-x-auto px-6 pb-8 hide-scrollbar snap-x">
                        <div className="flex-none w-[calc((100vw-min(1152px,100vw-48px))/2)] sm:block hidden"></div>
                        {filteredNews.map(news => (
                            <div key={news.id} className="snap-center">
                                <NewsCard news={news} />
                            </div>
                        ))}
                        <div className="flex-none w-12"></div>
                    </div>
                </section>

                {/* Papers Section */}
                <section className="space-y-8">
                    <div className="mx-auto max-w-6xl px-6 flex items-end justify-between">
                        <div className="space-y-1">
                            <div className="text-xs-pro text-cyan-600">Curation</div>
                            <h2 className="text-3xl font-black uppercase tracking-tighter">{t("注目論文", "Featured Papers")}</h2>
                        </div>
                        <div className="text-[10px] font-black text-neutral-300 uppercase tracking-widest">Scroll &rarr;</div>
                    </div>

                    {isLoading ? (
                        <div className="px-6 py-20 flex flex-col gap-4">
                            <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-xs-pro text-neutral-400">Syncing with Archive...</span>
                        </div>
                    ) : (
                        <div className="flex gap-6 overflow-x-auto px-6 pb-8 hide-scrollbar snap-x">
                            <div className="flex-none w-[calc((100vw-min(1152px,100vw-48px))/2)] sm:block hidden"></div>
                            {papers.length === 0 ? (
                                <div className="py-20 text-neutral-400 font-bold uppercase tracking-widest text-xs">No records found.</div>
                            ) : (
                                papers.map(paper => (
                                    <div key={paper.id} className="snap-center">
                                        <PaperCard paper={paper} />
                                    </div>
                                ))
                            )}
                            <div className="flex-none w-12"></div>
                        </div>
                    )}
                </section>

                {/* Newsletter (Bottom) */}
                <section className="mx-auto max-w-6xl px-6 pt-12">
                    <div className="bg-black text-white p-10 sm:p-20 rounded-[3rem] flex flex-col md:flex-row items-center gap-12 text-center md:text-left">
                        <div className="flex-1 space-y-6">
                            <div className="text-xs-pro text-cyan-400">Weekly Digest</div>
                            <h2 className="text-3xl sm:text-5xl font-black tracking-tighter leading-none uppercase">{t("最新論文を、毎週メールで受け取る。", "Research delivered to your inbox.")}</h2>
                            <p className="text-neutral-400 font-bold">{t("AIが厳選したあなたの興味に合う最新研究を、毎週月曜日にお届けします。", "AI-curated research items matching your interests, every Monday morning.")}</p>
                        </div>
                        <form onSubmit={handleNewsletter} className="w-full max-w-sm space-y-4">
                            <input
                                type="email"
                                value={newsletterEmail}
                                onChange={(e) => setNewsletterEmail(e.target.value)}
                                placeholder="EMAIL@EXAMPLE.COM"
                                className="w-full bg-neutral-900 border border-neutral-800 p-5 font-black text-xs tracking-widest uppercase focus:border-cyan-500 transition-colors"
                                required
                            />
                            <button
                                type="submit"
                                disabled={newsletterStatus !== 'idle'}
                                className="w-full bg-white text-black py-5 font-black text-xs tracking-widest uppercase hover:bg-cyan-500 hover:text-white transition-all disabled:opacity-50"
                            >
                                {newsletterStatus === 'loading' ? '...' : newsletterStatus === 'success' ? t("登録完了", "DONE") : t("購読する", "SUBSCRIBE")}
                            </button>
                        </form>
                    </div>
                </section>
            </main>

            {/* Multiple Choice Onboarding Overlay */}
            {showOnboarding && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white p-6 overflow-y-auto">
                    <div className="w-full max-w-4xl space-y-16">
                        <div className="space-y-4 text-center">
                            <div className="text-xs-pro text-cyan-600">Personalization</div>
                            <h2 className="text-4xl sm:text-7xl font-black tracking-tighter uppercase leading-none">
                                {t("あなたの領域を選択してください", "Select Your Realms")}
                            </h2>
                            <p className="text-neutral-400 font-bold uppercase tracking-widest text-[10px]">
                                {t("複数選択可能です。", "You can select multiple fields to personalize your desk.")}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                            <button
                                onClick={() => toggleCategory("all")}
                                className={`p-8 border transition-all font-black text-[10px] tracking-widest uppercase ${selectedCategories.includes("all")
                                        ? "bg-black text-white border-black"
                                        : "bg-white border-neutral-200 text-neutral-400 hover:border-black hover:text-black"
                                    }`}
                            >
                                {t("すべて", "ALL")}
                            </button>
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => toggleCategory(cat.id)}
                                    className={`p-8 border transition-all font-black text-[10px] tracking-widest uppercase ${selectedCategories.includes(cat.id)
                                            ? "bg-black text-white border-black"
                                            : "bg-white border-neutral-200 text-neutral-400 hover:border-black hover:text-black"
                                        }`}
                                >
                                    {t(cat.ja, cat.en)}
                                </button>
                            ))}
                        </div>

                        <div className="flex justify-center">
                            <button
                                onClick={saveOnboarding}
                                disabled={selectedCategories.length === 0}
                                className="w-full max-w-md py-6 bg-black text-white font-black tracking-widest text-xs uppercase hover:bg-cyan-600 transition-all disabled:opacity-10"
                            >
                                {t("この設定で開始する", "READY TO EXPLORE")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
