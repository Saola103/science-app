"use client";

import { useTranslations, useLocale } from 'next-intl';
import { useState } from 'react';
import { submitInquiry } from "../../../lib/actions/inquiry";
import { Send, CheckCircle2 } from 'lucide-react';

export default function ContactPage() {
    const t = useTranslations('Common');
    const locale = useLocale();
    const [pending, setPending] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setPending(true);
        setError("");

        const formData = new FormData(e.currentTarget);
        const result = await submitInquiry(formData, locale);

        if (result?.error) {
            setError(result.error);
            setPending(false);
        } else {
            setSuccess(true);
            setPending(false);
        }
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center px-6">
                <div className="max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in duration-500">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-sky-50 dark:bg-sky-500/10 text-sky-600 mb-4">
                        <CheckCircle2 size={40} />
                    </div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Message Sent</h1>
                    <p className="text-slate-500 font-bold leading-relaxed">
                        Thank you for your feedback! Your message has been received by the Pocket Dive team.
                    </p>
                    <button
                        onClick={() => window.location.href = `/${locale}`}
                        className="px-10 py-4 bg-slate-900 text-white font-black text-sm uppercase tracking-widest rounded-xl hover:bg-sky-600 transition-all shadow-xl shadow-slate-900/10"
                    >
                        {t('backToHome')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen py-24 px-6 md:py-32">
            <div className="max-w-4xl mx-auto space-y-16">

                {/* Header */}
                <div className="text-center space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-sky-500/20 bg-sky-500/5 text-[10px] font-black tracking-widest text-sky-600 uppercase">
                        CONNECT WITH US
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 uppercase italic">
                        {t('contact')}
                    </h1>
                    <p className="max-w-xl mx-auto text-slate-500 font-bold leading-relaxed">
                        Have ideas for new domains? Found a bug? Or just want to say hello?
                        We'd love to hear from you.
                    </p>
                </div>

                {/* Form Container */}
                <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900/50 border border-slate-100 rounded-[2.5rem] p-8 md:p-12 shadow-2xl shadow-slate-200/50 relative overflow-hidden">
                    <form onSubmit={handleSubmit} className="space-y-8 relative z-10">

                        <div className="space-y-2">
                            <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase italic">Topic</label>
                            <select
                                name="topic"
                                required
                                className="w-full h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:border-sky-600 focus:bg-white transition-all appearance-none cursor-pointer"
                            >
                                <option value="Domain Request">Domain/Category Request</option>
                                <option value="Bug Report">Bug Report</option>
                                <option value="Feedback">Feedback</option>
                                <option value="Partnership">Partnership</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase italic">Email (Optional)</label>
                            <input
                                type="email"
                                name="email"
                                placeholder="YOUR@EMAIL.COM"
                                className="w-full h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:border-sky-600 focus:bg-white transition-all placeholder:text-slate-300"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase italic">Message</label>
                            <textarea
                                name="message"
                                required
                                rows={5}
                                placeholder="DESCRIBE YOUR REQUEST OR FEEDBACK..."
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:border-sky-600 focus:bg-white transition-all placeholder:text-slate-300 resize-none"
                            ></textarea>
                        </div>

                        {error && (
                            <p className="text-xs font-bold text-red-500">{error}</p>
                        )}

                        <button
                            type="submit"
                            disabled={pending}
                            className={`w-full h-16 bg-slate-900 text-white font-black text-sm uppercase tracking-[0.2em] rounded-2xl hover:bg-sky-600 disabled:opacity-50 transition-all shadow-xl shadow-slate-900/10 flex items-center justify-center gap-3 active:scale-[0.98] ${pending ? 'cursor-not-allowed' : ''}`}
                        >
                            {pending ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <Send size={16} />
                                    SEND MESSAGE
                                </>
                            )}
                        </button>
                    </form>

                    {/* Gradient Decorations */}
                    <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-sky-500/5 blur-3xl rounded-full"></div>
                    <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-sky-500/5 blur-3xl rounded-full"></div>
                </div>
            </div>
        </div>
    );
}
