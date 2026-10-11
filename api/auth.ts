import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabaseAdmin';
import { setSessionCookie } from './_lib/session';
import { withApiErrorHandling } from './_lib/http';

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ error: 'Request body must be a JSON object' });
  }

  const { identifier, password } = body;

  if (typeof identifier !== 'string' || typeof password !== 'string' || !identifier.trim() || !password) {
    return res.status(400).json({ error: 'Identifier and password are required' });
  }

  const cleanId = identifier.trim().toLowerCase();
  const cleanPass = password.trim();

  const { data: account, error } = await supabaseAdmin
    .from('user_accounts')
    .select('*')
    .or(`username.ilike.${cleanId},identifier.ilike.${cleanId},email.ilike.${cleanId}`)
    .maybeSingle();

  if (error) {
    console.error('[POST /api/auth] Supabase error:', error);
    return res.status(500).json({ error: error.message });
  }

  if (!account) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (account.status === 'nonaktif') {
    return res.status(403).json({ error: 'Account is inactive' });
  }

  const isValid = typeof account.password_hash === 'string' && account.password_hash === cleanPass;

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Update last login (fire-and-forget with error handling)
  try {
    const { error: updateError } = await supabaseAdmin
      .from('user_accounts')
      .update({ last_login: new Date().toISOString() })
      .eq('id', account.id);
    if (updateError) {
      console.error('supabase.update_last_login_failed', {
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
      });
    }
  } catch (updateErr) {
    console.error('supabase.update_last_login_unexpected_error', updateErr);
  }

  try {
    setSessionCookie(res, account);
  } catch (sessionError) {
    console.error('auth.session_creation_failed', sessionError);
    return res.status(500).json({ error: 'Server authentication is not configured' });
  }

  const user = {
    id: account.target_id || account.id,
    nama: account.nama,
    email: account.email,
    role: account.role,
    identifier: account.identifier,
    mapel: account.mapel,
    rombel: account.rombel,
    is_wali_kelas: account.is_wali_kelas,
    wali_kelas_rombel: account.wali_kelas_rombel,
    is_logged_in: true,
  };

  return res.status(200).json({ user });
}

export default withApiErrorHandling(handler);