import type { DisasterType } from '../types';

/**
 * Klien API lokal Agent SIAGA.
 * Semua permintaan memakai cookie sesi guru (HttpOnly) atau token tim.
 */

export interface TeacherAccount {
  id: number;
  name: string;
  email: string;
}

export interface ClassSummary {
  id: number;
  name: string;
  code: string;
  createdAt: string;
  teamCount: number;
  attemptCount: number;
  avgScore: number;
}

export interface OverviewStats {
  classes: number;
  teams: number;
  attempts: number;
  avgScore: number;
}

export interface DisasterSummary {
  disasterType: DisasterType;
  attempts: number;
  avgScore: number;
  bestScore: number;
}

export interface RecentResult {
  id: number;
  disasterType: DisasterType;
  actionScore: number;
  recoveryScore: number;
  totalScore: number;
  durationSeconds: number;
  createdAt: string;
  teamName: string;
  avatarId: string | null;
  className: string | null;
}

export interface TeacherOverview {
  teacher: TeacherAccount;
  stats: OverviewStats;
  classes: ClassSummary[];
  perDisaster: DisasterSummary[];
  recent: RecentResult[];
}

export interface TeamProgressEntry {
  bestScore: number;
  attempts: number;
  lastPlayed: string;
}

export interface ClassTeam {
  id: number;
  name: string;
  avatarId: string | null;
  totalScore: number;
  missionsDone: number;
  createdAt: string;
  lastSeen: string;
  progress: Partial<Record<DisasterType, TeamProgressEntry>>;
}

export interface TeamResult {
  id: number;
  disasterType: DisasterType;
  actionScore: number;
  recoveryScore: number;
  totalScore: number;
  durationSeconds: number;
  detail: Record<string, unknown> | null;
  createdAt: string;
}

export interface TeamDetail {
  team: {
    id: number;
    name: string;
    avatarId: string | null;
    className: string;
    classCode: string;
    createdAt: string;
    lastSeen: string;
    progress: Partial<Record<DisasterType, TeamProgressEntry>>;
  };
  results: TeamResult[];
}

export interface TeamSession {
  token: string;
  team: {
    id: number;
    name: string;
    avatarId: string | null;
    className: string;
    classCode: string;
    progress: Partial<Record<DisasterType, TeamProgressEntry>>;
  };
}

export interface LeaderboardTeam {
  rank: number;
  id: number;
  name: string;
  avatarId: string | null;
  totalScore: number;
  missionsDone: number;
}

export interface Leaderboard {
  className: string | null;
  classCode: string | null;
  teams: LeaderboardTeam[];
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const TEAM_TOKEN_KEY = 'siaga.teamToken';
const TEAM_NAME_KEY = 'siaga.teamName';
const TEAM_CLASS_KEY = 'siaga.classCode';

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
      ...init,
    });
  } catch {
    throw new ApiError(
      'Server lokal tidak aktif. Jalankan `npm run dev` atau `npm start`.',
      0
    );
  }

  const text = await response.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!response.ok) {
    const errorMsg =
      json?.error ||
      (text && text.length < 300 ? text : `Permintaan gagal (${response.status}).`);
    throw new ApiError(errorMsg, response.status);
  }
  return json as T;
}

/* ------------------------------ Auth guru ------------------------------ */

export const loginTeacher = (email: string, password: string) =>
  api<{ teacher: TeacherAccount; classes: ClassSummary[] }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

export const registerTeacher = (
  name: string,
  email: string,
  password: string,
  inviteCode: string
) =>
  api<{ teacher: TeacherAccount; classes: ClassSummary[] }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, inviteCode }),
  });

export const logoutTeacher = () =>
  api<{ ok: boolean }>('/api/auth/logout', { method: 'POST' });

export const getTeacherMe = () =>
  api<{ teacher: TeacherAccount; classes: ClassSummary[] }>('/api/auth/me');

export const getOverview = () => api<TeacherOverview>('/api/teacher/overview');

export const createClass = (name: string, code?: string) =>
  api<{ classes: ClassSummary[] }>('/api/teacher/classes', {
    method: 'POST',
    body: JSON.stringify({ name, code }),
  });

export const updateClass = (id: number, patch: { name?: string; code?: string }) =>
  api<{ classes: ClassSummary[] }>(`/api/teacher/classes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });

export const deleteClass = (id: number) =>
  api<{ classes: ClassSummary[] }>(`/api/teacher/classes/${id}`, {
    method: 'DELETE',
  });

export const getClassTeams = (id: number) =>
  api<{ className: string; teams: ClassTeam[] }>(
    `/api/teacher/classes/${id}/teams`
  );

export const getTeamDetail = (id: number) =>
  api<TeamDetail>(`/api/teacher/teams/${id}`);

export const deleteTeam = (id: number) =>
  api<{ ok: boolean }>(`/api/teacher/teams/${id}`, { method: 'DELETE' });

export const exportCsvUrl = () => '/api/teacher/export.csv';

/* ------------------------------ Game siswa ----------------------------- */

export const hasTeamSession = () => !!localStorage.getItem(TEAM_TOKEN_KEY);

export const getTeamSession = () => ({
  token: localStorage.getItem(TEAM_TOKEN_KEY),
  teamName: localStorage.getItem(TEAM_NAME_KEY),
  classCode: localStorage.getItem(TEAM_CLASS_KEY),
});

export const clearTeamSession = () => {
  localStorage.removeItem(TEAM_TOKEN_KEY);
  localStorage.removeItem(TEAM_NAME_KEY);
  localStorage.removeItem(TEAM_CLASS_KEY);
};

export async function registerTeam(
  teamName: string,
  avatarId: string | null,
  classCode: string
): Promise<TeamSession> {
  // Server lokal mengirim `teamToken`; di klien kita simpan sebagai `token`.
  const response = await api<{
    teamToken: string;
    team: TeamSession['team'];
  }>('/api/game/teams', {
    method: 'POST',
    body: JSON.stringify({ teamName, avatarId, classCode }),
  });

  localStorage.setItem(TEAM_TOKEN_KEY, response.teamToken);
  localStorage.setItem(TEAM_NAME_KEY, response.team.name);
  localStorage.setItem(TEAM_CLASS_KEY, response.team.classCode);

  return { token: response.teamToken, team: response.team };
}

export const fetchTeamSession = () =>
  api<TeamSession>('/api/game/team', {
    headers: { 'x-team-token': localStorage.getItem(TEAM_TOKEN_KEY) || '' },
  });

export const saveResult = (
  disasterType: DisasterType,
  actionScore: number,
  recoveryScore: number,
  detail?: Record<string, unknown>,
  durationSeconds = 0
) => {
  const token = localStorage.getItem(TEAM_TOKEN_KEY);
  if (!token) {
    return Promise.resolve({ ok: false, offline: true, totalScore: 0, progress: {} });
  }
  return api<{
    ok: boolean;
    totalScore: number;
    progress: Partial<Record<DisasterType, TeamProgressEntry>>;
  }>('/api/game/results', {
    method: 'POST',
    headers: { 'x-team-token': token },
    body: JSON.stringify({ disasterType, actionScore, recoveryScore, detail, durationSeconds }),
  });
};

export const getLeaderboard = (classCode?: string) =>
  api<Leaderboard>(
    `/api/game/leaderboard${classCode ? `?classCode=${encodeURIComponent(classCode)}` : ''}`
  );
