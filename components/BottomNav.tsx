"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "./LanguageProvider";

/**
 * Mobile-only Bottom Navigation for Pocket Dive
 * Refined version: Text-only for a professional, professional look.
 */
export function BottomNav() {
    const pathname = usePathname();
    const { t } = useLanguage();

    const items = [
        { name: t("ホーム", "Home"), href: "/" },
        { name: t("ニュース", "News"), href: "/news" },
        { name: t("論文", "Papers"), href: "/papers" },
        { name: t("検索", "Search"), href: "/search" },
        { name: t("マイ", "My"), href: "/profile" },
    ];

    return (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white/80 backdrop-blur-xl border-t border-slate-100 pb-safe">
            <div className="flex justify-around items-center h-16">
                {items.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`relative flex flex-col items-center justify-center min-w-[64px] h-full transition-all ${pathname === item.href ? "text-cyan-600" : "text-slate-400"
                            }`}
                    >
                        <span className={`text-[10px] font-black uppercase tracking-widest transition-transform ${pathname === item.href ? "scale-110" : ""}`}>
                            {item.name}
                        </span>
                        {pathname === item.href && (
                            <div className="absolute bottom-2 w-5 h-0.5 rounded-full bg-cyan-600"></div>
                        )}
                    </Link>
                ))}
            </div>
        </nav>
    );
}
