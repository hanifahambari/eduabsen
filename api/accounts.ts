import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_lib/supabaseAdmin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  const hasId = id && typeof id === 'string';

  // GET /api/accounts or /api/accounts/:id
  if (req.method === 'GET') {
    if (hasId) {
      const { data, error } = await supabaseAdmin
        .from('user_accounts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('[GET /api/accounts/:id] Supabase error:', error);
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Account not found' });
        }
        return res.status(500).json({ error: error.message });
      }
      return res.status(200).json(data);
    }

    const { data, error } = await supabaseAdmin
      .from('user_accounts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[GET /api/accounts] Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json(data || []);
  }

  // POST /api/accounts
  if (req.method === 'POST') {
    const { data, error } = await supabaseAdmin
      .from('user_accounts')
      .insert(req.body)
      .select()
      .single();

    if (error) {
      console.error('[POST /api/accounts] Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }
    return res.status(201).json(data);
  }

  // PUT/PATCH /api/accounts/:id
  if ((req.method === 'PUT' || req.method === 'PATCH') && hasId) {
    const { data, error } = await supabaseAdmin
      .from('user_accounts')
      .update(req.body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[PUT/PATCH /api/accounts/:id] Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json(data);
  }

  // DELETE /api/accounts/:id
  if (req.method === 'DELETE' && hasId) {
    const { error } = await supabaseAdmin
      .from('user_accounts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[DELETE /api/accounts/:id] Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }
    return res.status(204).send('');
  }

  return res.status(405).json({ error: 'Method not allowed' });
}