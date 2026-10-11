import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabaseAdmin';
import { requireRole } from './_lib/session';
import { getSupabaseHttpStatus, isJsonObject, withApiErrorHandling } from './_lib/http';

async function handler(req: VercelRequest, res: VercelResponse) {
  const session = requireRole(req, res, ['admin', 'kepala', 'guru', 'siswa']);
  if (!session) return;
  if (req.method === 'GET') {
    const { target_type, target_id, date, rombel } = req.query;
    let query = supabaseAdmin.from('attendance').select('*').order('created_at', { ascending: false });

    if (target_type && typeof target_type === 'string') {
      query = query.eq('target_type', target_type);
    }
    if (target_id && typeof target_id === 'string') {
      query = query.eq('target_id', target_id);
    }
    if (date && typeof date === 'string') {
      query = query.eq('date', date);
    }
    if (rombel && typeof rombel === 'string') {
      query = query.eq('rombel', rombel);
    }
    if (session.role === 'siswa') {
      query = query.eq('target_id', session.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[GET /api/attendance] Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json(data || []);
  }

  if (req.method === 'POST') {
    if (!['admin', 'guru'].includes(session.role)) {
      return res.status(403).json({ error: 'You do not have permission to record attendance' });
    }
    if (!isJsonObject(req.body)) return res.status(400).json({ error: 'Request body must be a JSON object' });
    const { data, error } = await supabaseAdmin
      .from('attendance')
      .upsert(req.body, { onConflict: 'target_type,target_id,date' })
      .select()
      .single();

    if (error) {
      console.error('[POST /api/attendance] Supabase error:', error);
      return res.status(getSupabaseHttpStatus(error)).json({ error: error.message, code: error.code });
    }
    return res.status(201).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withApiErrorHandling(handler);