"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "./LanguageProvider";
import { useState, useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";

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
        { name: t("AI検索", "AI Search"), href: "/search" },
        { name: t("アプリについて", "About"), href: "/about" },
    ];

    return (
        <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-xl">
            <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 h-20">

                {/* Left: Mobile Toggle & Desktop Nav */}
                <div className="flex-1 flex items-center gap-6">
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="p-2 rounded-xl bg-slate-50 text-slate-600 hover:text-black transition-all"
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
                                className={`text-[10px] font-black tracking-widest uppercase transition-colors ${pathname === item.href ? "text-cyan-600" : "text-slate-400 hover:text-black"}`}
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
                        <span className="text-xl font-black tracking-tighter text-slate-900 group-hover:text-cyan-600 transition-colors">
                            Science<span className="text-cyan-500 font-extrabold">Papers</span>
                        </span>
                    </Link>
                </div>

                {/* Right: Actions */}
                <div className="flex-1 flex justify-end items-center gap-4">
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

                    <div className="h-4 w-px bg-slate-200 ml-2"></div>

                    <div className="flex items-center gap-2 text-[10px] font-black">
                        <button onClick={() => setLanguage("ja")} className={`p-1 ${language === "ja" ? "text-cyan-600" : "text-slate-300 hover:text-slate-900"}`}>JA</button>
                        <button onClick={() => setLanguage("en")} className={`p-1 ${language === "en" ? "text-cyan-600" : "text-slate-300 hover:text-slate-900"}`}>EN</button>
                    </div>
                </div>
            </nav>

            {/* Dropdown Menu Overlay */}
            <div className={`absolute top-20 left-0 right-0 bg-white/95 backdrop-blur-2xl border-b border-slate-100 transition-all duration-500 ease-in-out overflow-hidden ${isMenuOpen ? 'max-h-[400px] opacity-100 py-10 shadow-2xl' : 'max-h-0 opacity-0'}`}>
                <div className="mx-auto max-w-4xl px-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsMenuOpen(false)}
                            className="p-6 rounded-3xl border border-slate-100 hover:border-cyan-500/30 hover:bg-cyan-500/[0.02] transition-all group"
                        >
                            <div className="text-[10px] font-black text-cyan-500 uppercase tracking-widest mb-1">Explore</div>
                            <div className="text-2xl font-black text-slate-900 uppercase tracking-tight group-hover:translate-x-2 transition-transform">{item.name}</div>
                        </Link>
                    ))}
                </div>
            </div>
        </header>
    );
}
