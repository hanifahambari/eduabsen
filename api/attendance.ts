import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const { target_type, target_id, date, rombel } = req.query;
    let query = supabaseAdmin.from('attendance').select('*').order('created_at', { ascending: false });

    if (target_type && typeof target_type === 'string') {
      query = query.eq('target_type', target_type);
    }
    if (target_id && typeof target_id === 'string') {
      query = query.eq('target_id', target_id);
    }
    if (date && typeof date === 'string') {
      query = query.eq('date', date);
    }
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
      .from('attendance')
      .upsert(req.body, { onConflict: 'target_type,target_id,date' })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(201).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
