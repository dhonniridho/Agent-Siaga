import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Compass, Play, Sparkles } from 'lucide-react';

const MotionDiv = motion.div as any;

const ZONES = [
  { icon: '🏚️', label: 'Gempa Bumi', color: 'from-amber-50 to-orange-50 border-amber-200 text-amber-700' },
  { icon: '🌊', label: 'Banjir', color: 'from-sky-50 to-blue-50 border-sky-200 text-sky-700' },
  { icon: '🌋', label: 'Gunung Meletus', color: 'from-rose-50 to-red-50 border-rose-200 text-rose-700' },
  { icon: '⛰️', label: 'Tanah Longsor', color: 'from-emerald-50 to-teal-50 border-emerald-200 text-emerald-700' },
];

export interface WelcomeModalProps {
  teamName: string;
  onClose: () => void;
  playSound?: (type: string) => void;
}

/**
 * Sapaan Kapten Siaga yang tampil sekali saat pemain masuk ke Dunia 3D.
 * Setelah tombol "Siap Jelajah!" ditekan, layar 3D kembali bersih tanpa
 * dialog melayang di atas avatar pemain.
 */
export const WelcomeModal: React.FC<WelcomeModalProps> = ({ teamName, onClose, playSound }) => {
  const startRef = useRef<HTMLButtonElement>(null);

  const handleClose = () => {
    playSound?.('click');
    onClose();
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Enter') {
        event.preventDefault();
        handleClose();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => startRef.current?.focus(), 60);
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
      className="fixed inset-0 z-[140] flex items-center justify-center overflow-y-auto overscroll-contain bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6"
      style={{ touchAction: 'pan-y' }}
      onMouseDown={(event: React.MouseEvent) => {
        if (event.target === event.currentTarget) handleClose();
      }}
    >
      <MotionDiv
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        initial={{ y: 28, scale: 0.96, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 18, scale: 0.98, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 25 }}
        className="relative my-auto w-full max-w-md overflow-hidden rounded-[2rem] border-4 border-white bg-white shadow-2xl"
      >
        {/*Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400 px-5 pb-6 pt-6 text-white sm:px-7">
          <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full border-[20px] border-white/10" />
          <div className="flex items-center gap-3">
            <img
              src="/assets/kapten-idle.png"
              alt="Kapten Siaga"
              className="h-16 w-16 flex-shrink-0 object-contain drop-shadow-md sm:h-20 sm:w-20"
              style={{ imageRendering: 'pixelated' }}
            />
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]">
                <Sparkles size={13} /> Kapten Siaga
              </span>
              <h2
                id="welcome-title"
                className="font-display mt-2 text-2xl font-black leading-tight sm:text-3xl"
              >
                Halo, {teamName || 'Tim Agent'}! 👋
              </h2>
            </div>
          </div>
          <p className="mt-3 text-sm font-semibold leading-relaxed text-white/95">
            Selamat datang di <b>Jelajah Alam Siaga</b>! Aku Kapten Siaga, siap menemani
            petualangan timmu hari ini.
          </p>
        </div>

        {/*Petunjuk singkat & zona */}
        <div className="bg-slate-50/70 p-4 sm:p-5">
          <p className="mb-3 text-sm font-bold leading-relaxed text-slate-700">
            Jelajahi keempat zona bencana ini dengan <b>bebas</b> — tidak ada urutan wajib.
            Dekati papan atau tiang bercahaya untuk membaca, lalu mainkan misi dan kuisnya
            bila kamu siap. 🧭
          </p>
          <div className="grid grid-cols-2 gap-2">
            {ZONES.map((zone) => (
              <div
                key={zone.label}
                className={`flex items-center gap-2 rounded-2xl border-2 bg-gradient-to-r px-2.5 py-2 ${zone.color}`}
              >
                <span className="text-xl" aria-hidden="true">
                  {zone.icon}
                </span>
                <span className="text-xs font-black leading-tight">{zone.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
            <Compass size={14} className="text-sky-500" />
            Gunakan WASD / Panah / Joystick untuk berjalan.
          </div>
        </div>

        {/*Tombol utama */}
        <div className="border-t-2 border-slate-100 bg-white px-5 py-4 sm:px-7">
          <button
            ref={startRef}
            type="button"
            onClick={handleClose}
            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-amber-700 bg-gradient-to-r from-amber-500 to-orange-500 text-base font-black text-white shadow-lg transition hover:from-amber-400 hover:to-orange-400 active:translate-y-0.5 active:border-b-2 focus-visible:ring-4 focus-visible:ring-amber-300"
          >
            <Play size={19} fill="currentColor" /> Siap Jelajah!
          </button>
        </div>
      </MotionDiv>
    </MotionDiv>,
    document.body
  );
};

export default WelcomeModal;
