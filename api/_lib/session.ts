import { createHmac, timingSafeEqual } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { UserRole } from '../../types';

const COOKIE_NAME = 'eduabsen_session';
const SESSION_DURATION_SECONDS = 8 * 60 * 60;

export interface ApiSession {
  id: string;
  role: UserRole;
  nama: string;
  exp: number;
}

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || secret.length < 32) {
    throw new Error('Configure SESSION_SECRET or SUPABASE_SERVICE_ROLE_KEY with at least 32 characters');
  }
  return secret;
}

function sign(value: string): string {
  return createHmac('sha256', getSessionSecret()).update(value).digest('base64url');
}

export function setSessionCookie(
  response: VercelResponse,
  account: { id: string; target_id: string | null; role: UserRole; nama: string },
): void {
  const payload: ApiSession = {
    id: account.target_id || account.id,
    role: account.role,
    nama: account.nama,
    exp: Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const token = `${encoded}.${sign(encoded)}`;
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  response.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_DURATION_SECONDS}${secure}`,
  );
}

export function requireSession(req: VercelRequest, res: VercelResponse): ApiSession | null {
  const cookieHeader = req.headers.cookie;
  const cookieString = Array.isArray(cookieHeader) ? cookieHeader.join(';') : cookieHeader || '';
  const token = cookieString
    .split(';')
    .map(part => part.trim())
    .find(part => part.startsWith(`${COOKIE_NAME}=`))
    ?.slice(COOKIE_NAME.length + 1);

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }

  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) {
    res.status(401).json({ error: 'Invalid session' });
    return null;
  }

  try {
    const expected = Buffer.from(sign(encoded));
    const supplied = Buffer.from(signature);
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
      res.status(401).json({ error: 'Invalid session' });
      return null;
    }

    const session = JSON.parse(Buffer.from(encoded, 'base64url').toString()) as ApiSession;
    if (!session.id || !session.nama || !['admin', 'kepala', 'guru', 'siswa'].includes(session.role) || session.exp <= Date.now() / 1000) {
      res.status(401).json({ error: 'Session expired or invalid' });
      return null;
    }
    return session;
  } catch (error) {
    console.error('session.validation_failed', error);
    res.status(401).json({ error: 'Invalid session' });
    return null;
  }
}

export function requireRole(
  req: VercelRequest,
  res: VercelResponse,
  roles: UserRole[],
): ApiSession | null {
  const session = requireSession(req, res);
  if (!session) return null;
  if (!roles.includes(session.role)) {
    res.status(403).json({ error: 'You do not have permission to perform this action' });
    return null;
  }
  return session;
}
