import { useTranslations } from 'next-intl';
import { Link } from '../i18n/routing';
import Image from "next/image";

export function Footer() {
    const t = useTranslations('Common');

    return (
        <footer className="bg-white border-t border-slate-100 py-24 pb-32 lg:pb-24">
            <div className="mx-auto max-w-7xl px-6 grid grid-cols-1 md:grid-cols-4 gap-16">

                {/* Brand Info */}
                <div className="space-y-8">
                    <div className="space-y-6">
                        <Link href="/" className="group flex items-center gap-4">
                            <div className="relative w-8 h-8 flex-none rounded-2xl overflow-hidden shadow-md shadow-sky-600/10 bg-white border border-slate-100">
                                <Image
                                    src="/images/logo_icon.png"
                                    alt="Pocket Dive Logo"
                                    fill
                                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                            </div>
                            <span className="text-xl font-black tracking-tighter text-slate-900 italic uppercase leading-none">
                                POCKET <span className="text-sky-600">DIVE</span>
                            </span>
                        </Link>
                        <div className="space-y-4">
                            <p className="text-sm font-bold text-slate-500 leading-relaxed">
                                {t("footerTagline")}
                            </p>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                                    {t("footerDevelopedBy")}
                                </p>
                                <p className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter">
                                    {t("footerLogoCredit")}
                                </p>
                            </div>
                        </div>
                    </div>
                    {/* Social Channels Moved Here */}
                    <div className="flex gap-6 pt-2">
                        {/* Social icons removed for privacy/simplification as requested, or keep generic if official */}
                    </div>
                </div>

                {/* Navigation Links */}
                <div className="space-y-6">
                    <h3 className="text-xs font-black tracking-[0.2em] text-slate-900 uppercase italic border-b border-slate-100 pb-2">{t("footerMenu")}</h3>
                    <ul className="space-y-4 text-[11px] font-black tracking-widest uppercase">
                        <li><Link href="/" className="text-slate-400 hover:text-sky-600 transition-colors">{t("home")}</Link></li>
                        <li><Link href="/news" className="text-slate-400 hover:text-sky-600 transition-colors">{t("news")}</Link></li>
                        <li><Link href="/papers" className="text-slate-400 hover:text-sky-600 transition-colors">{t("papers")}</Link></li>
                        <li><Link href="/search" className="text-slate-400 hover:text-sky-600 transition-colors">{t("search")}</Link></li>
                        <li><Link href="/about" className="text-slate-400 hover:text-sky-600 transition-colors">{t("about")}</Link></li>
                        <li><Link href="/contact" className="text-slate-400 hover:text-sky-600 transition-colors">{t("contact")}</Link></li>
                    </ul>
                </div>

                {/* Contact Box */}
                <div className="space-y-6">
                    <h3 className="text-xs font-black tracking-[0.2em] text-slate-900 uppercase italic border-b border-slate-100 pb-2">{t("contact")}</h3>
                    <div className="space-y-4 font-bold text-sm text-slate-500">
                        <Link href="/contact" className="block hover:text-sky-600 transition-colors">
                            contact@pocket-dive.app
                        </Link>
                        <p className="text-xs leading-relaxed text-slate-400 italic">
                            {t("footerContactDesc")}
                        </p>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-7xl px-6 mt-20 pt-12 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-6">
                <div className="flex flex-col items-center sm:items-start gap-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{t("footerRights")}</p>
                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
                        v{process.env.NEXT_PUBLIC_APP_VERSION} ({process.env.NEXT_PUBLIC_GIT_HASH})
                    </p>
                </div>
                <div className="flex gap-8 text-[10px] font-bold tracking-[0.2em] uppercase text-slate-300">
                    <Link href="/terms" className="hover:text-slate-900 transition-colors uppercase">{t("terms")}</Link>
                    <Link href="/privacy" className="hover:text-slate-900 transition-colors uppercase">{t("privacy")}</Link>
                    <Link href="/legal" className="hover:text-slate-900 transition-colors uppercase">{t("legal")}</Link>
                </div>
            </div>
        </footer>
    );
}
