import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  cleanText,
  getSql,
  getTeamProgress,
  initializeDatabase,
  readBody,
  sendJson,
  signTeamToken,
  verifyTeamToken,
} from '../server/vercel-auth.js';

const DISASTERS = new Set(['EARTHQUAKE', 'FLOOD', 'LANDSLIDE', 'VOLCANO']);

function clampScore(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function clampDuration(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(3600, Math.round(n)));
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || '', 'http://localhost');
  const path = url.pathname.toLowerCase();

  try {
    await initializeDatabase();

    // 1. REGISTER TEAMS: POST /api/game/teams
    if (path.endsWith('/teams')) {
      if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        sendJson(res, 405, { error: 'Metode tidak diizinkan.' });
        return;
      }
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
      return;
    }

    // 2. CHECK TEAM SESSION: GET /api/game/team
    if (path.endsWith('/team')) {
      if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        sendJson(res, 405, { error: 'Metode tidak diizinkan.' });
        return;
      }
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
      return;
    }

    // 3. SAVE RESULTS: POST /api/game/results
    if (path.endsWith('/results')) {
      if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        sendJson(res, 405, { error: 'Metode tidak diizinkan.' });
        return;
      }
      const token = (req.headers['x-team-token'] as string) || '';
      const teamId = verifyTeamToken(token);
      if (!teamId) {
        sendJson(res, 401, { error: 'Token tim tidak valid. Daftarkan tim kembali.' });
        return;
      }

      const body = await readBody(req);
      const disasterType = cleanText(body.disasterType, 20).toUpperCase();
      if (!DISASTERS.has(disasterType)) {
        sendJson(res, 400, { error: 'Jenis bencana tidak dikenal.' });
        return;
      }

      const actionScore = clampScore(body.actionScore);
      const recoveryScore = clampScore(body.recoveryScore);
      const totalScore = actionScore + recoveryScore;
      const detail = body.detail ? JSON.stringify(body.detail).slice(0, 4000) : null;
      const durationSeconds = clampDuration(body.durationSeconds);

      const sql = getSql();
      await sql`
        INSERT INTO results
          (team_id, disaster_type, action_score, recovery_score, total_score, duration_seconds, detail)
        VALUES (${teamId}, ${disasterType}, ${actionScore}, ${recoveryScore}, ${totalScore}, ${durationSeconds}, ${detail})
      `;
      await sql`UPDATE teams SET last_seen = NOW() WHERE id = ${teamId}`;

      const progress = await getTeamProgress(teamId);
      sendJson(res, 201, {
        ok: true,
        totalScore,
        progress,
      });
      return;
    }

    // 4. LEADERBOARD: GET /api/game/leaderboard
    if (path.endsWith('/leaderboard')) {
      if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        sendJson(res, 405, { error: 'Metode tidak diizinkan.' });
        return;
      }
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
      return;
    }

    sendJson(res, 404, { error: 'Endpoint game tidak ditemukan.' });
  } catch (error) {
    console.error('[GAME API ERROR]', error);
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : 'Terjadi kesalahan pada server.',
    });
  }
}
