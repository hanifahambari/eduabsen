import type { VercelRequest, VercelResponse } from '../_lib/vercelTypes';
import { supabaseAdmin } from '../_lib/supabaseAdmin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid ID' });
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    const { decision, reviewer_id } = req.body;

    if (!decision || !['Disetujui', 'Ditolak'].includes(decision)) {
      return res.status(400).json({ error: 'Invalid decision' });
    }

    const { data, error } = await supabaseAdmin
      .from('correction_requests')
      .update({
        status: decision,
        reviewed_by: reviewer_id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}