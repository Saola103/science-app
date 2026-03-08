"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "./LanguageProvider";

/**
 * Mobile-only Bottom Navigation for Pocket Dive
 */
export function BottomNav() {
    const pathname = usePathname();
    const { t } = useLanguage();

    const items = [
        { name: t("ホーム", "Home"), href: "/", icon: "🏠" },
        { name: t("ニュース", "News"), href: "/news", icon: "🔥" },
        { name: t("論文", "Papers"), href: "/papers", icon: "📄" },
        { name: t("検索", "Search"), href: "/search", icon: "🔍" },
        { name: t("マイ", "My"), href: "/profile", icon: "👤" },
    ];

    return (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white/80 backdrop-blur-xl border-t border-slate-100 pb-safe">
            <div className="flex justify-around items-center h-16">
                {items.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`flex flex-col items-center gap-1 min-w-[64px] transition-all ${pathname === item.href ? "text-cyan-600 scale-110" : "text-slate-400"
                            }`}
                    >
                        <span className="text-xl">{item.icon}</span>
                        <span className="text-[10px] font-black uppercase tracking-tighter">{item.name}</span>
                        {pathname === item.href && (
                            <div className="absolute -top-1 w-1 h-1 rounded-full bg-cyan-600"></div>
                        )}
                    </Link>
                ))}
            </div>
        </nav>
    );
}
