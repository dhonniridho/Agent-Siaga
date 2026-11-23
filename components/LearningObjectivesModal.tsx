import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Target, X } from 'lucide-react';
import { LEARNING_OBJECTIVES, LEARNING_OBJECTIVES_INTRO } from '../constants';

const MotionDiv = motion.div as any;

interface LearningObjectivesModalProps {
  open: boolean;
  onClose: () => void;
}

export const LearningObjectivesModal: React.FC<LearningObjectivesModalProps> = ({ open, onClose }) => {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <MotionDiv
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(event: React.MouseEvent<HTMLDivElement>) => {
            if (event.target === event.currentTarget) onClose();
          }}
          role="presentation"
        >
          <MotionDiv
            role="dialog"
            aria-modal="true"
            aria-labelledby="learning-objectives-title"
            className="learning-objectives-scroll relative max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-white p-5 shadow-2xl sm:p-8"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <div className="flex items-start gap-3 pr-10 sm:gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200 sm:h-14 sm:w-14">
                <Target size={28} strokeWidth={2.5} />
              </div>
              <div className="min-w-0 pt-1">
                <h2 id="learning-objectives-title" className="font-display text-2xl font-black text-slate-900 sm:text-3xl">
                  Tujuan Pembelajaran
                </h2>
                <div className="mt-2 h-1.5 w-16 rounded-full bg-indigo-200" aria-hidden="true" />
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 transition-colors hover:bg-indigo-200 focus:outline-none focus:ring-4 focus:ring-indigo-200 active:scale-95 sm:right-6 sm:top-6"
              aria-label="Tutup Tujuan Pembelajaran"
              title="Tutup"
            >
              <X size={21} strokeWidth={2.5} />
            </button>

            <p className="mt-6 text-base leading-relaxed text-slate-600 sm:text-lg">
              {LEARNING_OBJECTIVES_INTRO}
            </p>

            <ol className="mt-5 space-y-3 sm:mt-6 sm:space-y-4">
              {LEARNING_OBJECTIVES.map((objective, index) => (
                <li
                  key={objective}
                  className="flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 sm:gap-4 sm:p-5"
                >
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-black text-white shadow-sm sm:h-9 sm:w-9 sm:text-base">
                    {index + 1}
                  </span>
                  <p className="pt-0.5 text-base leading-relaxed text-slate-700 sm:text-lg">
                    {objective}
                  </p>
                </li>
              ))}
            </ol>
          </MotionDiv>
        </MotionDiv>
      )}
    </AnimatePresence>
  );
};

