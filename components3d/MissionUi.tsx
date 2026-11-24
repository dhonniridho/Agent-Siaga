import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Heart, RefreshCw } from 'lucide-react';
import { Joystick } from '../components/world/Joystick';
import type { MoveVector } from '../components/world/worldConfig';

const MotionDiv = motion.div as any;

export const MissionPanel: React.FC<{
  children: React.ReactNode;
  accent?: string;
  className?: string;
}> = ({ children, accent = 'border-b-indigo-300', className = '' }) => (
  <div
    className={`flex h-full w-full flex-col overflow-hidden border-b-4 bg-slate-950 ${accent} ${className}`}
  >
    {children}
  </div>
);

export const HudChip: React.FC<{
  children: React.ReactNode;
  tone?: 'indigo' | 'red' | 'amber' | 'emerald' | 'sky' | 'stone';
  pulse?: boolean;
}> = ({ children, tone = 'indigo', pulse = false }) => {
  const tones: Record<string, string> = {
    indigo: 'bg-indigo-500/20 text-indigo-100 ring-indigo-300/30',
    red: 'bg-red-500/25 text-red-100 ring-red-300/40',
    amber: 'bg-amber-400/25 text-amber-100 ring-amber-300/40',
    emerald: 'bg-emerald-500/25 text-emerald-100 ring-emerald-300/40',
    sky: 'bg-sky-500/25 text-sky-100 ring-sky-300/40',
    stone: 'bg-stone-500/30 text-stone-100 ring-stone-300/30',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider ring-1 backdrop-blur-sm ${tones[tone]} ${
        pulse ? 'animate-pulse' : ''
      }`}
    >
      {children}
    </span>
  );
};

export const HealthBar: React.FC<{ value: number; label?: string }> = ({ value, label = 'Nyawa' }) => (
  <div className="flex items-center gap-2">
    <Heart size={16} className={value < 30 ? 'animate-pulse text-red-400' : 'text-red-400'} fill="currentColor" />
    <div className="h-2.5 w-24 overflow-hidden rounded-full bg-white/20 sm:w-32">
      <motion.div
        className={`h-full ${value < 30 ? 'bg-red-500' : 'bg-emerald-400'}`}
        animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        transition={{ duration: 0.25 }}
      />
    </div>
    <span className="text-[10px] font-black text-white/70">{label}</span>
  </div>
);

export const ActionButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  onPointerDown?: () => void;
  onPointerUp?: () => void;
  onPointerLeave?: () => void;
  tone?: 'indigo' | 'red' | 'amber' | 'emerald' | 'slate' | 'sky';
  active?: boolean;
  className?: string;
  disabled?: boolean;
}> = ({
  children,
  onClick,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  tone = 'indigo',
  active = false,
  className = '',
  disabled = false,
}) => {
  const tones: Record<string, string> = {
    indigo: 'bg-indigo-500 border-indigo-700 hover:bg-indigo-400',
    red: 'bg-red-500 border-red-700 hover:bg-red-400',
    amber: 'bg-amber-500 border-amber-700 hover:bg-amber-400',
    emerald: 'bg-emerald-500 border-emerald-700 hover:bg-emerald-400',
    slate: 'bg-slate-700 border-slate-900 hover:bg-slate-600',
    sky: 'bg-sky-500 border-sky-700 hover:bg-sky-400',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      onPointerCancel={onPointerUp}
      disabled={disabled}
      className={`touch-none select-none rounded-2xl border-b-4 px-4 py-3 text-sm font-black text-white shadow-xl transition-all active:translate-y-0.5 active:border-b-0 disabled:cursor-not-allowed disabled:opacity-40 ${
        tones[tone]
      } ${active ? 'ring-2 ring-white/80 ring-offset-2 ring-offset-transparent' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

export const TouchJoystick: React.FC<{
  valueRef: { current: MoveVector };
  label?: string;
}> = ({ valueRef, label = 'GERAK' }) => (
  <div className="pointer-events-auto sm:hidden">
    <Joystick valueRef={valueRef} label={label} />
  </div>
);

export const StartOverlay: React.FC<{
  emoji: string;
  title: string;
  description: React.ReactNode;
  buttonLabel: string;
  onStart: () => void;
  disabled?: boolean;
  tone?: 'indigo' | 'red' | 'amber' | 'emerald' | 'sky' | 'stone';
}> = ({ emoji, title, description, buttonLabel, onStart, disabled, tone = 'indigo' }) => {
  const gradients: Record<string, string> = {
    indigo: 'from-indigo-600 to-purple-700',
    red: 'from-red-600 to-rose-700',
    amber: 'from-amber-500 to-orange-600',
    emerald: 'from-emerald-500 to-green-700',
    sky: 'from-sky-500 to-blue-700',
    stone: 'from-stone-600 to-stone-800',
  };
  return (
    <div className={`absolute inset-0 z-30 flex items-center justify-center bg-gradient-to-br ${gradients[tone]} p-4`}>
      <MotionDiv
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-lg rounded-3xl border border-white/20 bg-white/10 p-6 text-center text-white shadow-2xl backdrop-blur-md sm:p-8"
      >
        <MotionDiv
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 1.8 }}
          className="mb-3 text-6xl"
        >
          {emoji}
        </MotionDiv>
        <h3 className="text-2xl font-black sm:text-3xl">{title}</h3>
        <p className="mt-3 text-sm font-medium leading-relaxed text-white/85 sm:text-base">{description}</p>
        <button
          onClick={onStart}
          disabled={disabled}
          className="mt-6 w-full rounded-2xl bg-white px-5 py-4 text-base font-black text-slate-800 shadow-xl transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50"
        >
          {buttonLabel}
        </button>
      </MotionDiv>
    </div>
  );
};

export const ResultOverlay: React.FC<{
  survived: boolean;
  title: string;
  message: string;
  stars?: number;
  stats?: Array<{ label: string; value: React.ReactNode }>;
  score: number;
  onReplay?: () => void;
  onContinue: () => void;
  continueLabel?: string;
}> = ({
  survived,
  title,
  message,
  stars = 0,
  stats = [],
  score,
  onReplay,
  onContinue,
  continueLabel = 'Lanjut',
}) => (
  <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
    <MotionDiv
      initial={{ scale: 0.85, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      className="w-full max-w-lg rounded-3xl bg-white p-6 text-center shadow-2xl sm:p-8"
    >
      <div className="text-6xl">{survived ? '🎉' : '💥'}</div>
      <h3 className={`mt-2 text-2xl font-black ${survived ? 'text-emerald-600' : 'text-orange-600'}`}>
        {title}
      </h3>
      <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">{message}</p>

      {stars > 0 && (
        <div className="mt-3 text-3xl tracking-widest">
          {'⭐'.repeat(stars)}
          <span className="opacity-20">{'⭐'.repeat(Math.max(0, 3 - stars))}</span>
        </div>
      )}

      {stats.length > 0 && (
        <div className="mx-auto mt-4 grid max-w-sm grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          {stats.map((stat) => (
            <React.Fragment key={stat.label}>
              <span className="text-left text-slate-500">{stat.label}</span>
              <span className="text-right font-black text-slate-800">{stat.value}</span>
            </React.Fragment>
          ))}
        </div>
      )}

      <div className="mt-4 rounded-2xl bg-indigo-50 px-4 py-3">
        <span className="text-xs font-black uppercase tracking-wider text-indigo-500">Skor misi</span>
        <div className="text-3xl font-black text-indigo-700">{score}</div>
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        {onReplay && (
          <button
            onClick={onReplay}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={17} /> Ulangi
          </button>
        )}
        <button
          onClick={onContinue}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-white shadow-lg hover:bg-emerald-400"
        >
          {continueLabel} <ChevronRight size={18} />
        </button>
      </div>
    </MotionDiv>
  </div>
);

export const MissionScene: React.FC<{
  children: React.ReactNode;
  hud?: React.ReactNode;
  controls?: React.ReactNode;
  overlay?: React.ReactNode;
  className?: string;
}> = ({ children, hud, controls, overlay, className = '' }) => (
  <div className={`relative flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-slate-900 ${className}`}>
    {children}
    {hud && (
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-wrap items-start justify-between gap-2 bg-gradient-to-b from-slate-950/75 to-transparent p-3 pr-16 sm:p-4 sm:pr-20">
        {hud}
      </div>
    )}
    {controls && <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-slate-950/80 to-transparent p-3 sm:p-4">{controls}</div>}
    {overlay}
  </div>
);
