import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabaseAdmin';
import { requireRole } from './_lib/session';
import { getSupabaseHttpStatus, isJsonObject, withApiErrorHandling } from './_lib/http';

async function handler(req: VercelRequest, res: VercelResponse) {
  const session = requireRole(req, res, ['admin', 'kepala', 'guru', 'siswa']);
  if (!session) return;
  const { id, target_type, target_id, status } = req.query;
  const hasId = id && typeof id === 'string';

  // GET /api/leaves or /api/leaves/:id
  if (req.method === 'GET') {
    if (hasId) {
      let query = supabaseAdmin.from('leave_requests').select('*').eq('id', id);
      if (!['admin', 'kepala', 'guru'].includes(session.role)) {
        query = query.eq('target_id', session.id);
      }
      const { data, error } = await query.maybeSingle();

      if (error) {
        console.error('[GET /api/leaves/:id] Supabase error:', error);
        return res.status(getSupabaseHttpStatus(error)).json({ error: error.message, code: error.code });
      }
      if (!data) return res.status(404).json({ error: 'Leave request not found' });
      return res.status(200).json(data);
    }

    let query = supabaseAdmin.from('leave_requests').select('*').order('created_at', { ascending: false });
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
      console.error('[GET /api/leaves] Supabase error:', error);
      return res.status(getSupabaseHttpStatus(error)).json({ error: error.message, code: error.code });
    }
    return res.status(200).json(data || []);
  }

  // POST /api/leaves
  if (req.method === 'POST') {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ error: 'Request body must be a JSON object' });
    }
    if (session.role !== 'admin' && req.body.target_id !== session.id) {
      return res.status(403).json({ error: 'You can only submit a leave request for your own account' });
    }
    const { data, error } = await supabaseAdmin
      .from('leave_requests')
      .insert(req.body)
      .select()
      .single();

    if (error) {
      console.error('[POST /api/leaves] Supabase error:', error);
      return res.status(getSupabaseHttpStatus(error)).json({ error: error.message, code: error.code });
    }
    return res.status(201).json(data);
  }

  // PUT/PATCH /api/leaves/:id (review)
  if ((req.method === 'PUT' || req.method === 'PATCH') && hasId) {
    if (!['admin', 'kepala'].includes(session.role)) {
      return res.status(403).json({ error: 'You do not have permission to review leave requests' });
    }
    if (!isJsonObject(req.body)) return res.status(400).json({ error: 'Request body must be a JSON object' });
    const { review_notes } = req.body;
    const decision = req.body.decision;

    if (typeof decision !== 'string' || !['Disetujui', 'Ditolak'].includes(decision)) {
      return res.status(400).json({ error: 'Invalid decision' });
    }

    const { data, error } = await supabaseAdmin
      .from('leave_requests')
      .update({
        status: decision,
        reviewed_by: session.id,
        reviewed_at: new Date().toISOString(),
        review_notes: review_notes || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[PUT/PATCH /api/leaves/:id] Supabase error:', error);
      return res.status(getSupabaseHttpStatus(error)).json({ error: error.message, code: error.code });
    }
    return res.status(200).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withApiErrorHandling(handler);