import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  getSql, initializeDatabase, readCookie, sendJson, teacherClasses, verifySession,
} from '../../server/vercel-auth';

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse & { status: (n: number) => any; json: (body: unknown) => void }
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    sendJson(res, 405, { error: 'Metode tidak diizinkan.' });
    return;
  }
  try {
    await initializeDatabase();
    const teacherId = verifySession(readCookie(req, 'siaga_session'));
    if (!teacherId) {
      sendJson(res, 401, { error: 'Sesi guru tidak valid.' });
      return;
    }
    const sql = getSql();
    const rows = await sql`SELECT id, name, email FROM teachers WHERE id = ${teacherId}`;
    if (!rows[0]) {
      sendJson(res, 401, { error: 'Sesi guru tidak valid.' });
      return;
    }
    sendJson(res, 200, {
      teacher: rows[0],
      classes: await teacherClasses(teacherId),
    });
  } catch (error) {
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : 'Gagal memeriksa sesi.',
    });
  }
}
