import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { generateNarration, PerformanceData } from '../services/geminiService';
import type { DisasterType } from '../types';

// Fix for framer-motion type issues
const MotionDiv = motion.div as any;

interface AINarratorProps {
  performanceData: PerformanceData;
  onContinue: () => void;
  playSound: (type: string) => void;
  /** Label tombol lanjut mengikuti fase berikutnya (dunia 3D / hasil akhir / daftar misi). */
  continueLabel?: string;
  /** Tombol cepat mengulang misi 2D + kuisnya dari awal. */
  onReplayMission?: () => void;
}

const TYPING_SPEED = 10; // ms per character

/** Lencana khusus untuk masing-masing zona bencana. */
const QUIZ_BADGES: Record<
  DisasterType,
  { icon: string; title: string; subtitle: string; gradient: string }
> = {
  EARTHQUAKE: {
    icon: '🏚️',
    title: 'Sahabat Siaga Gempa',
    subtitle: 'Tenang, lindungi kepala, dan waspadai gempa susulan!',
    gradient: 'from-amber-400 via-orange-500 to-red-500',
  },
  FLOOD: {
    icon: '🌊',
    title: 'Pahlawan Penyelamat Banjir',
    subtitle: 'Tas siaga berisi, lari ke tempat yang lebih tinggi!',
    gradient: 'from-sky-400 via-blue-500 to-indigo-600',
  },
  VOLCANO: {
    icon: '🌋',
    title: 'Penjaga Gunung Api',
    subtitle: 'Kenali tanda erupsi dan ikuti arah evakuasi!',
    gradient: 'from-rose-500 via-red-500 to-orange-500',
  },
  LANDSLIDE: {
    icon: '⛰️',
    title: 'Pelindung Lereng Hijau',
    subtitle: 'Jauhi tebing curam saat hujan deras mengguyur!',
    gradient: 'from-lime-500 via-emerald-500 to-teal-600',
  },
};

/** Apresiasi berbeda untuk tiap rentang skor kuis. */
const getAppreciation = (score: number) => {
  if (score >= 100) {
    return {
      stars: 3,
      title: 'Sempurna, Agen Hebat! 🏆',
      lines: [
        'Semua jawabanmu tepat! Kamu benar-benar siap jadi agen tanggap bencana.',
        'Tanpa keraguan! Pemahamanmu tentang bencana ini mantap sekali.',
        'Sempurna! Kapten Siaga bangga punya tim sehebat kalian!',
      ],
    };
  }
  if (score >= 70) {
    return {
      stars: 2,
      title: 'Kerja Bagus, Agen! 👏',
      lines: [
        'Kebanyakan jawabanmu sudah tepat. Pertahankan semangatnya!',
        'Kalian sudah menguasai banyak hal penting. Tinggal sedikit lagi menuju sempurna!',
        'Hebat! Pengetahuan kalian sudah cukup kuat untuk menyelamatkan tim.',
      ],
    };
  }
  return {
    stars: 1,
    title: 'Semangat, Agen! Terus Berlatih! 💪',
    lines: [
      'Belajar dari kesalahan itu hebat. Coba lagi, kamu pasti bisa lebih baik!',
      'Tak apa, yang penting kalian berani mencoba. Yuk ulangi misionya!',
      'Agen hebat selalu belajar. Baca lagi poin pentingnya, lalu coba lagi ya!',
    ],
  };
};

/** Hujan bintang & konfetti ringan di dalam kartu hasil. */
const CelebrationConfetti: React.FC<{ big: boolean }> = ({ big }) => {
  const pieces = useMemo(
    () =>
      Array.from({ length: big ? 42 : 18 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        drift: (Math.random() - 0.5) * 38,
        size: Math.random() * 7 + 5,
        duration: Math.random() * 1.8 + 2.2,
        delay: Math.random() * 2.6,
        rotate: Math.random() * 540 + 180,
        color: ['#fbbf24', '#f472b6', '#60a5fa', '#34d399', '#fb7185', '#a78bfa', '#f97316'][i % 7],
        star: big && i % 4 === 0,
      })),
    [big]
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2rem]">
      {pieces.map((p) => (
        <MotionDiv
          key={p.id}
          initial={{ y: -30, x: 0, opacity: 0, rotate: 0 }}
          animate={{
            y: '112vh',
            x: p.drift,
            opacity: [0, 1, 1, 0.9, 0],
            rotate: p.rotate,
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'linear',
          }}
          className="absolute top-0 flex items-center justify-center"
          style={{ left: `${p.left}%`, width: p.size, height: p.size }}
        >
          {p.star ? (
            <span className="text-base leading-none text-amber-400 drop-shadow">✦</span>
          ) : (
            <span
              className="block h-full w-full rounded-sm"
              style={{ backgroundColor: p.color }}
            />
          )}
        </MotionDiv>
      ))}
    </div>
  );
};

export const AINarrator: React.FC<AINarratorProps> = ({
  performanceData,
  onContinue,
  playSound,
  continueLabel,
  onReplayMission,
}) => {
  const [narration, setNarration] = useState<string>('');
  const [displayedText, setDisplayedText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isTypingDone, setIsTypingDone] = useState(false);
  const [showContinue, setShowContinue] = useState(false);
  const typingRef = useRef<number | null>(null);
  const charIndexRef = useRef(0);

  // Fetch narration on mount
  useEffect(() => {
    let cancelled = false;

    const fetchNarration = async () => {
      setIsLoading(true);
      try {
        const text = await generateNarration(performanceData);
        if (!cancelled) {
          setNarration(text);
          setIsLoading(false);
          playSound('levelStart');
        }
      } catch {
        if (!cancelled) {
          setNarration('Tim yang hebat! Terus berlatih untuk menjadi agen penyelamat yang handal! 💪');
          setIsLoading(false);
        }
      }
    };

    fetchNarration();
    return () => { cancelled = true; };
  }, [performanceData, playSound]);

  // Typewriter effect
  useEffect(() => {
    if (isLoading || !narration) return;

    charIndexRef.current = 0;
    setDisplayedText('');
    setIsTypingDone(false);
    setShowContinue(false);

    typingRef.current = window.setInterval(() => {
      charIndexRef.current += 1;
      if (charIndexRef.current >= narration.length) {
        setDisplayedText(narration);
        setIsTypingDone(true);
        if (typingRef.current) clearInterval(typingRef.current);
        // Show continue button with delay
        setTimeout(() => setShowContinue(true), 150);
      } else {
        setDisplayedText(narration.slice(0, charIndexRef.current));
      }
    }, TYPING_SPEED);

    return () => {
      if (typingRef.current) clearInterval(typingRef.current);
    };
  }, [narration, isLoading]);

  // Skip typing animation
  const skipTyping = useCallback(() => {
    if (isLoading) return;
    if (!isTypingDone && narration) {
      if (typingRef.current) clearInterval(typingRef.current);
      setDisplayedText(narration);
      setIsTypingDone(true);
      setShowContinue(true);
    }
  }, [isLoading, isTypingDone, narration]);

  const handleContinue = () => {
    playSound('click');
    onContinue();
  };

  // Score-based accent color
  const getAccentColor = () => {
    if (performanceData.score >= 80) return { bg: 'narrator-accent-gold', glow: 'narrator-glow-gold' };
    if (performanceData.score >= 50) return { bg: 'narrator-accent-blue', glow: 'narrator-glow-blue' };
    return { bg: 'narrator-accent-red', glow: 'narrator-glow-red' };
  };

  const accent = getAccentColor();

  // Score-based avatar art
  const getAvatarSrc = () => {
    if (performanceData.score >= 80) return '/assets/kapten-success.png';
    if (performanceData.score >= 50) return '/assets/kapten-idle.png';
    return '/assets/kapten-error.png';
  };

  // Khusus layar hasil kuis (fase RECOVERY).
  const isQuizResult = performanceData.phase === 'RECOVERY';
  const badge = QUIZ_BADGES[performanceData.disasterType] ?? QUIZ_BADGES.EARTHQUAKE;
  const appreciation = getAppreciation(performanceData.score);
  const variant =
    (performanceData.score + (performanceData.quizCorrect ?? 0) + performanceData.disasterType.length) %
    appreciation.lines.length;
  const masteredPoints = (performanceData.masteredPoints ?? []).slice(0, 3);

  return (
    <AnimatePresence>
      <MotionDiv
        className="narrator-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        onClick={skipTyping}
        style={{ overflowY: 'auto', alignItems: 'flex-start' }}
      >
        <MotionDiv
          className={`narrator-card ${accent.glow} my-auto`}
          initial={{ scale: 0.8, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', bounce: 0.4, duration: 0.6 }}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          {/* Top accent bar */}
          <div className={`narrator-accent-bar ${accent.bg}`} />

          {isQuizResult && (
            <>
              <CelebrationConfetti big={performanceData.score >= 70} />

              {/* Lencana bertema bencana */}
              <MotionDiv
                initial={{ scale: 0.7, opacity: 0, rotate: -10 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ type: 'spring', bounce: 0.55, delay: 0.12 }}
                className={`relative mx-4 mt-4 overflow-hidden rounded-2xl bg-gradient-to-r ${badge.gradient} px-3 py-3 text-center text-white shadow-lg`}
              >
                <MotionDiv
                  className="pointer-events-none absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/35 to-transparent"
                  initial={{ x: '-160%' }}
                  animate={{ x: '260%' }}
                  transition={{ repeat: Infinity, duration: 3.4, ease: 'linear', delay: 0.6 }}
                />
                <p className="relative text-[9px] font-black uppercase tracking-[0.22em] text-white/80">
                  Lencana Misi Selesai
                </p>
                <p className="relative text-lg font-black leading-tight drop-shadow-sm sm:text-2xl">
                  {badge.icon} {badge.title}
                </p>
                <p className="relative mt-0.5 text-[11px] font-bold text-white/90">
                  {badge.subtitle}
                </p>
              </MotionDiv>

              {/* Apresiasi sesuai rentang skor */}
              <MotionDiv
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="relative z-10 px-5 pt-3 text-center"
              >
                <p className="text-lg tracking-[0.12em] leading-none" aria-hidden="true">
                  {'⭐'.repeat(appreciation.stars)}
                  <span className="opacity-20">{'⭐'.repeat(3 - appreciation.stars)}</span>
                </p>
                <p className="mt-1 text-base font-black text-slate-800 sm:text-lg">
                  {appreciation.title}
                </p>
              </MotionDiv>
            </>
          )}

          {/* Kapten Siaga header */}
          <div className="narrator-header">
            <MotionDiv
              className="narrator-avatar-container"
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
            >
              <div className="narrator-avatar">
                <img src={getAvatarSrc()} alt="Kapten Siaga" className="narrator-avatar-img" />
              </div>
              <div className="narrator-rank-badge">⭐</div>
            </MotionDiv>

            <div className="narrator-identity">
              <h3 className="narrator-name">Kapten Siaga</h3>
              <span className="narrator-title">Ahli Tanggap Bencana</span>
            </div>

            {/* Score indicator */}
            <div className={`narrator-score-badge ${
              performanceData.score >= 80 ? 'narrator-score-gold' :
              performanceData.score >= 50 ? 'narrator-score-blue' : 'narrator-score-red'
            }`}>
              <span className="narrator-score-value">{performanceData.score}</span>
              <span className="narrator-score-label">SKOR</span>
            </div>
          </div>

          {/* Message area */}
          <div className="narrator-message-area">
            {isQuizResult && !isLoading && (
              <MotionDiv
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="mb-2 rounded-xl bg-amber-50 px-3 py-2 text-center text-sm font-bold text-amber-800"
              >
                {appreciation.lines[variant]}
              </MotionDiv>
            )}
            {isLoading ? (
              <div className="narrator-loading">
                <MotionDiv
                  className="narrator-loading-dots"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  <span className="narrator-loading-icon">📡</span>
                  <span>Kapten Siaga sedang menganalisis performa kalian...</span>
                </MotionDiv>
              </div>
            ) : (
              <div className="narrator-text-container">
                <span className="narrator-quote-mark">"</span>
                <p className="narrator-text">
                  {displayedText}
                  {!isTypingDone && <span className="typewriter-cursor">|</span>}
                </p>
                <span className="narrator-quote-mark narrator-quote-end">"</span>
              </div>
            )}
          </div>

          {/* Ringkasan poin penting yang berhasil dikuasai */}
          {isQuizResult && masteredPoints.length > 0 && (
            <MotionDiv
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="relative z-10 px-5 pb-1"
            >
              <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-emerald-600">
                ✅ Poin penting yang berhasil dikuasai
              </p>
              <ul className="space-y-1.5">
                {masteredPoints.map((point, idx) => (
                  <MotionDiv
                    key={idx}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.45 + idx * 0.12 }}
                    className="flex items-start gap-2 rounded-xl bg-emerald-50/70 px-2.5 py-2 text-[12px] font-semibold leading-snug text-slate-700"
                  >
                    <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-black text-white">
                      ✓
                    </span>
                    <span>{point}</span>
                  </MotionDiv>
                ))}
              </ul>
            </MotionDiv>
          )}

          {/* Continue button */}
          <AnimatePresence>
            {showContinue && (
              <MotionDiv
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', bounce: 0.4 }}
                className="narrator-actions"
              >
                {isQuizResult ? (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    {onReplayMission && (
                      <button
                        type="button"
                        className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl border-2 border-indigo-200 bg-white px-4 text-sm font-black text-indigo-600 shadow-sm transition-colors hover:bg-indigo-50 active:scale-[0.98]"
                        onClick={() => {
                          playSound('click');
                          onReplayMission();
                        }}
                      >
                        <RefreshCw size={17} /> Ulangi Misi
                      </button>
                    )}
                    <button className="narrator-continue-btn flex-1" onClick={handleContinue}>
                      <span>{continueLabel || 'Lanjut Jelajah Dunia 3D'}</span>
                      <MotionDiv
                        animate={{ x: [0, 4, 0] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                        style={{ display: 'inline-block' }}
                      >
                        →
                      </MotionDiv>
                    </button>
                  </div>
                ) : (
                  <button className="narrator-continue-btn" onClick={handleContinue}>
                    <span>Siap, Kapten!</span>
                    <MotionDiv
                      animate={{ x: [0, 4, 0] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                      style={{ display: 'inline-block' }}
                    >
                      →
                    </MotionDiv>
                  </button>
                )}
              </MotionDiv>
            )}
          </AnimatePresence>

          {/* Tap to skip hint */}
          {!isTypingDone && !isLoading && (
            <MotionDiv
              className="narrator-skip-hint"
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              Ketuk untuk lewati animasi
            </MotionDiv>
          )}
        </MotionDiv>
      </MotionDiv>
    </AnimatePresence>
  );
};

export default AINarrator;
