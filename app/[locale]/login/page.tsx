"use client";

import { useState } from "react";
import { getSupabaseClient } from "../../../lib/supabase/client";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || "ja";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");
    const supabase = getSupabaseClient();
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSuccess("確認メールを送信しました。メールをご確認ください。");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(`/${locale}/profile`);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <div className="px-5 pt-12">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-white/40 hover:text-white text-sm font-bold transition-colors">
          <ArrowLeft className="w-4 h-4" /> 戻る
        </button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-black italic">POCKET <span className="text-sky-400">DIVE</span></h1>
            <h2 className="text-xl font-black mt-4">{isSignUp ? "新規登録" : "ログイン"}</h2>
            <p className="text-sm text-white/40 font-medium">{isSignUp ? "アカウントを作成してパーソナライズを開始" : "科学の最前線へ戻ろう"}</p>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-3">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="メールアドレス" disabled={isLoading} className="w-full h-14 px-5 bg-white/5 border border-white/10 rounded-2xl text-sm font-medium text-white placeholder:text-white/20 outline-none focus:border-sky-500/50 transition-all disabled:opacity-50" />
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="パスワード（6文字以上）" disabled={isLoading} className="w-full h-14 px-5 bg-white/5 border border-white/10 rounded-2xl text-sm font-medium text-white placeholder:text-white/20 outline-none focus:border-sky-500/50 transition-all disabled:opacity-50" />
            </div>
            {error && <p className="text-xs text-rose-400 font-bold text-center bg-rose-500/10 border border-rose-500/20 rounded-xl py-3 px-4">{error}</p>}
            {success && <p className="text-xs text-emerald-400 font-bold text-center bg-emerald-500/10 border border-emerald-500/20 rounded-xl py-3 px-4">{success}</p>}
            <button type="submit" disabled={isLoading} className="w-full h-14 bg-sky-500 hover:bg-sky-400 text-white font-black text-sm uppercase tracking-widest rounded-2xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isSignUp ? "アカウントを作成" : "ログイン")}
            </button>
          </form>
          <div className="text-center">
            <button onClick={() => { setIsSignUp(!isSignUp); setError(""); setSuccess(""); }} className="text-sm text-white/40 hover:text-white transition-colors font-medium">
              {isSignUp ? "すでにアカウントをお持ちの方は" : "アカウントをお持ちでない方は"}
              <span className="text-sky-400 font-black ml-1">{isSignUp ? "ログイン" : "新規登録"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
