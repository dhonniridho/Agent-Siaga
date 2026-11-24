import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  getSql,
  getTeamProgress,
  initializeDatabase,
  readCookie,
  sendJson,
  verifySession,
} from '../../../../server/vercel-auth.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
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

    const url = new URL(req.url || '', 'http://localhost');
    const match = url.pathname.match(/classes\/(\d+)\/teams/);
    const classId = Number((req as any).query?.id || (match ? match[1] : 0));

    const sql = getSql();
    const classRows = await sql`
      SELECT * FROM classes WHERE id = ${classId} AND teacher_id = ${teacherId}
    `;
    if (classRows.length === 0) {
      sendJson(res, 404, { error: 'Kelas tidak ditemukan.' });
      return;
    }

    const teams = await sql`
      SELECT t.*,
             COALESCE(SUM(best.best_score), 0)::int AS total_score,
             COUNT(best.disaster_type)::int AS missions_done
      FROM teams t
      LEFT JOIN (
        SELECT team_id, disaster_type, MAX(total_score) AS best_score
        FROM results GROUP BY team_id, disaster_type
      ) best ON best.team_id = t.id
      WHERE t.class_id = ${classId}
      GROUP BY t.id
      ORDER BY total_score DESC, t.name ASC
    `;

    const teamsWithProgress = await Promise.all(
      teams.map(async (row: any) => ({
        id: Number(row.id),
        name: row.name,
        avatarId: row.avatar_id,
        totalScore: Number(row.total_score) || 0,
        missionsDone: Number(row.missions_done) || 0,
        createdAt: row.created_at,
        lastSeen: row.last_seen,
        progress: await getTeamProgress(Number(row.id)),
      }))
    );

    sendJson(res, 200, {
      className: classRows[0].name,
      teams: teamsWithProgress,
    });
  } catch (error) {
    console.error('[GET CLASS TEAMS ERROR]', error);
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : 'Gagal memuat tim kelas.',
    });
  }
}
