import React, { Suspense, lazy, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  BookOpenCheck,
  Compass,
  GraduationCap,
  Play,
  ShieldCheck,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { Avatar } from '../types';
import type { TeamSession } from '../sessionStore';
import { LearningObjectivesModal } from './LearningObjectivesModal';

const HeroScene = lazy(() => import('./HeroScene'));

const MotionDiv = motion.div as any;

export interface LandingPageProps {
  soundEnabled: boolean;
  onToggleSound: () => void;
  activeSession: TeamSession | null;
  onStartRegistration: () => void;
  onContinueSession: () => void;
  onOpenDashboard: () => void;
}

const MISSIONS = [
  { icon: '🏚️', label: 'Gempa Bumi', color: 'from-amber-400 to-orange-500' },
  { icon: '🌊', label: 'Banjir Bandang', color: 'from-sky-400 to-blue-600' },
  { icon: '🌋', label: 'Gunung Meletus', color: 'from-rose-400 to-red-600' },
  { icon: '⛰️', label: 'Tanah Longsor', color: 'from-lime-500 to-emerald-700' },
];

const float = (delay: number, y = 12) => ({
  animate: { y: [0, -y, 0] },
  transition: { repeat: Infinity, duration: 3.5 + delay * 0.4, delay, ease: 'easeInOut' as const },
});

/**
 * Halaman awal (hero) yang cerah, ramah anak sekolah, dan responsif penuh
 * viewport. Latar 3D interaktif dimuat terpisah agar cepat tampil.
 */
export const LandingPage: React.FC<LandingPageProps> = ({
  soundEnabled,
  onToggleSound,
  activeSession,
  onStartRegistration,
  onContinueSession,
  onOpenDashboard,
}) => {
  const [showObjectives, setShowObjectives] = useState(false);

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-gradient-to-b from-sky-300 via-cyan-100 to-emerald-100 font-sans">
      {/* ---------- Latar 3D interaktif ---------- */}
      <div className="absolute inset-0 z-0 lg:left-[38%]" aria-hidden="true">
        <div className="hero-aurora absolute inset-0 bg-[radial-gradient(circle_at_60%_35%,#ffffff_0%,transparent_50%)]" />
        <Suspense fallback={null}>
          <HeroScene />
        </Suspense>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-sky-100/70 via-sky-50/30 to-emerald-100/80 lg:from-transparent lg:via-transparent lg:to-emerald-100/50" />
      </div>

      {/* ---------- Navbar ---------- */}
      <header className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-8 sm:py-6">
        <div className="flex items-center gap-2.5 rounded-2xl border border-white/70 bg-white/70 px-3 py-2 shadow-lg backdrop-blur-md sm:px-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-sky-600 text-xl shadow-inner sm:h-10 sm:w-10">
            🌏
          </div>
          <div className="leading-tight">
            <p className="font-display text-base font-black tracking-tight text-slate-800 sm:text-lg">
              AGENT SIAGA
            </p>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-600 sm:text-[10px]">
              Siap. Tanggap. Selamat.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowObjectives(true)}
            className="flex h-10 items-center gap-2 rounded-xl border-2 border-white/80 bg-white/85 px-3 text-xs font-black text-emerald-700 shadow-lg backdrop-blur-md transition-colors hover:bg-white sm:h-11 sm:px-4 sm:text-sm"
            aria-label="Buka tujuan pembelajaran"
            title="Lihat Tujuan Pembelajaran"
          >
            <BookOpenCheck size={19} className="text-emerald-500" />
            <span className="hidden lg:inline">TUJUAN PEMBELAJARAN</span>
            <span className="hidden sm:inline lg:hidden">TUJUAN</span>
          </motion.button>
          <button
            type="button"
            onClick={onToggleSound}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/70 bg-white/70 text-slate-600 shadow-md backdrop-blur-md transition hover:bg-white active:scale-95 sm:h-11 sm:w-11"
            aria-label={soundEnabled ? 'Matikan suara' : 'Nyalakan suara'}
            title={soundEnabled ? 'Matikan suara' : 'Nyalakan suara'}
          >
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} className="text-slate-400" />}
          </button>
          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onOpenDashboard}
            className="flex h-10 items-center gap-2 rounded-xl border-2 border-white/80 bg-white/85 px-3 text-xs font-black text-indigo-700 shadow-lg backdrop-blur-md transition-colors hover:bg-white sm:h-11 sm:px-4 sm:text-sm"
          >
            <GraduationCap size={19} className="text-indigo-500" />
            <span className="hidden sm:inline">MODE GURU — DASHBOARD</span>
            <span className="sm:hidden">GURU</span>
          </motion.button>
        </div>
      </header>

      {/* ---------- Konten utama ---------- */}
      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-4 pb-10 sm:px-8">
        <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-10">
          {/* Teks hero */}
          <MotionDiv
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="text-center lg:text-left"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/70 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700 shadow-sm backdrop-blur-sm sm:text-xs">
              <Sparkles size={14} className="text-amber-500" />
              Petualangan Edukasi Bencana
            </span>

            <h1 className="font-display mt-4 text-[3.2rem] font-black leading-[0.9] tracking-tight text-slate-900 drop-shadow-sm sm:text-7xl lg:text-8xl">
              <span className="hero-title-shine bg-gradient-to-r from-emerald-500 via-sky-500 to-indigo-600 bg-clip-text text-transparent">
                AGENT SIAGA
              </span>
            </h1>
            <p className="font-display mt-2 text-xl font-bold tracking-wide text-slate-700 sm:text-3xl">
              Misi Penyelamatan Bumi
            </p>
            <p className="mx-auto mt-4 max-w-xl text-sm font-semibold leading-relaxed text-slate-600 sm:text-lg lg:mx-0">
              Jelajahi dunia 3D, temukan empat zona bencana, dan latih tim kamu mengambil
              keputusan yang tepat saat bencana datang. Belajar jadi seru! 🚀
            </p>

            {/* Daftar misi */}
            <div className="mt-6 grid grid-cols-2 gap-2 sm:gap-3 lg:max-w-xl">
              {MISSIONS.map((mission, index) => (
                <MotionDiv
                  key={mission.label}
                  {...float(index * 0.3, 7)}
                  className="flex items-center gap-2 rounded-2xl border border-white/80 bg-white/75 px-2.5 py-2 text-left shadow-md backdrop-blur-sm sm:px-3 sm:py-2.5"
                >
                  <span
                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${mission.color} text-lg shadow-inner sm:h-10 sm:w-10`}
                  >
                    {mission.icon}
                  </span>
                  <span className="min-w-0 text-xs font-black leading-tight text-slate-700 sm:text-sm">
                    {mission.label}
                  </span>
                </MotionDiv>
              ))}
            </div>

            {/* Tombol utama */}
            <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center lg:max-w-xl">
              <motion.button
                type="button"
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={onStartRegistration}
                className="group flex min-h-[56px] items-center justify-center gap-2 rounded-2xl border-b-4 border-emerald-700 bg-gradient-to-r from-emerald-500 to-teal-500 px-5 text-base font-black text-white shadow-xl shadow-emerald-500/30 transition-colors hover:from-emerald-400 hover:to-teal-400 sm:flex-1 sm:text-lg"
              >
                <Play size={21} fill="currentColor" />
                DAFTARKAN TIM / MULAI MISI
                <ArrowRight size={19} className="transition-transform group-hover:translate-x-1" />
              </motion.button>

              <motion.button
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={onOpenDashboard}
                className="flex min-h-[56px] items-center justify-center gap-2 rounded-2xl border-2 border-indigo-200 bg-white/85 px-5 text-sm font-black text-indigo-700 shadow-lg backdrop-blur-sm transition-colors hover:bg-white sm:text-base"
              >
                <GraduationCap size={21} />
                MODE GURU — DASHBOARD
              </motion.button>
            </div>

            {activeSession && (
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                onClick={onContinueSession}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-amber-400 bg-amber-50/85 px-4 py-3 text-sm font-black text-amber-800 shadow-sm transition-colors hover:bg-amber-100 sm:max-w-xl"
              >
                <Compass size={18} />
                Lanjutkan misi {activeSession.teamName} · Skor {activeSession.totalScore}
              </motion.button>
            )}

            <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-500 lg:justify-start">
              <ShieldCheck size={14} className="text-emerald-600" />
              Progres tim tersimpan otomatis dan bisa dilihat guru lewat dashboard.
            </p>
          </MotionDiv>

          {/* Ruang kosong di desktop sebagai tempat "napas" planet 3D */}
          <div className="relative hidden min-h-[420px] lg:block" aria-hidden="true">
            <MotionDiv
              {...float(0.4, 16)}
              className="absolute right-2 top-6 flex items-center gap-2 rounded-2xl border border-white/70 bg-white/75 px-3 py-2 text-xs font-black text-slate-700 shadow-lg backdrop-blur-sm"
            >
              <BookOpenCheck size={16} className="text-emerald-600" />
              4 Misi · 4 Kuis · 1 Bumi
            </MotionDiv>
          </div>
        </div>
      </main>

      {/* ---------- Footer ---------- */}
      <footer className="relative z-10 w-full px-4 pb-5 text-center text-[11px] font-bold text-slate-500 sm:pb-6">
        Agent Siaga · Belajar tanggap bencana lewat petualangan.
      </footer>

      {/* ---------- Modal Tujuan Pembelajaran ---------- */}
      <AnimatePresence>
        {showObjectives && (
          <LearningObjectivesModal onClose={() => setShowObjectives(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default LandingPage;
