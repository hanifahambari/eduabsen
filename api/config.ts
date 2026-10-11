import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabaseAdmin';
import { requireRole } from './_lib/session';
import { getSupabaseHttpStatus, isJsonObject, withApiErrorHandling } from './_lib/http';

async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireRole(req, res, ['admin'])) return;
  const { type } = req.query;
  const configType = type && typeof type === 'string' ? type : 'madrasah';

  // GET /api/config?type=madrasah|holidays|schedule
  if (req.method === 'GET') {
    let table: string;
    let orderColumn: string | null = null;

    switch (configType) {
      case 'holidays':
        table = 'holidays';
        orderColumn = 'tanggal';
        break;
      case 'schedule':
        table = 'schedule_config';
        break;
      case 'madrasah':
      default:
        table = 'madrasah_config';
        break;
    }

    let query = supabaseAdmin.from(table).select('*');
    if (orderColumn) {
      query = query.order(orderColumn, { ascending: true });
    }

    const { data, error } = await query;

    if (error) {
      console.error('[GET /api/config] Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json(data || []);
  }

  // POST /api/config?type=holidays
  if (req.method === 'POST' && configType === 'holidays') {
    if (!isJsonObject(req.body)) {
      return res.status(400).json({ error: 'Request body must be a JSON object' });
    }
    const { data, error } = await supabaseAdmin
      .from('holidays')
      .insert(req.body)
      .select()
      .single();

    if (error) {
      console.error('[POST /api/config] Supabase error:', error);
      return res.status(getSupabaseHttpStatus(error)).json({ error: error.message, code: error.code });
    }
    return res.status(201).json(data);
  }

  if (req.method === 'DELETE' && configType === 'holidays') {
    const id = req.query.id;
    if (typeof id !== 'string' || !id) {
      return res.status(400).json({ error: 'Holiday id is required' });
    }
    const { data, error } = await supabaseAdmin
      .from('holidays')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();
    if (error) {
      console.error('[DELETE /api/config] Supabase error:', error);
      return res.status(getSupabaseHttpStatus(error)).json({ error: error.message, code: error.code });
    }
    if (!data) return res.status(404).json({ error: 'Holiday not found' });
    return res.status(204).send('');
  }

  // PUT/PATCH /api/config?type=madrasah|schedule
  if ((req.method === 'PUT' || req.method === 'PATCH') && (configType === 'madrasah' || configType === 'schedule')) {
    if (!isJsonObject(req.body)) {
      return res.status(400).json({ error: 'Request body must be a JSON object' });
    }
    const table = configType === 'madrasah' ? 'madrasah_config' : 'schedule_config';
    const { data, error } = await supabaseAdmin
      .from(table)
      .upsert(req.body)
      .select()
      .single();

    if (error) {
      console.error('[PUT/PATCH /api/config] Supabase error:', error);
      return res.status(getSupabaseHttpStatus(error)).json({ error: error.message, code: error.code });
    }
    return res.status(200).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withApiErrorHandling(handler);