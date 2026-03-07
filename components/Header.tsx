"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "./LanguageProvider";

export function Header() {
    const pathname = usePathname();
    const { language, setLanguage, t } = useLanguage();

    const navItems = [
        { name: t("ホーム", "Home"), href: "/" },
        { name: t("AI検索", "AI Search"), href: "/search" },
        { name: t("このアプリについて", "About this app"), href: "/about" },
    ];

    return (
        <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
            <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
                <div className="flex items-center gap-8">
                    <Link
                        href="/"
                        className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2"
                    >
                        Science Papers
                    </Link>
                    <div className="hidden md:flex items-center gap-6 text-sm font-medium">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`transition-colors hover:text-cyan-600 ${pathname === item.href ? "text-cyan-600 font-semibold" : "text-slate-600"
                                    }`}
                            >
                                {item.name}
                            </Link>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center rounded-full border border-slate-200 bg-slate-100 p-1 text-xs font-medium text-slate-500">
                        <button
                            onClick={() => setLanguage("ja")}
                            className={`rounded-full px-3 py-1 transition-all ${language === "ja"
                                    ? "bg-white text-slate-900 shadow-sm"
                                    : "hover:bg-slate-200"
                                }`}
                        >
                            JA
                        </button>
                        <button
                            onClick={() => setLanguage("en")}
                            className={`rounded-full px-3 py-1 transition-all ${language === "en"
                                    ? "bg-white text-slate-900 shadow-sm"
                                    : "hover:bg-slate-200"
                                }`}
                        >
                            EN
                        </button>
                    </div>
                </div>
            </nav>
            {/* Mobile Nav */}
            <div className="md:hidden border-t border-slate-100 flex justify-center space-x-6 py-3 px-4 overflow-x-auto bg-white/90">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`whitespace-nowrap text-sm font-medium transition-colors hover:text-cyan-600 ${pathname === item.href ? "text-cyan-600 font-semibold" : "text-slate-600"
                            }`}
                    >
                        {item.name}
                    </Link>
                ))}
            </div>
        </header>
    );
}
