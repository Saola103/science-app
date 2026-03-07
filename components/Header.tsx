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
        { name: t("プロジェクトについて", "About"), href: "/about" },
    ];

    return (
        <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/90 backdrop-blur-md">
            <nav className="mx-auto flex max-w-7xl items-center h-16 px-6">

                {/* Menu Button (Left) */}
                <div className="flex-1 flex justify-start">
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="flex items-center gap-3 p-2 group"
                    >
                        <div className="flex flex-col gap-1 w-5">
                            <span className={`h-[2px] w-full bg-black transition-all ${isMenuOpen ? 'rotate-45 translate-y-[6px]' : ''}`}></span>
                            <span className={`h-[2px] w-full bg-black ${isMenuOpen ? 'opacity-0' : 'opacity-100'}`}></span>
                            <span className={`h-[2px] w-full bg-black transition-all ${isMenuOpen ? '-rotate-45 -translate-y-[6px]' : ''}`}></span>
                        </div>
                        <span className="text-[10px] font-black tracking-[0.2em] uppercase hidden sm:inline">Menu</span>
                    </button>
                </div>

                {/* Logo (Center) */}
                <div className="flex-none">
                    <Link href="/" className="flex items-center gap-2 group">
                        <span className="text-xl font-black tracking-tighter text-black">
                            Science<span className="text-cyan-600">Papers</span>
                        </span>
                    </Link>
                </div>

                {/* Actions (Right) */}
                <div className="flex-1 flex justify-end items-center gap-4">
                    {/* User */}
                    {user ? (
                        <Link href="/profile" className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-neutral-200 hover:bg-neutral-50 transition-all">
                            <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center text-[8px] font-black text-white">
                                {user.email?.[0].toUpperCase()}
                            </div>
                            <span className="text-[10px] font-black tracking-widest uppercase hidden lg:inline">{t("マイページ", "MY PAGE")}</span>
                        </Link>
                    ) : (
                        <Link href="/login" className="text-[10px] font-black tracking-widest uppercase hover:text-cyan-600 transition-colors">
                            {t("ログイン", "LOGIN")}
                        </Link>
                    )}

                    <div className="h-4 w-px bg-neutral-200"></div>

                    {/* Language Switch */}
                    <div className="flex items-center gap-3 text-[10px] font-black">
                        <button onClick={() => setLanguage("ja")} className={language === "ja" ? "text-cyan-600" : "text-neutral-400"}>JA</button>
                        <button onClick={() => setLanguage("en")} className={language === "en" ? "text-cyan-600" : "text-neutral-400"}>EN</button>
                    </div>
                </div>
            </nav>

            {/* Menu Overlay */}
            <div className={`absolute top-16 inset-0 h-[calc(100vh-64px)] bg-white z-[100] transition-transform duration-500 ease-in-out ${isMenuOpen ? 'translate-y-0' : '-translate-y-full'}`}>
                <div className="mx-auto max-w-2xl px-6 py-20 flex flex-col gap-8">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsMenuOpen(false)}
                            className="group flex items-center justify-between border-b border-neutral-100 pb-6 hover:translate-x-4 transition-transform"
                        >
                            <span className={`text-4xl sm:text-6xl font-black uppercase tracking-tight ${pathname === item.href ? 'text-black' : 'text-neutral-300 group-hover:text-black'}`}>
                                {item.name}
                            </span>
                            <svg className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                        </Link>
                    ))}
                    <div className="pt-20">
                        <div className="text-[10px] font-black tracking-widest uppercase text-neutral-400 mb-4">{t("開発者の想い", "DEVELOPER")}</div>
                        <p className="text-xl font-bold leading-tight max-w-md">{t("「科学論文は難しすぎる」。そんな常識を、高校生がAIで塗り替えました。", "Redefining science papers with AI. A project by Saola.")}</p>
                    </div>
                </div>
            </div>
        </header>
    );
}
