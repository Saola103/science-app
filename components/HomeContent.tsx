'use client';

import { Link, useRouter } from "../i18n/routing";
import { ArrowRight, Newspaper, FlaskConical, Mail, CheckCircle2, Play } from "lucide-react";
import { PaperCardData } from "../types";
import { NewsCardData } from "./NewsCard";
import { useState } from "react";

interface HomeContentProps {
    papers: PaperCardData[] | null;
    news?: NewsCardData[] | null;
}

// Category color map
const CATEGORY_COLORS: Record<string, string> = {
    PHYSICS: "bg-blue-50 text-blue-600",
    BIOLOGY: "bg-green-50 text-green-600",
    GENETICS: "bg-emerald-50 text-emerald-600",
    CHEMISTRY: "bg-orange-50 text-orange-600",
    AI: "bg-violet-50 text-violet-600",
    NEUROSCIENCE: "bg-pink-50 text-pink-600",
    SPACE: "bg-indigo-50 text-indigo-600",
    MEDICINE: "bg-rose-50 text-rose-600",
    ENVIRONMENT: "bg-teal-50 text-teal-600",
    DEFAULT: "bg-sky-50 text-sky-600",
};
function categoryColor(cat?: string | null) {
    if (!cat) return CATEGORY_COLORS.DEFAULT;
    const key = cat.toUpperCase();
    return CATEGORY_COLORS[key] || CATEGORY_COLORS.DEFAULT;
}

function formatDate(iso?: string | null) {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });
}

function todayJa() {
    const d = new Date();
    const week = ["日", "月", "火", "水", "木", "金", "土"];
    return d.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" }) + `（${week[d.getDay()]}）`;
}

// ─── Newsletter Form ─────────────────────────────────────────────────────────
function NewsletterForm({ compact = false }: { compact?: boolean }) {
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
            if (res.ok) {
                setState("done");
                setMsg(data.message || "確認メールを送信しました。メールをご確認ください。");
            } else {
                setState("error");
                setMsg(data.error || "登録に失敗しました。");
            }
        } catch {
            setState("error");
            setMsg("通信エラーが発生しました。");
        }
    };

    if (state === "done") {
        return (
            <div className={`flex items-center gap-3 ${compact ? "py-2" : "py-4"} text-emerald-600`}>
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <p className="text-sm font-bold">{msg}</p>
            </div>
        );
    }

    return (
        <form onSubmit={submit} className={`flex ${compact ? "gap-2" : "flex-col sm:flex-row gap-3"} w-full`}>
            <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                disabled={state === "loading"}
                className={`flex-1 bg-white border border-slate-200 rounded-xl px-4 ${compact ? "py-2.5 text-sm" : "py-3.5 text-base"} font-medium outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all placeholder:text-slate-300 disabled:opacity-60`}
            />
            <button
                type="submit"
                disabled={state === "loading"}
                className={`shrink-0 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-xl ${compact ? "px-5 py-2.5" : "px-8 py-3.5"} hover:bg-sky-600 transition-all disabled:opacity-60 flex items-center gap-2 whitespace-nowrap`}
            >
                {state === "loading" ? "送信中..." : (compact ? "登録" : "無料で登録する →")}
            </button>
            {state === "error" && <p className="text-xs text-rose-500 font-bold mt-1">{msg}</p>}
        </form>
    );
}

// ─── Featured News Card ───────────────────────────────────────────────────────
function FeaturedCard({ item }: { item: NewsCardData }) {
    return (
        <a
            href={item.url || "#"}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="group block bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:border-sky-200 transition-all duration-300"
        >
            <div className="p-8 md:p-10 space-y-5">
                <div className="flex items-center gap-3">
                    {item.category && (
                        <span className={`text-[10px] font-black tracking-[0.15em] uppercase px-3 py-1 rounded-full ${categoryColor(item.category)}`}>
                            {item.category}
                        </span>
                    )}
                    {item.published_at && (
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                            {formatDate(item.published_at)}
                        </span>
                    )}
                </div>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 leading-snug group-hover:text-sky-600 transition-colors line-clamp-3">
                    {item.title}
                </h2>
                {item.summary_general && (
                    <p className="text-sm text-slate-500 font-medium leading-relaxed line-clamp-3">
                        {item.summary_general}
                    </p>
                )}
                <div className="flex items-center justify-between pt-2">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                        {item.source || ""}
                    </span>
                    <span className="text-xs font-black text-sky-600 uppercase tracking-widest flex items-center gap-1 group-hover:gap-2 transition-all">
                        続きを読む <ArrowRight className="w-3 h-3" />
                    </span>
                </div>
            </div>
        </a>
    );
}

// ─── Small News Card ─────────────────────────────────────────────────────────
function SmallNewsCard({ item }: { item: NewsCardData }) {
    return (
        <a
            href={item.url || "#"}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="group flex gap-4 p-5 bg-white border border-slate-100 rounded-2xl hover:shadow-md hover:border-sky-200 transition-all duration-200"
        >
            <div className="flex-1 space-y-2">
                {item.category && (
                    <span className={`text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full ${categoryColor(item.category)}`}>
                        {item.category}
                    </span>
                )}
                <h3 className="text-sm font-bold text-slate-900 leading-snug group-hover:text-sky-600 transition-colors line-clamp-2">
                    {item.title}
                </h3>
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                    {item.source}
                </p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-200 group-hover:text-sky-400 shrink-0 mt-1 transition-colors" />
        </a>
    );
}

// ─── Paper Row Card ───────────────────────────────────────────────────────────
function PaperRowCard({ paper }: { paper: PaperCardData }) {
    return (
        <a
            href={paper.url || "#"}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="group flex gap-5 p-5 bg-white border border-slate-100 rounded-2xl hover:shadow-md hover:border-sky-200 transition-all duration-200"
        >
            <div className="w-1 rounded-full bg-sky-200 shrink-0 group-hover:bg-sky-500 transition-colors" />
            <div className="flex-1 space-y-2">
                <h3 className="text-sm font-bold text-slate-900 leading-snug group-hover:text-sky-600 transition-colors line-clamp-2">
                    {paper.title}
                </h3>
                {(paper as any).summary_general && (
                    <p className="text-xs text-slate-400 font-medium leading-relaxed line-clamp-2">
                        {(paper as any).summary_general}
                    </p>
                )}
                <div className="flex items-center gap-3">
                    {paper.category && (
                        <span className={`text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full ${categoryColor(paper.category)}`}>
                            {paper.category}
                        </span>
                    )}
                    {paper.published_at && (
                        <span className="text-[10px] font-bold text-slate-300">{formatDate(paper.published_at)}</span>
                    )}
                </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-200 group-hover:text-sky-400 shrink-0 mt-1 transition-colors" />
        </a>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function HomeContent({ papers, news }: HomeContentProps) {
    const featuredNews = news?.[0] ?? null;
    const restNews = news?.slice(1, 4) ?? [];
    const topPapers = papers?.slice(0, 4) ?? [];

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">

            {/* ── Masthead ─────────────────────────────────────────── */}
            <div className="bg-white border-b border-slate-100">
                <div className="max-w-5xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-4">
                        <div>
                            <p className="text-[10px] font-black tracking-[0.25em] text-slate-300 uppercase">Daily Science Digest</p>
                            <p className="text-sm font-bold text-slate-500">{todayJa()}</p>
                        </div>
                    </div>
                    {/* Compact newsletter bar */}
                    <div className="w-full sm:w-auto sm:max-w-sm">
                        <NewsletterForm compact />
                    </div>
                </div>
            </div>

            {/* ── Science TikTok Feed CTA ──────────────────────────── */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-slate-800">
                <div className="max-w-5xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-sky-500/20 rounded-xl flex items-center justify-center border border-sky-500/30">
                            <Play className="w-4 h-4 text-sky-400 fill-sky-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black tracking-widest text-sky-400 uppercase">NEW</p>
                            <p className="text-sm font-bold text-white">スワイプで科学を楽しもう</p>
                        </div>
                    </div>
                    <Link
                        href="/feed"
                        className="shrink-0 flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-white font-black text-xs uppercase tracking-widest px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-sky-500/20 whitespace-nowrap"
                    >
                        フィードを見る <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>

            {/* ── Main Feed ────────────────────────────────────────── */}
            <div className="max-w-5xl mx-auto px-6 py-10 space-y-16">

                {/* Today's Top Story */}
                {featuredNews && (
                    <section className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Newspaper className="w-4 h-4 text-sky-500" />
                            <h2 className="text-[11px] font-black tracking-[0.25em] text-slate-400 uppercase">今日のトップニュース</h2>
                            <div className="flex-1 h-px bg-slate-100" />
                            <Link href="/news" className="text-[10px] font-black text-slate-300 hover:text-sky-600 transition-colors uppercase tracking-widest flex items-center gap-1">
                                全て見る <ArrowRight className="w-3 h-3" />
                            </Link>
                        </div>
                        <FeaturedCard item={featuredNews} />
                    </section>
                )}

                {/* More News */}
                {restNews.length > 0 && (
                    <section className="space-y-4">
                        <div className="flex items-center gap-3">
                            <h2 className="text-[11px] font-black tracking-[0.25em] text-slate-400 uppercase">その他のニュース</h2>
                            <div className="flex-1 h-px bg-slate-100" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {restNews.map((item) => (
                                <SmallNewsCard key={item.id} item={item} />
                            ))}
                        </div>
                    </section>
                )}

                {/* Papers */}
                {topPapers.length > 0 && (
                    <section className="space-y-4">
                        <div className="flex items-center gap-3">
                            <FlaskConical className="w-4 h-4 text-sky-500" />
                            <h2 className="text-[11px] font-black tracking-[0.25em] text-slate-400 uppercase">新着論文</h2>
                            <div className="flex-1 h-px bg-slate-100" />
                            <Link href="/papers" className="text-[10px] font-black text-slate-300 hover:text-sky-600 transition-colors uppercase tracking-widest flex items-center gap-1">
                                全て見る <ArrowRight className="w-3 h-3" />
                            </Link>
                        </div>
                        <div className="space-y-3">
                            {topPapers.map((paper) => (
                                <PaperRowCard key={paper.id} paper={paper} />
                            ))}
                        </div>
                    </section>
                )}

                {/* Newsletter CTA */}
                <section className="bg-slate-900 rounded-3xl p-10 md:p-14 text-center space-y-6">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto">
                        <Mail className="w-6 h-6 text-white" />
                    </div>
                    <div className="space-y-3">
                        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                            毎朝、科学の最前線を届ける。
                        </h2>
                        <p className="text-sm text-slate-400 font-medium max-w-md mx-auto leading-relaxed">
                            世界中の論文・ニュースをAIが日本語で要約。<br />
                            毎朝メールに届くから、習慣にできる。完全無料。
                        </p>
                    </div>
                    <div className="max-w-md mx-auto">
                        <NewsletterForm />
                    </div>
                    <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                        購読解除はいつでも可能 · スパムは送りません
                    </p>
                </section>

                {/* Browse links */}
                <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-8">
                    <Link href="/news" className="group flex items-center justify-between p-6 bg-white border border-slate-100 rounded-2xl hover:border-sky-200 hover:shadow-md transition-all">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black tracking-widest text-sky-500 uppercase">Browse</p>
                            <p className="text-base font-black text-slate-900">最新ニュース一覧</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-slate-200 group-hover:text-sky-500 group-hover:translate-x-1 transition-all" />
                    </Link>
                    <Link href="/papers" className="group flex items-center justify-between p-6 bg-white border border-slate-100 rounded-2xl hover:border-sky-200 hover:shadow-md transition-all">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black tracking-widest text-sky-500 uppercase">Browse</p>
                            <p className="text-base font-black text-slate-900">新着論文一覧</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-slate-200 group-hover:text-sky-500 group-hover:translate-x-1 transition-all" />
                    </Link>
                </section>
            </div>
        </div>
    );
}
