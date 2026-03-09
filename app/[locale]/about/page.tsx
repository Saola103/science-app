"use client";

import { Link } from "../../../i18n/routing";
import { useTranslations } from "next-intl";

export default function AboutPage() {
  const t = useTranslations("About");
  const ct = useTranslations("Common");

  return (
    <div className="min-h-screen bg-white pb-32 font-sans text-slate-900">
      <section className="mx-auto max-w-4xl px-6 pt-24 pb-16 space-y-8">
        <div className="text-[11px] font-black tracking-widest text-sky-600 uppercase italic">Vision & Identity</div>
        <h1 className="text-5xl md:text-8xl font-black tracking-tighter uppercase leading-none italic">
          Pocket <span className="text-sky-600">Dive</span>
        </h1>
        <p className="max-w-xl text-lg md:text-xl font-bold leading-tight text-slate-500">
          {t("description")}
        </p>
      </section>

      <main className="mx-auto max-w-4xl px-6">
        <div className="border-t border-slate-100 pt-16 space-y-20">

          <section className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-[11px] font-black tracking-widest text-slate-300 uppercase">01 / Motivation</div>
            <div className="md:col-span-2 space-y-6 text-base md:text-lg font-bold leading-relaxed text-slate-700">
              <p>
                {t("motivation1")}
              </p>
              <p>
                {t("motivation2")}
              </p>
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-[11px] font-black tracking-widest text-slate-300 uppercase">02 / Solution</div>
            <div className="md:col-span-2 space-y-6 text-base md:text-lg font-bold leading-relaxed text-slate-700">
              <p>
                {t("solution1")}
              </p>
              <div className="p-10 rounded-2xl bg-sky-50 border border-sky-100 space-y-4">
                <p className="text-sky-700">
                  {t("solution2")}
                </p>
                <div className="pt-4 border-t border-sky-100">
                  <p className="text-[10px] text-slate-400 font-medium italic">
                    {t("logoNotice")}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-12 pt-16 border-t border-slate-100">
            <div className="text-[11px] font-black tracking-widest text-slate-300 uppercase">03 / Identity</div>
            <div className="md:col-span-2 flex items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black text-2xl italic shadow-xl">S</div>
              <div>
                <div className="text-xl font-black uppercase text-slate-900 leading-none">Saola</div>
                <div className="text-[11px] font-black tracking-widest text-slate-400 uppercase mt-2">Developer / High School Student</div>
              </div>
            </div>
          </section>

          <div className="flex justify-center pt-12">
            <Link href="/" className="px-12 py-4 bg-slate-900 text-white font-black text-[12px] tracking-widest uppercase rounded-lg hover:bg-sky-600 transition-all shadow-xl shadow-slate-900/10">
              {ct("backToHome")}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
