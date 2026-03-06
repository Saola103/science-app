import { createClient } from '@supabase/supabase-js';

// ここにあなたの Supabase URL を直接入れる（クォーテーションで囲む）
const SUPABASE_URL = "https://ueuxhoptzcjupywbrflu.supabase.co";

// ここにあなたの Service Role Key を直接入れる
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  console.log("--- 直接接続テスト開始 ---");
  
  const { count, error } = await supabase.from('papers').select('*', { count: 'exact', head: true });
  
  if (error) {
    console.error("DB接続エラー:", error.message);
  } else {
    console.log("DB接続成功！現在の論文数:", count);
  }
}
check();