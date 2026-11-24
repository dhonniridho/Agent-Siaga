import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  cleanText, getSql, initializeDatabase, readBody, sendJson,
  signTeamToken, getTeamProgress
} from '../../server/vercel-auth.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJson(res, 405, { error: 'Metode tidak diizinkan.' });
    return;
  }
  try {
    await initializeDatabase();
    const body = await readBody(req);
    const teamName = cleanText(body.teamName, 24);
    const avatarId = cleanText(body.avatarId, 10);
    const classCode = cleanText(body.classCode, 20).toUpperCase();

    if (!teamName) {
      sendJson(res, 400, { error: 'Nama tim wajib diisi.' });
      return;
    }

    const sql = getSql();
    let classRow: any = null;
    if (classCode) {
      const rows = await sql`SELECT * FROM classes WHERE UPPER(code) = ${classCode}`;
      classRow = rows[0];
    } else {
      const rows = await sql`SELECT * FROM classes ORDER BY id ASC LIMIT 1`;
      classRow = rows[0];
    }

    if (!classRow) {
      sendJson(res, 404, {
        error: classCode
          ? 'Kode kelas tidak ditemukan. Periksa kembali dari guru.'
          : 'Belum ada kelas di database. Guru perlu membuat kelas dulu.',
      });
      return;
    }

    let teamRows = await sql`SELECT * FROM teams WHERE class_id = ${classRow.id} AND name = ${teamName}`;
    let team = teamRows[0];

    if (team) {
      await sql`UPDATE teams SET avatar_id = ${avatarId || team.avatar_id || null}, last_seen = NOW() WHERE id = ${team.id}`;
    } else {
      const inserted = await sql`
        INSERT INTO teams (class_id, name, avatar_id)
        VALUES (${classRow.id}, ${teamName}, ${avatarId || null})
        RETURNING *
      `;
      team = inserted[0];
    }

    const token = signTeamToken(Number(team.id));
    const progress = await getTeamProgress(Number(team.id));

    sendJson(res, 201, {
      teamToken: token,
      team: {
        id: Number(team.id),
        name: team.name,
        avatarId: team.avatar_id,
        className: classRow.name,
        classCode: classRow.code,
        progress,
      },
    });
  } catch (error) {
    console.error('[TEAMS REGISTER ERROR]', error);
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : 'Gagal mendaftarkan tim.',
    });
  }
}
