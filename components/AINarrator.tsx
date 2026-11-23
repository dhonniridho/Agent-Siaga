import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateNarration, PerformanceData } from '../services/geminiService';

// Fix for framer-motion type issues
const MotionDiv = motion.div as any;

interface AINarratorProps {
  performanceData: PerformanceData;
  onContinue: () => void;
  playSound: (type: string) => void;
}

const TYPING_SPEED = 10; // ms per character

export const AINarrator: React.FC<AINarratorProps> = ({ performanceData, onContinue, playSound }) => {
  const [narration, setNarration] = useState<string>('');
  const [displayedText, setDisplayedText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isTypingDone, setIsTypingDone] = useState(false);
  const [showContinue, setShowContinue] = useState(false);
  const typingRef = useRef<number | null>(null);
  const charIndexRef = useRef(0);

  // Fetch narration on mount
  useEffect(() => {
    let cancelled = false;

    const fetchNarration = async () => {
      setIsLoading(true);
      try {
        const text = await generateNarration(performanceData);
        if (!cancelled) {
          setNarration(text);
          setIsLoading(false);
          playSound('levelStart');
        }
      } catch {
        if (!cancelled) {
          setNarration('Tim yang hebat! Terus berlatih untuk menjadi agen penyelamat yang handal! 💪');
          setIsLoading(false);
        }
      }
    };

    fetchNarration();
    return () => { cancelled = true; };
  }, [performanceData, playSound]);

  // Typewriter effect
  useEffect(() => {
    if (isLoading || !narration) return;

    charIndexRef.current = 0;
    setDisplayedText('');
    setIsTypingDone(false);
    setShowContinue(false);

    typingRef.current = window.setInterval(() => {
      charIndexRef.current += 1;
      if (charIndexRef.current >= narration.length) {
        setDisplayedText(narration);
        setIsTypingDone(true);
        if (typingRef.current) clearInterval(typingRef.current);
        // Show continue button with delay
        setTimeout(() => setShowContinue(true), 150);
      } else {
        setDisplayedText(narration.slice(0, charIndexRef.current));
      }
    }, TYPING_SPEED);

    return () => {
      if (typingRef.current) clearInterval(typingRef.current);
    };
  }, [narration, isLoading]);

  // Skip typing animation
  const skipTyping = useCallback(() => {
    if (isLoading) return;
    if (!isTypingDone && narration) {
      if (typingRef.current) clearInterval(typingRef.current);
      setDisplayedText(narration);
      setIsTypingDone(true);
      setShowContinue(true);
    }
  }, [isLoading, isTypingDone, narration]);

  const handleContinue = () => {
    playSound('click');
    onContinue();
  };

  // Score-based accent color
  const getAccentColor = () => {
    if (performanceData.score >= 80) return { bg: 'narrator-accent-gold', glow: 'narrator-glow-gold' };
    if (performanceData.score >= 50) return { bg: 'narrator-accent-blue', glow: 'narrator-glow-blue' };
    return { bg: 'narrator-accent-red', glow: 'narrator-glow-red' };
  };

  const accent = getAccentColor();

  // Score-based avatar art
  const getAvatarSrc = () => {
    if (performanceData.score >= 80) return '/assets/kapten-success.png';
    if (performanceData.score >= 50) return '/assets/kapten-idle.png';
    return '/assets/kapten-error.png';
  };

  return (
    <AnimatePresence>
      <MotionDiv
        className="narrator-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        onClick={skipTyping}
      >
        <MotionDiv
          className={`narrator-card ${accent.glow}`}
          initial={{ scale: 0.8, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', bounce: 0.4, duration: 0.6 }}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          {/* Top accent bar */}
          <div className={`narrator-accent-bar ${accent.bg}`} />

          {/* Kapten Siaga header */}
          <div className="narrator-header">
            <MotionDiv
              className="narrator-avatar-container"
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
            >
              <div className="narrator-avatar">
                <img src={getAvatarSrc()} alt="Kapten Siaga" className="narrator-avatar-img" />
              </div>
              <div className="narrator-rank-badge">⭐</div>
            </MotionDiv>

            <div className="narrator-identity">
              <h3 className="narrator-name">Kapten Siaga</h3>
              <span className="narrator-title">Ahli Tanggap Bencana</span>
            </div>

            {/* Score indicator */}
            <div className={`narrator-score-badge ${
              performanceData.score >= 80 ? 'narrator-score-gold' : 
              performanceData.score >= 50 ? 'narrator-score-blue' : 'narrator-score-red'
            }`}>
              <span className="narrator-score-value">{performanceData.score}</span>
              <span className="narrator-score-label">SKOR</span>
            </div>
          </div>

          {/* Message area */}
          <div className="narrator-message-area">
            {isLoading ? (
              <div className="narrator-loading">
                <MotionDiv
                  className="narrator-loading-dots"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  <span className="narrator-loading-icon">📡</span>
                  <span>Kapten Siaga sedang menganalisis performa kalian...</span>
                </MotionDiv>
              </div>
            ) : (
              <div className="narrator-text-container">
                <span className="narrator-quote-mark">"</span>
                <p className="narrator-text">
                  {displayedText}
                  {!isTypingDone && <span className="typewriter-cursor">|</span>}
                </p>
                <span className="narrator-quote-mark narrator-quote-end">"</span>
              </div>
            )}
          </div>

          {/* Continue button */}
          <AnimatePresence>
            {showContinue && (
              <MotionDiv
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', bounce: 0.4 }}
                className="narrator-actions"
              >
                <button
                  className="narrator-continue-btn"
                  onClick={handleContinue}
                >
                  <span>Siap, Kapten!</span>
                  <MotionDiv
                    animate={{ x: [0, 4, 0] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    style={{ display: 'inline-block' }}
                  >
                    →
                  </MotionDiv>
                </button>
              </MotionDiv>
            )}
          </AnimatePresence>

          {/* Tap to skip hint */}
          {!isTypingDone && !isLoading && (
            <MotionDiv
              className="narrator-skip-hint"
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              Ketuk untuk lewati animasi
            </MotionDiv>
          )}
        </MotionDiv>
      </MotionDiv>
    </AnimatePresence>
  );
};
