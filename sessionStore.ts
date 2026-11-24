import { useCallback, useEffect, useState } from 'react';
import type { DisasterType } from './types';

/**
 * Penyimpanan sesi tim yang "menjembatani" halaman pendaftaran/login siswa
 * dengan permainan. Identitas tim dan hasil misi juga dikirim ke API server;
 * localStorage menyimpan token sesi dan progres untuk melanjutkan di perangkat ini.
 *
 * Semua akses dibungkus try/catch supaya aplikasi tetap bisa dipakai saat
 * browser memblokir localStorage (mode private / iframe).
 */

const SESSIONS_KEY = 'agent-siaga:sessions:v1';
const ACTIVE_KEY = 'agent-siaga:active-session:v1';
const TEACHER_AUTH_KEY = 'agent-siaga:teacher-auth:v1';
const TEACHER_PIN_KEY = 'agent-siaga:teacher-pin-hash:v1';
export const SESSIONS_CHANGED_EVENT = 'agent-siaga:sessions-changed';

/** PIN demo bawaan. Guru bisa menggantinya lewat menu "Ganti PIN". */
export const DEFAULT_TEACHER_PIN = '1234';
const AUTH_DURATION_MS = 8 * 60 * 60 * 1000; // login berlaku 8 jam

export const CLASS_OPTIONS = [
  'Tanpa Kelas',
  'Kelas 1',
  'Kelas 2',
  'Kelas 3',
  'Kelas 4',
  'Kelas 5',
  'Kelas 6',
  'Kelas 7',
  'Kelas 8',
  'Kelas 9',
  'Lainnya',
] as const;

export interface TeamSession {
  id: string;
  /** Nama agen / siswa (dipakai untuk login). */
  studentName: string;
  /** Nama tim / kelompok. */
  teamName: string;
  backendToken?: string;
  /** Pilihan kelas (lihat CLASS_OPTIONS). */
  className: string;
  avatarId: string;
  createdAt: number;
  lastActiveAt: number;
  gameMode: 'adventure' | 'classic';
  totalScore: number;
  completedZones: DisasterType[];
  /** Skor akhir tiap misi (aksi + kuis). */
  completedLevelScores: Partial<Record<DisasterType, number>>;
  /** Skor kuis (RECOVERY) tiap misi, 0–100. Dipakai dashboard untuk rata-rata kuis. */
  quizScores: Partial<Record<DisasterType, number>>;
  readZones: DisasterType[];
}

export type SessionInput = Pick<TeamSession, 'studentName' | 'teamName' | 'avatarId'> &
  Partial<
    Pick<
      TeamSession,
      'className' | 'backendToken' | 'gameMode' | 'totalScore' | 'completedZones' | 'completedLevelScores' | 'quizScores' | 'readZones'
    >
  >;

const notify = () => {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new Event(SESSIONS_CHANGED_EVENT));
  } catch {
    /* event tidak tersedia → abaikan */
  }
};

const safeParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export function readSessions(): TeamSession[] {
  if (typeof window === 'undefined') return [];
  const list = safeParse<unknown>(window.localStorage.getItem(SESSIONS_KEY), []);
  if (!Array.isArray(list)) return [];
  return list
    .filter(
      (item): item is TeamSession =>
        !!item &&
        typeof item === 'object' &&
        typeof (item as TeamSession).id === 'string' &&
        typeof (item as TeamSession).teamName === 'string'
    )
    // Migrasi data lama (sebelum ada field quizScores).
    .map((session) => ({
      ...session,
      quizScores: session.quizScores ?? {},
      completedLevelScores: session.completedLevelScores ?? {},
      completedZones: session.completedZones ?? [],
      readZones: session.readZones ?? [],
    }));
}

function writeSessions(sessions: TeamSession[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    notify();
  } catch {
    /* kuota penuh / diblokir → sesi tetap hidup di memori */
  }
}

const createId = () => {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  } catch {
    /* fallback di bawah */
  }
  return `tim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const normalize = (value: string) => value.trim().toLowerCase();

/** Daftar tim baru → disimpan & langsung menjadi sesi aktif. */
export function saveSession(input: SessionInput): TeamSession {
  const now = Date.now();
  const session: TeamSession = {
    id: createId(),
    studentName: input.studentName.trim(),
    teamName: input.teamName.trim(),
    backendToken: input.backendToken,
    // Kelas opsional: form pendaftaran hanya meminta nama + avatar.
    // Nilai default menjaga kolom/filter kelas di Dashboard Guru tetap konsisten.
    className: input.className?.trim() || 'Tanpa Kelas',
    avatarId: input.avatarId,
    createdAt: now,
    lastActiveAt: now,
    gameMode: input.gameMode ?? 'adventure',
    totalScore: input.totalScore ?? 0,
    completedZones: input.completedZones ?? [],
    completedLevelScores: input.completedLevelScores ?? {},
    quizScores: input.quizScores ?? {},
    readZones: input.readZones ?? [],
  };
  writeSessions([...readSessions(), session]);
  setActiveSessionId(session.id);
  return session;
}

/**
 * Login siswa: cari sesi berdasarkan nama agen. Kelas bersifat opsional
 * (kompatibel dengan data lama); bila diisi, pencarian dipersempit lagi.
 */
export function findSessions(studentName: string, className?: string): TeamSession[] {
  const name = normalize(studentName);
  const grade = normalize(className ?? '');
  if (!name) return [];
  return readSessions().filter(
    (session) =>
      normalize(session.studentName) === name &&
      (!grade || normalize(session.className) === grade)
  );
}

export function getSession(id: string | null): TeamSession | null {
  if (!id) return null;
  return readSessions().find((session) => session.id === id) || null;
}

export function getActiveSession(): TeamSession | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(ACTIVE_KEY);
  if (!raw) return null;
  let id: string | null = null;
  try {
    const parsed = JSON.parse(raw);
    id = typeof parsed === 'string' ? parsed : null;
  } catch {
    // Format lama menyimpan id apa adanya (tanpa tanda kutip JSON).
    id = raw;
  }
  return getSession(id);
}

export function setActiveSessionId(id: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (id) window.localStorage.setItem(ACTIVE_KEY, JSON.stringify(id));
    else window.localStorage.removeItem(ACTIVE_KEY);
    notify();
  } catch {
    /* abaikan */
  }
}

/** Dipanggil App setiap kali skor / progres misi berubah. */
export function updateSession(id: string, patch: Partial<TeamSession>): TeamSession | null {
  const sessions = readSessions();
  const index = sessions.findIndex((session) => session.id === id);
  if (index < 0) return null;
  const updated: TeamSession = {
    ...sessions[index],
    ...patch,
    id,
    lastActiveAt: Date.now(),
  };
  sessions[index] = updated;
  writeSessions(sessions);
  return updated;
}

export function removeSession(id: string) {
  writeSessions(readSessions().filter((session) => session.id !== id));
  if (getActiveSession()?.id === id) setActiveSessionId(null);
}

export function clearAllSessions() {
  writeSessions([]);
  setActiveSessionId(null);
}

/* ------------------------------------------------------------------ */
/* Autentikasi Guru (PIN sederhana + akses demo)                       */
/* ------------------------------------------------------------------ */

/** Hash deterministik (bukan kriptografi kuat — cukup untuk PIN demo lokal). */
const hashPin = (pin: string) => {
  let hash = 5381;
  for (let i = 0; i < pin.length; i += 1) {
    hash = (hash * 33) ^ pin.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
};

const storedPinHash = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TEACHER_PIN_KEY);
};

export function verifyTeacherPin(pin: string): boolean {
  const expected = storedPinHash() || hashPin(DEFAULT_TEACHER_PIN);
  return pin.trim() === '' ? false : hashPin(pin.trim()) === expected;
}

export function changeTeacherPin(oldPin: string, newPin: string): boolean {
  if (!verifyTeacherPin(oldPin) || newPin.trim().length < 4) return false;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(TEACHER_PIN_KEY, hashPin(newPin.trim()));
  }
  return true;
}

export function signInTeacher() {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(TEACHER_AUTH_KEY, JSON.stringify({ at: Date.now() }));
  } catch {
    /* abaikan */
  }
}

export function signOutTeacher() {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(TEACHER_AUTH_KEY);
  } catch {
    /* abaikan */
  }
}

export function isTeacherAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  const raw = safeParse<{ at?: number } | null>(
    window.sessionStorage.getItem(TEACHER_AUTH_KEY),
    null
  );
  return !!raw && typeof raw.at === 'number' && Date.now() - raw.at < AUTH_DURATION_MS;
}

/** Dipakai tombol "Refresh Data" untuk memaksa hook membaca ulang storage. */
export function refreshSessions() {
  notify();
}

/** Hook ringan untuk Dashboard Guru: ikut berubah saat ada sesi baru / fokus tab. */
export function useTeamSessions(): TeamSession[] {
  const [sessions, setSessions] = useState<TeamSession[]>(() => readSessions());

  const refresh = useCallback(() => setSessions(readSessions()), []);

  useEffect(() => {
    refresh();
    window.addEventListener(SESSIONS_CHANGED_EVENT, refresh);
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener(SESSIONS_CHANGED_EVENT, refresh);
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [refresh]);

  return sessions;
}
