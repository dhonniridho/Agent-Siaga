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
} from '../../../server/vercel-auth.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
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

    const body = await readBody(req);
    const name = cleanText(body.name, 80);
    const requestedCode = cleanText(body.code, 20).toUpperCase();

    if (!name) {
      sendJson(res, 400, { error: 'Nama kelas wajib diisi.' });
      return;
    }

    const prefix = cleanText(name, 8)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 5) || 'KELAS';
    let code = requestedCode || `${prefix}${100 + Math.floor(Math.random() * 900)}`;

    if (!/^[A-Z0-9-]{3,20}$/.test(code)) {
      sendJson(res, 400, {
        error: 'Kode kelas hanya boleh huruf, angka, dan tanda minus (3-20 karakter).',
      });
      return;
    }

    const sql = getSql();
    const existing = await sql`SELECT id FROM classes WHERE code = ${code}`;
    if (existing.length > 0) {
      sendJson(res, 409, { error: 'Kode kelas sudah dipakai.' });
      return;
    }

    await sql`
      INSERT INTO classes (teacher_id, name, code)
      VALUES (${teacherId}, ${name}, ${code})
    `;

    sendJson(res, 201, { classes: await teacherClasses(teacherId) });
  } catch (error) {
    console.error('[CREATE CLASS ERROR]', error);
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : 'Gagal membuat kelas.',
    });
  }
}
