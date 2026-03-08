"use client";

import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "./LanguageProvider";

export function Footer() {
    const { t } = useLanguage();

    return (
        <footer className="bg-white border-t border-slate-100 py-24 pb-32 lg:pb-24">
            <div className="mx-auto max-w-7xl px-6 grid grid-cols-1 md:grid-cols-4 gap-16">

                {/* Brand Info */}
                <div className="space-y-6">
                    <Link href="/" className="group flex items-center gap-4">
                        <div className="relative w-11 h-11 flex-none rounded-2xl overflow-hidden shadow-md shadow-sky-600/10 bg-white border border-slate-100">
                            <Image
                                src="/logo.png"
                                alt="Pocket Dive Logo"
                                fill
                                className="object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                        </div>
                        <span className="text-xl font-black tracking-tighter text-slate-900 italic uppercase leading-none">
                            Pocket <span className="text-sky-600">Dive</span>
                        </span>
                    </Link>
                    <div className="space-y-4">
                        <p className="text-sm font-bold text-slate-500 leading-relaxed">
                            {t(
                                "ポケットから、身近な科学の世界へダイブできる。最新の知を、すべての人へ還元するためのプラットフォーム。",
                                "Diving into science from your pocket. A platform built to return the value of knowledge to everyone."
                            )}
                        </p>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                                Developed by Saola
                            </p>
                            <p className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter">
                                Logo design credit: Genspark AI
                            </p>
                        </div>
                    </div>
                </div>

                {/* Navigation Links */}
                <div className="space-y-6">
                    <h3 className="text-xs font-black tracking-[0.2em] text-slate-900 uppercase italic border-b border-slate-100 pb-2">{t("メニュー", "Menu")}</h3>
                    <ul className="space-y-4 text-[11px] font-black tracking-widest uppercase">
                        <li><Link href="/" className="text-slate-400 hover:text-sky-600 transition-colors">{t("ホーム", "Home")}</Link></li>
                        <li><Link href="/news" className="text-slate-400 hover:text-sky-600 transition-colors">{t("最新ニュース", "News")}</Link></li>
                        <li><Link href="/papers" className="text-slate-400 hover:text-sky-600 transition-colors">{t("最新論文", "Papers")}</Link></li>
                        <li><Link href="/search" className="text-slate-400 hover:text-sky-600 transition-colors">{t("AI検索", "AI Search")}</Link></li>
                        <li><Link href="/about" className="text-slate-400 hover:text-sky-600 transition-colors">{t("このアプリについて", "About")}</Link></li>
                    </ul>
                </div>

                {/* Contact Box */}
                <div className="space-y-6">
                    <h3 className="text-xs font-black tracking-[0.2em] text-slate-900 uppercase italic border-b border-slate-100 pb-2">{t("お問い合わせ", "Contact")}</h3>
                    <div className="space-y-4 font-bold text-sm text-slate-500">
                        <p className="hover:text-sky-600 transition-colors cursor-pointer">contact@saolams.com</p>
                        <p className="text-xs leading-relaxed text-slate-400 italic">
                            {t("プロダクトに関するフィードバックや提携については、上記アドレスよりお気軽にご連絡ください。", "For feedback or partnerships, feel free to contact us at the address above.")}
                        </p>
                    </div>
                </div>

                {/* Social Channels */}
                <div className="space-y-6">
                    <h3 className="text-xs font-black tracking-[0.2em] text-slate-900 uppercase italic border-b border-slate-100 pb-2">{t("公式SNS", "Social")}</h3>
                    <div className="flex gap-6">
                        {/* X Logo */}
                        <a href="https://x.com" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-slate-900 transition-all">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
                            </svg>
                        </a>
                        {/* FB Logo */}
                        <a href="https://facebook.com" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-sky-700 transition-all">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"></path>
                            </svg>
                        </a>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-7xl px-6 mt-20 pt-12 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">© 2026 Pocket Dive. All rights reserved.</p>
                <div className="flex gap-8 text-[10px] font-bold tracking-[0.2em] uppercase text-slate-300">
                    <Link href="/terms" className="hover:text-slate-900 transition-colors uppercase">{t("利用規約", "Terms")}</Link>
                    <Link href="/privacy" className="hover:text-slate-900 transition-colors uppercase">{t("プライバシー", "Privacy")}</Link>
                    <Link href="/legal" className="hover:text-slate-900 transition-colors uppercase">{t("特定商取引法", "Legal")}</Link>
                </div>
            </div>
        </footer>
    );
}
