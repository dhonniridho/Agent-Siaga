import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  getSql,
  initializeDatabase,
  readCookie,
  sendJson,
  teacherClasses,
  verifySession,
} from '../../server/vercel-auth.js';

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse & { status: (n: number) => any; json: (body: unknown) => void }
) {
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
    const teacherRows = await sql`SELECT id, name, email FROM teachers WHERE id = ${teacherId}`;
    const teacher = teacherRows[0];
    if (!teacher) {
      sendJson(res, 401, { error: 'Sesi guru tidak valid.' });
      return;
    }
    const stats = await sql`
      SELECT
        (SELECT COUNT(*)::int FROM classes WHERE teacher_id = ${teacherId}) AS classes,
        (SELECT COUNT(*)::int FROM teams t JOIN classes c ON c.id = t.class_id WHERE c.teacher_id = ${teacherId}) AS teams,
        (SELECT COUNT(*)::int FROM results r JOIN teams t ON t.id = r.team_id JOIN classes c ON c.id = t.class_id WHERE c.teacher_id = ${teacherId}) AS attempts,
        (SELECT COALESCE(ROUND(AVG(r.total_score)), 0)::int FROM results r JOIN teams t ON t.id = r.team_id JOIN classes c ON c.id = t.class_id WHERE c.teacher_id = ${teacherId}) AS avg_score
    `;
    const perDisaster = await sql`
      SELECT disaster_type, COUNT(*)::int AS attempts,
             COALESCE(ROUND(AVG(total_score)), 0)::int AS avg_score,
             COALESCE(MAX(total_score), 0)::int AS best_score
      FROM results r
      JOIN teams t ON t.id = r.team_id
      JOIN classes c ON c.id = t.class_id
      WHERE c.teacher_id = ${teacherId}
      GROUP BY disaster_type
    `;
    const recent = await sql`
      SELECT r.id, r.disaster_type, r.action_score, r.recovery_score,
             r.total_score, r.duration_seconds, r.created_at,
             t.name AS team_name, t.avatar_id,
             c.name AS class_name
      FROM results r
      JOIN teams t ON t.id = r.team_id
      JOIN classes c ON c.id = t.class_id
      WHERE c.teacher_id = ${teacherId}
      ORDER BY r.id DESC
      LIMIT 20
    `;
    sendJson(res, 200, {
      teacher: { id: Number(teacher.id), name: teacher.name, email: teacher.email },
      stats: {
        classes: Number(stats[0].classes) || 0,
        teams: Number(stats[0].teams) || 0,
        attempts: Number(stats[0].attempts) || 0,
        avgScore: Number(stats[0].avg_score) || 0,
      },
      classes: await teacherClasses(teacherId),
      perDisaster: perDisaster.map((row: any) => ({
        disasterType: row.disaster_type,
        attempts: Number(row.attempts) || 0,
        avgScore: Number(row.avg_score) || 0,
        bestScore: Number(row.best_score) || 0,
      })),
      recent: recent.map((row: any) => ({
        id: Number(row.id),
        disasterType: row.disaster_type,
        actionScore: Number(row.action_score) || 0,
        recoveryScore: Number(row.recovery_score) || 0,
        totalScore: Number(row.total_score) || 0,
        durationSeconds: Number(row.duration_seconds) || 0,
        createdAt: row.created_at,
        teamName: row.team_name,
        avatarId: row.avatar_id,
        className: row.class_name,
      })),
    });
  } catch (error) {
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : 'Gagal memuat ringkasan.',
    });
  }
}
