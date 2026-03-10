"use client";

import { useActionState } from "react";
import { subscribeToNewsletter } from "@/app/actions";
import { useTranslations } from "next-intl";

export function NewsletterForm() {
    const t = useTranslations("Newsletter");
    const [state, formAction, isPending] = useActionState(subscribeToNewsletter, null);

    return (
        <div className="space-y-6">
            <h3 className="text-xs font-black tracking-[0.2em] text-slate-900 uppercase italic border-b border-slate-100 pb-2">
                {t("title")}
            </h3>
            <div className="space-y-4">
                <p className="text-[11px] leading-relaxed text-slate-500 font-bold uppercase tracking-wider">
                    {t("description")}
                </p>
                <form action={formAction} className="flex flex-col gap-3">
                    <div className="relative group">
                        <input
                            type="email"
                            name="email"
                            placeholder={t("placeholder")}
                            required
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all placeholder:text-slate-300"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isPending}
                        className="group relative overflow-hidden bg-slate-900 hover:bg-sky-600 disabled:bg-slate-300 text-white rounded-2xl px-5 py-4 text-[11px] font-black tracking-widest uppercase transition-all duration-300 active:scale-95 shadow-xl shadow-slate-900/10 hover:shadow-sky-600/20"
                    >
                        <span className="relative z-10 flex items-center justify-center gap-2">
                            {isPending ? (
                                <span className="flex gap-1">
                                    <span className="w-1 h-1 bg-white rounded-full animate-bounce"></span>
                                    <span className="w-1 h-1 bg-white rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                    <span className="w-1 h-1 bg-white rounded-full animate-bounce [animation-delay:0.4s]"></span>
                                </span>
                            ) : (
                                <>
                                    {t("submit")}
                                    <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                                    </svg>
                                </>
                            )}
                        </span>
                    </button>
                </form>
                {state && (
                    <div className={`p-4 rounded-2xl border ${state.success ? "bg-emerald-50/50 border-emerald-100/50" : "bg-rose-50/50 border-rose-100/50"} transition-all animate-in fade-in slide-in-from-top-2 duration-500`}>
                        <p
                            className={`text-[10px] font-black uppercase tracking-widest ${state.success ? "text-emerald-600" : "text-rose-600"
                                } animate-pulse`}
                        >
                            {state.success ? t("success") : state.message}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
