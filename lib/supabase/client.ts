import { createClient } from "@supabase/supabase-js";

function getEnv(name: string): string | undefined {
  // tsx 実行時や一部ビルド環境では import.meta.env が入ることがあるため両対応
  return (import.meta as any)?.env?.[name] ?? (process.env as any)?.[name];
}

export function getSupabaseClient() {
  const url = getEnv("NEXT_PUBLIC_SUPABASE_URL") ?? getEnv("SUPABASE_URL");
  const anonKey =
    getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") ?? getEnv("SUPABASE_ANON_KEY");

  if (!url || !anonKey) {
    throw new Error(
      "Supabase の接続情報が見つかりません。SUPABASE_URL / SUPABASE_ANON_KEY（または NEXT_PUBLIC_ 付き）を設定してください。",
    );
  }

  return createClient(url, anonKey, {
    auth: { persistSession: false },
  });
}

