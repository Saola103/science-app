import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';

/**
 * Mobile-only Bottom Navigation for Pocket Dive
 * Refined version: Text-only for a professional, professional look.
 */
export function BottomNav() {
    const pathname = usePathname();
    const t = useTranslations('Common');

    const items = [
        { name: t("home"), href: "/" },
        { name: t("news"), href: "/news" },
        { name: t("papers"), href: "/papers" },
        { name: t("search"), href: "/search" },
        { name: t("home"), href: "/profile" }, // temporary name until I add profile translation or just use a fixed "Profile"
    ];

    // Overriding the profile name specifically if I want it consistent
    const refinedItems = [
        { name: t("home"), href: "/" },
        { name: t("news"), href: "/news" },
        { name: t("papers"), href: "/papers" },
        { name: t("search"), href: "/search" },
        { name: "MY PAGE", href: "/profile" },
    ];

    return (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white/80 backdrop-blur-xl border-t border-slate-100 pb-safe">
            <div className="flex justify-around items-center h-16">
                {refinedItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href as any}
                        className={`relative flex flex-col items-center justify-center min-w-[64px] h-full transition-all ${pathname === item.href ? "text-sky-600" : "text-slate-400"
                            }`}
                    >
                        <span className={`text-[10px] font-black uppercase tracking-widest transition-transform ${pathname === item.href ? "scale-105" : ""}`}>
                            {item.name}
                        </span>
                        {pathname === item.href && (
                            <div className="absolute bottom-2 w-5 h-0.5 rounded-full bg-sky-600"></div>
                        )}
                    </Link>
                ))}
            </div>
        </nav>
    );
}
