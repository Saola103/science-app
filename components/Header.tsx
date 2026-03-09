'use client';
import { useTranslations, useLocale } from 'next-intl';
import { Link, usePathname, useRouter } from '../i18n/routing';
import { useState, useEffect } from "react";
import { getSupabaseClient } from "../lib/supabase/client";
import { User } from "@supabase/supabase-js";
import Image from "next/image";
import { Globe, ChevronDown } from "lucide-react";

export function Header() {
    const t = useTranslations('Common');
    const pathname = usePathname();
    const router = useRouter();
    const locale = useLocale();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isLangOpen, setIsLangOpen] = useState(false);
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
        { name: t("home"), href: "/" },
        { name: t("search"), href: "/search" },
        { name: t("about"), href: "/about" },
    ];

    const languages = [
        { code: 'ja', name: '日本語' },
        { code: 'en', name: 'English' },
    ];

    const handleLanguageChange = (newLocale: string) => {
        router.replace(pathname, { locale: newLocale });
        setIsLangOpen(false);
    };

    return (
        <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur-md">
            <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 h-20">

                {/* Left: Desktop Nav */}
                <div className="flex-1 hidden lg:flex items-center gap-6">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href as any}
                            className={`text-[11px] font-bold tracking-widest uppercase transition-all ${pathname === item.href
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
                            <span className={`h-0.5 w-full bg-current transition-all ${isMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
                            <span className={`h-0.5 w-full bg-current ${isMenuOpen ? 'opacity-0' : ''}`}></span>
                            <span className={`h-0.5 w-full bg-current transition-all ${isMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
                        </div>
                    </button>
                </div>

                {/* Center: Brand Logo & Text */}
                <div className="flex-none">
                    <Link href="/" className="flex items-center gap-3 md:gap-4 group">
                        <div className="relative w-8 h-8 flex-none rounded-2xl overflow-hidden shadow-md shadow-sky-600/10 bg-white border border-slate-100">
                            <Image
                                src="/images/logo_icon.png"
                                alt="Pocket Dive Logo"
                                fill
                                className="object-cover group-hover:scale-110 transition-transform duration-500"
                                priority
                            />
                        </div>
                        <div className="flex flex-col leading-none">
                            <span className="text-lg md:text-xl font-black tracking-tighter text-slate-900 transition-colors uppercase italic">
                                POCKET <span className="text-sky-600">DIVE</span>
                            </span>
                        </div>
                    </Link>
                </div>

                {/* Right: Actions */}
                <div className="flex-1 flex justify-end items-center gap-4 md:gap-6">

                    {user ? (
                        <Link href="/profile" className="flex items-center gap-2 px-2 md:px-3 py-1 md:py-1.5 border border-slate-100 rounded-lg text-slate-600 hover:bg-slate-50 transition-all">
                            <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-sky-500 flex items-center justify-center text-[7px] md:text-[8px] font-bold text-white uppercase italic">
                                {user.email?.[0]}
                            </div>
                        </Link>
                    ) : (
                        <Link href="/login" className="px-3 md:px-4 py-1.5 md:py-2 bg-slate-900 text-white font-bold tracking-widest text-[9px] md:text-[11px] uppercase rounded-lg hover:bg-sky-600 transition-all shadow-md shadow-slate-900/10 whitespace-nowrap">
                            {t("login")}
                        </Link>
                    )}

                    {/* Language Selector Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setIsLangOpen(!isLangOpen)}
                            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-transparent hover:border-slate-100 hover:bg-slate-50 transition-all"
                        >
                            <Globe size={14} className="text-slate-400" />
                            <span className="text-[10px] font-black uppercase text-slate-900 hidden md:inline">{locale}</span>
                            <ChevronDown size={12} className={`text-slate-400 transition-transform ${isLangOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isLangOpen && (
                            <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-100 rounded-xl shadow-2xl py-2 animate-in fade-in zoom-in duration-200 origin-top-right">
                                <div className="grid grid-cols-1 max-h-[300px] overflow-y-auto">
                                    {languages.map((lang) => (
                                        <button
                                            key={lang.code}
                                            onClick={() => handleLanguageChange(lang.code)}
                                            className={`flex items-center justify-between px-4 py-2 text-[10px] font-bold transition-colors ${locale === lang.code ? 'text-sky-600 bg-sky-50' : 'text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            {lang.name}
                                            {locale === lang.code && <div className="w-1 h-1 rounded-full bg-sky-600"></div>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </nav>

            {/* Mobile Dropdown Menu */}
            <div className={`lg:hidden absolute top-20 left-0 right-0 bg-white border-b border-slate-100 transition-all duration-300 ease-in-out overflow-hidden shadow-2xl ${isMenuOpen ? 'max-h-[600px] opacity-100 py-8' : 'max-h-0 opacity-0'}`}>
                <div className="px-6 flex flex-col gap-6">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href as any}
                            onClick={() => setIsMenuOpen(false)}
                            className="text-2xl font-bold text-slate-900 uppercase tracking-tighter hover:text-sky-600 transition-colors"
                        >
                            {item.name}
                        </Link>
                    ))}
                </div>
            </div>

            {/* Backdrop for Language selector */}
            {isLangOpen && <div className="fixed inset-0 z-40" onClick={() => setIsLangOpen(false)}></div>}
        </header>
    );
}
