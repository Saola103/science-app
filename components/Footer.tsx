"use client";

import Link from "next/link";
import { useLanguage } from "./LanguageProvider";

export function Footer() {
    const { t } = useLanguage();

    return (
        <footer className="mt-20 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black py-16 transition-colors duration-300">
            <div className="mx-auto max-w-6xl px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
                <div className="md:col-span-1 space-y-6">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 group-hover:scale-110 transition-transform">
                            <span className="font-black text-xs">SP</span>
                        </div>
                        <span className="text-xl font-black tracking-tight text-foreground">
                            Science<span className="text-cyan-500">Papers</span>
                        </span>
                    </Link>
                    <div className="space-y-2">
                        <p className="text-sm text-slate-500 dark:text-slate-300 leading-relaxed font-bold">
                            {t("Developer: Saola", "Developer: Saola")}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                            {t(
                                "最先端の学術的な知見を、誰にでも分かりやすい形でお届けする科学情報プラットフォーム。",
                                "A science information platform that delivers cutting-edge insights to everyone."
                            )}
                        </p>
                    </div>
                </div>

                <div className="space-y-6">
                    <h3 className="text-xs font-black tracking-widest text-foreground uppercase opacity-80">{t("ナビゲーション", "Navigation")}</h3>
                    <ul className="space-y-4 text-sm font-bold">
                        <li><Link href="/" className="text-slate-500 dark:text-slate-400 hover:text-cyan-500 transition-colors uppercase">{t("ホーム", "Home")}</Link></li>
                        <li><Link href="/search" className="text-slate-500 dark:text-slate-400 hover:text-cyan-500 transition-colors uppercase">{t("AI検索", "AI Search")}</Link></li>
                        <li><Link href="/about" className="text-slate-500 dark:text-slate-400 hover:text-cyan-500 transition-colors uppercase">{t("プロジェクトについて", "About Project")}</Link></li>
                    </ul>
                </div>

                <div className="space-y-6">
                    <h3 className="text-xs font-black tracking-widest text-foreground uppercase opacity-80">{t("連絡先", "Contact")}</h3>
                    <ul className="space-y-4 text-sm font-bold">
                        <li className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-cyan-500">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                            </svg>
                            <span>contact@saolams.com</span>
                        </li>
                    </ul>
                </div>

                <div className="space-y-6">
                    <h3 className="text-xs font-black tracking-widest text-foreground uppercase opacity-80">{t("SNS", "Social")}</h3>
                    <div className="flex gap-4">
                        <a href="#" className="p-3 rounded-2xl bg-slate-200 dark:bg-white/5 hover:bg-cyan-500/20 text-foreground transition-all">
                            <span className="sr-only">X (Twitter)</span>
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932 6.064-6.932zm-1.294 19.497h2.039L6.482 3.239H4.293l13.314 17.411z" /></svg>
                        </a>
                        <a href="#" className="p-3 rounded-2xl bg-slate-200 dark:bg-white/5 hover:bg-blue-600/20 text-foreground transition-all">
                            <span className="sr-only">Facebook</span>
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" /></svg>
                        </a>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-6xl px-6 mt-16 pt-8 border-t border-slate-200 dark:border-white/5 flex flex-col sm:flex-row justify-between items-center gap-6">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 opacity-60">© 2026 Science Papers. All rights reserved.</p>
                <div className="flex gap-8 text-[10px] font-black tracking-widest uppercase text-slate-500 dark:text-slate-400 opacity-60">
                    <Link href="/terms" className="hover:text-cyan-500">{t("利用規約", "Terms")}</Link>
                    <Link href="/privacy" className="hover:text-cyan-500">{t("プライバシー", "Privacy")}</Link>
                    <Link href="/legal" className="hover:text-cyan-500">{t("特定商取引法", "Legal")}</Link>
                </div>
            </div>
        </footer>
    );
}
