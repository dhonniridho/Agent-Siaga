import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowRight,
  Check,
  LogIn,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { AVATARS } from '../constants';
import type { Avatar, DisasterType } from '../types';
import {
  findSessions,
  saveSession,
  setActiveSessionId,
  type TeamSession,
} from '../sessionStore';
import { ApiError, registerTeam } from '../services/api';

const MotionDiv = motion.div as any;

interface FormErrors {
  studentName?: string;
  teamName?: string;
  avatar?: string;
  login?: string;
  submit?: string;
}

export interface TeamRegistrationModalProps {
  onClose: () => void;
  onRegister: (session: TeamSession, avatar: Avatar) => void;
  onLogin: (session: TeamSession, avatar: Avatar) => void;
  playSound: (type: string) => void;
}

const inputClass =
  'w-full rounded-2xl border-2 border-indigo-100 bg-indigo-50/60 px-4 py-3 text-base font-bold text-indigo-900 outline-none transition-colors placeholder:font-semibold placeholder:text-indigo-300 focus:border-indigo-400 focus:bg-white';

/**
 * Pendaftaran menyimpan identitas tim ke server; sesi lokal dipakai untuk
 * melanjutkan permainan di perangkat yang sama.
 */
export const TeamRegistrationModal: React.FC<TeamRegistrationModalProps> = ({
  onClose,
  onRegister,
  onLogin,
  playSound,
}) => {
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [studentName, setStudentName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [found, setFound] = useState<TeamSession[] | null>(null);
  const [classCode, setClassCode] = useState('');
  const [busy, setBusy] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => firstInputRef.current?.focus(), 120);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        playSound('click');
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, playSound]);

  const clearField = (field: keyof FormErrors) =>
    setErrors((prev) => ({ ...prev, [field]: undefined }));

  const switchMode = (next: 'register' | 'login') => {
    playSound('click');
    setMode(next);
    setErrors({});
    setFound(null);
  };

  const validateCommon = () => {
    const next: FormErrors = {};
    if (studentName.trim().length < 2) next.studentName = 'Nama agen minimal 2 huruf.';
    else if (studentName.trim().length > 24) next.studentName = 'Nama agen maksimal 24 huruf.';
    // Saat login siswa cukup nama agen; nama tim tidak dibutuhkan.
    if (mode === 'register') {
      if (teamName.trim().length < 2) next.teamName = 'Nama tim minimal 2 huruf.';
      else if (teamName.trim().length > 20) next.teamName = 'Nama tim maksimal 20 huruf.';
      if (!selectedAvatar) next.avatar = 'Pilih avatar karakter tim!';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleRegister = async () => {
    if (busy || !validateCommon() || !selectedAvatar) {
      playSound('warning');
      return;
    }
    setBusy(true);
    setErrors({});
    try {
      const remote = await registerTeam(
        teamName.trim(),
        selectedAvatar.id,
        classCode.trim().toUpperCase(),
        studentName.trim()
      );
      const completedLevelScores: Partial<Record<DisasterType, number>> = {};
      const quizScores: Partial<Record<DisasterType, number>> = {};
      for (const [type, progress] of Object.entries(remote.team.progress)) {
        if (!progress) continue;
        completedLevelScores[type as DisasterType] = progress.bestScore;
        quizScores[type as DisasterType] = progress.bestRecoveryScore;
      }
      const session = saveSession({
        studentName: studentName.trim(),
        teamName: remote.team.name,
        className: remote.team.className,
        avatarId: selectedAvatar.id,
        backendToken: remote.token,
        totalScore: Object.values(completedLevelScores).reduce((total, score) => total + (score || 0), 0),
        completedZones: Object.keys(completedLevelScores) as DisasterType[],
        completedLevelScores,
        quizScores,
      });
      playSound('success');
      onRegister(session, selectedAvatar);
    } catch (error) {
      setErrors({
        submit: error instanceof ApiError ? error.message : 'Pendaftaran gagal. Coba lagi.',
      });
      playSound('warning');
    } finally {
      setBusy(false);
    }
  };

  const handleLogin = () => {
    if (!validateCommon()) {
      playSound('warning');
      return;
    }
    const results = findSessions(studentName);
    setFound(results);
    if (results.length === 0) {
      setErrors({ login: 'Sesi tidak ditemukan. Pastikan nama agen benar, atau daftarkan tim baru.' });
      playSound('warning');
      return;
    }
    playSound('success');
  };

  const resume = (session: TeamSession) => {
    const avatar = AVATARS.find((item) => item.id === session.avatarId) || AVATARS[0];
    setActiveSessionId(session.id);
    playSound('success');
    onLogin(session, avatar);
  };

  return createPortal(
    <MotionDiv
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto overscroll-contain bg-slate-950/60 p-3 backdrop-blur-md sm:p-6"
      style={{ touchAction: 'pan-y' }}
      onMouseDown={(event: React.MouseEvent) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <MotionDiv
        initial={{ y: 30, scale: 0.96, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 20, scale: 0.98, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 270, damping: 26 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="registration-title"
        className="relative my-auto w-full max-w-2xl overflow-hidden rounded-[2rem] border-4 border-white bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-sky-500 via-indigo-500 to-violet-600 px-5 pb-7 pt-6 text-white sm:px-8">
          <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full border-[20px] border-white/10" />
          <div className="pointer-events-none absolute -bottom-16 left-10 h-36 w-36 rounded-full border-[18px] border-white/10" />
          <button
            type="button"
            onClick={() => {
              playSound('click');
              onClose();
            }}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30"
            aria-label="Tutup pendaftaran"
          >
            <X size={20} />
          </button>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]">
            <Sparkles size={13} /> Pusat Komando Tim
          </span>
          <h2 id="registration-title" className="font-display mt-3 text-3xl font-black sm:text-4xl">
            {mode === 'register' ? 'Daftarkan Tim Kamu!' : 'Selamat Datang Kembali, Agen!'}
          </h2>
          <p className="mt-1 max-w-md text-sm font-semibold text-indigo-100">
            {mode === 'register'
              ? 'Isi identitas tim, pilih avatar, lalu misi penyelamatan bumi siap dimulai.'
              : 'Masukkan nama agen untuk melanjutkan progres yang tersimpan di perangkat ini.'}
          </p>

          {/* Tab switch */}
          <div className="mt-5 flex w-full max-w-sm rounded-2xl bg-white/15 p-1">
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-black transition sm:text-sm ${
                mode === 'register' ? 'bg-white text-indigo-700 shadow-md' : 'text-white/80 hover:text-white'
              }`}
            >
              <Users size={15} /> Daftar Tim Baru
            </button>
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-black transition sm:text-sm ${
                mode === 'login' ? 'bg-white text-indigo-700 shadow-md' : 'text-white/80 hover:text-white'
              }`}
            >
              <LogIn size={15} /> Login Siswa
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[62vh] overflow-y-auto p-5 sm:p-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="studentName" className="mb-1.5 flex items-center gap-1.5 text-xs font-black text-slate-700">
                <UserRound size={15} className="text-indigo-500" /> Nama Agen / Siswa
              </label>
              <input
                ref={firstInputRef}
                id="studentName"
                type="text"
                autoComplete="name"
                maxLength={24}
                placeholder="Contoh: Rani"
                value={studentName}
                onChange={(event) => {
                  setStudentName(event.target.value);
                  clearField('studentName');
                  clearField('login');
                  setFound(null);
                }}
                className={inputClass}
                aria-invalid={!!errors.studentName}
              />
              {errors.studentName && (
                <p className="mt-1 flex items-center gap-1 text-[11px] font-bold text-rose-600">
                  <AlertCircle size={12} /> {errors.studentName}
                </p>
              )}
            </div>

            {mode === 'register' ? (
              <div>
                <label htmlFor="teamName" className="mb-1.5 flex items-center gap-1.5 text-xs font-black text-slate-700">
                  <Users size={15} className="text-indigo-500" /> Nama Tim
                </label>
                <input
                  id="teamName"
                  type="text"
                  maxLength={20}
                  placeholder="Contoh: Tim Harimau"
                  value={teamName}
                  onChange={(event) => {
                    setTeamName(event.target.value);
                    clearField('teamName');
                  }}
                  className={inputClass}
                  aria-invalid={!!errors.teamName}
                />
                {errors.teamName && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] font-bold text-rose-600">
                    <AlertCircle size={12} /> {errors.teamName}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/60 px-3 py-3 text-xs font-bold text-indigo-600">
                <LogIn size={17} className="flex-shrink-0" />
                Sesi login hanya tersedia di perangkat/browser tempat tim didaftarkan.
              </div>
            )}
          </div>

          {mode === 'register' && (
            <div className="mt-4">
              <label htmlFor="classCode" className="mb-1.5 block text-xs font-black text-slate-700">
                Kode Kelas <span className="font-semibold text-slate-400">(opsional)</span>
              </label>
              <input
                id="classCode"
                type="text"
                maxLength={20}
                placeholder="Minta kode dari guru"
                value={classCode}
                onChange={(event) => setClassCode(event.target.value.toUpperCase().replace(/\s+/g, ''))}
                className={inputClass}
                disabled={busy}
              />
            </div>
          )}

          {/* Avatar picker (hanya saat daftar) */}
          {mode === 'register' && (
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-black text-slate-700">Pilih Avatar Karakter</p>
                <span className="text-[10px] font-bold text-slate-400">6 pilihan seru</span>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {AVATARS.map((avatar) => {
                  const active = selectedAvatar?.id === avatar.id;
                  return (
                    <motion.button
                      key={avatar.id}
                      type="button"
                      whileTap={{ scale: 0.92 }}
                      onClick={() => {
                        setSelectedAvatar(avatar);
                        clearField('avatar');
                        playSound('click');
                      }}
                      title={avatar.name}
                      aria-label={`Pilih avatar ${avatar.name}`}
                      aria-pressed={active}
                      className={`relative flex aspect-square flex-col items-center justify-center rounded-2xl border-2 p-1 transition-all ${
                        active
                          ? `border-transparent bg-gradient-to-br ${avatar.bgGradient} text-white shadow-lg`
                          : 'border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50'
                      }`}
                    >
                      <span className="text-2xl sm:text-3xl">{avatar.icon}</span>
                      <span className={`mt-0.5 text-[8px] font-black leading-none ${active ? 'text-white' : 'text-slate-500'}`}>
                        {avatar.name.replace('Agent ', '')}
                      </span>
                      {active && (
                        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow">
                          <Check size={12} strokeWidth={4} />
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
              {errors.avatar && (
                <p className="mt-2 flex items-center gap-1 text-[11px] font-bold text-rose-600">
                  <AlertCircle size={12} /> {errors.avatar}
                </p>
              )}
            </div>
          )}

          {/* Hasil login */}
          {mode === 'login' && found && found.length > 0 && (
            <div className="mt-5 rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-black text-emerald-700">
                <Check size={14} /> {found.length} sesi ditemukan. Pilih tim kamu:
              </p>
              <div className="space-y-2">
                {found.map((session) => {
                  const avatar = AVATARS.find((item) => item.id === session.avatarId) || AVATARS[0];
                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => resume(session)}
                      className="flex w-full items-center gap-3 rounded-xl border border-emerald-200 bg-white p-2 text-left shadow-sm transition hover:border-emerald-400 hover:shadow-md"
                    >
                      <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${avatar.bgGradient} text-xl`}>
                        {avatar.icon}
                      </span>
                      <span className="min-w-0 flex-1 leading-tight">
                        <span className="block truncate text-sm font-black text-slate-800">{session.teamName}</span>
                        <span className="block text-[10px] font-bold text-slate-500">
                          {session.studentName} · {session.className}
                        </span>
                      </span>
                      <span className="flex-shrink-0 rounded-lg bg-amber-100 px-2 py-1 text-[10px] font-black text-amber-700">
                        ⭐ {session.totalScore}
                      </span>
                      <ArrowRight size={16} className="flex-shrink-0 text-emerald-600" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {errors.login && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600">
              <AlertCircle size={15} /> {errors.login}
            </div>
          )}
          {errors.submit && (
            <div role="alert" className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600">
              <AlertCircle size={15} /> {errors.submit}
            </div>
          )}
        </div>

        {/* Footer / submit */}
        <div className="border-t-2 border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-7">
          {mode === 'register' ? (
            <button
              type="button"
              onClick={handleRegister}
              disabled={busy}
              className="flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-emerald-700 bg-gradient-to-r from-emerald-500 to-teal-500 text-base font-black text-white shadow-lg transition hover:from-emerald-400 hover:to-teal-400 active:translate-y-0.5 active:border-b-2 disabled:cursor-wait disabled:opacity-60 sm:text-lg"
            >
              <ShieldCheck size={21} /> {busy ? 'MENDAFTARKAN...' : 'DAFTARKAN TIM & MULAI MISI'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleLogin}
              className="flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-indigo-700 bg-gradient-to-r from-indigo-500 to-violet-600 text-base font-black text-white shadow-lg transition hover:from-indigo-400 hover:to-violet-500 active:translate-y-0.5 active:border-b-2 sm:text-lg"
            >
              <LogIn size={21} /> CARI SESI & LANJUTKAN
            </button>
          )}
          <p className="mt-2 text-center text-[10px] font-bold text-slate-400">
            Identitas tim dan hasil misi tersimpan di database server agar dapat dilihat guru.
          </p>
        </div>
      </MotionDiv>
    </MotionDiv>,
    document.body
  );
};

export default TeamRegistrationModal;
