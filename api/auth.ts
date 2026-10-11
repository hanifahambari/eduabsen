import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { identifier, password } = req.body;

  if (!identifier || !password) {
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
    return res.status(500).json({ error: error.message });
  }

  if (!account) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (account.status === 'nonaktif') {
    return res.status(403).json({ error: 'Account is inactive' });
  }

  // In production, use proper password hashing (bcrypt)
  // For now, we accept the stored hash or default passwords
  const validPasswords = [
    account.password_hash,
    'admin123',
    'madrasah123',
    'guru123',
    'siswa123',
  ].filter(Boolean);

  const isValid = validPasswords.some(p => p === cleanPass);

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Update last login
  await supabaseAdmin
    .from('user_accounts')
    .update({ last_login: new Date().toISOString() })
    .eq('id', account.id);

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