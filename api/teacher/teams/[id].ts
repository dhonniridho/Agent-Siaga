import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  getSql,
  getTeamProgress,
  initializeDatabase,
  readCookie,
  sendJson,
  verifySession,
} from '../../../server/vercel-auth.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET' && req.method !== 'DELETE') {
    res.setHeader('Allow', 'GET, DELETE');
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
    const match = url.pathname.match(/teams\/(\d+)/);
    const teamId = Number((req as any).query?.id || (match ? match[1] : 0));

    const sql = getSql();
    const teamRows = await sql`SELECT * FROM teams WHERE id = ${teamId}`;
    const team = teamRows[0];
    if (!team) {
      sendJson(res, 404, { error: 'Tim tidak ditemukan.' });
      return;
    }

    if (team.class_id) {
      const classRows = await sql`
        SELECT * FROM classes WHERE id = ${team.class_id} AND teacher_id = ${teacherId}
      `;
      if (classRows.length === 0) {
        sendJson(res, 403, { error: 'Tim bukan milik kelas Anda.' });
        return;
      }
    }

    if (req.method === 'DELETE') {
      await sql`DELETE FROM teams WHERE id = ${teamId}`;
      sendJson(res, 200, { ok: true });
      return;
    }

    const classRow = team.class_id
      ? (await sql`SELECT * FROM classes WHERE id = ${team.class_id}`)[0]
      : null;

    const results = await sql`
      SELECT * FROM results WHERE team_id = ${teamId} ORDER BY id DESC
    `;

    const progress = await getTeamProgress(teamId);

    sendJson(res, 200, {
      team: {
        id: Number(team.id),
        name: team.name,
        avatarId: team.avatar_id,
        className: classRow?.name || '-',
        classCode: classRow?.code || '-',
        createdAt: team.created_at,
        lastSeen: team.last_seen,
        progress,
      },
      results: results.map((row: any) => {
        let parsedDetail = null;
        if (row.detail) {
          try {
            parsedDetail = JSON.parse(row.detail);
          } catch {
            parsedDetail = null;
          }
        }
        return {
          id: Number(row.id),
          disasterType: row.disaster_type,
          actionScore: Number(row.action_score) || 0,
          recoveryScore: Number(row.recovery_score) || 0,
          totalScore: Number(row.total_score) || 0,
          durationSeconds: Number(row.duration_seconds) || 0,
          detail: parsedDetail,
          createdAt: row.created_at,
        };
      }),
    });
  } catch (error) {
    console.error('[GET/DELETE TEAM ERROR]', error);
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : 'Gagal memproses data tim.',
    });
  }
}
