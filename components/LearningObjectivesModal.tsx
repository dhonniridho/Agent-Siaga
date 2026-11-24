import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { BookOpenCheck, CheckCircle2, Sparkles, X } from 'lucide-react';

const MotionDiv = motion.div as any;

/** Tujuan pembelajaran IPAS SD yang disampaikan dengan bahasa ramah anak. */
const OBJECTIVES = [
  {
    icon: '🔍',
    color: 'from-amber-100 to-orange-100 border-amber-200 text-amber-700',
    text: 'Mengenali tanda-tanda dan penyebab terjadinya bencana alam di sekitar kita, yaitu gempa bumi, banjir bandang, gunung meletus, dan tanah longsor.',
  },
  {
    icon: '🏃',
    color: 'from-sky-100 to-blue-100 border-sky-200 text-sky-700',
    text: 'Mengetahui langkah penyelamatan diri yang tepat dan cepat saat terjadi keadaan darurat bencana (seperti berlindung di bawah meja kuat saat gempa, menjauhi aliran listrik saat banjir, serta menuju jalur evakuasi aman).',
  },
  {
    icon: '🎒',
    color: 'from-emerald-100 to-teal-100 border-emerald-200 text-emerald-700',
    text: 'Membedakan barang-barang penting yang harus dibawa dalam Tas Siaga Bencana (seperti air minum, P3K, senter, dan dokumen penting).',
  },
  {
    icon: '💚',
    color: 'from-rose-100 to-pink-100 border-rose-200 text-rose-700',
    text: 'Menumbuhkan sikap tenang, peduli lingkungan, dan tanggap bencana dalam kehidupan sehari-hari di sekolah maupun di rumah.',
  },
];

const DISASTERS = [
  { icon: '🏚️', label: 'Gempa Bumi' },
  { icon: '🌊', label: 'Banjir Bandang' },
  { icon: '🌋', label: 'Gunung Meletus' },
  { icon: '⛰️', label: 'Tanah Longsor' },
];

export interface LearningObjectivesModalProps {
  onClose: () => void;
  playSound?: (type: string) => void;
}

/** Modal "Tujuan Pembelajaran" — ringkas, cerah, dan mudah dibaca siswa SD. */
export const LearningObjectivesModal: React.FC<LearningObjectivesModalProps> = ({
  onClose,
  playSound,
}) => {
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
    window.addEventListener('keydown', onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => closeRef.current?.focus(), 60);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
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
      className="fixed inset-0 z-[130] flex items-center justify-center overflow-y-auto overscroll-contain bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6"
      style={{ touchAction: 'pan-y' }}
      onMouseDown={(event: React.MouseEvent) => {
        if (event.target === event.currentTarget) handleClose();
      }}
    >
      <MotionDiv
        role="dialog"
        aria-modal="true"
        aria-labelledby="objectives-title"
        initial={{ y: 28, scale: 0.96, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 18, scale: 0.98, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 25 }}
        className="relative my-auto w-full max-w-2xl overflow-hidden rounded-[2rem] border-4 border-white bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-400 via-sky-500 to-indigo-500 px-5 pb-6 pt-6 text-white sm:px-8">
          <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full border-[20px] border-white/10" />
          <div className="pointer-events-none absolute -bottom-16 left-6 h-36 w-36 rounded-full border-[18px] border-white/10" />
          <button
            ref={closeRef}
            type="button"
            onClick={handleClose}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30 focus-visible:ring-4 focus-visible:ring-white/50"
            aria-label="Tutup tujuan pembelajaran"
          >
            <X size={20} />
          </button>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]">
            <Sparkles size={13} /> Untuk Agen SIAGA
          </span>
          <h2
            id="objectives-title"
            className="font-display mt-3 flex items-center gap-2 text-3xl font-black sm:text-4xl"
          >
            <BookOpenCheck size={30} className="shrink-0" />
            Tujuan Pembelajaran
          </h2>
          <p className="mt-2 max-w-lg text-sm font-semibold leading-relaxed text-white/90 sm:text-base">
            Setelah memainkan simulasi petualangan AGENT SIAGA, siswa diharapkan mampu:
          </p>
        </div>

        {/* Daftar tujuan */}
        <div className="max-h-[55vh] space-y-2.5 overflow-y-auto bg-slate-50/70 p-4 sm:p-6">
          {OBJECTIVES.map((objective, index) => (
            <div
              key={index}
              className={`flex items-start gap-3 rounded-2xl border-2 bg-gradient-to-r p-3 sm:p-4 ${objective.color}`}
            >
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/80 text-xl shadow-sm">
                {objective.icon}
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest opacity-70">
                  <CheckCircle2 size={12} /> Tujuan {index + 1}
                </p>
                <p className="mt-0.5 text-sm font-bold leading-relaxed text-slate-700 sm:text-[15px]">
                  {objective.text}
                </p>
              </div>
            </div>
          ))}

          <div className="pt-1">
            <p className="mb-2 text-center text-[11px] font-black uppercase tracking-widest text-slate-400">
              Empat bencana yang akan dijelajahi
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {DISASTERS.map((disaster) => (
                <div
                  key={disaster.label}
                  className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-white bg-white px-2 py-2 text-center text-[11px] font-black text-slate-600 shadow-sm sm:text-xs"
                >
                  <span className="text-lg">{disaster.icon}</span>
                  {disaster.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-slate-100 bg-white px-5 py-4 sm:px-8">
          <button
            type="button"
            onClick={handleClose}
            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-emerald-700 bg-gradient-to-r from-emerald-500 to-teal-500 text-base font-black text-white shadow-lg transition hover:from-emerald-400 hover:to-teal-400 active:translate-y-0.5 active:border-b-2"
          >
            <CheckCircle2 size={20} /> Oke, Aku Siap Berpetualang!
          </button>
        </div>
      </MotionDiv>
    </MotionDiv>,
    document.body
  );
};

export default LearningObjectivesModal;
