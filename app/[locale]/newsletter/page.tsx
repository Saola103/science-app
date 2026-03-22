'use client';

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Mail, XCircle } from "lucide-react";

function NewsletterContent() {
    const searchParams = useSearchParams();
    const status = searchParams.get("status");

    const [email, setEmail] = useState("");
    const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
    const [msg, setMsg] = useState("");

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;
        setState("loading");
        try {
            const res = await fetch("/api/newsletter/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (res.ok) { setState("done"); setMsg(data.message); }
            else { setState("error"); setMsg(data.error); }
        } catch {
            setState("error"); setMsg("通信エラーが発生しました。");
        }
    };

    if (status === "confirmed") {
        return (
            <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-2xl font-black text-slate-900">登録完了！</h1>
                    <p className="text-slate-500 font-medium">明日の朝から、科学の最前線をお届けします。</p>
                </div>
            </div>
        );
    }

    if (status === "unsubscribed") {
        return (
            <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                    <XCircle className="w-8 h-8 text-slate-400" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-2xl font-black text-slate-900">配信を停止しました</h1>
                    <p className="text-slate-500 font-medium">ご利用ありがとうございました。またいつでも登録できます。</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-10">
            <div className="text-center space-y-4">
                <div className="w-14 h-14 bg-sky-50 rounded-2xl flex items-center justify-center mx-auto">
                    <Mail className="w-7 h-7 text-sky-500" />
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                    毎朝、科学の最前線を届ける。
                </h1>
                <p className="text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
                    世界中の論文・ニュースをAIが日本語で要約。<br />
                    毎朝メールに届くから、習慣にできる。完全無料。
                </p>
            </div>

            {/* What you get */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { icon: "🌍", label: "世界中の最新論文", desc: "arXiv・PubMedから毎日収集" },
                    { icon: "🇯🇵", label: "日本語で解説", desc: "AIが誰でも読める日本語に" },
                    { icon: "☀️", label: "毎朝届く", desc: "習慣にできるダイジェスト" },
                ].map((item) => (
                    <div key={item.label} className="bg-slate-50 rounded-2xl p-5 text-center space-y-2 border border-slate-100">
                        <div className="text-2xl">{item.icon}</div>
                        <p className="text-sm font-black text-slate-900">{item.label}</p>
                        <p className="text-xs text-slate-400 font-medium">{item.desc}</p>
                    </div>
                ))}
            </div>

            {/* Form */}
            {state === "done" ? (
                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl p-5 text-emerald-700">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <p className="text-sm font-bold">{msg}</p>
                </div>
            ) : (
                <form onSubmit={submit} className="space-y-3">
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        disabled={state === "loading"}
                        className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 text-base font-medium outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all placeholder:text-slate-300 disabled:opacity-60"
                    />
                    <button
                        type="submit"
                        disabled={state === "loading"}
                        className="w-full bg-slate-900 text-white font-black text-sm uppercase tracking-widest rounded-2xl py-4 hover:bg-sky-600 transition-all disabled:opacity-60"
                    >
                        {state === "loading" ? "送信中..." : "無料で登録する →"}
                    </button>
                    {state === "error" && (
                        <p className="text-xs text-rose-500 font-bold text-center">{msg}</p>
                    )}
                    <p className="text-[10px] text-slate-300 text-center font-bold uppercase tracking-widest">
                        購読解除はいつでも可能 · スパムは送りません
                    </p>
                </form>
            )}
        </div>
    );
}

export default function NewsletterPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6 py-24">
            <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-100 shadow-sm p-10 md:p-14">
                <Suspense>
                    <NewsletterContent />
                </Suspense>
            </div>
        </div>
    );
}
