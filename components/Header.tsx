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
        { name: t("このアプリについて", "About"), href: "/about" },
    ];

    return (
        <header className="sticky top-0 z-50 border-b border-white/5 bg-black/40 backdrop-blur-xl">
            <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
                <div className="flex items-center gap-8">
                    <Link href="/" className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                        <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                            Science Papers
                        </span>
                    </Link>
                    <div className="hidden md:flex items-center gap-6 text-sm font-medium">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`transition-colors hover:text-cyan-400 ${pathname === item.href ? "text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]" : "text-slate-400"
                                    }`}
                            >
                                {item.name}
                            </Link>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center rounded-full border border-white/10 bg-white/5 p-1 text-xs font-medium text-slate-300 backdrop-blur-md">
                        <button
                            onClick={() => setLanguage("ja")}
                            className={`rounded-full px-3 py-1 transition-all ${language === "ja" ? "bg-white/10 text-white shadow-[0_0_10px_rgba(255,255,255,0.1)]" : "hover:bg-white/5 text-slate-400"
                                }`}
                        >JA</button>
                        <button
                            onClick={() => setLanguage("en")}
                            className={`rounded-full px-3 py-1 transition-all ${language === "en" ? "bg-white/10 text-white shadow-[0_0_10px_rgba(255,255,255,0.1)]" : "hover:bg-white/5 text-slate-400"
                                }`}
                        >EN</button>
                    </div>
                </div>
            </nav>
            <div className="md:hidden border-t border-white/5 flex justify-center space-x-6 py-3 px-4 overflow-x-auto bg-black/50">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`whitespace-nowrap text-sm font-medium transition-colors hover:text-cyan-400 ${pathname === item.href ? "text-cyan-400" : "text-slate-400"
                            }`}
                    >{item.name}</Link>
                ))}
            </div>
        </header>
    );
}
