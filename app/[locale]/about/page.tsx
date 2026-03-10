
"use client";

import { Link } from "../../../i18n/routing";
import { useTranslations } from "next-intl";
import { Shield, BookOpen, Users, Mail } from "lucide-react";

export default function AboutPage() {
  const t = useTranslations("About");
  const ct = useTranslations("Common");

  return (
    <div className="min-h-screen bg-white pb-32 font-sans text-slate-900">
      
      {/* Hero Section */}
      <section className="relative mx-auto max-w-5xl px-6 pt-24 pb-16 space-y-8 text-center md:text-left">
        <div className="inline-block px-3 py-1 rounded-full bg-sky-50 text-sky-600 text-[10px] font-black uppercase tracking-widest border border-sky-100">
          Mission & Vision
        </div>
        <h1 className="text-4xl md:text-7xl font-black tracking-tighter uppercase leading-none italic">
          About <span className="text-sky-600">Us</span>
        </h1>
        <p className="max-w-2xl text-lg md:text-xl font-bold leading-relaxed text-slate-500">
          {t("description")}
        </p>
      </section>

      <main className="mx-auto max-w-4xl px-6">
        <div className="border-t border-slate-100 pt-16 space-y-20">

          {/* 1. Motivation */}
          <section className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
            <div className="md:col-span-4 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-900 mb-4">
                <BookOpen className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">{t("motivationTitle")}</h2>
            </div>
            <div className="md:col-span-8 space-y-6 text-base md:text-lg font-medium leading-relaxed text-slate-600">
              <p>
                {t("motivation")}
              </p>
            </div>
          </section>

          {/* 2. Compliance */}
          <section className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
            <div className="md:col-span-4 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-900 mb-4">
                <Shield className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">{t("complianceTitle")}</h2>
            </div>
            <div className="md:col-span-8 space-y-6">
              <p className="text-base md:text-lg font-medium leading-relaxed text-slate-600">
                {t("compliance")}
              </p>
              <ul className="space-y-4">
                <li className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-bold text-slate-700 leading-relaxed">
                  {t("complianceList1")}
                </li>
                <li className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-bold text-slate-700 leading-relaxed">
                  {t("complianceList2")}
                </li>
                <li className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-bold text-slate-700 leading-relaxed">
                  {t("complianceList3")}
                </li>
              </ul>
            </div>
          </section>

          {/* 3. Operator Info (Privacy Protected) */}
          <section className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 pt-16 border-t border-slate-100">
            <div className="md:col-span-4 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-900 mb-4">
                <Users className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">{t("title")}</h2>
            </div>
            <div className="md:col-span-8 flex flex-col gap-6">
              <div className="flex items-center gap-4 p-6 rounded-3xl bg-slate-900 text-white shadow-xl shadow-slate-900/10">
                <div className="w-12 h-12 rounded-full bg-sky-600 flex items-center justify-center font-black text-lg italic">P</div>
                <div>
                  <div className="text-lg font-black uppercase leading-none">{t("projectTeam")}</div>
                  <div className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mt-1">Non-profit Organization</div>
                </div>
              </div>
              
              <a href="mailto:contact@pocket-dive.app" className="flex items-center gap-4 p-6 rounded-3xl border-2 border-slate-100 hover:border-sky-600 hover:bg-sky-50 transition-all group">
                <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-white flex items-center justify-center text-slate-400 group-hover:text-sky-600 transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-widest text-slate-400 group-hover:text-sky-600">Contact Us</div>
                  <div className="text-sm font-bold text-slate-900 mt-1">contact@pocket-dive.app</div>
                </div>
              </a>
            </div>
          </section>

          <div className="flex justify-center pt-12">
            <Link href="/" className="px-12 py-4 bg-slate-900 text-white font-black text-[12px] tracking-widest uppercase rounded-2xl hover:bg-sky-600 transition-all shadow-xl shadow-slate-900/10">
              {ct("backToHome")}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
