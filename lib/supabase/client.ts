import { createClient } from '@supabase/supabase-js';

// NEXT_PUBLIC_ を読み込むように変更
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase の接続情報が見つかりません。環境変数を確認してください。");
}

export const getSupabaseClient = () => createClient(supabaseUrl, supabaseAnonKey);
