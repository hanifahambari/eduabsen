import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('supabase.admin_configuration_missing', {
    hasUrl: Boolean(supabaseUrl),
    hasServiceRoleKey: Boolean(supabaseServiceKey),
  });
  throw new Error('Konfigurasi Supabase server tidak lengkap. Hubungi administrator.');
}

if (supabaseServiceKey.startsWith('eyJ')) {
  try {
    const payload = JSON.parse(Buffer.from(supabaseServiceKey.split('.')[1], 'base64url').toString()) as { role?: string };
    if (payload.role !== 'service_role') {
      console.error('supabase.admin_key_has_wrong_role', { role: payload.role || 'unknown' });
      throw new Error('SUPABASE_SERVICE_ROLE_KEY bukan service_role key.');
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('bukan service_role')) throw error;
    console.error('supabase.admin_key_validation_failed', error);
    throw new Error('SUPABASE_SERVICE_ROLE_KEY tidak valid.');
  }
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});