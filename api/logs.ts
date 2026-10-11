import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabaseAdmin';
import { requireRole } from './_lib/session';
import { getSupabaseHttpStatus, withApiErrorHandling } from './_lib/http';

async function handler(req: VercelRequest, res: VercelResponse) {
  const session = requireRole(req, res, ['admin', 'kepala', 'guru', 'siswa']);
  if (!session) return;
  if (req.method === 'GET') {
    if (!['admin', 'kepala'].includes(session.role)) {
      return res.status(403).json({ error: 'You do not have permission to read activity logs' });
    }
    const { limit } = req.query;
    const { data, error } = await supabaseAdmin
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit ? parseInt(limit as string) : 100);

    if (error) {
      console.error('[GET /api/logs] Supabase error:', error);
      return res.status(getSupabaseHttpStatus(error)).json({ error: error.message, code: error.code });
    }
    return res.status(200).json(data || []);
  }

  if (req.method === 'POST') {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ error: 'Request body must be a JSON object' });
    }
    const { data, error } = await supabaseAdmin
      .from('activity_logs')
      .insert({ ...req.body, actor_name: session.nama, actor_role: session.role })
      .select()
      .single();

    if (error) {
      console.error('[POST /api/logs] Supabase error:', error);
      return res.status(getSupabaseHttpStatus(error)).json({ error: error.message, code: error.code });
    }
    return res.status(201).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withApiErrorHandling(handler);