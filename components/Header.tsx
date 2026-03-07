"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "./LanguageProvider";
import { useState } from "react";

export function Header() {
    const pathname = usePathname();
    const { language, setLanguage, theme, toggleTheme, t } = useLanguage();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const navItems = [
        { name: t("ホーム", "Home"), href: "/" },
        { name: t("AI検索", "AI Search"), href: "/search" },
        { name: t("このアプリについて", "About"), href: "/about" },
    ];

    return (
        <header className="sticky top-0 z-50 border-b border-white/5 dark:border-white/5 bg-white/40 dark:bg-black/40 backdrop-blur-xl transition-colors duration-300">
            <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 relative">

                {/* Left: Menu Trigger */}
                <div className="flex-1 flex items-center justify-start gap-4">
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-white/5 text-foreground transition-all flex items-center gap-2 group border border-transparent hover:border-slate-300 dark:hover:border-white/10"
                    >
                        <div className="flex flex-col gap-1 w-5">
                            <span className={`h-0.5 w-full bg-foreground transition-all duration-300 ${isMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`}></span>
                            <span className={`h-0.5 w-full bg-foreground transition-opacity duration-300 ${isMenuOpen ? 'opacity-0' : ''}`}></span>
                            <span className={`h-0.5 w-full bg-foreground transition-all duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></span>
                        </div>
                        <span className="hidden sm:inline font-bold text-sm tracking-widest uppercase opacity-70 group-hover:opacity-100">{t("MENU", "MENU")}</span>
                    </button>
                </div>

                {/* Center: Logo */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 group-hover:scale-110 transition-transform">
                            <span className="font-black text-xs">SP</span>
                        </div>
                        <span className="text-xl font-black tracking-tight text-foreground hidden sm:inline">
                            Science<span className="text-cyan-500">Papers</span>
                        </span>
                    </Link>
                </div>

                {/* Right: Toggles */}
                <div className="flex-1 flex items-center justify-end gap-3 sm:gap-6">
                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-all text-foreground"
                        title={theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
                    >
                        {theme === 'dark' ? (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-amber-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M3 12h2.25m.386-6.364l1.591 1.591M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-indigo-600">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                            </svg>
                        )}
                    </button>

                    {/* Language Switcher */}
                    <div className="flex items-center rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100/50 dark:bg-white/5 p-1 text-[10px] font-bold tracking-widest text-slate-500 backdrop-blur-md">
                        <button
                            onClick={() => setLanguage("ja")}
                            className={`rounded-lg px-2.5 py-1.5 transition-all ${language === "ja" ? "bg-white dark:bg-white/10 text-cyan-600 dark:text-cyan-400 shadow-sm" : "hover:text-foreground"
                                }`}
                        >JA</button>
                        <button
                            onClick={() => setLanguage("en")}
                            className={`rounded-lg px-2.5 py-1.5 transition-all ${language === "en" ? "bg-white dark:bg-white/10 text-cyan-600 dark:text-cyan-400 shadow-sm" : "hover:text-foreground"
                                }`}
                        >EN</button>
                    </div>
                </div>
            </nav>

            {/* Dropdown Menu */}
            <div className={`overflow-hidden transition-all duration-500 ease-in-out border-b border-white/5 bg-slate-50/95 dark:bg-[#020617]/95 backdrop-blur-2xl ${isMenuOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="mx-auto max-w-6xl px-6 py-10 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center sm:text-left">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsMenuOpen(false)}
                            className={`group flex flex-col items-center sm:items-start gap-2 p-4 rounded-2xl hover:bg-slate-200 dark:hover:bg-white/5 transition-all ${pathname === item.href ? 'text-cyan-500' : 'text-slate-500 dark:text-slate-400'
                                }`}
                        >
                            <div className="text-sm font-black tracking-widest uppercase opacity-50 group-hover:opacity-100 group-hover:text-cyan-500">{t("BROWSE", "BROWSE")}</div>
                            <div className="text-2xl font-black text-foreground group-hover:text-cyan-500 transition-colors uppercase">{item.name}</div>
                        </Link>
                    ))}
                </div>
            </div>
        </header>
    );
}
