import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  const hasId = id && typeof id === 'string';

  // GET /api/teachers or /api/teachers/:id
  if (req.method === 'GET') {
    if (hasId) {
      const { data, error } = await supabaseAdmin
        .from('teachers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Teacher not found' });
        }
        return res.status(500).json({ error: error.message });
      }
      return res.status(200).json(data);
    }

    const { data, error } = await supabaseAdmin
      .from('teachers')
      .select('*')
      .order('nama', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json(data || []);
  }

  // POST /api/teachers
  if (req.method === 'POST') {
    const { data, error } = await supabaseAdmin
      .from('teachers')
      .insert(req.body)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(201).json(data);
  }

  // PUT/PATCH /api/teachers/:id
  if ((req.method === 'PUT' || req.method === 'PATCH') && hasId) {
    const { data, error } = await supabaseAdmin
      .from('teachers')
      .update(req.body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json(data);
  }

  // DELETE /api/teachers/:id
  if (req.method === 'DELETE' && hasId) {
    const { error } = await supabaseAdmin
      .from('teachers')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(204).send('');
  }

  return res.status(405).json({ error: 'Method not allowed' });
}