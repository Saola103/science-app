import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy singleton - only created when first accessed, not at module evaluation time
let _client: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient => {
  if (_client) return _client;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  _client = createClient(supabaseUrl, supabaseAnonKey);
  return _client;
};
