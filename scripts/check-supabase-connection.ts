
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local if it exists, otherwise .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function checkConnection() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('Checking Supabase connection...');
  console.log(`URL: ${supabaseUrl ? 'Set' : 'Not Set'}`);
  console.log(`Anon Key: ${supabaseKey ? 'Set' : 'Not Set'}`);
  console.log(`Service Role Key: ${serviceKey ? 'Set' : 'Not Set'}`);

  if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Supabase environment variables are missing.');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Try to fetch one record from 'papers' table to verify connection
    const { data, error, count } = await supabase
      .from('papers')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Connection failed:', error.message);
    } else {
      console.log('Connection successful!');
      console.log(`Found ${count} records in 'papers' table.`);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkConnection();
