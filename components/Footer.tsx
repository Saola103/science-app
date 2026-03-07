"use client";

import Link from "next/link";
import { useLanguage } from "./LanguageProvider";

export function Footer() {
    const { t } = useLanguage();

    return (
        <footer className="mt-20 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/20 py-16 transition-colors duration-300">
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
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                        {t(
                            "最先端の学術的な知見を、誰にでも分かりやすい形でお届けする科学情報プラットフォーム。",
                            "A science information platform that delivers cutting-edge academic insights in a form that is easy for everyone to understand."
                        )}
                    </p>
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
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                            </svg>
                            <span>contact@sciencepapers.app</span>
                        </li>
                        <li className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9s2.015-9 4.5-9m0 18c1.828 0 3.522-1.817 4.096-4.5m-8.192 0c.574 2.683 2.268 4.5 4.096 4.5M12 3c1.828 0 3.522 1.817 4.096 4.5m-8.192 0c.574-2.683 2.268-4.5 4.096-4.5" />
                            </svg>
                            <span>Tokyo, Japan</span>
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
                        <a href="#" className="p-3 rounded-2xl bg-slate-200 dark:bg-white/5 hover:bg-cyan-500/20 text-foreground transition-all">
                            <span className="sr-only">LinkedIn</span>
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
                        </a>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-6xl px-6 mt-16 pt-8 border-t border-slate-200 dark:border-white/5 flex flex-col sm:flex-row justify-between items-center gap-6">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 opacity-60">© 2026 Science Papers. All rights reserved.</p>
                <div className="flex gap-8 text-[10px] font-black tracking-widest uppercase text-slate-500 dark:text-slate-400 opacity-60">
                    <Link href="#" className="hover:text-cyan-500">{t("利用規約", "Terms")}</Link>
                    <Link href="#" className="hover:text-cyan-500">{t("プライバシー", "Privacy")}</Link>
                    <Link href="#" className="hover:text-cyan-500">{t("特定商取引法", "Legal")}</Link>
                </div>
            </div>
        </footer>
    );
}
