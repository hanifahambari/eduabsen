import type { VercelRequest, VercelResponse } from "../_lib/vercelTypes";
import { supabaseAdmin } from '../_lib/supabaseAdmin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const { rombel } = req.query;
    let query = supabaseAdmin.from('students').select('*').order('nama', { ascending: true });

    if (rombel && typeof rombel === 'string') {
      query = query.eq('rombel', rombel);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json(data || []);
  }

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

  return res.status(405).json({ error: 'Method not allowed' });
}
