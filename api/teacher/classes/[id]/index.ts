import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  cleanText,
  getSql,
  initializeDatabase,
  readBody,
  readCookie,
  sendJson,
  teacherClasses,
  verifySession,
} from '../../../../server/vercel-auth.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'PATCH' && req.method !== 'DELETE') {
    res.setHeader('Allow', 'PATCH, DELETE');
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

    const url = new URL(req.url || '', 'http://localhost');
    const match = url.pathname.match(/classes\/(\d+)/);
    const classId = Number((req as any).query?.id || (match ? match[1] : 0));

    const sql = getSql();
    const check = await sql`
      SELECT id FROM classes WHERE id = ${classId} AND teacher_id = ${teacherId}
    `;
    if (check.length === 0) {
      sendJson(res, 404, { error: 'Kelas tidak ditemukan.' });
      return;
    }

    if (req.method === 'DELETE') {
      await sql`DELETE FROM classes WHERE id = ${classId}`;
      sendJson(res, 200, { classes: await teacherClasses(teacherId) });
      return;
    }

    const body = await readBody(req);
    const name = cleanText(body.name, 80);
    const code = cleanText(body.code, 20).toUpperCase();

    if (name) {
      await sql`UPDATE classes SET name = ${name} WHERE id = ${classId}`;
    }
    if (code) {
      if (!/^[A-Z0-9-]{3,20}$/.test(code)) {
        sendJson(res, 400, { error: 'Format kode kelas tidak valid.' });
        return;
      }
      const existing = await sql`SELECT id FROM classes WHERE code = ${code} AND id != ${classId}`;
      if (existing.length > 0) {
        sendJson(res, 409, { error: 'Kode kelas sudah dipakai.' });
        return;
      }
      await sql`UPDATE classes SET code = ${code} WHERE id = ${classId}`;
    }

    sendJson(res, 200, { classes: await teacherClasses(teacherId) });
  } catch (error) {
    console.error('[UPDATE/DELETE CLASS ERROR]', error);
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : 'Gagal memperbarui kelas.',
    });
  }
}
