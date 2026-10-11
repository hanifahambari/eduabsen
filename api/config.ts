import type { VercelRequest, VercelResponse } from "../_lib/vercelTypes";
import { supabaseAdmin } from '../_lib/supabaseAdmin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { type } = req.query;
  const configType = type && typeof type === 'string' ? type : 'madrasah';

  // GET /api/config?type=madrasah|holidays|schedule
  if (req.method === 'GET') {
    let table: string;
    let orderColumn: string | null = null;

    switch (configType) {
      case 'holidays':
        table = 'holidays';
        orderColumn = 'tanggal';
        break;
      case 'schedule':
        table = 'schedule_config';
        break;
      case 'madrasah':
      default:
        table = 'madrasah_config';
        break;
    }

    let query = supabaseAdmin.from(table).select('*');
    if (orderColumn) {
      query = query.order(orderColumn, { ascending: true });
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json(data || []);
  }

  // POST /api/config?type=holidays
  if (req.method === 'POST' && configType === 'holidays') {
    const { data, error } = await supabaseAdmin
      .from('holidays')
      .insert(req.body)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(201).json(data);
  }

  // PUT/PATCH /api/config?type=madrasah|schedule
  if ((req.method === 'PUT' || req.method === 'PATCH') && (configType === 'madrasah' || configType === 'schedule')) {
    const table = configType === 'madrasah' ? 'madrasah_config' : 'schedule_config';
    const { data, error } = await supabaseAdmin
      .from(table)
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

