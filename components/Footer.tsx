"use client";

import Link from "next/link";
import { useLanguage } from "./LanguageProvider";

export function Footer() {
    const { t } = useLanguage();

    return (
        <footer className="bg-white border-t border-neutral-200 py-20">
            <div className="mx-auto max-w-6xl px-6 grid grid-cols-1 md:grid-cols-4 gap-16">

                {/* Brand */}
                <div className="space-y-6">
                    <Link href="/" className="group">
                        <span className="text-xl font-black tracking-tighter text-black">
                            Science<span className="text-cyan-600">Papers</span>
                        </span>
                    </Link>
                    <div className="space-y-2">
                        <p className="text-[10px] font-black tracking-widest text-neutral-400 uppercase">
                            Developer: Saola
                        </p>
                        <p className="text-sm font-bold text-neutral-500 leading-tight">
                            {t(
                                "最先端の学術的な知見を、誰にでも分かりやすい形でお届けする。",
                                "Delivering cutting-edge insights to everyone, simply."
                            )}
                        </p>
                    </div>
                </div>

                {/* Links */}
                <div className="space-y-6">
                    <h3 className="text-xs-pro text-black">{t("ナビゲーション", "Navigation")}</h3>
                    <ul className="space-y-4 text-xs font-black tracking-widest uppercase">
                        <li><Link href="/" className="text-neutral-400 hover:text-black transition-colors">{t("ホーム", "Home")}</Link></li>
                        <li><Link href="/search" className="text-neutral-400 hover:text-black transition-colors">{t("AI検索", "AI Search")}</Link></li>
                        <li><Link href="/about" className="text-neutral-400 hover:text-black transition-colors">{t("プロジェクトについて", "About")}</Link></li>
                    </ul>
                </div>

                {/* Contact */}
                <div className="space-y-6">
                    <h3 className="text-xs-pro text-black">{t("連絡先", "Contact")}</h3>
                    <p className="text-sm font-bold text-neutral-500">contact@saolams.com</p>
                </div>

                {/* Social */}
                <div className="space-y-6">
                    <h3 className="text-xs-pro text-black">{t("SNS", "Social")}</h3>
                    <div className="flex gap-6 uppercase text-[10px] font-black tracking-widest">
                        <a href="#" className="text-neutral-400 hover:text-black">X</a>
                        <a href="#" className="text-neutral-400 hover:text-black">FB</a>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-6xl px-6 mt-20 pt-8 border-t border-neutral-100 flex flex-col sm:flex-row justify-between items-center gap-6">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-300">© 2026 Science Papers. All rights reserved.</p>
                <div className="flex gap-8 text-[9px] font-black tracking-[0.2em] uppercase text-neutral-300">
                    <Link href="/terms" className="hover:text-black">{t("利用規約", "Terms")}</Link>
                    <Link href="/privacy" className="hover:text-black">{t("プライバシー", "Privacy")}</Link>
                    <Link href="/legal" className="hover:text-black">{t("特定商取引法", "Legal")}</Link>
                </div>
            </div>
        </footer>
    );
}
