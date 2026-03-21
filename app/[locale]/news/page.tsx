"use client";

import { useEffect, useState, useMemo } from "react";
import { Link } from "../../../i18n/routing";
import { NewsCard, type NewsCardData } from "../../../components/NewsCard";
import { useTranslations, useLocale } from "next-intl";
import { CATEGORIES_HIERARCHY } from "../../../lib/categories";
import { fetchLatestNews } from "../../actions";
import { AdBanner } from "../../../components/AdBanner";

// Fallback mock news displayed before the DB is populated
const MOCK_NEWS: NewsCardData[] = [
    {
        id: "news-2026-1",
        title: "核融合発電の商用化へ決定的な一歩 — 日本のベンチャーが定常運転100時間を達成",
        source: "Global Energy Review",
        url: "#",
        published_at: "2026-03-05",
        summary_general: "日本のスタートアップが核融合炉の100時間連続運転に成功しました。安価でクリーンな電力を無限に提供できる可能性があり、未来のエネルギー問題解決へ向けた歴史的な一歩です。",
        summary_expert: "高温超電導(HTS)磁石を用いた高ベータ運転において、プラズマの不安定性を克服し、非誘導的な電流駆動による100時間の定常燃焼を維持することに成功。",
        image_url: null,
        category: "PHYSICS",
    },
    {
        id: "news-2026-2",
        title: "AIによる完全なタンパク質設計が可能に — 自然界に存在しない新機能酵素をゼロから作成",
        source: "Synthetic Biology Today",
        url: "#",
        published_at: "2026-02-28",
        summary_general: "生成AIが自然界には存在しない新しい酵素の設計に成功しました。プラスチックを数分で完全分解できる能力を持ち、海洋汚染問題の解決に革命的な役割を果たす期待があります。",
        summary_expert: "拡散モデルを発展させた構造生成AIにより、特定の基質（PETおよび低密度ポリエチレン）に対する高い触媒活性を持つ新規フォールドをde novoで設計。",
        image_url: null,
        category: "GENETICS",
    },
    {
        id: "news-2026-3",
        title: "パナマのジャングルに巨大な野獣が闊歩していた先史時代の姿を復元",
        source: "Paleo World",
        url: "#",
        published_at: "2026-03-01",
        summary_general: "中米パナマで発見された巨大なナマケモノの化石から、先史時代の生態系を再構築。かつてここにはゾウほどの大きさの哺乳類が生息していたことが判明しました。",
        summary_expert: null,
        image_url: null,
        category: "PALEONTOLOGY",
    },
];

export default function NewsPage() {
    const t = useTranslations('News');
    const ct = useTranslations('Common');
    const locale = useLocale();
    const [selectedMinors, setSelectedMinors] = useState<string[]>([]);
    const [displayCount, setDisplayCount] = useState(6);
    const [activeMajor, setActiveMajor] = useState<string>(CATEGORIES_HIERARCHY[0].id);
    const [dbNews, setDbNews] = useState<NewsCardData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const stored = localStorage.getItem("selectedMinors");
        if (stored) setSelectedMinors(JSON.parse(stored));
    }, []);

    useEffect(() => {
        fetchLatestNews(30)
            .then((data) => setDbNews(data))
            .catch(() => setDbNews([]))
            .finally(() => setIsLoading(false));
    }, []);

    const toggleMinor = (id: string) => {
        const next = selectedMinors.includes(id)
            ? selectedMinors.filter(c => c !== id)
            : [...selectedMinors, id];
        setSelectedMinors(next);
        localStorage.setItem("selectedMinors", JSON.stringify(next));
        setDisplayCount(6);
    };

    const activeMajorData = useMemo(() =>
        CATEGORIES_HIERARCHY.find(m => m.id === activeMajor) || CATEGORIES_HIERARCHY[0],
        [activeMajor]);

    // Use DB news if available, otherwise fall back to mock data
    const allNews = dbNews.length > 0 ? dbNews : MOCK_NEWS;

    const filteredNews = useMemo(() => {
        if (selectedMinors.length === 0) return allNews;
        return allNews.filter(news =>
            selectedMinors.some(minor =>
                news.category?.toLowerCase().includes(minor.toLowerCase()) ||
                news.title?.toLowerCase().includes(minor.toLowerCase())
            )
        );
    }, [allNews, selectedMinors]);

    const displayedNews = useMemo(() => filteredNews.slice(0, displayCount), [filteredNews, displayCount]);

    return (
        <div className="min-h-screen bg-white">
            <div className="mx-auto max-w-7xl px-6 py-12 flex flex-col lg:flex-row gap-16">

                {/* 1. Sidebar */}
                <aside className="w-full lg:w-80 flex-none space-y-12">
                    <div className="space-y-4">
                        <Link href="/" className="inline-flex items-center gap-2 text-[10px] font-black tracking-widest text-slate-400 uppercase hover:text-black transition-colors">
                            &larr; {ct("backToHome")}
                        </Link>
                        <h1 className="text-4xl sm:text-6xl font-black tracking-tighter uppercase italic leading-none text-slate-900">{t("diveTitle")}</h1>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest leading-tight">
                            {t("diveSubtitle")}
                        </p>
                    </div>

                    <div className="space-y-10">
                        {/* Major Category */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black tracking-[0.2em] text-sky-600 uppercase italic">{t("step1")}</h3>
                            <div className="grid grid-cols-1 gap-2">
                                {CATEGORIES_HIERARCHY.map(major => (
                                    <button
                                        key={major.id}
                                        onClick={() => setActiveMajor(major.id)}
                                        className={`w-full text-left px-6 py-4 rounded-xl border transition-all font-black text-xs uppercase tracking-widest ${activeMajor === major.id
                                            ? "bg-slate-900 text-white border-slate-900"
                                            : "bg-slate-50 border-slate-100 text-slate-400 hover:border-sky-500/30 hover:text-slate-900"
                                            }`}
                                    >
                                        {locale === 'ja' ? major.nameJa : major.nameEn}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Minor Category */}
                        <div className="space-y-4 animate-in slide-in-from-left duration-500">
                            <h3 className="text-[10px] font-black tracking-[0.2em] text-sky-600 uppercase italic">{t("step2")}</h3>
                            <div className="flex flex-wrap gap-2">
                                {activeMajorData.minors.map(minor => (
                                    <button
                                        key={minor.id}
                                        onClick={() => toggleMinor(minor.id)}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-[11px] font-black uppercase tracking-wider ${selectedMinors.includes(minor.id)
                                            ? "bg-sky-500 text-white border-sky-500 shadow-md shadow-sky-500/20"
                                            : "bg-white border-slate-200 text-slate-500 hover:border-sky-500/30 hover:text-slate-900"
                                            }`}
                                    >
                                        <span className="text-base">{minor.icon}</span>
                                        {locale === 'ja' ? minor.ja : minor.en}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </aside>

                {/* 2. Main News Feed */}
                <main className="flex-1 space-y-20">
                    <header className="border-b-2 border-slate-900 pb-4">
                        <h2 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">
                            {t("latestStories")}
                        </h2>
                    </header>

                    {isLoading ? (
                        <div className="py-20 flex flex-col items-center gap-4">
                            <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs font-black tracking-widest text-slate-400 uppercase animate-pulse">
                                {locale === 'ja' ? '読み込み中...' : 'Loading...'}
                            </span>
                        </div>
                    ) : displayedNews.length === 0 ? (
                        <div className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                            {t("noNews")}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-x-12 gap-y-20">
                            {displayedNews.map(news => <NewsCard key={news.id} news={news} />)}
                        </div>
                    )}

                    {/* Ad Banner — displayed between news list and load more button */}
                    {displayedNews.length > 0 && (
                        <AdBanner
                            adSlot="1234567890"
                            adFormat="horizontal"
                            className="w-full my-4"
                            style={{ minHeight: 90 }}
                        />
                    )}

                    {filteredNews.length > displayCount && (
                        <div className="flex justify-center pt-8 border-t border-slate-100">
                            <button
                                onClick={() => setDisplayCount(prev => prev + 12)}
                                className="px-12 py-5 rounded-2xl bg-slate-900 text-white font-black text-xs tracking-[0.2em] uppercase hover:bg-sky-600 hover:scale-105 transition-all shadow-xl shadow-slate-900/10"
                            >
                                {ct("viewMore")}
                            </button>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
