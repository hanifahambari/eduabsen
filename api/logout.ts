import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withApiErrorHandling } from './_lib/http';

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `eduabsen_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure}`);
  return res.status(204).send('');
}

export default withApiErrorHandling(handler);
