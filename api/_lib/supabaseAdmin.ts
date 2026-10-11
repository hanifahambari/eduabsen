import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('FATAL: Missing Supabase environment variables (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
  throw new Error('Konfigurasi Supabase server tidak lengkap. Hubungi administrator.');
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});