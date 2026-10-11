import type { VercelRequest, VercelResponse } from "./_lib/vercelTypes";
import { supabaseAdmin } from './_lib/supabaseAdmin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const { limit } = req.query;
    const { data, error } = await supabaseAdmin
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit ? parseInt(limit as string) : 100);

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json(data || []);
  }

  if (req.method === 'POST') {
    const { data, error } = await supabaseAdmin
      .from('activity_logs')
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




