import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

/**
 * Database lokal Agent SIAGA.
 * Memakai modul bawaan Node (`node:sqlite`) supaya tidak perlu kompilasi
 * native module di komputer sekolah.
 */

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = process.env.SIAGA_DB_PATH || path.join(DATA_DIR, 'agent-siaga.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS teachers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    student_name TEXT,
    avatar_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_seen TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(class_id, name)
  );

  CREATE TABLE IF NOT EXISTS results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    disaster_type TEXT NOT NULL,
    action_score INTEGER NOT NULL DEFAULT 0,
    recovery_score INTEGER NOT NULL DEFAULT 0,
    total_score INTEGER NOT NULL DEFAULT 0,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    detail TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_results_team ON results(team_id);
  CREATE INDEX IF NOT EXISTS idx_results_disaster ON results(disaster_type);
  CREATE INDEX IF NOT EXISTS idx_teams_class ON teams(class_id);
`);

// Migrasi ringan untuk database yang sudah dibuat versi sebelumnya.
const resultColumns = db.prepare('PRAGMA table_info(results)').all();
if (!resultColumns.some((column) => column.name === 'duration_seconds')) {
  db.exec('ALTER TABLE results ADD COLUMN duration_seconds INTEGER NOT NULL DEFAULT 0');
}
const teamColumns = db.prepare('PRAGMA table_info(teams)').all();
if (!teamColumns.some((column) => column.name === 'student_name')) {
  db.exec('ALTER TABLE teams ADD COLUMN student_name TEXT');
}

/* ------------------------------------------------------------------ */
/* Password & token                                                    */
/* ------------------------------------------------------------------ */

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, expectedHex] = stored.split(':');
  const actual = crypto.scryptSync(String(password), salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

function getOrCreateSecret() {
  const row = db.prepare('SELECT value FROM app_meta WHERE key = ?').get('session_secret');
  if (row?.value) return row.value;

  const secret =
    process.env.SIAGA_SESSION_SECRET || crypto.randomBytes(48).toString('hex');
  db.prepare('INSERT INTO app_meta (key, value) VALUES (?, ?)').run(
    'session_secret',
    secret
  );
  return secret;
}

const SESSION_SECRET = getOrCreateSecret();
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

export function signSession(payload, ttlSeconds = SESSION_TTL_SECONDS) {
  const body = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encoded = base64url(JSON.stringify(body));
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${signature}`;
}

export function verifySession(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return null;

  const expected = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('base64url');

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (!payload?.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Seed awal                                                           */
/* ------------------------------------------------------------------ */

export function seedDatabase() {
  const teacherCount = db.prepare('SELECT COUNT(*) AS n FROM teachers').get().n;
  if (teacherCount > 0) return;

  const email = (process.env.SEED_TEACHER_EMAIL || 'guru@agentsiaga.id').toLowerCase();
  const password = process.env.SEED_TEACHER_PASSWORD || 'siaga123';
  const name = process.env.SEED_TEACHER_NAME || 'Guru Siaga';
  const classCode = (process.env.SEED_CLASS_CODE || 'SIAGA6A').toUpperCase();

  const info = db
    .prepare('INSERT INTO teachers (name, email, password_hash) VALUES (?, ?, ?)')
    .run(name, email, hashPassword(password));

  db.prepare('INSERT INTO classes (teacher_id, name, code) VALUES (?, ?, ?)').run(
    Number(info.lastInsertRowid),
    'Kelas 6A',
    classCode
  );

  console.log(
    `[Agent SIAGA] Akun guru dibuat: ${email} / ${password} • kode kelas: ${classCode}`
  );
}

seedDatabase();

/* ------------------------------------------------------------------ */
/* Query bantuan                                                       */
/* ------------------------------------------------------------------ */

export function findTeacherByEmail(email) {
  return db
    .prepare('SELECT * FROM teachers WHERE email = ?')
    .get(String(email || '').trim().toLowerCase());
}

export function findTeacherById(id) {
  return db
    .prepare('SELECT id, name, email, created_at FROM teachers WHERE id = ?')
    .get(id);
}

export function findClassByCode(code) {
  return db
    .prepare('SELECT * FROM classes WHERE UPPER(code) = ?')
    .get(String(code || '').trim().toUpperCase());
}

export function getDefaultClass() {
  return db.prepare('SELECT * FROM classes ORDER BY id ASC LIMIT 1').get();
}

export function findTeamById(id) {
  return db.prepare('SELECT * FROM teams WHERE id = ?').get(id);
}

export function getTeamProgress(teamId) {
  const rows = db
    .prepare(
      `SELECT disaster_type,
              MAX(total_score) AS best_score,
              MAX(recovery_score) AS best_recovery_score,
              MAX(created_at) AS last_played,
              COUNT(*) AS attempts
       FROM results
       WHERE team_id = ?
       GROUP BY disaster_type`
    )
    .all(teamId);

  const progress = {};
  for (const row of rows) {
    progress[row.disaster_type] = {
      bestScore: Number(row.best_score) || 0,
      bestRecoveryScore: Number(row.best_recovery_score) || 0,
      attempts: Number(row.attempts) || 0,
      lastPlayed: row.last_played,
    };
  }
  return progress;
}
