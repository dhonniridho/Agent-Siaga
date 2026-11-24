import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Compass,
  Lightbulb,
  ListChecks,
  Play,
  Target,
  X,
} from 'lucide-react';
import { WORLD_FACTS } from '../../constants';
import type { DisasterType } from '../../types';
import type { MissionZone } from './worldConfig';
import { ZONE_INFO } from './zoneInfo';

// Samakan dengan komponen lain: cast agar tipe framer-motion tidak bentrok.
const MotionDiv = motion.div as any;

interface ZoneInfoCardProps {
  zone: MissionZone;
  completed: boolean;
  /** True setelah papan/zona ini pernah dibuka pada sesi ini. */
  read: boolean;
  onClose: () => void;
  /** Memulai misi zona ini (dipanggil hanya saat tombol Mulai Misi ditekan). */
  onStartMission: (zoneId: DisasterType) => void;
  playSound?: (type: string) => void;
}

/**
 * Kartu informasi zona ala "Jelajah PTI": visual besar di kiri dan
 * penjelasan singkat di kanan. Di layar sempit kedua kolom bertumpuk.
 *
 * Catatan: kartu ini hanya mengurus tampilan + input Esc/klik luar.
 * Kontrol pemain & kamera dikunci oleh pemanggil selama kartu terbuka.
 */
export const ZoneInfoCard: React.FC<ZoneInfoCardProps> = ({
  zone,
  completed,
  read,
  onClose,
  onStartMission,
  playSound,
}) => {
  const info = ZONE_INFO[zone.id];
  const facts = WORLD_FACTS[zone.id];
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  const handleClose = () => {
    playSound?.('click');
    onClose();
  };

  const handleStart = () => {
    if (completed) return;
    playSound?.('click');
    onStartMission(zone.id);
  };

  // Esc menutup kartu ini saja. Listener capture + stopPropagation mencegah
  // dialog Keluar ikut terbuka (ExitConfirmDialog memakai listener biasa).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      playSound?.('click');
      onClose();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [onClose, playSound]);

  // Fokuskan tombol tutup supaya keyboard/touch langsung siap.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => closeRef.current?.focus(), 50);
    return () => {
      window.clearTimeout(timer);
      previous?.focus?.();
    };
  }, []);

  // Jangan biarkan halaman di belakang ikut ter-scroll.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return createPortal(
    <MotionDiv
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-2 sm:p-5"
      style={{ touchAction: 'pan-y' }}
    >
      {/* Klik di luar kartu = tutup */}
      <div
        className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      <MotionDiv
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ y: 28, scale: 0.96, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 18, scale: 0.98, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26, mass: 0.8 }}
        onClick={(event: React.MouseEvent) => event.stopPropagation()}
        className="relative z-10 max-h-[92vh] w-full max-w-3xl overflow-y-auto overscroll-contain rounded-[1.75rem] border-4 border-white bg-white shadow-2xl sm:rounded-[2rem]"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={handleClose}
          className="absolute right-3 top-3 z-30 flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/80 bg-white/90 text-slate-500 shadow-lg outline-none transition-colors hover:bg-white hover:text-slate-800 focus-visible:ring-4 focus-visible:ring-sky-300/70 active:scale-95 sm:h-11 sm:w-11"
          aria-label="Tutup kartu informasi zona"
          title="Tutup (Esc)"
        >
          <X size={21} />
        </button>

        <div className="grid sm:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
          {/* ---------------- Panel visual kiri ---------------- */}
          <div
            className="relative flex min-h-[10.5rem] items-center justify-center overflow-hidden p-4 sm:min-h-[25rem] sm:flex-col sm:p-6"
            style={{
              background: `linear-gradient(150deg, ${zone.color} 0%, #172033 118%)`,
            }}
          >
            {/* Pola lingkaran ringan, tanpa aset luar */}
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 18% 18%, rgba(255,255,255,0.55) 0, transparent 34%), radial-gradient(circle at 82% 78%, rgba(255,255,255,0.35) 0, transparent 36%)',
              }}
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full border-[18px] border-white/10"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -bottom-14 -left-12 h-48 w-48 rounded-full border-[22px] border-white/10"
              aria-hidden="true"
            />

            <div className="relative flex items-center gap-4 text-white sm:flex-col sm:gap-5 sm:text-center">
              <div className="relative flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-[1.5rem] border-4 border-white/35 bg-white/15 shadow-2xl sm:h-40 sm:w-40 sm:rounded-[2rem]">
                <div className="absolute inset-2 rounded-[1.1rem] border border-white/25 sm:inset-3 sm:rounded-[1.5rem]" />
                <span
                  className="text-6xl leading-none drop-shadow-lg sm:text-8xl"
                  role="img"
                  aria-label={info.title}
                >
                  {zone.icon}
                </span>
              </div>

              <div className="min-w-0 text-left sm:text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/75 sm:text-xs">
                  Zona {info.code}
                </p>
                <p className="font-display mt-0.5 text-2xl font-black leading-tight drop-shadow-sm sm:mt-1 sm:text-3xl">
                  {info.title}
                </p>
              </div>
            </div>

            <div className="absolute bottom-3 left-1/2 hidden -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white/80 sm:flex">
              <Target size={12} />
              Jelajah Alam Siaga
            </div>
          </div>

          {/* ---------------- Panel teks kanan ---------------- */}
          <div className="flex min-w-0 flex-col gap-3 p-5 pt-6 sm:gap-3.5 sm:p-6">
            <div>
              <p
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.22em]"
                style={{ backgroundColor: `${zone.color}18`, color: zone.color }}
              >
                <Target size={12} />
                Kode zona {info.code}
              </p>
              <h2
                id={titleId}
                className="font-display mt-2 text-3xl font-black leading-tight text-slate-800 sm:text-4xl"
              >
                {info.title}
              </h2>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600 sm:text-base">
                {info.intro}
              </p>
            </div>

            <div
              className="rounded-2xl border-2 p-3 sm:p-3.5"
              style={{
                borderColor: `${zone.color}55`,
                backgroundColor: `${zone.color}0f`,
              }}
            >
              <p
                className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em]"
                style={{ color: zone.color }}
              >
                <ListChecks size={13} />
                FAKTA PENTING
              </p>
              <ol className="mt-2 space-y-1.5">
                {facts.facts.map((fact, index) => (
                  <li key={index} className="flex gap-2">
                    <span
                      className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-black text-white"
                      style={{ backgroundColor: zone.color }}
                    >
                      {index + 1}
                    </span>
                    <span className="text-[13px] font-bold leading-snug text-slate-700 sm:text-sm">
                      {fact}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-3 sm:p-3.5">
              <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">
                <Lightbulb size={13} />
                TAHUKAH KAMU?
              </p>
              <p className="mt-1.5 text-[13px] font-bold leading-snug text-slate-700 sm:text-sm">
                {info.funFact}
              </p>
            </div>

            <div
              className={`flex items-center gap-2 rounded-2xl border-2 px-3 py-2 text-[13px] font-bold ${
                read
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-slate-50 text-slate-500'
              }`}
            >
              {read ? (
                <CheckCircle2 size={18} className="flex-shrink-0 text-emerald-500" />
              ) : (
                <CheckCircle2 size={18} className="flex-shrink-0 text-slate-300" />
              )}
              <span className="min-w-0 flex-1">
                {read ? 'Papan sudah dibaca' : 'Membuka papan informasi...'}
              </span>
              {completed && (
                <span className="flex flex-shrink-0 items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
                  <CheckCircle2 size={11} />
                  Selesai
                </span>
              )}
            </div>

            <div className="mt-1 flex flex-col gap-2">
              {!completed && (
                <button
                  type="button"
                  onClick={handleStart}
                  className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 text-base font-black text-white shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-600 active:scale-[0.98]"
                  title="Mulai misi zona ini"
                >
                  <Play size={20} fill="currentColor" />
                  Mulai Misi
                </button>
              )}

              <button
                type="button"
                onClick={handleClose}
                className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-amber-500 bg-amber-400 px-4 text-base font-black text-amber-950 shadow-lg shadow-amber-200/70 transition-all hover:bg-amber-300 active:translate-y-0.5 active:border-b-2"
              >
                <Compass size={20} />
                Tutup dan lanjut jelajah
              </button>
            </div>

            <p className="text-center text-[10px] font-bold text-slate-400">
              Tekan <kbd className="rounded bg-slate-100 px-1.5 py-0.5">Esc</kbd> atau klik di luar
              kartu untuk menutup
            </p>
          </div>
        </div>
      </MotionDiv>
    </MotionDiv>,
    document.body
  );
};

export default ZoneInfoCard;
