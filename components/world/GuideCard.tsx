import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Compass, Gamepad2, Map, Play, RotateCcw, Sparkles, X } from 'lucide-react';

const MotionDiv = motion.div as any;

const STEPS = [
  {
    icon: '🎮',
    Icon: Gamepad2,
    title: 'Cara berjalan',
    color: 'from-sky-100 to-blue-100 border-sky-200 text-sky-700',
    text: 'Gunakan tombol W A S D atau tombol Panah di keyboard. Kalau memakai HP, geser Joystick di layar. Geser layar untuk memutar kamera.',
  },
  {
    icon: '🗺️',
    Icon: Map,
    title: 'Jelajah & baca papan',
    color: 'from-emerald-100 to-teal-100 border-emerald-200 text-emerald-700',
    text: 'Cari tiang bercahaya dan papan fakta di keempat zona bencana. Dekati lalu tekan E (atau tombol Baca di HP), atau klik langsung papan/tiangnya.',
  },
  {
    icon: '🧩',
    Icon: Play,
    title: 'Misi & kuis',
    color: 'from-amber-100 to-orange-100 border-amber-200 text-amber-700',
    text: 'Pada kartu zona, tekan Mulai Misi. Selesaikan misi penyelamatan 2D, lalu jawab kuis singkat untuk menguji apa yang sudah kamu pelajari.',
  },
  {
    icon: '🔁',
    Icon: RotateCcw,
    title: 'Bebas mengulang',
    color: 'from-violet-100 to-fuchsia-100 border-violet-200 text-violet-700',
    text: 'Misi yang sudah selesai tetap bisa dimainkan lagi kapan saja lewat tombol Misi, atau dengan membuka kembali papan zonanya.',
  },
];

export interface GuideCardProps {
  onClose: () => void;
  playSound?: (type: string) => void;
}

/** Kartu petunjuk singkat yang muncul saat papan "Panduan Bermain" dibuka. */
export const GuideCard: React.FC<GuideCardProps> = ({ onClose, playSound }) => {
  const closeRef = useRef<HTMLButtonElement>(null);

  const handleClose = () => {
    playSound?.('click');
    onClose();
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleClose();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => closeRef.current?.focus(), 60);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = previous;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <MotionDiv
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[115] flex items-center justify-center overflow-y-auto overscroll-contain bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6"
      style={{ touchAction: 'pan-y' }}
      onMouseDown={(event: React.MouseEvent) => {
        if (event.target === event.currentTarget) handleClose();
      }}
    >
      <MotionDiv
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-title"
        initial={{ y: 28, scale: 0.96, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 18, scale: 0.98, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 25 }}
        className="relative my-auto w-full max-w-xl overflow-hidden rounded-[2rem] border-4 border-white bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-sky-500 via-cyan-500 to-emerald-500 px-5 pb-6 pt-6 text-white sm:px-7">
          <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full border-[20px] border-white/10" />
          <button
            ref={closeRef}
            type="button"
            onClick={handleClose}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30 focus-visible:ring-4 focus-visible:ring-white/50"
            aria-label="Tutup panduan bermain"
          >
            <X size={20} />
          </button>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]">
            <Sparkles size={13} /> Base Camp
          </span>
          <h2
            id="guide-title"
            className="font-display mt-3 flex items-center gap-2 text-3xl font-black sm:text-4xl"
          >
            <Compass size={30} className="shrink-0" />
            Panduan Bermain
          </h2>
          <p className="mt-2 max-w-md text-sm font-semibold leading-relaxed text-white/90">
            Halo, Agen Siaga! Ikuti langkah singkat ini supaya petualanganmu seru dan aman. 🧭
          </p>
        </div>

        {/* Langkah-langkah */}
        <div className="max-h-[52vh] space-y-2.5 overflow-y-auto bg-slate-50/70 p-4 sm:p-5">
          {STEPS.map((step, index) => {
            const StepIcon = step.Icon;
            return (
              <div
                key={step.title}
                className={`flex items-start gap-3 rounded-2xl border-2 bg-gradient-to-r p-3 ${step.color}`}
              >
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/80 text-xl shadow-sm">
                  {step.icon}
                </span>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest opacity-70">
                    <StepIcon size={12} /> Langkah {index + 1} · {step.title}
                  </p>
                  <p className="mt-0.5 text-sm font-bold leading-relaxed text-slate-700">
                    {step.text}
                  </p>
                </div>
              </div>
            );
          })}

          <div className="rounded-2xl border-2 border-dashed border-sky-200 bg-sky-50 px-3 py-2.5 text-center text-[12px] font-black text-sky-700">
            ✨ Tidak ada panah penunjuk — kamu bebas menjelajah ke zona mana pun sesuai pilihanmu!
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-slate-100 bg-white px-5 py-4 sm:px-7">
          <button
            type="button"
            onClick={handleClose}
            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-sky-700 bg-gradient-to-r from-sky-500 to-cyan-500 text-base font-black text-white shadow-lg transition hover:from-sky-400 hover:to-cyan-400 active:translate-y-0.5 active:border-b-2"
          >
            <Play size={19} fill="currentColor" /> Oke, Aku Siap Jelajah!
          </button>
        </div>
      </MotionDiv>
    </MotionDiv>,
    document.body
  );
};

export default GuideCard;
