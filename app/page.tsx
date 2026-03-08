"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

/**
 * Pocket Dive Home Page
 * 4 Vertical Banners for main functions
 */
export default function Home() {
    const { t } = useLanguage();

    const sections = [
        {
            title: t("最新科学ニュース", "Latest Science News"),
            desc: t("世界中で起きている「今」の科学をキャッチアップ。", "Dive into what's happening in the world of science right now."),
            btn: t("ニュースへダイブ", "Dive into News"),
            href: "/news",
            color: "from-amber-400 to-orange-600",
            icon: "🔥",
            tag: "UPDATED DAILY"
        },
        {
            title: t("新着論文", "New Research Papers"),
            desc: t("最先端の研究成果を、あなたに最適なカテゴリで。", "High-quality research across various categories selected for you."),
            btn: t("論文へダイブ", "Dive into Papers"),
            href: "/papers",
            color: "from-cyan-500 to-blue-600",
            icon: "📄",
            tag: "CURATED"
        },
        {
            title: t("AI検索", "Search with AI"),
            desc: t("読みたい論文を、AIが的確に見つけ出します。", "Let our AI find the exact research paper you're looking for."),
            btn: t("AIにまかせる", "Search with AI"),
            href: "/search",
            color: "from-indigo-500 to-purple-600",
            icon: "🧬",
            tag: "GEN AI"
        },
        {
            title: t("メルマガ（ニュースレター）登録", "Newsletter"),
            desc: t("毎週、厳選した科学の「徳」をメールでお届け。", "Weekly dose of scientific wisdom delivered straight to your inbox."),
            btn: t("購読を申し込む", "Subscribe"),
            href: "#newsletter",
            color: "from-slate-800 to-slate-950",
            icon: "📧",
            tag: "COMMUNITY"
        }
    ];

    return (
        <div className="min-h-screen bg-white">
            {/* Hero / Concept Section */}
            <section className="px-6 pt-20 pb-12 flex flex-col items-center text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-[10px] font-black tracking-widest text-slate-500 uppercase">
                    {t("ポケットから科学へダイブ", "DIVE INTO SCIENCE FROM YOUR POCKET")}
                </div>
                <h1 className="text-6xl sm:text-9xl font-black tracking-tighter uppercase leading-[0.8] text-slate-900 italic">
                    Pocket<br /><span className="text-cyan-600">Dive</span>
                </h1>
                <p className="max-w-xl text-lg font-bold text-slate-500 leading-tight">
                    {t("科学の「面白さ」をすべての人へ。最新ニュースと論文の要約プラットフォーム。", "Bringing the fascination of science to everyone. Your gateway to research and news.")}
                </p>
            </section>

            {/* Vertical Banners Grid */}
            <main className="max-w-5xl mx-auto px-6 pb-32 space-y-6">
                {sections.map((section, idx) => (
                    <Link
                        key={idx}
                        href={section.href}
                        id={section.href === "#newsletter" ? "newsletter-banner" : undefined}
                        className={`group relative block w-full overflow-hidden rounded-[2.5rem] bg-gradient-to-br ${section.color} p-8 sm:p-14 text-white shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98] animate-in slide-in-from-bottom duration-700`}
                        style={{ animationDelay: `${idx * 100}ms` }}
                    >
                        {/* Background Ornament */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:scale-125 transition-transform duration-700"></div>
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl"></div>

                        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-10">
                            <div className="space-y-4 text-center sm:text-left flex-1">
                                <span className="text-[10px] font-black tracking-[0.2em] bg-white/20 px-3 py-1 rounded-full uppercase">
                                    {section.tag}
                                </span>
                                <div className="flex flex-col gap-2">
                                    <h2 className="text-4xl sm:text-6xl font-black tracking-tighter uppercase leading-none italic">
                                        {section.title}
                                    </h2>
                                    <p className="max-w-md text-lg font-medium text-white/80 leading-tight">
                                        {section.desc}
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col items-center gap-6">
                                <div className="text-7xl sm:text-9xl group-hover:rotate-12 transition-transform duration-500 drop-shadow-xl">
                                    {section.icon}
                                </div>
                                <div className="px-8 py-4 rounded-full bg-white text-slate-900 font-black text-xs tracking-widest uppercase shadow-xl">
                                    {section.btn}
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}

                {/* Newsletter Form anchor point */}
                <div id="newsletter" className="pt-12 scroll-mt-24">
                    <div className="bg-slate-50 border border-slate-100 rounded-[3rem] p-10 sm:p-20 text-center space-y-8">
                        <div className="space-y-2">
                            <h3 className="text-3xl font-black uppercase tracking-tight">{t("最新の徳を、ダイレクトに。", "Subscribe for scientific wisdom.")}</h3>
                            <p className="text-slate-500 font-bold max-w-md mx-auto">{t("AIが厳選した最新の研究トピックを毎週月曜日にお届けします。", "Weekly curated research and news delivered directly to your inbox.")}</p>
                        </div>
                        <form className="max-w-md mx-auto flex flex-col sm:flex-row gap-3">
                            <input
                                type="email"
                                placeholder="EMAIL@EXAMPLE.COM"
                                className="flex-1 bg-white border border-slate-200 px-6 py-4 rounded-2xl font-black text-xs uppercase focus:border-cyan-500 transition-colors outline-none"
                                required
                            />
                            <button className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs tracking-widest uppercase hover:bg-cyan-600 transition-all">
                                {t("購読する", "SUBSCRIBE")}
                            </button>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
}
