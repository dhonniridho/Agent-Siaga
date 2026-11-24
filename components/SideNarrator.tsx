import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Loader, X } from 'lucide-react';

interface SideNarratorProps {
  message: string;
  isTyping?: boolean;
  status?: 'idle' | 'warning' | 'success' | 'error';
  visible: boolean;
  /**
   * "mission" menempatkan kartu di bawah area HUD (timer/nyawa/progres)
   * supaya tidak menutupi informasi penting selama misi 3D berlangsung.
   */
  variant?: 'default' | 'mission';
}

export const SideNarrator: React.FC<SideNarratorProps> = ({
  message,
  isTyping = false,
  status = 'idle',
  visible,
  variant = 'default',
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [dismissed, setDismissed] = useState(false);

  // Typewriter effect
  useEffect(() => {
    if (!message) {
      setDisplayedText('');
      return;
    }

    setDismissed(false);
    // Reset when message changes
    setDisplayedText('');

    let i = 0;
    const speed = 8; // ms per char
    let timer: number;

    const typeWriter = () => {
      // Use an absolute slice (not prev + char) so nothing can interleave
      i++;
      setDisplayedText(message.slice(0, i));
      if (i < message.length) timer = window.setTimeout(typeWriter, speed);
    };

    timer = window.setTimeout(typeWriter, speed);

    // Cancel the in-flight animation when the message changes or unmounts,
    // otherwise the old and new loops run together and scramble the text.
    return () => window.clearTimeout(timer);
  }, [message]);

  const getBorderColor = () => {
    switch (status) {
      case 'warning': return 'border-orange-400 shadow-orange-400/50';
      case 'success': return 'border-green-400 shadow-green-400/50';
      case 'error': return 'border-red-400 shadow-red-400/50';
      default: return 'border-indigo-400 shadow-indigo-400/50';
    }
  };

  const getAvatarImage = () => {
    switch (status) {
      case 'success': return '/assets/kapten-success.png';
      case 'error': return '/assets/kapten-error.png';
      case 'warning':
      case 'idle':
      default: return '/assets/kapten-idle.png';
    }
  };

  return (
    <AnimatePresence>
      {visible && !dismissed && message && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.96 }}
          transition={{ duration: 0.22 }}
          className={`fixed left-3 flex pointer-events-auto sm:left-4 ${
            variant === 'mission'
              ? 'top-[6.75rem] z-10 w-[min(18rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] sm:top-28 lg:left-6 lg:top-32'
              : 'top-20 z-50 w-[min(19rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] sm:top-24 md:left-6 lg:left-8 lg:w-72 xl:w-80'
          }`}
          style={{
            left: 'max(0.75rem, env(safe-area-inset-left, 0.75rem))',
          }}
        >
          <div
            className={`w-full overflow-hidden border-2 bg-white/95 shadow-2xl backdrop-blur-md ${
              variant === 'mission' ? 'rounded-2xl p-2.5' : 'rounded-3xl p-3 lg:p-4'
            } ${getBorderColor()}`}
          >
            <div className="flex min-w-0 items-center gap-2">
              <div className="relative h-11 w-11 flex-shrink-0">
                <img src={getAvatarImage()} alt="Kapten Siaga" className="h-full w-full object-contain drop-shadow-md" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="truncate text-sm font-black uppercase tracking-wider text-gray-800 lg:text-base">
                  Kapten Siaga
                </h4>
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">Pemandu Misi</p>
              </div>
              <div className="flex items-center gap-1">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-white bg-yellow-400 shadow-sm">
                  <Shield size={15} className="text-yellow-800" fill="currentColor" />
                </div>
                <button
                  type="button"
                  onClick={() => setDismissed(true)}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Tutup pesan Kapten Siaga"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="mt-2 min-w-0 rounded-2xl bg-blue-50/70 p-2.5 lg:p-3">
              {isTyping && !message ? (
                <div className="flex items-center gap-2 text-blue-500">
                  <Loader size={16} className="animate-spin" />
                  <span className="text-xs font-bold">Menganalisa...</span>
                </div>
              ) : (
                <p className="text-xs font-bold leading-relaxed text-slate-700 sm:text-[13px] lg:text-sm">
                  {displayedText}
                  {displayedText.length < message.length && (
                    <span className="ml-1 inline-block h-3 w-1.5 animate-pulse bg-blue-500" />
                  )}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
