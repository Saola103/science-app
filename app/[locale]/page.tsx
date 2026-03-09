'use client';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from "../../i18n/routing";
import Image from "next/image";
import { useState } from "react";
import { Search, ArrowRight } from "lucide-react";

export default function Home() {
    const t = useTranslations('Home');
    const st = useTranslations('Search');
    const ct = useTranslations('Common');
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
        } else {
            router.push(`/search`);
        }
    };

    return (
        <div className="min-h-screen bg-white text-slate-900 leading-relaxed font-sans">

            {/* 1. Hero Section (White) */}
            <section className="relative pt-32 pb-24 px-6 md:pt-48 md:pb-40 overflow-hidden">
                <div className="max-w-5xl mx-auto text-center space-y-12 relative z-10">
                    <div className="space-y-6">
                        <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-slate-900 leading-none italic uppercase">
                            POCKET <span className="text-sky-600">DIVE</span>
                        </h1>
                        <p className="text-xl md:text-3xl font-bold text-slate-700 max-w-3xl mx-auto leading-tight">
                            {t("subtitle")}
                        </p>
                    </div>

                    <p className="text-base md:text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed font-medium">
                        {t("description")}
                    </p>

                    {/* Prominent Search Bar */}
                    <form onSubmit={handleSearch} className="max-w-2xl mx-auto relative group">
                        <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                            <Search className="w-5 h-5 text-slate-400 group-focus-within:text-sky-600 transition-colors" />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={ct("searchPlaceholder")}
                            className="w-full h-16 md:h-20 pl-16 pr-40 bg-white border-2 border-slate-100 rounded-2xl md:rounded-3xl text-lg font-bold outline-none focus:border-sky-600 focus:ring-4 focus:ring-sky-600/5 transition-all shadow-xl shadow-slate-200/40 placeholder:text-slate-400"
                        />
                        <button
                            type="submit"
                            className="absolute right-2 top-2 bottom-2 px-8 bg-slate-900 text-white font-black text-xs md:text-sm uppercase tracking-widest rounded-xl md:rounded-2xl hover:bg-sky-600 active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-slate-900/10"
                        >
                            {ct("search")}
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </form>
                </div>

                {/* Background Decor (Subtle) */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-sky-50 rounded-full blur-[120px] opacity-50 -z-0"></div>
            </section>

            {/* 2. Latest News Section (Sky 50) - Zig: Image Left, Text Right */}
            <section className="bg-sky-50 py-24 px-6 md:py-32">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-16 md:gap-24">
                    <div className="flex-1 w-full relative aspect-[4/3] rounded-[2.5rem] overflow-hidden shadow-2xl shadow-sky-900/5 border border-white/50">
                        <Image
                            src="https://picsum.photos/seed/science1/1200/900"
                            alt="Science News"
                            fill
                            className="object-cover hover:scale-105 transition-transform duration-1000"
                        />
                    </div>
                    <div className="flex-1 space-y-8 text-center md:text-left">
                        <div className="inline-block px-4 py-1.5 rounded-full bg-sky-600/10 text-sky-600 text-[10px] font-black tracking-[0.2em] uppercase">
                            Insights
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 leading-tight">
                            {t("newsTitle")}
                        </h2>
                        <p className="text-lg text-slate-600 leading-relaxed font-medium">
                            {t("newsDesc")}
                        </p>
                        <div className="pt-4">
                            <Link
                                href="/news"
                                className="group inline-flex items-center gap-3 text-sm font-black uppercase tracking-widest text-slate-900 hover:text-sky-600 transition-colors"
                            >
                                {ct("viewMore")}
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. Research Papers Section (White) - Zag: Text Left, Image Right */}
            <section className="bg-white py-24 px-6 md:py-32">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row-reverse items-center gap-16 md:gap-24">
                    <div className="flex-1 w-full relative aspect-[4/3] rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-900/5 border border-slate-100">
                        <Image
                            src="https://picsum.photos/seed/science2/1200/900"
                            alt="Research Papers"
                            fill
                            className="object-cover hover:scale-105 transition-transform duration-1000"
                        />
                    </div>
                    <div className="flex-1 space-y-8 text-center md:text-left">
                        <div className="inline-block px-4 py-1.5 rounded-full bg-slate-900/5 text-slate-500 text-[10px] font-black tracking-[0.2em] uppercase">
                            Academic
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 leading-tight">
                            {t("papersTitle")}
                        </h2>
                        <p className="text-lg text-slate-600 leading-relaxed font-medium">
                            {t("papersDesc")}
                        </p>
                        <div className="pt-4">
                            <Link
                                href="/papers"
                                className="group inline-flex items-center gap-3 text-sm font-black uppercase tracking-widest text-slate-900 hover:text-sky-600 transition-colors"
                            >
                                {ct("viewMore")}
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* 4. AI Search Concept Section (Sky 50) - Zig: Image Left, Text Right */}
            <section className="bg-sky-50 py-24 px-6 md:py-32">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-16 md:gap-24">
                    <div className="flex-1 w-full relative aspect-[4/3] rounded-[2.5rem] overflow-hidden shadow-2xl shadow-sky-900/5 border border-white/50">
                        <Image
                            src="https://picsum.photos/seed/science3/1200/900"
                            alt="AI Integration"
                            fill
                            className="object-cover hover:scale-105 transition-transform duration-1000"
                        />
                    </div>
                    <div className="flex-1 space-y-8 text-center md:text-left">
                        <div className="inline-block px-4 py-1.5 rounded-full bg-sky-600/10 text-sky-600 text-[10px] font-black tracking-[0.2em] uppercase">
                            Next-Gen
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 leading-tight">
                            {t("searchTitle")}<br />
                            <span className="text-sky-600">{t("searchSubtitle")}</span>
                        </h2>
                        <p className="text-lg text-slate-600 leading-relaxed font-medium">
                            {t("searchDesc")}
                        </p>
                        <div className="pt-4">
                            <Link
                                href="/search"
                                className="px-10 py-5 bg-slate-900 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:bg-sky-600 transition-all shadow-xl shadow-slate-900/20 active:scale-95"
                            >
                                {st("modeDeep")}
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* 5. Values / Philosophy (White) */}
            <section className="bg-white py-24 px-6 md:py-32 text-center border-t border-slate-50">
                <div className="max-w-4xl mx-auto space-y-12">
                    <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 uppercase italic">
                        Knowledge for <span className="text-sky-600">Everyone.</span>
                    </h2>
                    <p className="text-lg md:text-xl text-slate-500 font-bold leading-relaxed">
                        We believe that the frontier of human understanding should be accessible to all.
                        Pocket Dive bridges the gap between deep research and everyday curiosity.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8">
                        {[
                            { label: "Accuracy", value: "Verified data from arXiv & PubMed" },
                            { label: "Clarity", value: "AI-powered dual-level summaries" },
                            { label: "Speed", value: "Real-time updates on latest facts" }
                        ].map((item, i) => (
                            <div key={i} className="p-8 rounded-[2rem] bg-slate-50 border border-slate-100 space-y-3">
                                <div className="text-xs font-black tracking-widest text-sky-600 uppercase italic">{item.label}</div>
                                <div className="text-sm font-bold text-slate-900 leading-tight">{item.value}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

        </div>
    );
}

