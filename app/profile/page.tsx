"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useLanguage } from "@/components/LanguageProvider";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { PaperCard, type PaperCardData } from "@/components/PaperCard";

export default function ProfilePage() {
    const { t } = useLanguage();
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [bookmarks, setBookmarks] = useState<PaperCardData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const supabase = getSupabaseClient();
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) {
                router.push("/login");
                return;
            }
            setUser(user);
            setIsLoading(false);
        });
    }, [router]);

    const handleLogout = async () => {
        const supabase = getSupabaseClient();
        await supabase.auth.signOut();
        router.push("/");
    };

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        </div>;
    }

    return (
        <div className="min-h-screen pb-32">
            <section className="mx-auto max-w-4xl px-6 pt-24 pb-16 space-y-8">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-8 text-center sm:text-left">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-[10px] font-black tracking-widest text-cyan-600 dark:text-cyan-400 uppercase">
                            PROFILE SETTINGS
                        </div>
                        <h1 className="text-4xl sm:text-6xl font-black text-foreground tracking-tight">
                            My <span className="text-cyan-500">Science</span> Desk.
                        </h1>
                        <p className="text-lg font-bold text-slate-500 dark:text-slate-400">
                            Logged in as: <span className="text-foreground">{user?.email}</span>
                        </p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="px-8 py-4 rounded-xl border border-red-500/20 text-red-500 font-black text-xs tracking-widest uppercase hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/10"
                    >
                        {t("ログアウト", "LOGOUT")}
                    </button>
                </div>
            </section>

            <main className="mx-auto max-w-5xl px-6 space-y-12">
                <div className="flex items-center gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-2xl">🔖</div>
                    <h2 className="text-xl font-black tracking-widest text-foreground uppercase">{t("ブックマークした論文", "SAVED PAPERS")}</h2>
                </div>

                {bookmarks.length === 0 ? (
                    <div className="py-32 text-center space-y-6 bg-slate-100/50 dark:bg-white/5 rounded-[3rem] border border-dashed border-slate-300 dark:border-white/10">
                        <div className="text-4xl opacity-30">📪</div>
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                            {t("現在ブックマークはありません。", "YOU DON'T HAVE ANY SAVED PAPERS YET.")}
                        </p>
                        <button
                            onClick={() => router.push("/search")}
                            className="px-6 py-3 rounded-lg bg-cyan-500 text-white font-black text-[10px] tracking-widest uppercase hover:scale-105 transition-all"
                        >
                            {t("論文を探しに行く", "START DISCOVERING")}
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {bookmarks.map((paper) => (
                            <PaperCard key={paper.id} paper={paper} />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
