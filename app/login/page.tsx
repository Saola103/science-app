"use client";

import { useState } from "react";
import { getSupabaseClient } from "../../lib/supabase/client";
import { useLanguage } from "../../components/LanguageProvider";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const { t } = useLanguage();
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [isSignUp, setIsSignUp] = useState(false);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        const supabase = getSupabaseClient();

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                alert(t("確認メールを送信しました。確認後ログインしてください。", "Confirmation email sent. Please check and login."));
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                router.push("/");
            }
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center px-6">
            <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-[3rem] p-10 sm:p-16 shadow-2xl space-y-10">
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-[10px] font-black tracking-widest text-cyan-600 dark:text-cyan-400 uppercase">
                        MEMBER AREA
                    </div>
                    <h1 className="text-4xl font-black text-foreground tracking-tight">
                        {isSignUp ? t("アカウント作成", "Create Account") : t("ログイン", "Welcome Back")}
                    </h1>
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                        {isSignUp ? t("学術ジャーナルをあなたらしく。", "Personalize your journals.") : t("科学の最前線へ戻りましょう。", "Return to the frontier.")}
                    </p>
                </div>

                {error && (
                    <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleAuth} className="space-y-6">
                    <div className="space-y-4">
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-6 py-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-foreground placeholder-slate-400 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 transition-all font-bold"
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full px-6 py-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-foreground placeholder-slate-400 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 transition-all font-bold"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-5 rounded-2xl bg-foreground text-background font-black tracking-widest text-sm hover:scale-105 transition-all shadow-xl shadow-foreground/20 disabled:opacity-30 disabled:scale-100 uppercase"
                    >
                        {isLoading ? t("処理中...", "PROCESSING...") : isSignUp ? t("登録する", "SIGNUP") : t("ログイン", "LOGIN")}
                    </button>
                </form>

                <div className="text-center">
                    <button
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-xs font-black tracking-widest text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 transition-colors uppercase"
                    >
                        {isSignUp ? t("ログインはこちら", "Already have an account? Login") : t("アカウント作成はこちら", "Don't have an account? Sign up")}
                    </button>
                </div>
            </div>
        </div>
    );
}
