import React, { useRef, useState } from 'react';
import type { MoveVector } from './worldConfig';

interface JoystickProps {
  valueRef: { current: MoveVector };
  label?: string;
}

/**
 * Joystick virtual untuk HP/tablet.
 * Nilai x/y berkisar -1..1 (y negatif = dorong ke atas).
 */
export const Joystick: React.FC<JoystickProps> = ({ valueRef, label = 'GERAK' }) => {
  const baseRef = useRef<HTMLDivElement>(null);
  const pointerId = useRef<number | null>(null);
  const center = useRef({ x: 0, y: 0, max: 48 });
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);

  const setFromPoint = (clientX: number, clientY: number) => {
    const dx = clientX - center.current.x;
    const dy = clientY - center.current.y;
    const distance = Math.hypot(dx, dy);
    const max = center.current.max;
    const scale = distance > max ? max / distance : 1;
    const x = dx * scale;
    const y = dy * scale;
    setKnob({ x, y });
    valueRef.current = {
      x: Math.max(-1, Math.min(1, x / max)),
      y: Math.max(-1, Math.min(1, y / max)),
    };
  };

  const reset = () => {
    pointerId.current = null;
    setActive(false);
    setKnob({ x: 0, y: 0 });
    valueRef.current = { x: 0, y: 0 };
  };

  const handleDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerId.current !== null) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    center.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      max: rect.width * 0.32,
    };
    pointerId.current = e.pointerId;
    setActive(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    setFromPoint(e.clientX, e.clientY);
  };

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerId.current !== e.pointerId) return;
    e.preventDefault();
    setFromPoint(e.clientX, e.clientY);
  };

  const handleUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerId.current !== e.pointerId) return;
    e.preventDefault();
    reset();
  };

  return (
    <div className="flex flex-col items-center gap-1.5 pointer-events-auto">
      <div
        ref={baseRef}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerCancel={handleUp}
        onLostPointerCapture={reset}
        className={`relative rounded-full border-4 select-none touch-none transition-colors ${
          active
            ? 'bg-white/35 border-white/80 shadow-[0_0_30px_rgba(255,255,255,0.35)]'
            : 'bg-slate-900/25 border-white/55 shadow-lg'
        } backdrop-blur-sm`}
        style={{ width: 'clamp(116px, 30vw, 150px)', height: 'clamp(116px, 30vw, 150px)' }}
        aria-label="Joystick gerak"
        role="application"
      >
        {/* Cincin dalam */}
        <div className="absolute inset-[18%] rounded-full border-2 border-white/30" />

        {/* Penanda arah */}
        <span className="absolute top-1.5 left-1/2 -translate-x-1/2 text-white/60 text-xs font-black">▲</span>
        <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-white/60 text-xs font-black">▼</span>
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-white/60 text-xs font-black">◀</span>
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-white/60 text-xs font-black">▶</span>

        {/* Knob */}
        <div
          className={`absolute left-1/2 top-1/2 rounded-full border-2 border-white/80 flex items-center justify-center ${
            active ? 'bg-white/95' : 'bg-white/80'
          }`}
          style={{
            width: '48%',
            height: '48%',
            transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))`,
            boxShadow: active ? '0 0 22px rgba(255,255,255,0.65)' : '0 4px 10px rgba(15,23,42,0.35)',
            transition: active ? 'none' : 'transform 120ms ease-out',
          }}
        >
          <div className="relative w-5 h-5">
            <span className="absolute left-1/2 top-0 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <span className="absolute left-1/2 bottom-0 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <span className="absolute top-1/2 left-0 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <span className="absolute top-1/2 right-0 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-indigo-500" />
          </div>
        </div>
      </div>
      <span className="text-[11px] font-black tracking-widest text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
        {label}
      </span>
    </div>
  );
};
