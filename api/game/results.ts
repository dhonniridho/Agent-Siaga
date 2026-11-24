import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  cleanText, getSql, initializeDatabase, readBody, sendJson,
  verifyTeamToken, getTeamProgress
} from '../../server/vercel-auth.js';

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
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
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
  } catch (error) {
    console.error('[RESULTS ERROR]', error);
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : 'Gagal menyimpan hasil.',
    });
  }
}
