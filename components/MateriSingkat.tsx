import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  AlertTriangle,
  SkipForward,
  Sparkles,
  Flag,
} from 'lucide-react';
import { MATERI } from '../materi';
import type { DisasterType } from '../types';
import { LEVEL_COLOR_CLASSES } from '../colorUtils';
import { Button } from './Button';

// Sama seperti di App: cast ke any untuk menghindari konflik tipe framer-motion.
const MotionDiv = motion.div as any;

const slideVariants = {
  enter: (direction: number) => ({
    x: direction >= 0 ? 90 : -90,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction >= 0 ? -90 : 90,
    opacity: 0,
  }),
};

interface MateriSingkatProps {
  disasterType: DisasterType;
  /** Nama warna level dari LevelConfig (amber, blue, stone, orange, ...). */
  color: string;
  /** Dipanggil saat slide terakhir selesai (tombol "Mulai Misi!"). */
  onFinish: () => void;
  /** Dipanggil saat anak menekan "Lewati". */
  onSkip: () => void;
  playSound?: (type: string) => void;
}

export const MateriSingkat: React.FC<MateriSingkatProps> = ({
  disasterType,
  color,
  onFinish,
  onSkip,
  playSound,
}) => {
  const slides = MATERI[disasterType];
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const palette =
    LEVEL_COLOR_CLASSES[color as keyof typeof LEVEL_COLOR_CLASSES] ??
    LEVEL_COLOR_CLASSES.stone;

  const slide = slides[index];
  const isFirst = index === 0;
  const isLast = index === slides.length - 1;

  const playClick = () => {
    if (playSound) playSound('click');
  };

  const goTo = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= slides.length || nextIndex === index) return;
    setDirection(nextIndex > index ? 1 : -1);
    setIndex(nextIndex);
  };

  const handleBack = () => {
    if (isFirst) return;
    playClick();
    goTo(index - 1);
  };

  const handleNext = () => {
    if (isLast) {
      playClick();
      onFinish();
      return;
    }
    playClick();
    goTo(index + 1);
  };

  const handleSkip = () => {
    playClick();
    onSkip();
  };

  const handleDot = (target: number) => {
    if (target === index) return;
    playClick();
    goTo(target);
  };

  const handleDragEnd = (_event: unknown, info: PanInfo) => {
    if (info.offset.x < -70 && !isLast) {
      playClick();
      goTo(index + 1);
    } else if (info.offset.x > 70 && !isFirst) {
      playClick();
      goTo(index - 1);
    }
  };

  return (
    <MotionDiv
      initial={{ scale: 0.94, opacity: 0, y: 30 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 1.06, opacity: 0 }}
      className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-[2rem] border-4 border-gray-100 bg-white shadow-2xl"
    >
      <div className={`h-2.5 w-full ${palette.topBar}`} />

      <div className="p-5 sm:p-8">
        {/* Header: label materi + tombol lewati */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-black uppercase tracking-widest sm:text-xs ${palette.bgLight} ${palette.textDark}`}
          >
            <Sparkles size={15} />
            Materi Misi
          </div>

          <button
            type="button"
            onClick={handleSkip}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 active:scale-95"
            aria-label="Lewati materi dan mulai misi"
          >
            <SkipForward size={17} />
            Lewati
          </button>
        </div>

        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <MotionDiv
            key={`${disasterType}-${index}`}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.26, ease: 'easeOut' }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.12}
            onDragEnd={handleDragEnd}
            className="flex min-h-[340px] touch-pan-y flex-col sm:min-h-[360px]"
            aria-live="polite"
          >
            {/* Judul kartu */}
            <div className="mb-4 text-center">
              <div
                className={`mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-3xl text-5xl shadow-inner ${palette.bgLight}`}
              >
                {slide.icon}
              </div>
              <h2 className="font-display text-2xl font-black leading-tight text-gray-800 sm:text-3xl">
                {slide.title}
              </h2>
            </div>

            {/* Pengantar singkat (opsional) */}
            {slide.intro && (
              <p className="mb-4 text-lg font-semibold leading-relaxed text-gray-600 sm:text-xl">
                {slide.intro}
              </p>
            )}

            {/* Poin-poin materi */}
            <ul className="space-y-2.5">
              {slide.points.map((point, pointIndex) => (
                <li
                  key={`${slide.title}-${pointIndex}`}
                  className={`flex items-start gap-3 rounded-2xl border-2 p-3 sm:p-4 ${palette.border} ${palette.bgLighter}`}
                >
                  <span className="mt-0.5 text-2xl leading-none sm:text-3xl">
                    {point.icon}
                  </span>
                  <span className="text-base font-bold leading-relaxed text-gray-700 sm:text-lg">
                    {point.text}
                  </span>
                </li>
              ))}
            </ul>

            {/* Catatan ingat / jangan */}
            {slide.note && (
              <div
                className={`mt-3 flex items-start gap-3 rounded-2xl border-2 p-3.5 sm:p-4 ${
                  slide.note.kind === 'jangan'
                    ? 'border-rose-200 bg-rose-50 text-rose-800'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                }`}
              >
                {slide.note.kind === 'jangan' ? (
                  <AlertTriangle size={26} className="mt-0.5 shrink-0" />
                ) : (
                  <Lightbulb size={26} className="mt-0.5 shrink-0" />
                )}
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest opacity-70">
                    {slide.note.kind === 'jangan' ? 'Jangan!' : 'Ingat!'}
                  </p>
                  <p className="text-base font-bold leading-relaxed sm:text-lg">
                    {slide.note.text}
                  </p>
                </div>
              </div>
            )}
          </MotionDiv>
        </AnimatePresence>

        {/* Indikator halaman */}
        <div className="mt-5 flex items-center justify-center gap-2">
          {slides.map((_, dotIndex) => {
            const active = dotIndex === index;
            return (
              <button
                key={dotIndex}
                type="button"
                onClick={() => handleDot(dotIndex)}
                aria-label={`Ke halaman ${dotIndex + 1}`}
                aria-current={active ? 'step' : undefined}
                className={`h-3 rounded-full border transition-all duration-200 ${
                  active
                    ? `w-8 border-transparent ${palette.bg}`
                    : `w-3 ${palette.bgLight} ${palette.border} hover:opacity-80`
                }`}
              />
            );
          })}
        </div>
        <p className="mt-2 text-center text-[11px] font-bold uppercase tracking-wider text-gray-400">
          Halaman {index + 1} dari {slides.length}
        </p>

        {/* Navigasi */}
        <div className="mt-4 flex items-center gap-3">
          <Button
            variant="secondary"
            size="lg"
            onClick={handleBack}
            disabled={isFirst}
            className={`flex-1 text-lg ${isFirst ? 'cursor-not-allowed opacity-40' : ''}`}
          >
            <ChevronLeft />
            Kembali
          </Button>

          <Button
            variant="primary"
            size="lg"
            onClick={handleNext}
            className={`flex-[1.5] text-lg ${palette.bg} ${palette.shadow}`}
          >
            {isLast ? (
              <>
                Mulai Misi!
                <Flag />
              </>
            ) : (
              <>
                Lanjut
                <ChevronRight />
              </>
            )}
          </Button>
        </div>

        <p className="mt-3 text-center text-xs font-semibold text-gray-400">
          Geser kartu ke kiri atau kanan untuk pindah halaman.
        </p>
      </div>
    </MotionDiv>
  );
};
