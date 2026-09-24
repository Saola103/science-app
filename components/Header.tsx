'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from "react";
import Image from "next/image";

// Note: currently unused (no route imports this component — the shipped app
// chrome is BottomNav.tsx + /feedapp's own ProtoHeader). Kept around and its
// dead-route links cleaned up in case it's revived later, rather than left to
// silently rot with links to pages that no longer exist.
export function Header() {
    const pathname = usePathname();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const navItems = [
        { name: "ホーム", href: "/" },
        { name: "フィード", href: "/feedapp/feed" },
        { name: "検索", href: "/search" },
        { name: "このアプリについて", href: "/about" },
    ];

    return (
        <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur-md">
            <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 h-20">

                {/* Left: Desktop Nav */}
                <div className="flex-1 hidden lg:flex items-center gap-3">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`text-[10px] font-bold tracking-wide uppercase whitespace-nowrap transition-all ${pathname === item.href
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

                    {/* Login was removed — the app is accountless (localStorage-only
                        saves/streak), so this links straight into the feed instead
                        of an auth flow. */}
                    <Link href="/feedapp/feed" className="px-3 md:px-4 py-1.5 md:py-2 bg-slate-900 text-white font-bold tracking-widest text-[9px] md:text-[11px] uppercase rounded-lg hover:bg-sky-600 transition-all shadow-md shadow-slate-900/10 whitespace-nowrap">
                        フィード
                    </Link>
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
                            className="text-2xl font-bold text-slate-900 uppercase tracking-tighter hover:text-sky-600 transition-colors"
                        >
                            {item.name}
                        </Link>
                    ))}
                </div>
            </div>
        </header>
    );
}
