import type { VercelRequest, VercelResponse } from "../_lib/vercelTypes";
import { supabaseAdmin } from '../_lib/supabaseAdmin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const { target_type, target_id, status } = req.query;
    let query = supabaseAdmin.from('leave_requests').select('*').order('created_at', { ascending: false });

    if (target_type && typeof target_type === 'string') {
      query = query.eq('target_type', target_type);
    }
    if (target_id && typeof target_id === 'string') {
      query = query.eq('target_id', target_id);
    }
    if (status && typeof status === 'string') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json(data || []);
  }

  if (req.method === 'POST') {
    const { data, error } = await supabaseAdmin
      .from('leave_requests')
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
