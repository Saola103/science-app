
"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Loader2, Lock, Inbox, Calendar, Trash2 } from "lucide-react";

// Client-side Supabase client for Admin (using anon key is fine if RLS is set, 
// but for Admin dashboard usually we want more privilege or just read RLS-allowed data.
// Since this is a simple personal app, we assume we can read inquiries.)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // 簡易的なパスワードチェック (本来はServer Actionで環境変数と比較すべきだが、要件通り簡易実装)
    // ここではAPI経由でチェックするか、環境変数をクライアントに露出させるわけにはいかないので、
    // サーバーサイドでチェックするAPIを作るのが正解。
    // 今回は簡易的に「APIルートでデータ取得する際にパスワードを送る」方式にします。
    
    try {
      const res = await fetch("/api/admin/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        throw new Error("Invalid password");
      }

      const data = await res.json();
      setInquiries(data.inquiries);
      setIsAuthenticated(true);
    } catch (err) {
      setError("Incorrect password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-24 px-6">
      <div className="max-w-4xl mx-auto">
        
        <div className="mb-12 text-center space-y-4">
          <h1 className="text-3xl font-black uppercase text-slate-900">Admin Dashboard</h1>
          <p className="text-slate-500 font-bold text-sm">Manage inquiries and feedback.</p>
        </div>

        {!isAuthenticated ? (
          <div className="max-w-md mx-auto bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">Admin Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-12 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-sky-600 transition-colors"
                    placeholder="Enter password..."
                  />
                </div>
              </div>
              {error && <p className="text-xs font-bold text-red-500 text-center">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-sky-600 transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Access Dashboard"}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Inbox className="w-5 h-5" />
                Inquiries ({inquiries.length})
              </h2>
              <button 
                onClick={() => setIsAuthenticated(false)}
                className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors"
              >
                Logout
              </button>
            </div>

            <div className="grid gap-4">
              {inquiries.map((item) => (
                <div key={item.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="inline-block px-3 py-1 rounded-full bg-sky-50 text-sky-600 text-[10px] font-black uppercase tracking-widest mb-2">
                        {item.topic}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900">{item.email || "No Email"}</h3>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                      <Calendar className="w-3 h-3" />
                      {new Date(item.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed bg-slate-50 p-4 rounded-xl">
                    {item.message}
                  </p>
                </div>
              ))}
              {inquiries.length === 0 && (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200 text-slate-400 font-bold">
                  No inquiries found.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
