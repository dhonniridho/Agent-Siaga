import type { IncomingMessage, ServerResponse } from 'node:http';
import { clearCookie, sendJson } from '../../server/vercel-auth';

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse & { status: (n: number) => any; json: (body: unknown) => void }
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJson(res, 405, { error: 'Metode tidak diizinkan.' });
    return;
  }
  clearCookie(res);
  sendJson(res, 200, { ok: true });
}
