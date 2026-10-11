import type { VercelRequest, VercelResponse } from "./_lib/vercelTypes";
import { supabaseAdmin } from './_lib/supabaseAdmin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json(data || []);
  }

  // POST /api/classes
  if (req.method === 'POST') {
    const { data, error } = await supabaseAdmin
      .from('classes')
      .insert(req.body)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(201).json(data);
  }

  // PUT/PATCH /api/classes/:id
  if ((req.method === 'PUT' || req.method === 'PATCH') && hasId) {
    const { data, error } = await supabaseAdmin
      .from('classes')
      .update(req.body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json(data);
  }

  // DELETE /api/classes/:id
  if (req.method === 'DELETE' && hasId) {
    const { error } = await supabaseAdmin
      .from('classes')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(204).send('');
  }

  return res.status(405).json({ error: 'Method not allowed' });
}


