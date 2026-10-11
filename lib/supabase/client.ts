import { createClient } from '@supabase/supabase-js';

const publicEnv = import.meta.env as ImportMetaEnv & {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
};
const supabaseUrl = publicEnv.VITE_SUPABASE_URL || publicEnv.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = publicEnv.VITE_SUPABASE_ANON_KEY || publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase public environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY) in the Vercel build environment.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});