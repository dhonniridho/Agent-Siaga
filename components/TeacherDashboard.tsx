import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Download,
  GraduationCap,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  School,
  ShieldCheck,
  Trash2,
  Trophy,
  User,
  Users,
  X,
} from 'lucide-react';
import {
  ApiError,
  createClass,
  deleteClass,
  deleteTeam,
  exportCsvUrl,
  getClassTeams,
  getOverview,
  getTeamDetail,
  getTeacherMe,
  loginTeacher,
  logoutTeacher,
  registerTeacher,
  updateClass,
} from '../services/api';
import type {
  ClassSummary,
  ClassTeam,
  DisasterSummary,
  RecentResult,
  TeacherAccount,
  TeacherOverview,
  TeamDetail,
} from '../services/api';
import type { DisasterType } from '../types';
import { AVATARS } from '../constants';

const DISASTER_META: Record<
  DisasterType,
  { label: string; emoji: string; color: string; soft: string }
> = {
  EARTHQUAKE: {
    label: 'Gempa Bumi',
    emoji: '🏫',
    color: 'text-amber-600',
    soft: 'bg-amber-100 text-amber-800',
  },
  FLOOD: {
    label: 'Banjir Bandang',
    emoji: '🌊',
    color: 'text-sky-600',
    soft: 'bg-sky-100 text-sky-800',
  },
  LANDSLIDE: {
    label: 'Tanah Longsor',
    emoji: '⛰️',
    color: 'text-stone-600',
    soft: 'bg-stone-100 text-stone-800',
  },
  VOLCANO: {
    label: 'Erupsi Gunung',
    emoji: '🌋',
    color: 'text-red-600',
    soft: 'bg-red-100 text-red-800',
  },
};

function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Terjadi kesalahan. Coba lagi.';
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const normalized = value.includes('T')
    ? value
    : `${value.replace(' ', 'T')}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(seconds?: number) {
  const value = Math.max(0, Math.round(seconds || 0));
  if (value < 60) return `${value} dtk`;
  const minutes = Math.floor(value / 60);
  const rest = value % 60;
  if (minutes < 60) return `${minutes} mnt ${rest} dtk`;
  return `${Math.floor(minutes / 60)} j ${minutes % 60} mnt`;
}

function StatCard({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}>
        {icon}
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-800">{value}</p>
      {hint && <p className="mt-1 text-xs font-medium text-slate-400">{hint}</p>}
    </div>
  );
}

const AuthPanel: React.FC<{
  onAuthenticated: (teacher: TeacherAccount, classes: ClassSummary[]) => void;
}> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const result =
        mode === 'login'
          ? await loginTeacher(email.trim(), password)
          : await registerTeacher(name.trim(), email.trim(), password, inviteCode.trim());
      onAuthenticated(result.teacher, result.classes);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 px-4 py-10">
      <div className="pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-1/4 h-80 w-80 rounded-full bg-purple-500/20 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-6 text-center text-white">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-white/15 bg-white/10 text-3xl shadow-2xl backdrop-blur-md">
            🛡️
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-indigo-300">
            Agent Siaga
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">Dashboard Guru</h1>
          <p className="mt-2 text-sm font-medium text-indigo-100/70">
            Pantau progres tim, skor misi, dan hasil kuis seluruh kelas.
          </p>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-white/15 bg-white p-6 shadow-2xl sm:p-8">
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`rounded-xl px-3 py-2 text-sm font-black transition-colors ${
                mode === 'login' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'
              }`}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className={`rounded-xl px-3 py-2 text-sm font-black transition-colors ${
                mode === 'register' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'
              }`}
            >
              Daftar Guru
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'register' && (
              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-xs font-black text-slate-600">
                  <User size={14} /> Nama Guru
                </span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Contoh: Bu Rina"
                  className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-colors placeholder:font-medium placeholder:text-slate-300 focus:border-indigo-500"
                  required
                />
              </label>
            )}

            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-black text-slate-600">
                <Mail size={14} /> Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="guru@sekolah.id"
                className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-colors placeholder:font-medium placeholder:text-slate-300 focus:border-indigo-500"
                autoComplete="email"
                required
              />
            </label>

            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-black text-slate-600">
                <Lock size={14} /> Password
              </span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-colors placeholder:font-medium placeholder:text-slate-300 focus:border-indigo-500"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
              />
            </label>

            {mode === 'register' && (
              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-xs font-black text-slate-600">
                  <KeyRound size={14} /> Kode Undangan Guru
                </span>
                <input
                  value={inviteCode}
                  onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
                  placeholder="AGENT-SIAGA"
                  className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3 text-sm font-bold tracking-widest text-slate-700 outline-none transition-colors placeholder:font-medium placeholder:tracking-normal placeholder:text-slate-300 focus:border-indigo-500"
                  required
                />
              </label>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold leading-relaxed text-rose-700">
                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-indigo-200 transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
              {busy ? 'Memproses...' : mode === 'login' ? 'Masuk Dashboard' : 'Buat Akun Guru'}
            </button>
          </form>

          {mode === 'login' && (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-[11px] font-medium leading-relaxed text-amber-800">
              <b>Akun awal:</b> guru@agentsiaga.id / siaga123 · <b>Kode kelas:</b> SIAGA6A
            </div>
          )}
        </div>

        <p className="mt-5 text-center text-xs font-medium text-indigo-200/50">
          Data tersimpan lokal di server SQLite sekolah.
        </p>
      </div>
    </div>
  );
};

const DisasterBars: React.FC<{ rows: DisasterSummary[] }> = ({ rows }) => {
  const byType = useMemo(() => {
    const map = new Map<DisasterType, DisasterSummary>();
    rows.forEach((row) => map.set(row.disasterType, row));
    return map;
  }, [rows]);

  return (
    <div className="space-y-3">
      {(Object.keys(DISASTER_META) as DisasterType[]).map((type) => {
        const meta = DISASTER_META[type];
        const row = byType.get(type);
        const value = row?.avgScore ?? 0;
        return (
          <div key={type}>
            <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-1.5 font-black text-slate-700">
                <span>{meta.emoji}</span> {meta.label}
              </span>
              <span className="font-bold text-slate-400">
                {row ? `${value} rata-rata · ${row.attempts} percobaan` : 'Belum dimainkan'}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${
                  type === 'EARTHQUAKE'
                    ? 'bg-amber-400'
                    : type === 'FLOOD'
                      ? 'bg-sky-400'
                      : type === 'LANDSLIDE'
                        ? 'bg-stone-400'
                        : 'bg-red-400'
                }`}
                style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const RecentList: React.FC<{ rows: RecentResult[] }> = ({ rows }) => {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
        <p className="text-sm font-bold text-slate-400">Belum ada hasil misi.</p>
        <p className="mt-1 text-xs font-medium text-slate-400">
          Hasil akan muncul setelah tim menyelesaikan kuis pemulihan.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => {
        const meta = DISASTER_META[row.disasterType] ?? {
          label: row.disasterType,
          emoji: '🧭',
          soft: 'bg-slate-100 text-slate-700',
        };
        return (
          <div
            key={row.id}
            className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2.5"
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${meta.soft}`}>
              {meta.emoji}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-slate-700">{row.teamName}</p>
              <p className="truncate text-[11px] font-medium text-slate-400">
                {meta.label} · {row.className || 'Tanpa kelas'} · {formatDate(row.createdAt)} · ⏱ {formatDuration(row.durationSeconds)}
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm font-black text-indigo-600">{row.totalScore}</p>
              <p className="text-[10px] font-bold text-slate-400">
                {row.actionScore} + {row.recoveryScore}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const TeamDetailModal: React.FC<{
  detail: TeamDetail;
  onClose: () => void;
  onDelete: (teamId: number) => void;
}> = ({ detail, onClose, onDelete }) => (
  <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
    <div className="relative z-10 flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
            {AVATARS.find((avatar) => avatar.id === detail.team.avatarId)?.icon || '🕵️'}
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800">{detail.team.name}</h3>
            <p className="text-xs font-bold text-slate-500">
              {detail.team.className} · Kode {detail.team.classCode}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 text-slate-400 shadow-sm hover:text-slate-700"
          aria-label="Tutup detail tim"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(Object.keys(DISASTER_META) as DisasterType[]).map((type) => {
            const meta = DISASTER_META[type];
            const progress = detail.team.progress[type];
            return (
              <div key={type} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center">
                <div className="text-2xl">{meta.emoji}</div>
                <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {meta.label}
                </p>
                <p className="mt-0.5 text-lg font-black text-slate-700">
                  {progress?.bestScore ?? '—'}
                </p>
                <p className="text-[10px] font-bold text-slate-400">
                  {progress ? `${progress.attempts} percobaan` : 'Belum'}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-5">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-500">
            <BarChart3 size={14} /> Riwayat Misi
          </p>
          {detail.results.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-center text-sm font-bold text-slate-400">
              Tim ini belum menyelesaikan misi.
            </div>
          ) : (
            <div className="space-y-2">
              {detail.results.map((result) => {
                const meta = DISASTER_META[result.disasterType] ?? {
                  label: result.disasterType,
                  emoji: '🧭',
                  soft: 'bg-slate-100 text-slate-700',
                };
                return (
                  <div
                    key={result.id}
                    className="flex items-center gap-3 rounded-2xl border border-slate-100 px-3 py-2.5"
                  >
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${meta.soft}`}>
                      {meta.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-slate-700">{meta.label}</p>
                      <p className="text-[11px] font-medium text-slate-400">
                        {formatDate(result.createdAt)} · ⏱ {formatDuration(result.durationSeconds)}
                      </p>
                    </div>
                    <div className="text-right text-[11px] font-bold text-slate-400">
                      <p className="font-mono text-base font-black text-indigo-600">
                        {result.totalScore}
                      </p>
                      aksi {result.actionScore} · kuis {result.recoveryScore}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-slate-100 p-4">
        <button
          type="button"
          onClick={() => onDelete(detail.team.id)}
          className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-600 hover:bg-rose-100"
        >
          <Trash2 size={14} /> Hapus Tim
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-black text-white hover:bg-slate-700"
        >
          Tutup
        </button>
      </div>
    </div>
  </div>
);

export const TeacherDashboard: React.FC = () => {
  const [checking, setChecking] = useState(true);
  const [teacher, setTeacher] = useState<TeacherAccount | null>(null);
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [overview, setOverview] = useState<TeacherOverview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [teams, setTeams] = useState<ClassTeam[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamDetail, setTeamDetail] = useState<TeamDetail | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassCode, setNewClassCode] = useState('');
  const [editingClass, setEditingClass] = useState<ClassSummary | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');

  const selectedClass = useMemo(
    () => classes.find((item) => item.id === selectedClassId) ?? null,
    [classes, selectedClassId]
  );

  const loadOverview = useCallback(async () => {
    const data = await getOverview();
    setOverview(data);
    setClasses(data.classes);
    setTeacher((current) => current ?? data.teacher);
    setSelectedClassId((current) => {
      if (current && data.classes.some((item) => item.id === current)) return current;
      return data.classes[0]?.id ?? null;
    });
  }, []);

  const loadTeams = useCallback(async (classId: number) => {
    setTeamsLoading(true);
    try {
      const data = await getClassTeams(classId);
      setTeams(data.teams);
    } finally {
      setTeamsLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const me = await getTeacherMe();
        if (!alive) return;
        setTeacher(me.teacher);
        setClasses(me.classes);
        setSelectedClassId(me.classes[0]?.id ?? null);
        await loadOverview();
      } catch {
        // Belum login — tampilkan formulir masuk.
      } finally {
        if (alive) setChecking(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [loadOverview]);

  useEffect(() => {
    if (!teacher || !selectedClassId) {
      setTeams([]);
      return;
    }
    void loadTeams(selectedClassId).catch((err) => setError(errorMessage(err)));
  }, [loadTeams, selectedClassId, teacher]);

  const handleAuthenticated = async (account: TeacherAccount, initialClasses: ClassSummary[]) => {
    setTeacher(account);
    setClasses(initialClasses);
    setSelectedClassId(initialClasses[0]?.id ?? null);
    setError('');
    await loadOverview().catch((err) => setError(errorMessage(err)));
  };

  const handleLogout = async () => {
    try {
      await logoutTeacher();
    } catch {
      // Cookie tetap akan kedaluwarsa; lanjutkan keluar.
    }
    setTeacher(null);
    setOverview(null);
    setClasses([]);
    setTeams([]);
    setTeamDetail(null);
    setSelectedClassId(null);
    setNotice('');
    setError('');
  };

  const handleCreateClass = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newClassName.trim()) return;
    setBusy(true);
    setError('');
    try {
      const result = await createClass(newClassName.trim(), newClassCode.trim() || undefined);
      setClasses(result.classes);
      setNewClassName('');
      setNewClassCode('');
      setShowCreate(false);
      setNotice('Kelas baru berhasil dibuat.');
      const created = result.classes[result.classes.length - 1];
      if (created) setSelectedClassId(created.id);
      await loadOverview();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSaveClass = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingClass) return;
    setBusy(true);
    setError('');
    try {
      const result = await updateClass(editingClass.id, {
        name: editName.trim() || undefined,
        code: editCode.trim() || undefined,
      });
      setClasses(result.classes);
      setEditingClass(null);
      setNotice('Data kelas diperbarui.');
      await loadOverview();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteClass = async (item: ClassSummary) => {
    if (!window.confirm(`Hapus kelas "${item.name}" beserta data tim di dalamnya?`)) return;
    setBusy(true);
    setError('');
    try {
      const result = await deleteClass(item.id);
      setClasses(result.classes);
      setNotice('Kelas dihapus.');
      setSelectedClassId((current) => (current === item.id ? result.classes[0]?.id ?? null : current));
      await loadOverview();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteTeam = async (teamId: number) => {
    if (!window.confirm('Hapus tim ini beserta seluruh hasil misinya?')) return;
    setBusy(true);
    setError('');
    try {
      await deleteTeam(teamId);
      setTeamDetail(null);
      if (selectedClassId) await loadTeams(selectedClassId);
      await loadOverview();
      setNotice('Tim dihapus.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const openTeamDetail = async (teamId: number) => {
    setError('');
    try {
      const detail = await getTeamDetail(teamId);
      setTeamDetail(detail);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <Loader2 size={34} className="mx-auto animate-spin text-indigo-300" />
          <p className="mt-3 text-sm font-bold text-indigo-100/70">Memeriksa sesi guru...</p>
        </div>
      </div>
    );
  }

  if (!teacher) {
    return <AuthPanel onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-xl text-white shadow-lg shadow-indigo-200">
              🛡️
            </div>
            <div className="leading-tight">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">
                Agent Siaga
              </p>
              <h1 className="text-lg font-black text-slate-800">Dashboard Guru</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="#/"
              onClick={() => {
                if (window.location.hash.includes('guru')) {
                  window.location.hash = '#/';
                } else {
                  window.location.href = '/';
                }
              }}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition-colors hover:bg-slate-50"
            >
              <ArrowLeft size={14} /> Halaman Siswa
            </a>
            <a
              href={exportCsvUrl()}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-black text-white shadow-sm transition-colors hover:bg-emerald-400"
            >
              <Download size={14} /> CSV
            </a>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-600 transition-colors hover:bg-rose-100"
            >
              <LogOut size={14} /> Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Sapaan */}
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-slate-800">
              Halo, {teacher.name}!
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Ringkasan kemampuan mitigasi bencana seluruh tim di kelas Anda.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              void loadOverview().catch((err) => setError(errorMessage(err)));
              if (selectedClassId) void loadTeams(selectedClassId);
            }}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw size={14} /> Segarkan
          </button>
        </div>

        {(error || notice) && (
          <div
            className={`mb-4 flex items-start justify-between gap-3 rounded-2xl border p-3 text-sm font-bold ${
              error
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            <div className="flex items-start gap-2">
              {error ? (
                <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
              ) : (
                <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0" />
              )}
              {error || notice}
            </div>
            <button
              type="button"
              onClick={() => {
                setError('');
                setNotice('');
              }}
              className="text-current opacity-60 hover:opacity-100"
              aria-label="Tutup notifikasi"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Statistik */}
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon={<School size={20} />}
            label="Kelas"
            value={overview?.stats.classes ?? classes.length}
            hint="Kelompok belajar terdaftar"
            tone="bg-indigo-100 text-indigo-600"
          />
          <StatCard
            icon={<Users size={20} />}
            label="Tim"
            value={overview?.stats.teams ?? 0}
            hint="Tim siswa terdaftar"
            tone="bg-sky-100 text-sky-600"
          />
          <StatCard
            icon={<BarChart3 size={20} />}
            label="Percobaan"
            value={overview?.stats.attempts ?? 0}
            hint="Misi yang diselesaikan"
            tone="bg-amber-100 text-amber-600"
          />
          <StatCard
            icon={<Trophy size={20} />}
            label="Rata-rata"
            value={overview?.stats.avgScore ?? 0}
            hint="Skor total per misi"
            tone="bg-emerald-100 text-emerald-600"
          />
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.35fr]">
          {/* Kelas */}
          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-500">
                <GraduationCap size={17} /> Daftar Kelas
              </h3>
              <button
                type="button"
                onClick={() => setShowCreate((value) => !value)}
                className="flex items-center gap-1 rounded-xl bg-indigo-600 px-2.5 py-1.5 text-[11px] font-black text-white hover:bg-indigo-500"
              >
                <Plus size={14} /> Kelas
              </button>
            </div>

            {showCreate && (
              <form
                onSubmit={handleCreateClass}
                className="mb-4 space-y-2 rounded-2xl border border-indigo-100 bg-indigo-50 p-3"
              >
                <input
                  value={newClassName}
                  onChange={(event) => setNewClassName(event.target.value)}
                  placeholder="Nama kelas, mis. Kelas 6B"
                  className="w-full rounded-xl border-2 border-white bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-indigo-400"
                  required
                />
                <input
                  value={newClassCode}
                  onChange={(event) => setNewClassCode(event.target.value.toUpperCase())}
                  placeholder="Kode kelas (opsional), mis. SIAGA6B"
                  className="w-full rounded-xl border-2 border-white bg-white px-3 py-2 text-sm font-bold tracking-wider text-slate-700 outline-none focus:border-indigo-400"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={busy}
                    className="flex-1 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black text-white hover:bg-indigo-500 disabled:opacity-60"
                  >
                    Simpan Kelas
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-500"
                  >
                    Batal
                  </button>
                </div>
              </form>
            )}

            {classes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center">
                <p className="text-sm font-bold text-slate-400">Belum ada kelas.</p>
                <p className="mt-1 text-xs font-medium text-slate-400">
                  Buat kelas agar tim siswa bisa mendaftar dengan kode.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {classes.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-2xl border p-3 transition-colors ${
                      selectedClassId === item.id
                        ? 'border-indigo-300 bg-indigo-50'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedClassId(item.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-sm font-black text-slate-800">{item.name}</p>
                        <p className="mt-0.5 text-[11px] font-bold text-slate-400">
                          {item.teamCount} tim · {item.attemptCount} percobaan · rata-rata{' '}
                          {item.avgScore}
                        </p>
                      </button>
                      <div className="flex items-center gap-1">
                        <span className="rounded-lg bg-slate-900 px-2 py-1 font-mono text-[10px] font-black tracking-wider text-white">
                          {item.code}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingClass(item);
                            setEditName(item.name);
                            setEditCode(item.code);
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-indigo-600"
                          aria-label={`Ubah kelas ${item.name}`}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClass(item)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          aria-label={`Hapus kelas ${item.name}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {editingClass?.id === item.id && (
                      <form onSubmit={handleSaveClass} className="mt-3 space-y-2 border-t border-indigo-200/60 pt-3">
                        <input
                          value={editName}
                          onChange={(event) => setEditName(event.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700"
                          placeholder="Nama kelas"
                          required
                        />
                        <input
                          value={editCode}
                          onChange={(event) => setEditCode(event.target.value.toUpperCase())}
                          className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 font-mono text-xs font-black tracking-wider text-slate-700"
                          placeholder="Kode kelas"
                        />
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            disabled={busy}
                            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-black text-white disabled:opacity-60"
                          >
                            Simpan
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingClass(null)}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-black text-slate-500"
                          >
                            Batal
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-[11px] font-medium leading-relaxed text-amber-800">
              <b>Cara bergabung:</b> bagikan <b>kode kelas</b> ke siswa. Mereka memasukkan kode saat
              mendaftarkan tim di halaman permainan.
            </div>
          </section>

          {/* Performa per bencana + hasil terbaru */}
          <section className="space-y-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-500">
                <BarChart3 size={17} /> Rata-rata per Bencana
              </h3>
              <DisasterBars rows={overview?.perDisaster ?? []} />
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-500">
                <Trophy size={17} /> Hasil Misi Terbaru
              </h3>
              <RecentList rows={overview?.recent ?? []} />
            </div>
          </section>
        </div>

        {/* Tim di kelas terpilih */}
        <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-500">
                <Users size={17} /> Rekap Progres Siswa
              </h3>
              <p className="mt-1 text-xs font-medium text-slate-400">
                {selectedClass
                  ? `Kelas ${selectedClass.name} (${selectedClass.code}) · klik tim untuk rincian.`
                  : 'Pilih kelas terlebih dahulu.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="class-filter" className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Filter Kelas
              </label>
              <select
                id="class-filter"
                value={selectedClassId ?? ''}
                onChange={(event) => setSelectedClassId(Number(event.target.value) || null)}
                className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-black text-slate-700 outline-none focus:border-indigo-400"
              >
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.code}
                  </option>
                ))}
              </select>
            </div>
            {selectedClassId && (
              <button
                type="button"
                onClick={() => void loadTeams(selectedClassId)}
                className="flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1.5 text-[11px] font-black text-slate-500 hover:bg-slate-50"
              >
                <RefreshCw size={13} /> Muat Ulang
              </button>
            )}
          </div>

          {teamsLoading ? (
            <div className="flex items-center justify-center py-10 text-slate-400">
              <Loader2 size={26} className="animate-spin" />
            </div>
          ) : teams.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
              <p className="text-sm font-bold text-slate-400">Belum ada tim di kelas ini.</p>
              <p className="mt-1 text-xs font-medium text-slate-400">
                Bagikan kode kelas {selectedClass?.code ?? '-'} agar siswa dapat bergabung.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <th className="px-2 py-2">Tim</th>
                    <th className="px-2 py-2 text-center">Skor Total</th>
                    <th className="px-2 py-2 text-center">Misi</th>
                    <th className="px-2 py-2">Progres Bencana</th>
                    <th className="px-2 py-2 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((team, index) => (
                    <tr
                      key={team.id}
                      className="border-b border-slate-100 transition-colors hover:bg-slate-50"
                    >
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${
                              index === 0
                                ? 'bg-amber-100 text-amber-700'
                                : index === 1
                                  ? 'bg-slate-200 text-slate-600'
                                  : index === 2
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-black text-slate-700">{team.name}</p>
                            <p className="text-[10px] font-medium text-slate-400">
                              Terakhir aktif {formatDate(team.lastSeen)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-3 text-center font-mono text-base font-black text-indigo-600">
                        {team.totalScore}
                      </td>
                      <td className="px-2 py-3 text-center">
                        <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black text-emerald-700">
                          {team.missionsDone}/4
                        </span>
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(Object.keys(DISASTER_META) as DisasterType[]).map((type) => {
                            const progress = team.progress[type];
                            const meta = DISASTER_META[type];
                            return (
                              <span
                                key={type}
                                title={
                                  progress
                                    ? `${meta.label}: skor terbaik ${progress.bestScore}`
                                    : `${meta.label}: belum dimainkan`
                                }
                                className={`rounded-md px-1.5 py-0.5 text-[10px] font-black ${
                                  progress
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-slate-100 text-slate-300'
                                }`}
                              >
                                {meta.emoji} {progress ? progress.bestScore : '—'}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-2 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => void openTeamDetail(team.id)}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1.5 text-[11px] font-black text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
                        >
                          Detail <ChevronRight size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="mt-6 text-center text-xs font-medium text-slate-400">
          Agent Siaga · Dashboard guru lokal · Tim Adhista
        </p>
      </main>

      {teamDetail && (
        <TeamDetailModal
          detail={teamDetail}
          onClose={() => setTeamDetail(null)}
          onDelete={(teamId) => void handleDeleteTeam(teamId)}
        />
      )}
    </div>
  );
};

export default TeacherDashboard;
