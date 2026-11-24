import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  cleanText, getSql, hashPassword, initializeDatabase, readBody, sendJson,
  setCookie, signSession, teacherClasses,
} from '../../server/vercel-auth.js';

export default async function handler(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse & { status: (n: number) => any; json: (body: unknown) => void }
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJson(res, 405, { error: 'Metode tidak diizinkan.' });
    return;
  }
  try {
    await initializeDatabase();
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
  } catch (error) {
    console.error('[AUTH REGISTER ERROR]', error);
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : 'Gagal mendaftarkan guru.',
    });
  }
}
