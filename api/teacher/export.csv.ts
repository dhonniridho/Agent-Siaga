import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  getSql,
  initializeDatabase,
  readCookie,
  sendJson,
  verifySession,
} from '../../../server/vercel-auth.js';

function csvCell(value: unknown) {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

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

    const sql = getSql();
    const rows = await sql`
      SELECT c.name AS class_name, c.code AS class_code,
             t.name AS team_name, t.avatar_id,
             r.disaster_type, r.action_score, r.recovery_score,
             r.total_score, r.duration_seconds, r.created_at
      FROM results r
      JOIN teams t ON t.id = r.team_id
      LEFT JOIN classes c ON c.id = t.class_id
      WHERE c.teacher_id = ${teacherId}
      ORDER BY c.name, t.name, r.id
    `;

    const header = [
      'kelas',
      'kode_kelas',
      'tim',
      'avatar',
      'bencana',
      'skor_aksi',
      'skor_kuis',
      'total',
      'waktu',
      'waktu_pengerjaan_detik',
    ];
    const lines = [header.join(',')];
    for (const row of rows) {
      lines.push(
        [
          row.class_name,
          row.class_code,
          row.team_name,
          row.avatar_id,
          row.disaster_type,
          row.action_score,
          row.recovery_score,
          row.total_score,
          row.created_at,
          row.duration_seconds,
        ]
          .map(csvCell)
          .join(',')
      );
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="agent-siaga-rekap-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.end(`\ufeff${lines.join('\r\n')}`);
  } catch (error) {
    console.error('[EXPORT CSV ERROR]', error);
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : 'Gagal mengekspor CSV.',
    });
  }
}
