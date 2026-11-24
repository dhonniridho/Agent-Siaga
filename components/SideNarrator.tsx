import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Loader } from 'lucide-react';

interface SideNarratorProps {
  message: string;
  isTyping?: boolean;
  status?: 'idle' | 'warning' | 'success' | 'error';
  visible: boolean;
}

export const SideNarrator: React.FC<SideNarratorProps> = ({ message, isTyping = false, status = 'idle', visible }) => {
  const [displayedText, setDisplayedText] = useState('');

  // Typewriter effect
  useEffect(() => {
    if (!message) {
      setDisplayedText('');
      return;
    }

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
      default: return 'border-blue-400 shadow-blue-400/50';
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
      {visible && (
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          className="fixed left-4 top-1/4 min-[1600px]:left-8 z-50 w-64 min-[1600px]:w-72 pointer-events-none hidden xl:block origin-top-left min-[1600px]:origin-left scale-[0.45] min-[1600px]:scale-100"
        >
          <div className={`bg-white/95 backdrop-blur-md rounded-3xl p-5 min-[1600px]:p-6 border-2 shadow-xl relative ${getBorderColor()}`}>
            {/* Avatar Head */}
            <div className="absolute -top-20 -left-8 w-36 h-36 flex items-center justify-center">
              <img src={getAvatarImage()} alt="Kapten Siaga" className="w-full h-full object-contain filter drop-shadow-md" />
            </div>

            {/* Badge */}
            <div className="absolute -top-14 left-20 bg-yellow-400 rounded-full p-2 border-2 border-white shadow-sm">
              <Shield size={28} className="text-yellow-800" fill="currentColor" />
            </div>

            <div className="mt-14 ml-2">
              <h4 className="text-lg font-bold text-gray-800 uppercase tracking-wider mb-2">Kapten Siaga</h4>

              <div className="bg-blue-50/50 rounded-2xl p-3 min-h-[72px] min-[1600px]:min-h-[100px]">
                {isTyping && !message ? (
                  <div className="flex items-center gap-2 text-blue-500">
                    <Loader size={20} className="animate-spin" />
                    <span className="text-base font-medium">Menganalisa...</span>
                  </div>
                ) : (
                  <p className="text-gray-700 text-lg font-medium leading-relaxed">
                    {displayedText}
                    {displayedText.length < message.length && (
                      <span className="inline-block w-2 h-5 bg-blue-500 ml-1 animate-pulse"></span>
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
