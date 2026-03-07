"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "./LanguageProvider";
import { useState, useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";

export function Header() {
    const pathname = usePathname();
    const { language, setLanguage, theme, toggleTheme, t } = useLanguage();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const supabase = getSupabaseClient();
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUser(user);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const navItems = [
        { name: t("ホーム", "Home"), href: "/" },
        { name: t("AI検索", "AI Search"), href: "/search" },
        { name: t("このアプリについて", "About"), href: "/about" },
    ];

    return (
        <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl transition-all duration-300">
            <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

                {/* Left: Mobile Menu & Direct Links */}
                <div className="flex items-center gap-8 flex-1">
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="md:hidden p-2 rounded-xl text-foreground"
                    >
                        <div className="flex flex-col gap-1 w-5">
                            <span className={`h-0.5 w-full bg-current transition-all ${isMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`}></span>
                            <span className={`h-0.5 w-full bg-current ${isMenuOpen ? 'opacity-0' : ''}`}></span>
                            <span className={`h-0.5 w-full bg-current transition-all ${isMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></span>
                        </div>
                    </button>

                    {/* Desktop Direct Links */}
                    <div className="hidden md:flex items-center gap-8">
                        {navItems.slice(0, 3).map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`text-sm font-black tracking-widest uppercase transition-all hover:text-cyan-500 ${pathname === item.href ? "text-cyan-600 dark:text-cyan-400" : "text-slate-500 dark:text-slate-400"
                                    }`}
                            >
                                {item.name}
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Center: Logo */}
                <div className="flex flex-col items-center">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 group-hover:scale-110 transition-transform">
                            <span className="font-black text-xs">SP</span>
                        </div>
                        <span className="text-2xl font-black tracking-tight text-foreground hidden sm:inline">
                            Science<span className="text-cyan-500">Papers</span>
                        </span>
                    </Link>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center justify-end gap-3 sm:gap-6 flex-1">
                    {/* User / Auth */}
                    {user ? (
                        <Link href="/profile" className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-all border border-slate-200 dark:border-white/10">
                            <div className="w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center text-[10px] font-bold text-white">
                                {user.email?.[0].toUpperCase()}
                            </div>
                            <span className="text-xs font-black tracking-widest text-foreground uppercase">{t("マイページ", "MY PAGE")}</span>
                        </Link>
                    ) : (
                        <Link href="/login" className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background font-black tracking-widest text-[10px] uppercase hover:scale-105 transition-all">
                            {t("ログイン", "LOGIN")}
                        </Link>
                    )}

                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-foreground hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
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
                    <div className="flex items-center rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100/50 dark:bg-white/5 p-1 text-[10px] font-bold tracking-widest text-slate-500 backdrop-blur-md transition-colors">
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

            {/* Full Width Menu Dropdown (Mobile & Extra Links) */}
            <div className={`overflow-hidden transition-all duration-500 ease-in-out border-b border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 ${isMenuOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="mx-auto max-w-7xl px-6 py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsMenuOpen(false)}
                            className="flex flex-col gap-1 p-6 rounded-3xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all border border-transparent hover:border-slate-200 dark:hover:border-white/10"
                        >
                            <div className="text-[10px] font-black tracking-[0.2em] text-cyan-500 uppercase">{t("ナビゲート", "NAVIGATE")}</div>
                            <div className="text-xl font-black text-foreground uppercase">{item.name}</div>
                        </Link>
                    ))}
                    {!user && (
                        <Link
                            href="/login"
                            onClick={() => setIsMenuOpen(false)}
                            className="sm:hidden flex flex-col gap-1 p-6 rounded-3xl bg-foreground text-background"
                        >
                            <div className="text-[10px] font-black tracking-[0.2em] uppercase opacity-60">{t("会員登録", "JOIN US")}</div>
                            <div className="text-xl font-black uppercase">{t("ログイン / 登録", "LOGIN / SIGNUP")}</div>
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
}
