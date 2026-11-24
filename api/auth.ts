import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  cleanText,
  clearCookie,
  getSql,
  hashPassword,
  initializeDatabase,
  readBody,
  readCookie,
  sendJson,
  setCookie,
  signSession,
  teacherClasses,
  verifyPassword,
  verifySession,
} from '../server/vercel-auth.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || '', 'http://localhost');
  const path = url.pathname.toLowerCase();

  try {
    await initializeDatabase();

    // 1. LOGIN: POST /api/auth/login
    if (path.endsWith('/login')) {
      if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        sendJson(res, 405, { error: 'Metode tidak diizinkan.' });
        return;
      }
      const body = await readBody(req);
      const email = cleanText(body.email, 160).toLowerCase();
      const password = String(body.password ?? '');
      if (!email || !password) {
        sendJson(res, 400, { error: 'Email dan password wajib diisi.' });
        return;
      }
      const sql = getSql();
      const rows = await sql`SELECT * FROM teachers WHERE email = ${email}`;
      const teacher = rows[0];
      if (!teacher || !verifyPassword(password, teacher.password_hash)) {
        sendJson(res, 401, { error: 'Email atau password salah.' });
        return;
      }
      const teacherId = Number(teacher.id);
      setCookie(res, signSession(teacherId));
      sendJson(res, 200, {
        teacher: { id: teacherId, name: teacher.name, email: teacher.email },
        classes: await teacherClasses(teacherId),
      });
      return;
    }

    // 2. REGISTER: POST /api/auth/register
    if (path.endsWith('/register')) {
      if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        sendJson(res, 405, { error: 'Metode tidak diizinkan.' });
        return;
      }
      const body = await readBody(req);
      const name = cleanText(body.name, 80);
      const email = cleanText(body.email, 160).toLowerCase();
      const password = String(body.password ?? '');
      const inviteCode = cleanText(body.inviteCode, 40).toUpperCase();

      if (!name || !email || !password) {
        sendJson(res, 400, { error: 'Nama, email, dan password wajib diisi.' });
        return;
      }
      if (password.length < 6) {
        sendJson(res, 400, { error: 'Password minimal 6 karakter.' });
        return;
      }
      if (inviteCode !== (process.env.SIAGA_INVITE_CODE || 'AGENT-SIAGA').toUpperCase()) {
        sendJson(res, 403, { error: 'Kode undangan guru tidak cocok.' });
        return;
      }
      const sql = getSql();
      const existing = await sql`SELECT id FROM teachers WHERE email = ${email}`;
      if (existing.length > 0) {
        sendJson(res, 409, { error: 'Email tersebut sudah terdaftar.' });
        return;
      }
      const inserted = await sql`
        INSERT INTO teachers (name, email, password_hash)
        VALUES (${name}, ${email}, ${hashPassword(password)})
        RETURNING id
      `;
      const teacherId = Number(inserted[0].id);
      let code = `${name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5) || 'KELAS'}${100 + Math.floor(Math.random() * 900)}`;
      for (let i = 0; i < 20; i += 1) {
        const found = await sql`SELECT id FROM classes WHERE code = ${code}`;
        if (found.length === 0) break;
        code = `${name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5) || 'KELAS'}${100 + Math.floor(Math.random() * 900)}`;
      }
      await sql`
        INSERT INTO classes (teacher_id, name, code)
        VALUES (${teacherId}, ${'Kelas Baru'}, ${code})
      `;
      setCookie(res, signSession(teacherId));
      sendJson(res, 201, {
        teacher: { id: teacherId, name, email },
        classes: await teacherClasses(teacherId),
      });
      return;
    }

    // 3. LOGOUT: POST /api/auth/logout
    if (path.endsWith('/logout')) {
      if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        sendJson(res, 405, { error: 'Metode tidak diizinkan.' });
        return;
      }
      clearCookie(res);
      sendJson(res, 200, { ok: true });
      return;
    }

    // 4. ME: GET /api/auth/me
    if (path.endsWith('/me')) {
      if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        sendJson(res, 405, { error: 'Metode tidak diizinkan.' });
        return;
      }
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
      return;
    }

    sendJson(res, 404, { error: 'Endpoint auth tidak ditemukan.' });
  } catch (error) {
    console.error('[AUTH API ERROR]', error);
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : 'Terjadi kesalahan pada server.',
    });
  }
}
