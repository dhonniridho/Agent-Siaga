import crypto from 'node:crypto';
import { neon } from '@neondatabase/serverless';

type DbRow = Record<string, any>;

function databaseUrl() {
  return (
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.NEON_DATABASE_URL ||
    ''
  );
}

export function getSql() {
  const url = databaseUrl();
  if (!url) throw new Error('Database Vercel belum dikonfigurasi.');
  return neon(url);
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  if (!stored?.includes(':')) return false;
  const [salt, expectedHex] = stored.split(':');
  const actual = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function sessionSecret() {
  return crypto
    .createHash('sha256')
    .update(process.env.SIAGA_SESSION_SECRET || databaseUrl())
    .digest();
}

export function signSession(teacherId: number) {
  const payload = Buffer.from(
    JSON.stringify({
      teacherId,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
    })
  ).toString('base64url');
  const signature = crypto
    .createHmac('sha256', sessionSecret())
    .update(payload)
    .digest('base64url');
  return `${payload}.${signature}`;
}

export function verifySession(token: string | undefined) {
  if (!token?.includes('.')) return null;
  const [payload, signature] = token.split('.');
  const expected = crypto
    .createHmac('sha256', sessionSecret())
    .update(payload)
    .digest('base64url');
  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return null;
  }
  try {
    const value = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!value.exp || value.exp < Math.floor(Date.now() / 1000)) return null;
    return Number(value.teacherId) || null;
  } catch {
    return null;
  }
}

export async function initializeDatabase() {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS teachers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS classes (
      id SERIAL PRIMARY KEY,
      teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS teams (
      id SERIAL PRIMARY KEY,
      class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      avatar_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(class_id, name)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS results (
      id SERIAL PRIMARY KEY,
      team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      disaster_type TEXT NOT NULL,
      action_score INTEGER NOT NULL DEFAULT 0,
      recovery_score INTEGER NOT NULL DEFAULT 0,
      total_score INTEGER NOT NULL DEFAULT 0,
      duration_seconds INTEGER NOT NULL DEFAULT 0,
      detail TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  const email = (
    process.env.SEED_TEACHER_EMAIL || 'guru@agentsiaga.id'
  ).toLowerCase();
  const password = process.env.SEED_TEACHER_PASSWORD || 'siaga123';
  const name = process.env.SEED_TEACHER_NAME || 'Guru Siaga';
  const classCode = (process.env.SEED_CLASS_CODE || 'SIAGA6A').toUpperCase();
  const existing = await sql`SELECT id FROM teachers WHERE email = ${email}`;
  if (existing.length === 0) {
    const inserted = await sql`
      INSERT INTO teachers (name, email, password_hash)
      VALUES (${name}, ${email}, ${hashPassword(password)})
      RETURNING id
    `;
    await sql`
      INSERT INTO classes (teacher_id, name, code)
      VALUES (${Number(inserted[0].id)}, ${'Kelas 6A'}, ${classCode})
    `;
  }
}

export function cleanText(value: unknown, max = 120) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

export function readCookie(req: any, name: string) {
  const raw = String(req.headers?.cookie || '');
  for (const part of raw.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

export function setCookie(res: any, value: string) {
  res.setHeader(
    'Set-Cookie',
    `siaga_session=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`
  );
}

export function clearCookie(res: any) {
  res.setHeader(
    'Set-Cookie',
    'siaga_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
  );
}

export function sendJson(res: any, status: number, body: unknown) {
  res.status(status).json(body);
}

export async function readBody(req: any): Promise<Record<string, unknown>> {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  // Jika Vercel Serverless Function tidak auto-parse body, baca manual stream chunks:
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const raw = Buffer.concat(chunks).toString('utf8');
    if (!raw.trim()) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export async function teacherClasses(teacherId: number) {
  const sql = getSql();
  const rows = await sql`
    SELECT c.id, c.name, c.code, c.created_at,
      (SELECT COUNT(*)::int FROM teams t WHERE t.class_id = c.id) AS team_count,
      (SELECT COUNT(*)::int FROM results r JOIN teams t ON t.id = r.team_id WHERE t.class_id = c.id) AS attempt_count,
      (SELECT COALESCE(ROUND(AVG(r.total_score)), 0)::int FROM results r JOIN teams t ON t.id = r.team_id WHERE t.class_id = c.id) AS avg_score
    FROM classes c
    WHERE c.teacher_id = ${teacherId}
    ORDER BY c.id
  `;
  return rows.map((row) => ({
    id: Number(row.id),
    name: row.name,
    code: row.code,
    createdAt: row.created_at,
    teamCount: Number(row.team_count) || 0,
    attemptCount: Number(row.attempt_count) || 0,
    avgScore: Number(row.avg_score) || 0,
  }));
}
