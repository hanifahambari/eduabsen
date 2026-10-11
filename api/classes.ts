import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabaseAdmin';
import { requireRole } from './_lib/session';
import { getSupabaseHttpStatus, isJsonObject, withApiErrorHandling } from './_lib/http';

async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireRole(req, res, ['admin'])) return;
  const { id } = req.query;
  const hasId = id && typeof id === 'string';

  // GET /api/classes or /api/classes/:id
  if (req.method === 'GET') {
    if (hasId) {
      const { data, error } = await supabaseAdmin
        .from('classes')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('[GET /api/classes/:id] Supabase error:', error);
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Class not found' });
        }
        return res.status(500).json({ error: error.message });
      }
      return res.status(200).json(data);
    }

    const { data, error } = await supabaseAdmin
      .from('classes')
      .select('*')
      .order('nama', { ascending: true });

    if (error) {
      console.error('[GET /api/classes] Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json(data || []);
  }

  // POST /api/classes
  if (req.method === 'POST') {
    if (!isJsonObject(req.body)) return res.status(400).json({ error: 'Request body must be a JSON object' });
    const { data, error } = await supabaseAdmin
      .from('classes')
      .insert(req.body)
      .select()
      .single();

    if (error) {
      console.error('[POST /api/classes] Supabase error:', error);
      return res.status(getSupabaseHttpStatus(error)).json({ error: error.message, code: error.code });
    }
    return res.status(201).json(data);
  }

  // PUT/PATCH /api/classes/:id
  if ((req.method === 'PUT' || req.method === 'PATCH') && hasId) {
    if (!isJsonObject(req.body)) return res.status(400).json({ error: 'Request body must be a JSON object' });
    const { data, error } = await supabaseAdmin
      .from('classes')
      .update(req.body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[PUT/PATCH /api/classes/:id] Supabase error:', error);
      return res.status(getSupabaseHttpStatus(error)).json({ error: error.message, code: error.code });
    }
    return res.status(200).json(data);
  }

  // DELETE /api/classes/:id
  if (req.method === 'DELETE' && hasId) {
    const { data, error } = await supabaseAdmin
      .from('classes')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('[DELETE /api/classes/:id] Supabase error:', error);
      return res.status(getSupabaseHttpStatus(error)).json({ error: error.message, code: error.code });
    }
    if (!data) return res.status(404).json({ error: 'Class not found' });
    return res.status(204).send('');
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withApiErrorHandling(handler);