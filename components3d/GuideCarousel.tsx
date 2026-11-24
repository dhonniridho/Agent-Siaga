import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Compass,
  Keyboard,
  MapPin,
  MousePointerClick,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { Avatar } from '../types';
import { SceneBackdrop3D } from './SceneBackdrop3D';

const MotionDiv = motion.div as any;

interface GuideSlide {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  accent: string;
  emoji: string;
  body?: string;
  location?: string;
  steps?: string[];
  fact?: string;
  kind: 'intro' | 'disaster' | 'controls';
}

const SLIDES: GuideSlide[] = [
  {
    id: 'intro',
    kind: 'intro',
    eyebrow: 'Panduan Agen Baru',
    title: 'Selamat Datang, Tim Penyelamat!',
    subtitle: 'Empat bencana menanti. Pelajari panduan singkat ini sebelum masuk ke dunia 3D.',
    accent: '#818cf8',
    emoji: '🌏',
    body: 'Kalian akan menjelajahi pulau Siaga, membaca papan informasi, lalu menyelesaikan misi evakuasi dan kuis pemulihan di setiap zona.',
  },
  {
    id: 'earthquake',
    kind: 'disaster',
    eyebrow: 'Zona 01',
    title: 'Gempa Bumi',
    subtitle: 'Tanah berguncang tanpa aba-aba. Lindungi kepala dan cari perlindungan kokoh.',
    accent: '#f59e0b',
    emoji: '🏫',
    location: 'Padang, Sumatera Barat',
    steps: [
      'Jongkok, berlindung di bawah meja kokoh, dan pegang kaki meja (Drop, Cover, Hold On).',
      'Jauhi jendela kaca, lemari tinggi, dan benda yang mudah jatuh.',
      'Setelah guncangan reda, keluar ke lapangan terbuka dan waspadai gempa susulan.',
    ],
    fact: 'Gempa tidak bisa diprediksi. Karena itu latihan evakuasi rutin sangat penting.',
  },
  {
    id: 'flood',
    kind: 'disaster',
    eyebrow: 'Zona 02',
    title: 'Banjir Bandang',
    subtitle: 'Air bisa naik sangat cepat. Siapkan tas siaga dan bergerak ke tempat tinggi.',
    accent: '#38bdf8',
    emoji: '🌊',
    location: 'Jakarta Utara',
    steps: [
      'Isi tas siaga dengan dokumen penting, obat, senter, P3K, dan uang tunai.',
      'Matikan listrik bila aman, lalu naik ke lantai atas atau tempat yang lebih tinggi.',
      'Jangan berjalan melawan arus dan jangan menyentuh kabel atau stopkontak yang basah.',
    ],
    fact: 'Banjir bandang bisa datang meski di tempatmu tidak hujan, karena hujan turun di hulu sungai.',
  },
  {
    id: 'landslide',
    kind: 'disaster',
    eyebrow: 'Zona 03',
    title: 'Tanah Longsor',
    subtitle: 'Lereng yang retak bisa meluncur. Bergeraklah cepat ke samping menjauh dari jalur longsoran.',
    accent: '#a16207',
    emoji: '⛰️',
    location: 'Bukit Siaga',
    steps: [
      'Waspadai retakan tanah, pohon miring, dan air sumur yang tiba-tiba keruh.',
      'Lari tegak lurus menjauhi arah luncuran tanah, bukan mengikuti arah lereng.',
      'Jangan berhenti di bawah tebing. Menuju tanah yang stabil dan lapang.',
    ],
    fact: 'Satu retakan kecil di tanah bisa menjadi tanda awal pergerakan lereng. Selalu waspada saat hujan deras.',
  },
  {
    id: 'volcano',
    kind: 'disaster',
    eyebrow: 'Zona 04',
    title: 'Erupsi Gunung Berapi',
    subtitle: 'Abu, batu, dan awan panas berbahaya. Kenali tandanya dan ikuti arahan evakuasi.',
    accent: '#ef4444',
    emoji: '🌋',
    location: 'Gunung Siaga',
    steps: [
      'Kenali tanda erupsi: asap tebal, hewan panik, retakan, dan gempa vulkanik.',
      'Lindungi pernapasan dengan masker atau kain basah, lalu lindungi kepala.',
      'Jauhi zona terlarang dan ikuti jalur evakuasi menuju tempat aman.',
    ],
    fact: 'Status gunung api: Normal, Waspada, Siaga, dan Awas. Semakin tinggi statusnya, semakin tinggi kewaspadaan.',
  },
  {
    id: 'controls',
    kind: 'controls',
    eyebrow: 'Cara Bermain',
    title: 'Kendalikan Agenmu',
    subtitle: 'Gunakan keyboard di komputer atau joystick dan tombol di layar sentuh.',
    accent: '#34d399',
    emoji: '🎮',
  },
];

const DISASTER_MINI = [
  { emoji: '🏫', label: 'Gempa Bumi', color: '#f59e0b' },
  { emoji: '🌊', label: 'Banjir Bandang', color: '#38bdf8' },
  { emoji: '⛰️', label: 'Tanah Longsor', color: '#a16207' },
  { emoji: '🌋', label: 'Erupsi Gunung', color: '#ef4444' },
];

interface Props {
  teamName: string;
  avatar: Avatar | null;
  onFinish: () => void;
  playSound: (type: string) => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  offline?: boolean;
}

export const GuideCarousel: React.FC<Props> = ({
  teamName,
  avatar,
  onFinish,
  playSound,
  soundEnabled = true,
  onToggleSound,
  offline = false,
}) => {
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(SLIDES.length - 1, next));
      if (clamped === index) return;
      setIndex(clamped);
      playSound('click');
    },
    [index, playSound]
  );

  const next = useCallback(() => {
    if (isLast) {
      playSound('success');
      onFinish();
      return;
    }
    goTo(index + 1);
  }, [goTo, index, isLast, onFinish, playSound]);

  const skip = useCallback(() => {
    playSound('click');
    onFinish();
  }, [onFinish, playSound]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        next();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goTo(index - 1);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        skip();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goTo, index, next, skip]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-indigo-950 via-indigo-800 to-purple-900 font-sans text-white">
      <SceneBackdrop3D variant="guide" accent={slide.accent} />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-5 sm:px-6 sm:py-8">
        {/* Header */}
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-2xl shadow-lg backdrop-blur-md">
              {avatar?.icon || '🕵️'}
            </div>
            <div className="leading-tight">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-200">
                Tim Penyelamat
              </p>
              <h1 className="max-w-[46vw] truncate text-lg font-black sm:max-w-none sm:text-xl">
                {teamName || 'Tim Agent Siaga'}
              </h1>
              {offline && (
                <span className="mt-0.5 inline-flex rounded-md bg-amber-400/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-200">
                  Mode offline
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onToggleSound && (
              <button
                type="button"
                onClick={onToggleSound}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white/80 backdrop-blur-md transition-colors hover:bg-white/20"
                aria-label={soundEnabled ? 'Matikan suara' : 'Nyalakan suara'}
                title={soundEnabled ? 'Matikan suara' : 'Nyalakan suara'}
              >
                {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>
            )}
            <button
              type="button"
              onClick={skip}
              className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-black text-white/80 backdrop-blur-md transition-colors hover:bg-white/20"
            >
              <X size={14} /> Lewati
            </button>
          </div>
        </header>

        {/* Slide */}
        <main className="flex flex-1 items-center py-5 sm:py-8">
          <AnimatePresence mode="wait">
            <MotionDiv
              key={slide.id}
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -24, scale: 0.98 }}
              transition={{ duration: 0.28 }}
              className="w-full overflow-hidden rounded-[2rem] border border-white/20 bg-white/10 shadow-2xl backdrop-blur-xl"
            >
              <div
                className="h-1.5 w-full"
                style={{ background: `linear-gradient(90deg, ${slide.accent}, transparent)` }}
              />

              <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-10">
                <div>
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-950"
                      style={{ backgroundColor: slide.accent }}
                    >
                      <Sparkles size={12} /> {slide.eyebrow}
                    </span>
                    {slide.location && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-bold text-white/80">
                        <MapPin size={12} /> {slide.location}
                      </span>
                    )}
                  </div>

                  <h2 className="text-3xl font-black leading-tight sm:text-4xl lg:text-[2.6rem]">
                    <span className="mr-2">{slide.emoji}</span>
                    {slide.title}
                  </h2>
                  <p className="mt-3 text-sm font-medium leading-relaxed text-indigo-50/90 sm:text-base">
                    {slide.subtitle}
                  </p>

                  {slide.body && (
                    <p className="mt-4 rounded-2xl border border-white/15 bg-white/5 p-4 text-sm leading-relaxed text-white/80">
                      {slide.body}
                    </p>
                  )}

                  {slide.kind === 'intro' && (
                    <div className="mt-5 grid grid-cols-2 gap-2.5">
                      {DISASTER_MINI.map((item) => (
                        <div
                          key={item.label}
                          className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-3 py-2.5"
                        >
                          <span className="text-2xl">{item.emoji}</span>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-black">{item.label}</p>
                            <p className="text-[10px] font-bold text-white/50">Zona misi 3D</p>
                          </div>
                          <span
                            className="ml-auto h-2 w-2 flex-shrink-0 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {slide.kind === 'disaster' && slide.steps && (
                    <div className="mt-5 space-y-2.5">
                      <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-white/60">
                        <ShieldCheck size={13} /> Langkah Siaga
                      </p>
                      {slide.steps.map((step, stepIndex) => (
                        <div
                          key={step}
                          className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3"
                        >
                          <span
                            className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-black text-slate-950"
                            style={{ backgroundColor: slide.accent }}
                          >
                            {stepIndex + 1}
                          </span>
                          <p className="text-xs font-medium leading-relaxed text-white/85 sm:text-sm">
                            {step}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {slide.fact && (
                    <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-200/30 bg-amber-300/15 p-3">
                      <span className="text-lg">💡</span>
                      <p className="text-xs font-medium leading-relaxed text-amber-50/90">
                        <b className="text-amber-200">Tahukah kamu?</b> {slide.fact}
                      </p>
                    </div>
                  )}
                </div>

                {/* Right visual / controls */}
                <div>
                  {slide.kind === 'controls' ? (
                    <div className="space-y-3">
                      <div className="rounded-3xl border border-white/15 bg-slate-950/35 p-4">
                        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-300">
                          <Keyboard size={16} /> Komputer / Laptop
                        </p>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-white/80">
                          {[
                            ['W / ↑', 'Jalan ke depan'],
                            ['A / D', 'Geser kiri & kanan'],
                            ['Spasi', 'Loncat / aksi'],
                            ['Klik', 'Pilih jawaban'],
                          ].map(([key, label]) => (
                            <div key={key} className="flex items-center gap-2 rounded-xl bg-white/10 px-2.5 py-2">
                              <kbd className="rounded-md bg-white/90 px-2 py-0.5 text-[10px] font-black text-slate-900">
                                {key}
                              </kbd>
                              <span className="leading-tight">{label}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-3xl border border-white/15 bg-slate-950/35 p-4">
                        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-sky-300">
                          <Smartphone size={16} /> HP / Tablet
                        </p>
                        <div className="mt-3 flex items-center gap-3">
                          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full border-4 border-white/30 bg-white/10">
                            <Compass size={28} className="text-white/70" />
                          </div>
                          <p className="text-xs font-medium leading-relaxed text-white/75">
                            Geser <b className="text-white">joystick</b> di kiri bawah untuk bergerak,
                            lalu ketuk <b className="text-white">tombol aksi</b> di kanan bawah untuk
                            berlindung, melompat, atau menjawab.
                          </p>
                        </div>
                      </div>

                      <div className="rounded-3xl border border-emerald-200/30 bg-emerald-400/15 p-4">
                        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-200">
                          <MousePointerClick size={16} /> Kuis Pemulihan
                        </p>
                        <p className="mt-2 text-xs font-medium leading-relaxed text-emerald-50/85">
                          Setelah misi evakuasi, klik podium jawaban A–D atau tekan tombol{' '}
                          <kbd className="rounded bg-white/20 px-1.5 py-0.5 font-black">A B C D</kbd>{' '}
                          di keyboard. Baca penjelasan sebelum lanjut.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative mx-auto flex aspect-square w-full max-w-[260px] items-center justify-center sm:max-w-[300px]">
                      <div
                        className="absolute inset-4 rounded-full opacity-30 blur-2xl"
                        style={{ backgroundColor: slide.accent }}
                      />
                      <div
                        className="relative flex h-full w-full items-center justify-center rounded-[3rem] border border-white/20 bg-gradient-to-br from-white/20 to-white/5 shadow-2xl"
                        style={{ boxShadow: `inset 0 0 60px ${slide.accent}33` }}
                      >
                        <span className="animate-float text-[7rem] drop-shadow-2xl sm:text-[8rem]">
                          {slide.emoji}
                        </span>
                        <span
                          className="absolute -bottom-3 rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-950 shadow-xl"
                          style={{ backgroundColor: slide.accent }}
                        >
                          {slide.kind === 'intro' ? 'Siap Bertugas' : slide.eyebrow}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </MotionDiv>
          </AnimatePresence>
        </main>

        {/* Footer navigation */}
        <footer className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-center gap-1.5 sm:justify-start">
            {SLIDES.map((item, dotIndex) => (
              <button
                key={item.id}
                type="button"
                onClick={() => goTo(dotIndex)}
                aria-label={`Buka slide ${dotIndex + 1}: ${item.title}`}
                className={`h-2 rounded-full transition-all ${
                  dotIndex === index
                    ? 'w-7 bg-white'
                    : dotIndex < index
                      ? 'w-2 bg-emerald-300'
                      : 'w-2 bg-white/30 hover:bg-white/60'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => goTo(index - 1)}
              disabled={index === 0}
              className="flex h-12 items-center gap-1.5 rounded-2xl border border-white/20 bg-white/10 px-4 text-sm font-black text-white/85 backdrop-blur-md transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft size={18} /> Kembali
            </button>
            <button
              type="button"
              onClick={next}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-amber-400 px-5 text-sm font-black text-amber-950 shadow-xl shadow-amber-950/30 transition-transform hover:scale-[1.02] active:scale-95 sm:flex-none sm:px-7"
            >
              {isLast ? (
                <>
                  Mulai Petualangan <ArrowRight size={18} />
                </>
              ) : (
                <>
                  Lanjut <ChevronRight size={18} />
                </>
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default GuideCarousel;
