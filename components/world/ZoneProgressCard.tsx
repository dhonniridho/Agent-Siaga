import React from 'react';
import { BookCheck, CheckCircle2, Target } from 'lucide-react';
import type { DisasterType } from '../../types';
import { MISSION_ZONES, type MissionZone } from './worldConfig';

const SHORT_ZONE_NAMES: Record<DisasterType, string> = {
  EARTHQUAKE: 'Gempa',
  FLOOD: 'Banjir',
  LANDSLIDE: 'Longsor',
  VOLCANO: 'Erupsi',
};

interface ZoneProgressCardProps {
  completedZones: DisasterType[];
  /** Zona yang papan informasinya sudah dibaca pada sesi ini. */
  readZones: DisasterType[];
  nextZone?: MissionZone;
}

/**
 * Kartu progres ringkas di kiri bawah. Menggantikan chip "MISI 0/4"
 * supaya pemain bisa melihat keempat zona sekaligus tanpa menutup layar.
 */
export const ZoneProgressCard: React.FC<ZoneProgressCardProps> = ({
  completedZones,
  readZones,
  nextZone,
}) => {
  const completedCount = Math.min(completedZones.length, MISSION_ZONES.length);

  return (
    <div
      className="pointer-events-auto w-[min(46vw,190px)] rounded-2xl border border-white/60 bg-white/90 p-2 shadow-xl backdrop-blur-md sm:w-[206px] sm:p-2.5"
      aria-label={`Progres misi: ${completedCount} dari ${MISSION_ZONES.length} zona`}
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-1">
        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-indigo-500 sm:text-[10px]">
          Progres zona
        </p>
        <Target size={13} className="flex-shrink-0 text-indigo-400" />
      </div>

      <p className="mt-0.5 text-sm font-black leading-tight text-slate-800 sm:text-base">
        <span className="text-lg text-indigo-600 sm:text-xl">{completedCount}</span> dari{' '}
        {MISSION_ZONES.length} zona
      </p>

      <div className="mt-1.5 space-y-1">
        {MISSION_ZONES.map((zone) => {
          const done = completedZones.includes(zone.id);
          const read = readZones.includes(zone.id);
          const isNext = !done && nextZone?.id === zone.id;
          return (
            <div
              key={zone.id}
              className={`flex items-center gap-1.5 rounded-lg px-1.5 py-1 ${
                done ? 'bg-emerald-50' : isNext ? 'bg-amber-50' : 'bg-slate-50'
              }`}
              title={`${zone.name}${done ? ' (selesai)' : isNext ? ' (berikutnya)' : ''}${
                read ? ' • papan sudah dibaca' : ''
              }`}
            >
              <span className="w-4 flex-shrink-0 text-center text-[11px] leading-none sm:text-xs" aria-hidden="true">
                {zone.icon}
              </span>
              <span
                className={`min-w-0 flex-1 truncate text-[10px] font-bold leading-tight sm:text-[11px] ${
                  done ? 'text-emerald-700' : 'text-slate-600'
                }`}
              >
                {SHORT_ZONE_NAMES[zone.id]}
              </span>
              <span className="flex flex-shrink-0 items-center gap-0.5">
                {read && (
                  <BookCheck
                    size={13}
                    className="text-sky-500"
                    aria-label="Papan sudah dibaca"
                  />
                )}
                {done ? (
                  <CheckCircle2 size={13} className="text-emerald-500" aria-label="Selesai" />
                ) : isNext ? (
                  <Target size={13} style={{ color: zone.color }} aria-label="Berikutnya" />
                ) : (
                  <span className="h-2.5 w-2.5 rounded-full border border-slate-300" aria-hidden="true" />
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ZoneProgressCard;
