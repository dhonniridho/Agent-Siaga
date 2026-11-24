import React, { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Award,
  Backpack,
  CheckCircle2,
  ChevronRight,
  Heart,
  MapPin,
  Medal,
  RefreshCw,
  Sparkles,
  Star,
  Trophy,
} from 'lucide-react';
import type { Avatar, DisasterType, LevelConfig } from '../types';
import { SceneBackdrop3D } from './SceneBackdrop3D';

const MotionDiv = motion.div as any;
const MotionSpan = motion.span as any;

const ZONE_EMOJI: Record<DisasterType, string> = {
  EARTHQUAKE: '🏫',
  FLOOD: '🌊',
  LANDSLIDE: '⛰️',
  VOLCANO: '🌋',
};

const CONFETTI_COLORS = [
  '#facc15',
  '#fb7185',
  '#38bdf8',
  '#4ade80',
  '#a78bfa',
  '#fb923c',
  '#f472b6',
  '#2dd4bf',
];

const ConfettiBurst: React.FC = () => {
  const pieces = useMemo(
    () =>
      Array.from({ length: 80 }, (_, index) => ({
        id: index,
        left: Math.random() * 100,
        delay: Math.random() * 2.4,
        duration: 2.6 + Math.random() * 2.4,
        size: 5 + Math.random() * 9,
        rotate: Math.random() * 720 - 360,
        drift: (Math.random() - 0.5) * 140,
        color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
        round: Math.random() > 0.55,
      })),
    []
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-20 overflow-hidden" aria-hidden="true">
      {pieces.map((piece) => (
        <MotionDiv
          key={piece.id}
          initial={{ y: '-12vh', x: 0, opacity: 1, rotate: 0 }}
          animate={{ y: '112vh', x: piece.drift, opacity: [1, 1, 0.9, 0], rotate: piece.rotate }}
          transition={{
            duration: piece.duration,
            delay: piece.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
          className={`absolute top-0 ${piece.round ? 'rounded-full' : 'rounded-[2px]'}`}
          style={{
            left: `${piece.left}%`,
            width: piece.size,
            height: piece.round ? piece.size : piece.size * 1.8,
            backgroundColor: piece.color,
          }}
        />
      ))}
    </div>
  );
};

const SparkleRing: React.FC = () => {
  const sparkles = useMemo(
    () =>
      Array.from({ length: 14 }, (_, index) => ({
        id: index,
        angle: (index / 14) * Math.PI * 2,
        delay: index * 0.06,
        distance: 110 + Math.random() * 50,
      })),
    []
  );

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {sparkles.map((sparkle) => (
        <MotionDiv
          key={sparkle.id}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1.15, 0],
            x: Math.cos(sparkle.angle) * sparkle.distance,
            y: Math.sin(sparkle.angle) * sparkle.distance,
          }}
          transition={{
            duration: 1.4,
            delay: 0.35 + sparkle.delay,
            repeat: Infinity,
            repeatDelay: 1.6,
            ease: 'easeOut',
          }}
          className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.9)]"
        />
      ))}
    </div>
  );
};

export interface MissionCelebrationProps {
  teamName: string;
  avatar: Avatar | null;
  level: LevelConfig;
  actionScore: number;
  recoveryScore: number;
  quizCorrect: number;
  quizTotal: number;
  healthRemaining?: number;
  itemsSaved?: number;
  totalItems?: number;
  survived?: boolean;
  bestScore: number;
  previousBest: number;
  totalTeamScore: number;
  allMissionsDone: boolean;
  onReplay: () => void;
  onChooseMission: () => void;
  onViewAwards?: () => void;
  playSound: (type: string) => void;
}

/**
 * Halaman perayaan setelah tombol "Selesaikan Misi" di kuis akhir.
 * Menampilkan konfeti, bintang, lencana, rekap skor/nyawa, pesan Kapten,
 * serta tombol Main Lagi dan Pilih Misi Lain.
 */
export const MissionCelebration: React.FC<MissionCelebrationProps> = ({
  teamName,
  avatar,
  level,
  actionScore,
  recoveryScore,
  quizCorrect,
  quizTotal,
  healthRemaining,
  itemsSaved,
  totalItems,
  survived,
  bestScore,
  previousBest,
  totalTeamScore,
  allMissionsDone,
  onReplay,
  onChooseMission,
  onViewAwards,
  playSound,
}) => {
  const totalScore = actionScore + recoveryScore;
  const percent = Math.round((totalScore / 200) * 100);

  const tier =
    percent >= 90
      ? {
          label: 'Lencana Emas',
          emoji: '🏅',
          stars: 3,
          ring: 'from-amber-200 via-yellow-400 to-amber-600',
          text: 'text-amber-300',
          chip: 'bg-amber-400/20 text-amber-100 ring-amber-300/40',
          glow: 'shadow-[0_0_70px_rgba(250,204,21,0.45)]',
        }
      : percent >= 70
        ? {
            label: 'Lencana Perak',
            emoji: '🥈',
            stars: 2,
            ring: 'from-slate-100 via-slate-300 to-slate-500',
            text: 'text-slate-200',
            chip: 'bg-slate-300/20 text-slate-100 ring-slate-200/40',
            glow: 'shadow-[0_0_60px_rgba(203,213,225,0.35)]',
          }
        : {
            label: 'Lencana Perunggu',
            emoji: '🥉',
            stars: 1,
            ring: 'from-orange-200 via-amber-500 to-orange-700',
            text: 'text-orange-200',
            chip: 'bg-orange-400/20 text-orange-100 ring-orange-300/40',
            glow: 'shadow-[0_0_60px_rgba(251,146,60,0.35)]',
          };

  const bestImproved = bestScore > previousBest;
  const newRecord = bestImproved && bestScore > 0;

  const captainMessage = newRecord
    ? `Rekor baru, Tim ${teamName || 'Siaga'}! Skor terbaikmu ${bestScore} poin dan langsung tersimpan untuk Dashboard Guru. Kalian makin hebat!`
    : percent >= 90
      ? `Luar biasa, Tim ${teamName || 'Siaga'}! Kalian menyelesaikan misi ${level.title} dengan sangat sigap. Terus jaga semangat siaga!`
      : percent >= 70
        ? `Kerja bagus, Tim ${teamName || 'Siaga'}! Misi ${level.title} berhasil dituntaskan. Coba main lagi untuk mengejar lencana emas!`
        : `Misi ${level.title} selesai, Tim ${teamName || 'Siaga'}! Setiap percobaan membuat kalian lebih siap. Ayo main lagi dan pecahkan rekor terbaikmu!`;

  useEffect(() => {
    playSound('victory');
  }, [playSound]);

  return (
    <div className="fixed inset-0 z-[120] h-screen w-full overflow-y-auto bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 text-white">
      <SceneBackdrop3D variant="victory" accent="#facc15" />
      <ConfettiBurst />

      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(129,140,248,0.28),transparent_55%)]" />

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center px-3 py-6 sm:px-6 sm:py-10">
        <MotionDiv
          initial={{ opacity: 0, y: 28, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 180, damping: 20 }}
          className="w-full overflow-hidden rounded-[2rem] border border-white/20 bg-white/10 shadow-2xl backdrop-blur-xl"
        >
          <div className="h-2 w-full bg-gradient-to-r from-amber-300 via-emerald-300 to-sky-400" />

          <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center lg:gap-10">
            {/* Lencana + bintang */}
            <div className="flex flex-col items-center text-center">
              <MotionDiv
                initial={{ scale: 0, rotate: -160 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 180, damping: 14, delay: 0.15 }}
                className={`relative flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br ${tier.ring} p-1.5 ${tier.glow} sm:h-48 sm:w-48`}
              >
                <SparkleRing />
                <div className="flex h-full w-full flex-col items-center justify-center rounded-full border-4 border-white/50 bg-slate-950/85">
                  <MotionSpan
                    animate={{ y: [0, -6, 0], rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                    className="text-5xl sm:text-6xl"
                    role="img"
                    aria-label={tier.label}
                  >
                    {tier.emoji}
                  </MotionSpan>
                  <span className={`mt-1 text-[11px] font-black uppercase tracking-[0.2em] ${tier.text}`}>
                    {tier.label}
                  </span>
                  <span className="font-mono text-2xl font-black text-white">{totalScore}</span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-white/45">
                    dari 200 poin
                  </span>
                </div>
              </MotionDiv>

              <div className="mt-4 flex items-center justify-center gap-1.5">
                {[0, 1, 2].map((index) => (
                  <MotionDiv
                    key={index}
                    initial={{ scale: 0, rotate: -90, opacity: 0 }}
                    animate={{
                      scale: index < tier.stars ? 1 : 0.7,
                      rotate: 0,
                      opacity: index < tier.stars ? 1 : 0.22,
                    }}
                    transition={{
                      type: 'spring',
                      stiffness: 260,
                      damping: 14,
                      delay: 0.35 + index * 0.18,
                    }}
                  >
                    <Star
                      size={index === 1 ? 42 : 34}
                      className={index < tier.stars ? 'text-amber-300' : 'text-white'}
                      fill="currentColor"
                    />
                  </MotionDiv>
                ))}
              </div>

              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-100 ring-1 ring-white/15">
                <Sparkles size={12} /> Misi Selesai
              </p>
              <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">
                {ZONE_EMOJI[level.id]} {level.title}
              </h1>
              <p className="mt-1 text-sm font-bold text-indigo-100/80">
                Tim {teamName || 'Siaga'} · {percent}% penguasaan misi
              </p>

              {newRecord && (
                <MotionDiv
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.8, type: 'spring', bounce: 0.5 }}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1.5 text-xs font-black text-amber-950 shadow-lg"
                >
                  <Trophy size={15} /> REKOR BARU TERSIMPAN!
                </MotionDiv>
              )}
            </div>

            {/* Rekap skor, nyawa, pesan Kapten, tombol */}
            <div className="min-w-0">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-2xl border border-white/15 bg-white/10 p-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-indigo-200">
                    Skor Aksi 3D
                  </p>
                  <p className="mt-1 font-mono text-2xl font-black text-white">{actionScore}</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 p-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-indigo-200">
                    Skor Kuis
                  </p>
                  <p className="mt-1 font-mono text-2xl font-black text-white">{recoveryScore}</p>
                </div>
                <div className="rounded-2xl border border-emerald-300/30 bg-emerald-400/15 p-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-200">
                    Jawaban Benar
                  </p>
                  <p className="mt-1 font-mono text-2xl font-black text-emerald-100">
                    {quizCorrect}
                    <span className="text-sm text-emerald-200/60">/{quizTotal}</span>
                  </p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 p-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-indigo-200">
                    Skor Terbaik
                  </p>
                  <p className="mt-1 font-mono text-2xl font-black text-amber-300">{bestScore}</p>
                </div>
              </div>

              <div className="mt-2.5 flex flex-wrap gap-2">
                {typeof healthRemaining === 'number' && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 px-3 py-1.5 text-xs font-black text-rose-100 ring-1 ring-rose-300/30">
                    <Heart size={14} fill="currentColor" /> Nyawa tersisa {healthRemaining}%
                  </span>
                )}
                {typeof itemsSaved === 'number' && typeof totalItems === 'number' && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/20 px-3 py-1.5 text-xs font-black text-sky-100 ring-1 ring-sky-300/30">
                    <Backpack size={14} /> Barang penting {itemsSaved}/{totalItems}
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black ring-1 ${
                    survived === false
                      ? 'bg-orange-500/20 text-orange-100 ring-orange-300/30'
                      : 'bg-emerald-500/20 text-emerald-100 ring-emerald-300/30'
                  }`}
                >
                  <CheckCircle2 size={14} />
                  {survived === false ? 'Belajar dari percobaan ini' : 'Evakuasi berhasil'}
                </span>
              </div>

              <div className="mt-4 flex items-start gap-3 rounded-2xl border border-indigo-300/30 bg-indigo-950/55 p-3.5">
                <img
                  src="/assets/kapten-success.png"
                  alt="Kapten Siaga"
                  className="h-14 w-14 flex-shrink-0 object-contain drop-shadow-md"
                  style={{ imageRendering: 'pixelated' }}
                />
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
                    Pesan Kapten Siaga
                  </p>
                  <p className="mt-1 text-sm font-bold leading-relaxed text-indigo-50">
                    {captainMessage}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={onReplay}
                  className="flex min-h-[54px] flex-1 items-center justify-center gap-2 rounded-2xl border-b-4 border-amber-600 bg-amber-400 px-4 text-base font-black text-amber-950 shadow-xl transition-all hover:bg-amber-300 active:translate-y-0.5 active:border-b-2"
                >
                  <RefreshCw size={19} /> Main Lagi
                </button>
                <button
                  type="button"
                  onClick={onChooseMission}
                  className="flex min-h-[54px] flex-1 items-center justify-center gap-2 rounded-2xl border-b-4 border-emerald-700 bg-emerald-500 px-4 text-base font-black text-white shadow-xl transition-all hover:bg-emerald-400 active:translate-y-0.5 active:border-b-2"
                >
                  <MapPin size={19} /> Pilih Misi Lain
                  <ChevronRight size={17} />
                </button>
              </div>

              {allMissionsDone && onViewAwards && (
                <button
                  type="button"
                  onClick={onViewAwards}
                  className="mt-2 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 text-sm font-black text-white/90 transition-colors hover:bg-white/20"
                >
                  <Award size={18} /> Lihat Penghargaan Akhir
                  <ChevronRight size={16} />
                </button>
              )}

              <p className="mt-3 text-center text-[10px] font-bold text-white/45">
                Total skor terbaik seluruh misi: {totalTeamScore} poin · tersimpan otomatis untuk
                Dashboard Guru
              </p>
            </div>
          </div>
        </MotionDiv>

        <div className="mt-3 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-white/35">
          <Medal size={13} /> Agent Siaga · Misi Penyelamatan Bumi
        </div>
      </main>
    </div>
  );
};

export default MissionCelebration;
