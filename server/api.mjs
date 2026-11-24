import crypto from 'node:crypto';
import express from 'express';
import {
  db,
  findClassByCode,
  findTeacherByEmail,
  findTeacherById,
  findTeamById,
  getDefaultClass,
  getTeamProgress,
  hashPassword,
  signSession,
  verifyPassword,
  verifySession,
} from './db.mjs';

const DISASTERS = new Set(['EARTHQUAKE', 'FLOOD', 'LANDSLIDE', 'VOLCANO']);
const TEACHER_COOKIE = 'siaga_session';
const INVITE_CODE = process.env.SIAGA_INVITE_CODE || 'AGENT-SIAGA';

function readCookie(req, name) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

function setTeacherCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production' && process.env.SIAGA_HTTPS === '1';
  const pieces = [
    `${TEACHER_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${60 * 60 * 24 * 7}`,
  ];
  if (secure) pieces.push('Secure');
  res.setHeader('Set-Cookie', pieces.join('; '));
}

function clearTeacherCookie(res) {
  res.setHeader(
    'Set-Cookie',
    `${TEACHER_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
}

function teacherFromRequest(req) {
  const token = readCookie(req, TEACHER_COOKIE);
  const payload = verifySession(token);
  if (!payload || payload.role !== 'teacher') return null;
  return findTeacherById(payload.teacherId) || null;
}

function requireTeacher(req, res, next) {
  const teacher = teacherFromRequest(req);
  if (!teacher) {
    res.status(401).json({ error: 'Sesi guru tidak valid. Silakan masuk kembali.' });
    return;
  }
  req.teacher = teacher;
  next();
}

function teamFromRequest(req) {
  const header = req.headers['x-team-token'];
  const bearer = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const token = (Array.isArray(header) ? header[0] : header) || bearer || req.body?.teamToken;
  const payload = verifySession(token);
  if (!payload || payload.role !== 'team') return null;
  return findTeamById(payload.teamId) || null;
}

function requireTeam(req, res, next) {
  const team = teamFromRequest(req);
  if (!team) {
    res.status(401).json({ error: 'Token tim tidak valid. Daftarkan tim kembali.' });
    return;
  }
  req.team = team;
  next();
}

function cleanText(value, max = 120) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function clampScore(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function clampDuration(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(3600, Math.round(n)));
}

function makeClassCode(name) {
  const prefix = cleanText(name, 8)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 5) || 'KELAS';
  for (let i = 0; i < 30; i += 1) {
    const code = `${prefix}${crypto.randomInt(100, 999)}`;
    const existing = findClassByCode(code);
    if (!existing) return code;
  }
  return `KELAS${crypto.randomInt(1000, 9999)}`;
}

function teacherClasses(teacherId) {
  return db
    .prepare(
      `SELECT c.*,
              (SELECT COUNT(*) FROM teams t WHERE t.class_id = c.id) AS team_count,
              (SELECT COUNT(*) FROM results r
                 JOIN teams t ON t.id = r.team_id
                WHERE t.class_id = c.id) AS attempt_count,
              (SELECT COALESCE(AVG(r.total_score), 0) FROM results r
                 JOIN teams t ON t.id = r.team_id
                WHERE t.class_id = c.id) AS avg_score
       FROM classes c
       WHERE c.teacher_id = ?
       ORDER BY c.id ASC`
    )
    .all(teacherId)
    .map((row) => ({
      id: Number(row.id),
      name: row.name,
      code: row.code,
      createdAt: row.created_at,
      teamCount: Number(row.team_count) || 0,
      attemptCount: Number(row.attempt_count) || 0,
      avgScore: Math.round(Number(row.avg_score) || 0),
    }));
}

function classBelongsToTeacher(classId, teacherId) {
  return !!db
    .prepare('SELECT id FROM classes WHERE id = ? AND teacher_id = ?')
    .get(classId, teacherId);
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function createApiApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '256kb' }));

  app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'agent-siaga', time: new Date().toISOString() });
  });

  /* ----------------------------- Auth guru ----------------------------- */

  app.post('/api/auth/login', (req, res) => {
    const email = cleanText(req.body?.email, 160).toLowerCase();
    const password = String(req.body?.password ?? '');

    if (!email || !password) {
      res.status(400).json({ error: 'Email dan password wajib diisi.' });
      return;
    }

    const teacher = findTeacherByEmail(email);
    if (!teacher || !verifyPassword(password, teacher.password_hash)) {
      res.status(401).json({ error: 'Email atau password salah.' });
      return;
    }

    const token = signSession({ role: 'teacher', teacherId: Number(teacher.id) });
    setTeacherCookie(res, token);
    res.json({
      teacher: { id: Number(teacher.id), name: teacher.name, email: teacher.email },
      classes: teacherClasses(Number(teacher.id)),
    });
  });

  app.post('/api/auth/register', (req, res) => {
    const name = cleanText(req.body?.name, 80);
    const email = cleanText(req.body?.email, 160).toLowerCase();
    const password = String(req.body?.password ?? '');
    const inviteCode = cleanText(req.body?.inviteCode, 40);

    if (!name || !email || !password) {
      res.status(400).json({ error: 'Nama, email, dan password wajib diisi.' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Password minimal 6 karakter.' });
      return;
    }
    if (inviteCode.toUpperCase() !== INVITE_CODE.toUpperCase()) {
      res.status(403).json({ error: 'Kode undangan guru tidak cocok.' });
      return;
    }
    if (findTeacherByEmail(email)) {
      res.status(409).json({ error: 'Email tersebut sudah terdaftar.' });
      return;
    }

    const info = db
      .prepare('INSERT INTO teachers (name, email, password_hash) VALUES (?, ?, ?)')
      .run(name, email, hashPassword(password));
    const teacherId = Number(info.lastInsertRowid);
    db.prepare('INSERT INTO classes (teacher_id, name, code) VALUES (?, ?, ?)').run(
      teacherId,
      'Kelas Baru',
      makeClassCode('KELAS')
    );

    const token = signSession({ role: 'teacher', teacherId });
    setTeacherCookie(res, token);
    res.status(201).json({
      teacher: { id: teacherId, name, email },
      classes: teacherClasses(teacherId),
    });
  });

  app.post('/api/auth/logout', (_req, res) => {
    clearTeacherCookie(res);
    res.json({ ok: true });
  });

  app.get('/api/auth/me', (req, res) => {
    const teacher = teacherFromRequest(req);
    if (!teacher) {
      res.status(401).json({ error: 'Belum masuk.' });
      return;
    }
    res.json({ teacher, classes: teacherClasses(Number(teacher.id)) });
  });

  /* --------------------------- Dashboard guru -------------------------- */

  app.get('/api/teacher/overview', requireTeacher, (req, res) => {
    const teacherId = Number(req.teacher.id);
    const classes = teacherClasses(teacherId);
    const classIds = classes.map((c) => c.id);

    const teamCount = classIds.length
      ? db
          .prepare(
            `SELECT COUNT(*) AS n FROM teams WHERE class_id IN (${classIds
              .map(() => '?')
              .join(',')})`
          )
          .get(...classIds).n
      : 0;

    const attemptRow = classIds.length
      ? db
          .prepare(
            `SELECT COUNT(*) AS n, COALESCE(AVG(r.total_score), 0) AS avg
               FROM results r JOIN teams t ON t.id = r.team_id
              WHERE t.class_id IN (${classIds.map(() => '?').join(',')})`
          )
          .get(...classIds)
      : { n: 0, avg: 0 };

    const perDisaster = classIds.length
      ? db
          .prepare(
            `SELECT r.disaster_type,
                    COUNT(*) AS attempts,
                    COALESCE(AVG(r.total_score), 0) AS avg_score,
                    MAX(r.total_score) AS best_score
               FROM results r JOIN teams t ON t.id = r.team_id
              WHERE t.class_id IN (${classIds.map(() => '?').join(',')})
              GROUP BY r.disaster_type`
          )
          .all(...classIds)
      : [];

    const recent = classIds.length
      ? db
          .prepare(
            `SELECT r.id, r.disaster_type, r.action_score, r.recovery_score,
                    r.total_score, r.duration_seconds, r.created_at, t.name AS team_name,
                    t.avatar_id, c.name AS class_name
               FROM results r
               JOIN teams t ON t.id = r.team_id
               LEFT JOIN classes c ON c.id = t.class_id
              WHERE t.class_id IN (${classIds.map(() => '?').join(',')})
              ORDER BY r.id DESC LIMIT 12`
          )
          .all(...classIds)
      : [];

    res.json({
      teacher: req.teacher,
      stats: {
        classes: classes.length,
        teams: Number(teamCount) || 0,
        attempts: Number(attemptRow.n) || 0,
        avgScore: Math.round(Number(attemptRow.avg) || 0),
      },
      classes,
      perDisaster: perDisaster.map((row) => ({
        disasterType: row.disaster_type,
        attempts: Number(row.attempts) || 0,
        avgScore: Math.round(Number(row.avg_score) || 0),
        bestScore: Number(row.best_score) || 0,
      })),
      recent: recent.map((row) => ({
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
  });

  app.post('/api/teacher/classes', requireTeacher, (req, res) => {
    const name = cleanText(req.body?.name, 80);
    const requestedCode = cleanText(req.body?.code, 20).toUpperCase();
    if (!name) {
      res.status(400).json({ error: 'Nama kelas wajib diisi.' });
      return;
    }

    const code = requestedCode || makeClassCode(name);
    if (!/^[A-Z0-9-]{3,20}$/.test(code)) {
      res.status(400).json({ error: 'Kode kelas hanya boleh huruf, angka, dan tanda minus (3-20 karakter).' });
      return;
    }
    if (findClassByCode(code)) {
      res.status(409).json({ error: 'Kode kelas sudah dipakai.' });
      return;
    }

    db.prepare('INSERT INTO classes (teacher_id, name, code) VALUES (?, ?, ?)').run(
      Number(req.teacher.id),
      name,
      code
    );
    res.status(201).json({ classes: teacherClasses(Number(req.teacher.id)) });
  });

  app.patch('/api/teacher/classes/:id', requireTeacher, (req, res) => {
    const classId = Number(req.params.id);
    if (!classBelongsToTeacher(classId, Number(req.teacher.id))) {
      res.status(404).json({ error: 'Kelas tidak ditemukan.' });
      return;
    }
    const name = cleanText(req.body?.name, 80);
    const code = cleanText(req.body?.code, 20).toUpperCase();
    if (name) db.prepare('UPDATE classes SET name = ? WHERE id = ?').run(name, classId);
    if (code) {
      if (!/^[A-Z0-9-]{3,20}$/.test(code)) {
        res.status(400).json({ error: 'Format kode kelas tidak valid.' });
        return;
      }
      const existing = findClassByCode(code);
      if (existing && Number(existing.id) !== classId) {
        res.status(409).json({ error: 'Kode kelas sudah dipakai.' });
        return;
      }
      db.prepare('UPDATE classes SET code = ? WHERE id = ?').run(code, classId);
    }
    res.json({ classes: teacherClasses(Number(req.teacher.id)) });
  });

  app.delete('/api/teacher/classes/:id', requireTeacher, (req, res) => {
    const classId = Number(req.params.id);
    if (!classBelongsToTeacher(classId, Number(req.teacher.id))) {
      res.status(404).json({ error: 'Kelas tidak ditemukan.' });
      return;
    }
    db.prepare('DELETE FROM classes WHERE id = ?').run(classId);
    res.json({ classes: teacherClasses(Number(req.teacher.id)) });
  });

  app.get('/api/teacher/classes/:id/teams', requireTeacher, (req, res) => {
    const classId = Number(req.params.id);
    if (!classBelongsToTeacher(classId, Number(req.teacher.id))) {
      res.status(404).json({ error: 'Kelas tidak ditemukan.' });
      return;
    }

    const teams = db
      .prepare(
        `SELECT t.*,
                COALESCE(SUM(best.best_score), 0) AS total_score,
                COUNT(best.disaster_type) AS missions_done
           FROM teams t
           LEFT JOIN (
             SELECT team_id, disaster_type, MAX(total_score) AS best_score
               FROM results GROUP BY team_id, disaster_type
           ) best ON best.team_id = t.id
          WHERE t.class_id = ?
          GROUP BY t.id
          ORDER BY total_score DESC, t.name ASC`
      )
      .all(classId);

    res.json({
      className: db.prepare('SELECT name FROM classes WHERE id = ?').get(classId)?.name,
      teams: teams.map((row) => ({
        id: Number(row.id),
        name: row.name,
        studentName: row.student_name || null,
        avatarId: row.avatar_id,
        totalScore: Number(row.total_score) || 0,
        missionsDone: Number(row.missions_done) || 0,
        createdAt: row.created_at,
        lastSeen: row.last_seen,
        progress: getTeamProgress(Number(row.id)),
      })),
    });
  });

  app.get('/api/teacher/teams/:id', requireTeacher, (req, res) => {
    const team = findTeamById(Number(req.params.id));
    if (!team) {
      res.status(404).json({ error: 'Tim tidak ditemukan.' });
      return;
    }
    const classRow = team.class_id
      ? db.prepare('SELECT * FROM classes WHERE id = ?').get(team.class_id)
      : null;
    if (classRow && !classBelongsToTeacher(Number(classRow.id), Number(req.teacher.id))) {
      res.status(403).json({ error: 'Tim bukan milik kelas Anda.' });
      return;
    }

    const results = db
      .prepare('SELECT * FROM results WHERE team_id = ? ORDER BY id DESC')
      .all(team.id);

    res.json({
      team: {
        id: Number(team.id),
        name: team.name,
        studentName: team.student_name || null,
        avatarId: team.avatar_id,
        className: classRow?.name || '-',
        classCode: classRow?.code || '-',
        createdAt: team.created_at,
        lastSeen: team.last_seen,
        progress: getTeamProgress(Number(team.id)),
      },
      results: results.map((row) => {
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
  });

  app.delete('/api/teacher/teams/:id', requireTeacher, (req, res) => {
    const team = findTeamById(Number(req.params.id));
    if (!team) {
      res.status(404).json({ error: 'Tim tidak ditemukan.' });
      return;
    }
    if (team.class_id) {
      const classRow = db.prepare('SELECT * FROM classes WHERE id = ?').get(team.class_id);
      if (classRow && !classBelongsToTeacher(Number(classRow.id), Number(req.teacher.id))) {
        res.status(403).json({ error: 'Tim bukan milik kelas Anda.' });
        return;
      }
    }
    db.prepare('DELETE FROM teams WHERE id = ?').run(team.id);
    res.json({ ok: true });
  });

  app.get('/api/teacher/export.csv', requireTeacher, (req, res) => {
    const rows = db
      .prepare(
        `SELECT c.name AS class_name, c.code AS class_code,
                t.name AS team_name, t.avatar_id,
                r.disaster_type, r.action_score, r.recovery_score,
                r.total_score, r.duration_seconds, r.created_at
           FROM results r
           JOIN teams t ON t.id = r.team_id
           LEFT JOIN classes c ON c.id = t.class_id
          WHERE c.teacher_id = ?
          ORDER BY c.name, t.name, r.id`
      )
      .all(Number(req.teacher.id));

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

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="agent-siaga-rekap-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.send(`\ufeff${lines.join('\r\n')}`);
  });

  /* ----------------------------- Game siswa ---------------------------- */

  app.post('/api/game/teams', (req, res) => {
    const teamName = cleanText(req.body?.teamName, 24);
    const studentName = cleanText(req.body?.studentName, 24);
    const avatarId = cleanText(req.body?.avatarId, 10);
    const classCode = cleanText(req.body?.classCode, 20).toUpperCase();

    if (!teamName || !studentName) {
      res.status(400).json({ error: 'Nama siswa dan nama tim wajib diisi.' });
      return;
    }

    let classRow = classCode ? findClassByCode(classCode) : getDefaultClass();
    if (!classRow) {
      res.status(404).json({
        error: classCode
          ? 'Kode kelas tidak ditemukan. Periksa kembali dari guru.'
          : 'Belum ada kelas di database. Guru perlu membuat kelas dulu.',
      });
      return;
    }

    let team = db
      .prepare('SELECT * FROM teams WHERE class_id = ? AND name = ?')
      .get(classRow.id, teamName);

    if (team) {
      db.prepare("UPDATE teams SET student_name = ?, avatar_id = ?, last_seen = datetime('now') WHERE id = ?").run(
        studentName,
        avatarId || team.avatar_id || null,
        team.id
      );
    } else {
      const info = db
        .prepare('INSERT INTO teams (class_id, name, student_name, avatar_id) VALUES (?, ?, ?, ?)')
        .run(classRow.id, teamName, studentName, avatarId || null);
      team = findTeamById(Number(info.lastInsertRowid));
    }

    const token = signSession(
      { role: 'team', teamId: Number(team.id) },
      60 * 60 * 24 * 30
    );

    res.status(201).json({
      teamToken: token,
      team: {
        id: Number(team.id),
        name: team.name,
        studentName: team.student_name || null,
        avatarId: team.avatar_id,
        className: classRow.name,
        classCode: classRow.code,
        progress: getTeamProgress(Number(team.id)),
      },
    });
  });

  app.get('/api/game/team', requireTeam, (req, res) => {
    const classRow = req.team.class_id
      ? db.prepare('SELECT * FROM classes WHERE id = ?').get(req.team.class_id)
      : null;
    res.json({
      team: {
        id: Number(req.team.id),
        name: req.team.name,
        studentName: req.team.student_name || null,
        avatarId: req.team.avatar_id,
        className: classRow?.name || '-',
        classCode: classRow?.code || '-',
        progress: getTeamProgress(Number(req.team.id)),
      },
    });
  });

  app.post('/api/game/results', requireTeam, (req, res) => {
    const disasterType = cleanText(req.body?.disasterType, 20).toUpperCase();
    if (!DISASTERS.has(disasterType)) {
      res.status(400).json({ error: 'Jenis bencana tidak dikenal.' });
      return;
    }

    const actionScore = clampScore(req.body?.actionScore);
    const recoveryScore = clampScore(req.body?.recoveryScore);
    const totalScore = actionScore + recoveryScore;
    const detail = req.body?.detail ? JSON.stringify(req.body.detail).slice(0, 4000) : null;
    const durationSeconds = clampDuration(req.body?.durationSeconds);

    db.prepare(
      `INSERT INTO results
        (team_id, disaster_type, action_score, recovery_score, total_score, duration_seconds, detail)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      Number(req.team.id),
      disasterType,
      actionScore,
      recoveryScore,
      totalScore,
      durationSeconds,
      detail
    );
    db.prepare("UPDATE teams SET last_seen = datetime('now') WHERE id = ?").run(
      Number(req.team.id)
    );

    res.status(201).json({
      ok: true,
      totalScore,
      progress: getTeamProgress(Number(req.team.id)),
    });
  });

  app.get('/api/game/leaderboard', (req, res) => {
    const classCode = cleanText(req.query?.classCode, 20).toUpperCase();
    const classRow = classCode ? findClassByCode(classCode) : getDefaultClass();
    if (!classRow) {
      res.json({ className: null, classCode: null, teams: [] });
      return;
    }

    const teams = db
      .prepare(
        `SELECT t.id, t.name, t.avatar_id,
                COALESCE(SUM(best.best_score), 0) AS total_score,
                COUNT(best.disaster_type) AS missions_done
           FROM teams t
           LEFT JOIN (
             SELECT team_id, disaster_type, MAX(total_score) AS best_score
               FROM results GROUP BY team_id, disaster_type
           ) best ON best.team_id = t.id
          WHERE t.class_id = ?
          GROUP BY t.id
          ORDER BY total_score DESC, t.name ASC
          LIMIT 20`
      )
      .all(classRow.id);

    res.json({
      className: classRow.name,
      classCode: classRow.code,
      teams: teams.map((row, index) => ({
        rank: index + 1,
        id: Number(row.id),
        name: row.name,
        avatarId: row.avatar_id,
        totalScore: Number(row.total_score) || 0,
        missionsDone: Number(row.missions_done) || 0,
      })),
    });
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Endpoint API tidak ditemukan.' });
  });

  // Express error handler (mis. body JSON rusak).
  app.use((error, _req, res, _next) => {
    console.error('[Agent SIAGA API]', error);
    res.status(500).json({ error: 'Terjadi kesalahan pada server lokal.' });
  });

  return app;
}
