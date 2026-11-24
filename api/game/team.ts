import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  getSql, initializeDatabase, sendJson,
  verifyTeamToken, getTeamProgress
} from '../../server/vercel-auth.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    sendJson(res, 405, { error: 'Metode tidak diizinkan.' });
    return;
  }
  try {
    await initializeDatabase();
    const token = (req.headers['x-team-token'] as string) || '';
    const teamId = verifyTeamToken(token);
    if (!teamId) {
      sendJson(res, 401, { error: 'Token tim tidak valid. Daftarkan tim kembali.' });
      return;
    }
    const sql = getSql();
    const teamRows = await sql`
      SELECT t.*, c.name as class_name, c.code as class_code
      FROM teams t
      LEFT JOIN classes c ON c.id = t.class_id
      WHERE t.id = ${teamId}
    `;
    const team = teamRows[0];
    if (!team) {
      sendJson(res, 404, { error: 'Tim tidak ditemukan.' });
      return;
    }
    const progress = await getTeamProgress(teamId);
    sendJson(res, 200, {
      team: {
        id: Number(team.id),
        name: team.name,
        avatarId: team.avatar_id,
        className: team.class_name || '-',
        classCode: team.class_code || '-',
        progress,
      },
    });
  } catch (error) {
    console.error('[GET TEAM ERROR]', error);
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : 'Gagal memuat tim.',
    });
  }
}
