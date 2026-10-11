import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json(data || []);
  }

  // POST /api/students
  if (req.method === 'POST') {
    const { data, error } = await supabaseAdmin
      .from('students')
      .insert(req.body)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(201).json(data);
  }

  // PUT/PATCH /api/students/:id
  if ((req.method === 'PUT' || req.method === 'PATCH') && hasId) {
    const { data, error } = await supabaseAdmin
      .from('students')
      .update(req.body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json(data);
  }

  // DELETE /api/students/:id
  if (req.method === 'DELETE' && hasId) {
    const { error } = await supabaseAdmin
      .from('students')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(204).send('');
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
