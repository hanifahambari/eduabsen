import type { VercelRequest, VercelResponse } from "./_lib/vercelTypes";
import { supabaseAdmin } from './_lib/supabaseAdmin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id, target_type, target_id, status } = req.query;
  const hasId = id && typeof id === 'string';

  // GET /api/leaves or /api/leaves/:id
  if (req.method === 'GET') {
    if (hasId) {
      const { data, error } = await supabaseAdmin
        .from('leave_requests')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Leave request not found' });
        }
        return res.status(500).json({ error: error.message });
      }
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

    const { data, error } = await query;
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json(data || []);
  }

  // POST /api/leaves
  if (req.method === 'POST') {
    const { data, error } = await supabaseAdmin
      .from('leave_requests')
      .insert(req.body)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(201).json(data);
  }

  // PUT/PATCH /api/leaves/:id (review)
  if ((req.method === 'PUT' || req.method === 'PATCH') && hasId) {
    const { decision, reviewer_id, review_notes } = req.body;

    if (!decision || !['Disetujui', 'Ditolak'].includes(decision)) {
      return res.status(400).json({ error: 'Invalid decision' });
    }

    const { data, error } = await supabaseAdmin
      .from('leave_requests')
      .update({
        status: decision,
        reviewed_by: reviewer_id,
        reviewed_at: new Date().toISOString(),
        review_notes: review_notes || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}