"use client";

import { useEffect, useState, useMemo } from "react";
import { Link } from "../../../i18n/routing";
import { PaperCard, type PaperCardData } from "../../../components/PaperCard";
import { useTranslations } from "next-intl";
import { fetchLatestPapers } from "../../actions";
import { CATEGORIES_HIERARCHY } from "../../../lib/categories";

export default function PapersPage() {
    const t = useTranslations('Papers');
    const ct = useTranslations('Common');
    const [papers, setPapers] = useState<PaperCardData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedMinors, setSelectedMinors] = useState<string[]>([]);
    const [displayCount, setDisplayCount] = useState(6);
    const [activeMajor, setActiveMajor] = useState<string>(CATEGORIES_HIERARCHY[0].id);

    useEffect(() => {
        const stored = localStorage.getItem("selectedMinors");
        if (stored) setSelectedMinors(JSON.parse(stored));
    }, []);

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            try {
                const data = await fetchLatestPapers(50, selectedMinors);
                setPapers((data || []) as PaperCardData[]);
            } catch (err) { }
            setIsLoading(false);
        };
        load();
    }, [selectedMinors]);

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

    const displayedPapers = useMemo(() => papers.slice(0, displayCount), [papers, displayCount]);

    return (
        <div className="min-h-screen bg-white">
            <div className="mx-auto max-w-7xl px-6 py-12 flex flex-col lg:flex-row gap-12">

                {/* Sidebar (Desktop) / Filter Section */}
                <aside className="w-full lg:w-80 flex-none space-y-12">
                    <div className="space-y-4">
                        <Link href="/" className="inline-flex items-center gap-2 text-[10px] font-black tracking-widest text-slate-400 uppercase hover:text-black transition-colors">
                            &larr; {ct("backToHome")}
                        </Link>
                        <h1 className="text-4xl sm:text-6xl font-black tracking-tighter uppercase italic leading-none">{t("diveTitle")}</h1>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest leading-tight">
                            {t("diveSubtitle")}
                        </p>
                    </div>

                    <div className="space-y-10">
                        {/* Major Category Selection (Drill Down Step 1) */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black tracking-[0.2em] text-sky-600 uppercase italic">Step 1: Select Realm</h3>
                            <div className="grid grid-cols-1 gap-2">
                                {CATEGORIES_HIERARCHY.map(major => (
                                    <button
                                        key={major.id}
                                        onClick={() => setActiveMajor(major.id)}
                                        className={`w-full text-left px-6 py-4 rounded-2xl border transition-all font-black text-xs uppercase tracking-widest ${activeMajor === major.id
                                            ? "bg-slate-900 text-white border-slate-900 shadow-xl"
                                            : "bg-slate-50 border-slate-100 text-slate-400 hover:border-sky-500/30 hover:text-slate-900"
                                            }`}
                                    >
                                        {major.nameEn}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Minor Category Selection (Drill Down Step 2) */}
                        <div className="space-y-4 animate-in slide-in-from-left duration-500">
                            <h3 className="text-[10px] font-black tracking-[0.2em] text-sky-600 uppercase italic">Step 2: Choose Fields</h3>
                            <div className="flex flex-wrap gap-2">
                                {activeMajorData.minors.map(minor => (
                                    <button
                                        key={minor.id}
                                        onClick={() => toggleMinor(minor.id)}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-[11px] font-black uppercase tracking-wider ${selectedMinors.includes(minor.id)
                                            ? "bg-sky-600 text-white border-sky-600 shadow-md shadow-sky-600/20"
                                            : "bg-white border-slate-200 text-slate-500 hover:border-sky-500/30 hover:text-slate-900"
                                            }`}
                                    >
                                        <span className="text-lg">{minor.icon}</span>
                                        {minor.en}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 space-y-12">
                    {isLoading ? (
                        <div className="py-32 flex flex-col items-center gap-6">
                            <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-xs font-black tracking-widest text-slate-400 uppercase animate-pulse">Accessing Matrix...</span>
                        </div>
                    ) : (
                        <div className="space-y-12">
                            {displayedPapers.length === 0 ? (
                                <div className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                                    {t("noPapers")}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {displayedPapers.map(paper => <PaperCard key={paper.id} paper={paper} />)}
                                </div>
                            )}

                            {papers.length > displayCount && (
                                <div className="flex justify-center pt-8">
                                    <button
                                        onClick={() => setDisplayCount(prev => prev + 12)}
                                        className="px-12 py-5 rounded-2xl bg-slate-900 text-white font-black text-xs tracking-[0.2em] uppercase hover:bg-sky-600 hover:scale-105 transition-all shadow-xl shadow-slate-900/10"
                                    >
                                        {ct("viewMore")}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
