import React, { useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  playSound?: () => void;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  fullWidth = false,
  className = '',
  playSound,
  onClick,
  ...props 
}) => {
  const btnRef = useRef<HTMLButtonElement>(null);

  const baseStyles = "font-display font-bold rounded-2xl shadow-[0_4px_0_0_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-1 transition-all flex items-center justify-center gap-2 ripple-container";
  
  const variants = {
    primary: "bg-indigo-500 text-white hover:bg-indigo-600 shadow-indigo-700",
    secondary: "bg-white text-gray-700 hover:bg-gray-50 shadow-gray-300 border-2 border-gray-200",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-red-700",
    success: "bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-700",
  };

  const sizes = {
    sm: "px-3 py-1 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-xl",
  };

  // Cast motion.button to any to avoid TypeScript errors with mismatched definitions
  const MotionButton = motion.button as any;

  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    // Play click sound
    if (playSound) playSound();

    // Create ripple effect
    const btn = btnRef.current;
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const ripple = document.createElement('span');
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
      ripple.className = 'ripple';
      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    }

    // Call original onClick
    if (onClick) onClick(e);
  }, [playSound, onClick]);

  return (
    <MotionButton
      ref={btnRef}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`
        ${baseStyles}
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      onClick={handleClick}
      {...props}
    >
      {children}
    </MotionButton>
  );
};