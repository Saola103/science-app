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
        <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur-md">
            <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 h-20">

                {/* Left: Desktop Nav */}
                <div className="flex-1 hidden lg:flex items-center gap-8">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`text-[11px] font-black tracking-widest uppercase transition-all ${pathname === item.href
                                    ? "text-sky-600 border-b-2 border-sky-600 pb-1"
                                    : "text-slate-400 hover:text-slate-900"
                                }`}
                        >
                            {item.name}
                        </Link>
                    ))}
                </div>

                {/* Mobile Menu Toggle */}
                <div className="flex-1 lg:hidden flex items-center">
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="p-3 text-slate-600 hover:text-sky-600 transition-colors"
                    >
                        <div className="flex flex-col gap-1 w-6">
                            <span className={`h-0.5 w-full bg-current transition-all ${isMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`}></span>
                            <span className={`h-0.5 w-full bg-current ${isMenuOpen ? 'opacity-0' : ''}`}></span>
                            <span className={`h-0.5 w-full bg-current transition-all ${isMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></span>
                        </div>
                    </button>
                </div>

                {/* Center: Brand Logo & Text */}
                <div className="flex-none">
                    <Link href="/" className="flex items-center gap-4 group">
                        <div className="relative w-11 h-11 flex-none rounded-2xl overflow-hidden shadow-md shadow-sky-600/10 bg-white border border-slate-100">
                            <Image
                                src="/logo.png"
                                alt="Pocket Dive Logo"
                                fill
                                className="object-cover group-hover:scale-110 transition-transform duration-500"
                                priority
                            />
                        </div>
                        <div className="flex flex-col leading-none">
                            <span className="text-xl font-black tracking-tighter text-slate-900 transition-colors uppercase italic">
                                Pocket <span className="text-sky-600">Dive</span>
                            </span>
                        </div>
                    </Link>
                </div>

                {/* Right: Actions */}
                <div className="flex-1 flex justify-end items-center gap-6">
                    {/* Newsletter (Hidden on mobile) */}
                    <Link
                        href="/#newsletter"
                        className="hidden md:flex items-center gap-2 text-[11px] font-black tracking-widest text-slate-400 hover:text-sky-600 uppercase transition-colors"
                    >
                        {t("購読", "SUBSCRIBE")}
                    </Link>

                    {user ? (
                        <Link href="/profile" className="flex items-center gap-2 px-3 py-1.5 border border-slate-100 rounded-lg text-slate-600 hover:bg-slate-50 transition-all">
                            <div className="w-5 h-5 rounded-full bg-sky-500 flex items-center justify-center text-[8px] font-bold text-white uppercase italic">
                                {user.email?.[0]}
                            </div>
                        </Link>
                    ) : (
                        <Link href="/login" className="px-4 py-2 bg-slate-900 text-white font-black tracking-widest text-[11px] uppercase rounded-lg hover:bg-sky-600 transition-all shadow-md shadow-slate-900/10">
                            {t("ログイン", "LOGIN")}
                        </Link>
                    )}

                    {/* Language Switcher */}
                    <div className="flex items-center gap-3 text-[10px] font-black ml-4">
                        <button onClick={() => setLanguage("ja")} className={`transition-colors ${language === "ja" ? "text-sky-600" : "text-slate-300 hover:text-slate-900"}`}>JA</button>
                        <button onClick={() => setLanguage("en")} className={`transition-colors ${language === "en" ? "text-sky-600" : "text-slate-300 hover:text-slate-900"}`}>EN</button>
                    </div>
                </div>
            </nav>

            {/* Mobile Dropdown Menu */}
            <div className={`lg:hidden absolute top-20 left-0 right-0 bg-white border-b border-slate-100 transition-all duration-300 ease-in-out overflow-hidden shadow-2xl ${isMenuOpen ? 'max-h-[600px] opacity-100 py-8' : 'max-h-0 opacity-0'}`}>
                <div className="px-6 flex flex-col gap-6">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsMenuOpen(false)}
                            className="text-2xl font-black text-slate-900 uppercase tracking-tighter hover:text-sky-600 transition-colors"
                        >
                            {item.name}
                        </Link>
                    ))}
                </div>
            </div>
        </header>
    );
}
