import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabaseAdmin';
import { requireRole } from './_lib/session';
import { getSupabaseHttpStatus, isJsonObject, withApiErrorHandling } from './_lib/http';

async function handler(req: VercelRequest, res: VercelResponse) {
  const session = requireRole(req, res, ['admin', 'kepala', 'guru', 'siswa']);
  if (!session) return;
  const { id, target_type, target_id, status } = req.query;
  const hasId = id && typeof id === 'string';

  // GET /api/corrections or /api/corrections/:id
  if (req.method === 'GET') {
    if (hasId) {
      let query = supabaseAdmin.from('correction_requests').select('*').eq('id', id);
      if (!['admin', 'kepala', 'guru'].includes(session.role)) {
        query = query.eq('target_id', session.id);
      }
      const { data, error } = await query.maybeSingle();

      if (error) {
        console.error('[GET /api/corrections/:id] Supabase error:', error);
        return res.status(getSupabaseHttpStatus(error)).json({ error: error.message, code: error.code });
      }
      if (!data) return res.status(404).json({ error: 'Correction request not found' });
      return res.status(200).json(data);
    }

    let query = supabaseAdmin.from('correction_requests').select('*').order('created_at', { ascending: false });
    if (target_type && typeof target_type === 'string') {
      query = query.eq('target_type', target_type);
    }
    if (target_id && typeof target_id === 'string') {
      query = query.eq('target_id', target_id);
    }
    if (status && typeof status === 'string') {
      query = query.eq('status', status);
    }
    if (session.role === 'siswa') {
      query = query.eq('target_id', session.id);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[GET /api/corrections] Supabase error:', error);
      return res.status(getSupabaseHttpStatus(error)).json({ error: error.message, code: error.code });
    }
    return res.status(200).json(data || []);
  }

  // POST /api/corrections
  if (req.method === 'POST') {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ error: 'Request body must be a JSON object' });
    }
    if (session.role !== 'admin' && req.body.target_id !== session.id) {
      return res.status(403).json({ error: 'You can only submit a correction request for your own account' });
    }
    const { data, error } = await supabaseAdmin
      .from('correction_requests')
      .insert(req.body)
      .select()
      .single();

    if (error) {
      console.error('[POST /api/corrections] Supabase error:', error);
      return res.status(getSupabaseHttpStatus(error)).json({ error: error.message, code: error.code });
    }
    return res.status(201).json(data);
  }

  // PUT/PATCH /api/corrections/:id (review)
  if ((req.method === 'PUT' || req.method === 'PATCH') && hasId) {
    if (!['admin', 'kepala', 'guru'].includes(session.role)) {
      return res.status(403).json({ error: 'You do not have permission to review correction requests' });
    }
    if (!isJsonObject(req.body)) return res.status(400).json({ error: 'Request body must be a JSON object' });
    const decision = req.body.decision;

    if (typeof decision !== 'string' || !['Disetujui', 'Ditolak'].includes(decision)) {
      return res.status(400).json({ error: 'Invalid decision' });
    }

    const { data, error } = await supabaseAdmin
      .from('correction_requests')
      .update({
        status: decision,
        reviewed_by: session.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[PUT/PATCH /api/corrections/:id] Supabase error:', error);
      return res.status(getSupabaseHttpStatus(error)).json({ error: error.message, code: error.code });
    }
    return res.status(200).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withApiErrorHandling(handler);