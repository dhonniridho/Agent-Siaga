import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  cleanText,
  getSql,
  getTeamProgress,
  initializeDatabase,
  readBody,
  readCookie,
  sendJson,
  teacherClasses,
  verifySession,
} from '../server/vercel-auth.js';

function csvCell(value: unknown) {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || '', 'http://localhost');
  const path = url.pathname.toLowerCase();

  try {
    await initializeDatabase();
    const teacherId = verifySession(readCookie(req, 'siaga_session'));
    if (!teacherId) {
      sendJson(res, 401, { error: 'Sesi guru tidak valid.' });
      return;
    }

    const sql = getSql();

    // 1. OVERVIEW: GET /api/teacher/overview
    if (path.endsWith('/overview')) {
      if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        sendJson(res, 405, { error: 'Metode tidak diizinkan.' });
        return;
      }
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
      return;
    }

    // 2. EXPORT CSV: GET /api/teacher/export.csv
    if (path.includes('/export')) {
      if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        sendJson(res, 405, { error: 'Metode tidak diizinkan.' });
        return;
      }
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
      return;
    }

    // 3. CLASS TEAMS: GET /api/teacher/classes/:id/teams
    const classTeamsMatch = path.match(/classes\/(\d+)\/teams/);
    if (classTeamsMatch) {
      if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        sendJson(res, 405, { error: 'Metode tidak diizinkan.' });
        return;
      }
      const classId = Number(classTeamsMatch[1]);
      const classRows = await sql`SELECT * FROM classes WHERE id = ${classId} AND teacher_id = ${teacherId}`;
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
          studentName: row.student_name || null,
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
      return;
    }

    // 4. CLASS DETAILS: PATCH / DELETE /api/teacher/classes/:id
    const classSingleMatch = path.match(/classes\/(\d+)/);
    if (classSingleMatch) {
      const classId = Number(classSingleMatch[1]);
      const check = await sql`SELECT id FROM classes WHERE id = ${classId} AND teacher_id = ${teacherId}`;
      if (check.length === 0) {
        sendJson(res, 404, { error: 'Kelas tidak ditemukan.' });
        return;
      }

      if (req.method === 'DELETE') {
        await sql`DELETE FROM classes WHERE id = ${classId}`;
        sendJson(res, 200, { classes: await teacherClasses(teacherId) });
        return;
      }

      if (req.method === 'PATCH') {
        const body = await readBody(req);
        const name = cleanText(body.name, 80);
        const code = cleanText(body.code, 20).toUpperCase();

        if (name) {
          await sql`UPDATE classes SET name = ${name} WHERE id = ${classId}`;
        }
        if (code) {
          if (!/^[A-Z0-9-]{3,20}$/.test(code)) {
            sendJson(res, 400, { error: 'Format kode kelas tidak valid.' });
            return;
          }
          const existing = await sql`SELECT id FROM classes WHERE code = ${code} AND id != ${classId}`;
          if (existing.length > 0) {
            sendJson(res, 409, { error: 'Kode kelas sudah dipakai.' });
            return;
          }
          await sql`UPDATE classes SET code = ${code} WHERE id = ${classId}`;
        }

        sendJson(res, 200, { classes: await teacherClasses(teacherId) });
        return;
      }

      res.setHeader('Allow', 'PATCH, DELETE');
      sendJson(res, 405, { error: 'Metode tidak diizinkan.' });
      return;
    }

    // 5. CREATE CLASS: POST /api/teacher/classes
    if (path.endsWith('/classes')) {
      if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        sendJson(res, 405, { error: 'Metode tidak diizinkan.' });
        return;
      }
      const body = await readBody(req);
      const name = cleanText(body.name, 80);
      const requestedCode = cleanText(body.code, 20).toUpperCase();

      if (!name) {
        sendJson(res, 400, { error: 'Nama kelas wajib diisi.' });
        return;
      }

      const prefix = cleanText(name, 8)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 5) || 'KELAS';
      let code = requestedCode || `${prefix}${100 + Math.floor(Math.random() * 900)}`;

      if (!/^[A-Z0-9-]{3,20}$/.test(code)) {
        sendJson(res, 400, {
          error: 'Kode kelas hanya boleh huruf, angka, dan tanda minus (3-20 karakter).',
        });
        return;
      }

      const existing = await sql`SELECT id FROM classes WHERE code = ${code}`;
      if (existing.length > 0) {
        sendJson(res, 409, { error: 'Kode kelas sudah dipakai.' });
        return;
      }

      await sql`
        INSERT INTO classes (teacher_id, name, code)
        VALUES (${teacherId}, ${name}, ${code})
      `;

      sendJson(res, 201, { classes: await teacherClasses(teacherId) });
      return;
    }

    // 6. TEAMS: GET / DELETE /api/teacher/teams/:id
    const teamSingleMatch = path.match(/teams\/(\d+)/);
    if (teamSingleMatch) {
      const teamId = Number(teamSingleMatch[1]);
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

      if (req.method === 'GET') {
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
            studentName: team.student_name || null,
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
        return;
      }

      res.setHeader('Allow', 'GET, DELETE');
      sendJson(res, 405, { error: 'Metode tidak diizinkan.' });
      return;
    }

    sendJson(res, 404, { error: 'Endpoint guru tidak ditemukan.' });
  } catch (error) {
    console.error('[TEACHER API ERROR]', error);
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : 'Terjadi kesalahan pada server.',
    });
  }
}
