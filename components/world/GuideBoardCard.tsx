import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Compass, Gamepad2, MousePointer2, Smartphone, X } from 'lucide-react';
import type { DisasterType } from '../../types';
import { ZONE_INFO } from './zoneInfo';

const MotionDiv = motion.div as any;

const ZONE_ORDER: DisasterType[] = ['EARTHQUAKE', 'FLOOD', 'LANDSLIDE', 'VOLCANO'];

const ZONE_STYLE: Record<DisasterType, { bg: string; chip: string }> = {
  EARTHQUAKE: { bg: 'from-amber-50 to-white', chip: 'bg-amber-100 text-amber-800' },
  FLOOD: { bg: 'from-sky-50 to-white', chip: 'bg-sky-100 text-sky-800' },
  LANDSLIDE: { bg: 'from-stone-100 to-white', chip: 'bg-stone-200 text-stone-800' },
  VOLCANO: { bg: 'from-red-50 to-white', chip: 'bg-red-100 text-red-800' },
};

interface Props {
  onClose: () => void;
  playSound?: (type: string) => void;
}

/**
 * Panel ringkas dari papan panduan di area spawn. Menampilkan ringkasan
 * keempat bencana sekaligus supaya pemain tahu apa yang menanti di dunia 3D.
 */
export const GuideBoardCard: React.FC<Props> = ({ onClose, playSound }) => {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  const close = () => {
    playSound?.('click');
    onClose();
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      close();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => closeRef.current?.focus(), 50);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
      previous?.focus?.();
    };
  }, []);

  return createPortal(
    <MotionDiv
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[115] flex items-center justify-center p-2 sm:p-5"
      style={{ touchAction: 'pan-y' }}
    >
      <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={close} aria-hidden="true" />

      <MotionDiv
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ y: 24, scale: 0.97, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        className="relative z-10 max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[1.75rem] border-4 border-white bg-white p-5 shadow-2xl sm:rounded-[2rem] sm:p-7"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={close}
          className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-white/90 text-slate-500 shadow-lg hover:text-slate-800"
          aria-label="Tutup panduan"
        >
          <X size={20} />
        </button>

        <div className="mb-5 flex items-start gap-3 pr-12">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-2xl text-white shadow-lg">
            🧭
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-indigo-500">
              Papan Panduan · Area Awal
            </p>
            <h2 id={titleId} className="font-display mt-1 text-2xl font-black text-slate-800 sm:text-3xl">
              Ringkasan Empat Zona Bencana
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Baca dulu sebelum menjelajah. Setiap zona punya misi evakuasi dan kuis pemulihan 3D.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {ZONE_ORDER.map((type) => {
            const info = ZONE_INFO[type];
            const style = ZONE_STYLE[type];
            return (
              <div
                key={type}
                className={`rounded-2xl border-2 border-white bg-gradient-to-br ${style.bg} p-4 shadow-sm`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="text-3xl">{info.code === 'Z01' ? '🏫' : info.code === 'Z02' ? '🌊' : info.code === 'Z03' ? '⛰️' : '🌋'}</span>
                    <div className="min-w-0">
                      <span className={`inline-block rounded-md px-1.5 py-0.5 text-[9px] font-black tracking-wider ${style.chip}`}>
                        {info.code}
                      </span>
                      <h3 className="truncate text-base font-black text-slate-800">{info.title}</h3>
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-xs font-bold leading-snug text-slate-600">{info.mainSteps}</p>
                <p className="mt-2 rounded-lg bg-white/70 p-2 text-[11px] font-medium leading-snug text-slate-500">
                  💡 {info.funFact}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-4 grid gap-2 rounded-2xl bg-slate-900 p-3 text-white sm:grid-cols-3">
          <p className="flex items-center gap-2 text-[11px] font-bold text-white/80">
            <Gamepad2 size={15} className="text-emerald-300" /> PC: <b className="text-white">WASD</b> + klik
          </p>
          <p className="flex items-center gap-2 text-[11px] font-bold text-white/80">
            <Smartphone size={15} className="text-sky-300" /> HP: joystick + tombol aksi
          </p>
          <p className="flex items-center gap-2 text-[11px] font-bold text-white/80">
            <MousePointer2 size={15} className="text-amber-300" /> Kuis: klik podium / A–D
          </p>
        </div>

        <button
          type="button"
          onClick={close}
          className="mt-4 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 text-base font-black text-white shadow-lg transition-colors hover:bg-indigo-500"
        >
          <Compass size={19} /> Siap Menjelajah
        </button>
      </MotionDiv>
    </MotionDiv>,
    document.body
  );
};

export default GuideBoardCard;
