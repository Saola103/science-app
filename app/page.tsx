"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";

/**
 * Pocket Dive Home Page - Full Renewal
 * Clean, structured, two-column layouts, alternating backgrounds.
 */
export default function Home() {
    const { t } = useLanguage();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");

    const handleQuickSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
        } else {
            router.push(`/search`);
        }
    };

    return (
        <div className="min-h-screen bg-white text-slate-900 leading-relaxed font-sans">

            {/* 1. Introduction Section (White) */}
            <section className="py-24 px-6 md:py-32">
                <div className="max-w-4xl mx-auto text-center space-y-8">
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-slate-900 leading-none italic uppercase">
                        POCKET <span className="text-sky-600">DIVE</span>
                    </h1>
                    <div className="space-y-6">
                        <p className="text-xl md:text-2xl font-bold text-slate-700 leading-tight">
                            {t("ポケットから、身近な科学の世界へダイブできる。", "Dive into the world of science right from your pocket.")}
                        </p>
                        <p className="text-base text-slate-500 max-w-2xl mx-auto leading-relaxed">
                            {t(
                                "「科学って難しそう」。そんな常識を、私たちは変えていきたい。最先端の研究や驚きのニュースを、わかりやすく、面白く、すべての人にお届けします。科学の「価値」をすべての人へ還元するために生まれたプラットフォームです。",
                                "Science shouldn't feel distant. Our mission is to transform complex academic research and breakthrough news into engaging, accessible insights for everyone. Built to bring the value of scientific discovery to all."
                            )}
                        </p>
                    </div>
                </div>
            </section>

            {/* 2. Latest News Section (Sky 50) */}
            <section className="bg-sky-50 py-24 px-6">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12 sm:gap-20">
                    <div className="flex-1 w-full aspect-video md:aspect-square relative rounded-2xl overflow-hidden shadow-sm">
                        <Image
                            src="https://picsum.photos/seed/tech/800/800"
                            alt="Science News"
                            fill
                            className="object-cover"
                        />
                    </div>
                    <div className="flex-1 space-y-6">
                        <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900">
                            {t("最新ニュース", "Latest News")}
                        </h2>
                        <p className="text-base text-slate-600 leading-relaxed">
                            {t(
                                "世界中で日々刻々と進化するテクノロジーや科学の「今」をキャッチしましょう。AIが要約したニュースで、効率的に知識をアップデート。",
                                "Catch up on the rapidly evolving world of technology and science. Get daily updates summarized by AI to keep your knowledge current and sharp."
                            )}
                        </p>
                        <div className="pt-2">
                            <Link
                                href="/news"
                                className="inline-block px-10 py-4 bg-sky-600 text-white font-black text-sm uppercase tracking-widest rounded-lg hover:bg-sky-700 transition-colors shadow-lg shadow-sky-600/10"
                            >
                                {t("全て見る", "VIEW ALL")}
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. Research Papers Section (White) */}
            <section className="bg-white py-24 px-6 border-b border-slate-50">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row-reverse items-center gap-12 sm:gap-20">
                    <div className="flex-1 w-full aspect-video md:aspect-square relative rounded-2xl overflow-hidden shadow-sm">
                        <Image
                            src="https://picsum.photos/seed/space/800/800"
                            alt="Research Papers"
                            fill
                            className="object-cover"
                        />
                    </div>
                    <div className="flex-1 space-y-6">
                        <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900">
                            {t("新着論文", "Research Papers")}
                        </h2>
                        <p className="text-base text-slate-600 leading-relaxed">
                            {t(
                                "arXivやPubMedから届く膨大な論文から、価値のある研究をセレクト。専門家向けと一般向けの二段階要約で、深い学びを提供します。",
                                "Selected high-impact research from clinical and academic sources. We provide dual-level summaries for both experts and curious beginners."
                            )}
                        </p>
                        <div className="pt-2">
                            <Link
                                href="/papers"
                                className="inline-block px-10 py-4 bg-sky-600 text-white font-black text-sm uppercase tracking-widest rounded-lg hover:bg-sky-700 transition-colors shadow-lg shadow-sky-600/10"
                            >
                                {t("全て見る", "VIEW ALL")}
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* 4. AI Search Section (Sky 50) */}
            <section className="bg-sky-50 py-24 px-6">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12 sm:gap-20">
                    <div className="flex-1 w-full aspect-video md:aspect-square relative rounded-2xl overflow-hidden shadow-sm">
                        <Image
                            src="https://picsum.photos/seed/ai/800/800"
                            alt="AI Integration"
                            fill
                            className="object-cover"
                        />
                    </div>
                    <div className="flex-1 space-y-8">
                        <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 leading-tight">
                            {t("知のリサーチを、", "Next Generation")}<br />
                            <span className="text-sky-600">{t("もっとダイレクトに。", "AI Search.")}</span>
                        </h2>
                        <p className="text-base text-slate-600 leading-relaxed">
                            {t(
                                "キーワード検索を超え、意味で論文を探す。AIへの問いかけが、あなたのリサーチの扉を開きます。膨大なアーカイブから瞬時に回答を見つけましょう。",
                                "Go beyond keywords. Search for papers by their meaning. Ask questions directly to our AI and get immediate academic insights from our complete archive."
                            )}
                        </p>

                        <form onSubmit={handleQuickSearch} className="flex flex-col sm:flex-row gap-3 pt-2">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t("キーワードや質問を入力...", "Search by theme or question...")}
                                className="flex-1 h-14 px-6 bg-white border border-slate-200 rounded-lg text-base font-medium outline-none focus:border-sky-600 transition-colors placeholder:text-slate-400"
                            />
                            <button
                                type="submit"
                                className="h-14 px-10 bg-slate-900 text-white font-black text-sm uppercase tracking-widest rounded-lg hover:bg-sky-600 transition-colors shadow-xl shadow-slate-900/10 whitespace-nowrap"
                            >
                                {t("検索", "SEARCH")}
                            </button>
                        </form>
                    </div>
                </div>
            </section>

            {/* 5. Newsletter Section (White with Divider) */}
            <div className="max-w-6xl mx-auto px-6">
                <hr className="border-slate-100" />
            </div>
            <section className="bg-white py-24 px-6 text-center">
                <div className="max-w-2xl mx-auto space-y-8">
                    <div className="space-y-4">
                        <h2 className="text-3xl font-black tracking-tight text-slate-900 uppercase">
                            {t("最新の知を、ダイレクトに。", "Stay Updated.")}
                        </h2>
                        <p className="text-base text-slate-500 font-bold leading-relaxed px-4">
                            {t(
                                "AIが厳選した最新の研究トピックや科学ニュースを、毎週月曜日にお届けします。",
                                "Receive weekly curated research topics and science news delivered manually by AI every Monday morning."
                            )}
                        </p>
                    </div>
                    <form className="flex flex-col sm:flex-row gap-3">
                        <input
                            type="email"
                            placeholder="EMAIL@EXAMPLE.COM"
                            className="flex-1 h-14 px-6 bg-slate-50 border border-slate-100 rounded-lg text-sm font-black uppercase outline-none focus:border-sky-600 focus:bg-white transition-all"
                            required
                        />
                        <button className="h-14 px-10 bg-sky-600 text-white font-black text-sm uppercase tracking-widest rounded-lg hover:bg-sky-700 transition-all shadow-lg shadow-sky-600/10">
                            {t("購読する", "SUBSCRIBE")}
                        </button>
                    </form>
                </div>
            </section>

            {/* 6. Bottom Summary Items */}
            <section className="bg-slate-50 py-24 px-6 border-t border-slate-100">
                <div className="max-w-6xl mx-auto space-y-16">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                        <h2 className="text-xl font-black tracking-[0.2em] text-slate-900 uppercase italic">
                            {t("ピックアップ", "Recommended Stories")}
                        </h2>
                        <Link href="/news" className="text-xs font-black tracking-widest text-sky-600 hover:text-sky-700 uppercase">
                            {t("全て見る", "View All")} &rarr;
                        </Link>
                    </div>

                    {/* Items Grid (Placeholder for real data) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="group space-y-4 cursor-pointer">
                                <div className="aspect-[16/10] bg-slate-200 rounded-xl overflow-hidden relative">
                                    <Image
                                        src={`https://picsum.photos/seed/item-${i}/600/400`}
                                        alt="item"
                                        fill
                                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="text-[10px] font-black tracking-[0.2em] text-sky-600 uppercase">SCIENCE FEATURE</div>
                                    <h3 className="text-lg font-black leading-snug group-hover:text-sky-600 transition-colors">
                                        {t("人工知能が予見する、次世代のクリーンエネルギー革命とその課題", "The AI Vision for Next-Gen Clean Energy Revolution and its Challenges.")}
                                    </h3>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

        </div>
    );
}
