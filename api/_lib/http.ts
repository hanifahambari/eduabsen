import type { VercelRequest, VercelResponse } from '@vercel/node';

export interface SupabaseErrorInfo {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
}

export function getSupabaseHttpStatus(error: SupabaseErrorInfo): number {
  if (error.code === 'PGRST116') return 404;
  if (error.code === '42501') return 403;
  if (/^(22|23)/.test(error.code || '')) return 400;
  return 500;
}

export function isJsonObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function withApiErrorHandling(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<unknown>,
) {
  return async (req: VercelRequest, res: VercelResponse): Promise<void> => {
    try {
      await handler(req, res);
    } catch (error) {
      const failure = error instanceof Error ? error : new Error(String(error));
      console.error('api.unhandled_error', {
        method: req.method,
        url: req.url,
        message: failure.message,
        stack: failure.stack,
      });
      if (!res.headersSent) {
        res.status(500).json({ error: 'Terjadi kesalahan server saat memproses permintaan.' });
      }
    }
  };
}
