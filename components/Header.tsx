"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "./LanguageProvider";
import { useState, useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import Image from "next/image";

export function Header() {
    const pathname = usePathname();
    const { language, setLanguage, t } = useLanguage();
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
        { name: t("ニュース", "News"), href: "/news" },
        { name: t("論文", "Papers"), href: "/papers" },
        { name: t("検索", "Search"), href: "/search" },
        { name: t("このページについて", "About"), href: "/about" },
    ];

    return (
        <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-xl">
            <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 h-20">

                {/* Left: Mobile Toggle & Desktop Nav */}
                <div className="flex-1 flex items-center gap-6">
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="p-2 rounded-xl bg-slate-50 text-slate-600 hover:text-black transition-all lg:hidden"
                    >
                        <div className="flex flex-col gap-1 w-5">
                            <span className={`h-0.5 w-full bg-current transition-all ${isMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`}></span>
                            <span className={`h-0.5 w-full bg-current ${isMenuOpen ? 'opacity-0' : ''}`}></span>
                            <span className={`h-0.5 w-full bg-current transition-all ${isMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></span>
                        </div>
                    </button>

                    <div className="hidden lg:flex items-center gap-6">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`text-[10px] font-black tracking-widest uppercase transition-colors ${pathname === item.href ? "text-cyan-600 underline underline-offset-4 decoration-2" : "text-slate-400 hover:text-black"}`}
                            >
                                {item.name}
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Center: Brand Logo & Text */}
                <div className="flex-none">
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="relative w-10 h-10 sm:w-12 sm:h-12 flex-none">
                            <Image
                                src="/logo.png"
                                alt="Pocket Dive Logo"
                                fill
                                className="object-contain group-hover:scale-105 transition-transform duration-500"
                                priority
                                unoptimized
                            />
                        </div>
                        <span className="text-xl sm:text-2xl font-black tracking-tighter text-slate-900 group-hover:text-cyan-500 transition-colors whitespace-nowrap italic leading-none">
                            Pocket<span className="text-cyan-400 uppercase ml-1">Dive</span>
                        </span>
                    </Link>
                </div>

                {/* Right: Actions */}
                <div className="flex-1 flex justify-end items-center gap-3 sm:gap-6">
                    {/* Newsletter Link */}
                    <Link
                        href="/#newsletter"
                        className="hidden md:flex items-center gap-2 text-[10px] font-black tracking-widest text-slate-400 hover:text-orange-500 uppercase transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {t("メルマガ", "NEWSLETTER")}
                    </Link>

                    <div className="h-4 w-px bg-slate-200 hidden md:block"></div>

                    {user ? (
                        <Link href="/profile" className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-50 hover:bg-slate-100 transition-all border border-slate-100">
                            <div className="w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center text-[8px] font-bold text-white">
                                {user.email?.[0].toUpperCase()}
                            </div>
                            <span className="text-[10px] font-black tracking-widest text-slate-600 uppercase hidden sm:inline">{t("マイページ", "PROFILE")}</span>
                        </Link>
                    ) : (
                        <Link href="/login" className="px-5 py-2.5 rounded-full bg-slate-900 text-white font-black tracking-widest text-[10px] uppercase hover:bg-cyan-600 transition-all">
                            {t("ログイン", "LOGIN")}
                        </Link>
                    )}

                    <div className="flex items-center gap-2 text-[10px] font-black ml-2 sm:ml-0">
                        <button onClick={() => setLanguage("ja")} className={`p-1 ${language === "ja" ? "text-cyan-600" : "text-slate-300 hover:text-slate-900"}`}>JA</button>
                        <button onClick={() => setLanguage("en")} className={`p-1 ${language === "en" ? "text-cyan-600" : "text-slate-300 hover:text-slate-900"}`}>EN</button>
                    </div>
                </div>
            </nav>

            {/* Dropdown Menu Overlay */}
            <div className={`absolute top-20 left-0 right-0 bg-white/95 backdrop-blur-2xl border-b border-slate-100 transition-all duration-500 ease-in-out overflow-hidden ${isMenuOpen ? 'max-h-[600px] opacity-100 py-10 shadow-2xl' : 'max-h-0 opacity-0'}`}>
                <div className="mx-auto max-w-4xl px-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsMenuOpen(false)}
                            className="p-6 rounded-3xl border border-slate-100 hover:border-cyan-500/30 hover:bg-cyan-500/[0.02] transition-all group"
                        >
                            <div className="text-[10px] font-black text-cyan-500 uppercase tracking-widest mb-1">DIVE INTO</div>
                            <div className="text-2xl font-black text-slate-900 uppercase tracking-tight group-hover:translate-x-2 transition-transform">{item.name}</div>
                        </Link>
                    ))}
                    {/* Newsletter in mobile menu */}
                    <Link
                        href="/#newsletter"
                        onClick={() => setIsMenuOpen(false)}
                        className="p-6 rounded-3xl border border-orange-100 bg-orange-50/30 hover:bg-orange-50 transition-all group lg:hidden"
                    >
                        <div className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">SUBSCRIBE</div>
                        <div className="text-2xl font-black text-slate-900 uppercase tracking-tight group-hover:translate-x-2 transition-transform">{t("メルマガ登録", "Newsletter")}</div>
                    </Link>
                </div>
            </div>
        </header>
    );
}
