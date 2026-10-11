import type { VercelRequest, VercelResponse } from "../_lib/vercelTypes";
import { supabaseAdmin } from '../_lib/supabaseAdmin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('madrasah_config')
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json(data);
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    const { data, error } = await supabaseAdmin
      .from('madrasah_config')
      .upsert(req.body)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
