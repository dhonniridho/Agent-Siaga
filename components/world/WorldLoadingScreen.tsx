import React, { useEffect, useState } from 'react';
import { AlertTriangle, Gamepad2, Loader2, MapPin, RefreshCw, Shield } from 'lucide-react';
import { WORLD_FACTS } from '../../constants';

const TIPS = [
  WORLD_FACTS.EARTHQUAKE.facts[0],
  WORLD_FACTS.FLOOD.facts[0],
  WORLD_FACTS.LANDSLIDE.facts[0],
  WORLD_FACTS.VOLCANO.facts[0],
];

/**
 * Layar loading bertema dunia 3D. Dipakai saat chunk World3D sedang diunduh
 * (React.lazy) dan saat canvas pertama kali disiapkan.
 */
export const WorldLoadingScreen: React.FC<{ message?: string }> = ({
  message = 'Menyiapkan dunia 3D...',
}) => {
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(
      () => setTipIndex((index) => (index + 1) % TIPS.length),
      3200
    );
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-sky-400 via-sky-300 to-emerald-200 px-5 text-center">
      {/* Awan dekoratif */}
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="absolute left-[8%] top-[12%] h-20 w-40 rounded-full bg-white/70 blur-[1px]" />
        <div className="absolute left-[16%] top-[16%] h-16 w-24 rounded-full bg-white/80" />
        <div className="absolute right-[10%] top-[18%] h-16 w-32 rounded-full bg-white/60" />
        <div className="absolute right-[18%] top-[22%] h-14 w-20 rounded-full bg-white/70" />
        <div className="absolute bottom-[14%] left-[-6%] h-40 w-64 rounded-full bg-emerald-500/25 blur-sm" />
        <div className="absolute bottom-[10%] right-[-8%] h-44 w-72 rounded-full bg-emerald-600/20 blur-sm" />
      </div>

      <div className="relative flex w-full max-w-md flex-col items-center">
        <div className="relative mb-5 flex h-28 w-28 items-center justify-center rounded-full border-4 border-white/80 bg-white/30 shadow-xl backdrop-blur-sm">
          <span className="absolute inset-0 animate-ping rounded-full border-2 border-white/40" />
          <img
            src="/assets/kapten-idle.png"
            alt="Kapten Siaga"
            className="h-24 w-auto object-contain drop-shadow-md"
            style={{ imageRendering: 'pixelated' }}
          />
          <span className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-amber-400 text-amber-900 shadow">
            <Shield size={18} fill="currentColor" />
          </span>
        </div>

        <p className="text-xs font-black uppercase tracking-[0.25em] text-white/90 drop-shadow">
          Agent Siaga
        </p>
        <h1 className="mt-1 text-3xl font-black leading-tight text-white drop-shadow-md">
          Jelajah Alam Siaga
        </h1>
        <p className="mt-2 text-sm font-bold text-white/90 drop-shadow">
          {message}
        </p>

        <div className="mt-5 flex items-center gap-2 rounded-full bg-white/30 px-4 py-2 text-xs font-bold text-white shadow backdrop-blur-sm">
          <Loader2 size={16} className="animate-spin" />
          Menyiapkan petualanganmu...
        </div>

        <div className="mt-6 w-full rounded-2xl border-2 border-white/60 bg-white/90 p-4 text-left shadow-xl backdrop-blur-sm">
          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-600">
            <MapPin size={12} /> Tahukah kamu?
          </p>
          <p className="mt-1.5 min-h-[3.25rem] text-sm font-bold leading-snug text-slate-700">
            {TIPS[tipIndex]}
          </p>
          <div className="mt-2 flex gap-1.5">
            {TIPS.map((_, index) => (
              <span
                key={index}
                className={`h-1.5 rounded-full transition-all ${
                  index === tipIndex ? 'w-6 bg-amber-400' : 'w-2 bg-slate-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Tampilan bila dunia 3D gagal dimuat (mis. chunk tidak bisa diunduh).
 * Selalu sediakan jalan keluar ke Mode Klasik 2D.
 */
export const WorldLoadError: React.FC<{ onClassicMode: () => void }> = ({ onClassicMode }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gradient-to-br from-indigo-700 via-indigo-600 to-purple-700 p-5">
    <div className="w-full max-w-md rounded-[2rem] bg-white p-6 text-center shadow-2xl sm:p-8">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
        <AlertTriangle size={34} />
      </div>
      <h2 className="text-2xl font-black text-slate-800">Dunia 3D belum bisa dimuat</h2>
      <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
        Koneksi atau perangkat ini mungkin belum mendukung dunia 3D. Petualangan kalian
        tetap bisa dilanjutkan lewat <b>Mode Klasik</b>.
      </p>
      <div className="mt-6 space-y-3">
        <button
          onClick={() => window.location.reload()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-4 text-base font-black text-white shadow-lg transition-colors hover:bg-indigo-700"
        >
          <RefreshCw size={20} /> Coba Lagi
        </button>
        <button
          onClick={onClassicMode}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-5 py-4 text-base font-black text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
        >
          <Gamepad2 size={20} /> Mode Klasik (2D)
        </button>
      </div>
    </div>
  </div>
);

export class WorldLoadBoundary extends React.Component<
  { children: React.ReactNode; onClassicMode: () => void },
  { failed: boolean }
> {
  constructor(props: { children: React.ReactNode; onClassicMode: () => void }) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return <WorldLoadError onClassicMode={this.props.onClassicMode} />;
    }
    return this.props.children;
  }
}
