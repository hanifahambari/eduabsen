import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabaseAdmin';
import { requireRole } from './_lib/session';
import { getSupabaseHttpStatus, isJsonObject, withApiErrorHandling } from './_lib/http';

async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireRole(req, res, ['admin'])) return;
  const { id, rombel } = req.query;
  const hasId = id && typeof id === 'string';
  const rombelFilter = rombel && typeof rombel === 'string' ? rombel : null;

  // GET /api/students or /api/students/:id
  if (req.method === 'GET') {
    if (hasId) {
      const { data, error } = await supabaseAdmin
        .from('students')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('[GET /api/students/:id] Supabase error:', error);
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Student not found' });
        }
        return res.status(500).json({ error: error.message });
      }
      return res.status(200).json(data);
    }

    let query = supabaseAdmin.from('students').select('*').order('nama', { ascending: true });
    if (rombelFilter) {
      query = query.eq('rombel', rombelFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[GET /api/students] Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json(data || []);
  }

  // POST /api/students
  if (req.method === 'POST') {
    const batch = Array.isArray(req.body);
    if (!batch && !isJsonObject(req.body)) {
      return res.status(400).json({ error: 'Request body must be an object or array of objects' });
    }
    if (batch && !(req.body as unknown[]).every(isJsonObject)) {
      return res.status(400).json({ error: 'Each student must be a JSON object' });
    }
    const write = batch
      ? supabaseAdmin.from('students').upsert(req.body, { onConflict: 'nisn', ignoreDuplicates: true }).select()
      : supabaseAdmin.from('students').insert(req.body).select();
    const { data, error } = await write;
    if (error) {
      console.error('[POST /api/students] Supabase error:', error);
      return res.status(getSupabaseHttpStatus(error)).json({ error: error.message, code: error.code });
    }
    return res.status(201).json(batch ? data : data?.[0]);
  }

  // PUT/PATCH /api/students/:id
  if ((req.method === 'PUT' || req.method === 'PATCH') && hasId) {
    if (!isJsonObject(req.body)) {
      return res.status(400).json({ error: 'Request body must be a JSON object' });
    }
    const { data, error } = await supabaseAdmin
      .from('students')
      .update(req.body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[PUT/PATCH /api/students/:id] Supabase error:', error);
      return res.status(getSupabaseHttpStatus(error)).json({ error: error.message, code: error.code });
    }
    return res.status(200).json(data);
  }

  // DELETE /api/students/:id
  if (req.method === 'DELETE' && hasId) {
    const { data, error } = await supabaseAdmin
      .from('students')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('[DELETE /api/students/:id] Supabase error:', error);
      return res.status(getSupabaseHttpStatus(error)).json({ error: error.message, code: error.code });
    }
    if (!data) return res.status(404).json({ error: 'Student not found' });
    return res.status(204).send('');
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withApiErrorHandling(handler);