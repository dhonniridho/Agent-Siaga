import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  cleanText, getSql, initializeDatabase, sendJson
} from '../../server/vercel-auth.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    sendJson(res, 405, { error: 'Metode tidak diizinkan.' });
    return;
  }
  try {
    await initializeDatabase();
    const url = new URL(req.url || '', 'http://localhost');
    const classCode = cleanText(url.searchParams.get('classCode'), 20).toUpperCase();

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
      sendJson(res, 200, { className: null, classCode: null, teams: [] });
      return;
    }

    const teams = await sql`
      SELECT t.id, t.name, t.avatar_id,
             COALESCE(SUM(best.best_score), 0)::int AS total_score,
             COUNT(best.disaster_type)::int AS missions_done
      FROM teams t
      LEFT JOIN (
        SELECT team_id, disaster_type, MAX(total_score) AS best_score
        FROM results GROUP BY team_id, disaster_type
      ) best ON best.team_id = t.id
      WHERE t.class_id = ${classRow.id}
      GROUP BY t.id
      ORDER BY total_score DESC, t.name ASC
      LIMIT 20
    `;

    sendJson(res, 200, {
      className: classRow.name,
      classCode: classRow.code,
      teams: teams.map((row: any, index: number) => ({
        rank: index + 1,
        id: Number(row.id),
        name: row.name,
        avatarId: row.avatar_id,
        totalScore: Number(row.total_score) || 0,
        missionsDone: Number(row.missions_done) || 0,
      })),
    });
  } catch (error) {
    console.error('[LEADERBOARD ERROR]', error);
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : 'Gagal memuat papan peringkat.',
    });
  }
}
