'use client';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import Image from "next/image";
import { useState } from "react";

export default function Home() {
    const t = useTranslations('Home');
    const ct = useTranslations('Common');
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
                            {t("subtitle")}
                        </p>
                        <p className="text-base text-slate-500 max-w-2xl mx-auto leading-relaxed">
                            {t("description")}
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
                            {t("newsTitle")}
                        </h2>
                        <p className="text-base text-slate-600 leading-relaxed">
                            {t("newsDesc")}
                        </p>
                        <div className="pt-2">
                            <Link
                                href="/news"
                                className="inline-block px-10 py-4 bg-sky-600 text-white font-black text-sm uppercase tracking-widest rounded-lg hover:bg-sky-700 transition-colors shadow-lg shadow-sky-600/10"
                            >
                                {ct("viewMore")}
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
                            {t("papersTitle")}
                        </h2>
                        <p className="text-base text-slate-600 leading-relaxed">
                            {t("papersDesc")}
                        </p>
                        <div className="pt-2">
                            <Link
                                href="/papers"
                                className="inline-block px-10 py-4 bg-sky-600 text-white font-black text-sm uppercase tracking-widest rounded-lg hover:bg-sky-700 transition-colors shadow-lg shadow-sky-600/10"
                            >
                                {ct("viewMore")}
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
                            {t("searchTitle")}<br />
                            <span className="text-sky-600">{t("searchSubtitle")}</span>
                        </h2>
                        <p className="text-base text-slate-600 leading-relaxed">
                            {t("searchDesc")}
                        </p>

                        <form onSubmit={handleQuickSearch} className="flex flex-col sm:flex-row gap-3 pt-2">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={ct("searchPlaceholder")}
                                className="flex-1 h-14 px-6 bg-white border border-slate-200 rounded-lg text-base font-medium outline-none focus:border-sky-600 transition-colors placeholder:text-slate-400"
                            />
                            <button
                                type="submit"
                                className="h-14 px-10 bg-slate-900 text-white font-black text-sm uppercase tracking-widest rounded-lg hover:bg-sky-600 transition-colors shadow-xl shadow-slate-900/10 whitespace-nowrap"
                            >
                                {ct("search")}
                            </button>
                        </form>
                    </div>
                </div>
            </section>

            {/* 6. Bottom Summary Items */}
            <section className="bg-slate-50 py-24 px-6 border-t border-slate-100">
                <div className="max-w-6xl mx-auto space-y-16">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                        <h2 className="text-xl font-black tracking-[0.2em] text-slate-900 uppercase italic">
                            FEATURED STORIES
                        </h2>
                        <Link href="/news" className="text-xs font-black tracking-widest text-sky-600 hover:text-sky-700 uppercase">
                            {ct("viewMore")} &rarr;
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
                                        Next-Gen Insights into Clean Energy Revolution and AI.
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
