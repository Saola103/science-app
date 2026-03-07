import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 「既に作られていたらそれを使い、なければ作る」という仕組みにする
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const getSupabaseClient = () => supabase;
