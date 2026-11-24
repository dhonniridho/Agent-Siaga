import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  cleanText, getSql, initializeDatabase, readBody, sendJson, setCookie,
  signSession, teacherClasses, verifyPassword,
} from '../../server/vercel-auth';

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
  } catch (error) {
    console.error('[AUTH LOGIN ERROR]', error);
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : 'Gagal masuk.',
    });
  }
}
