import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import { AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Gamepad2,
  LogOut,
  RefreshCw,
  Shield,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { Avatar, DisasterType } from '../../types';
import { Joystick } from './Joystick';
import {
  INFO_BOARDS,
  MISSION_ZONES,
  PLAYER_SPAWN,
  WORLD_BOUNDS,
  type InfoBoard,
  type MissionZone,
  type MoveVector,
  type PlayerPose,
} from './worldConfig';
import { DirectionArrow } from './DirectionArrow';
import { InfoBoard as InfoBoardMesh } from './InfoBoard';
import { KaptenBillboard } from './KaptenBillboard';
import { Player } from './Player';
import { NatureEnvironment } from './NatureEnvironment';
import { ZoneMarker } from './ZoneMarker';
import { ZoneInfoCard } from './ZoneInfoCard';
import { ZoneProgressCard } from './ZoneProgressCard';
import { ZONE_INFO } from './zoneInfo';
import { WorldLoadingScreen } from './WorldLoadingScreen';
import { ExitConfirmDialog } from '../ExitConfirmDialog';

interface World3DProps {
  teamName: string;
  avatar: Avatar | null;
  score: number;
  completedZones: DisasterType[];
  /** Zona yang papan informasinya sudah dibaca pada sesi ini. */
  readZones: DisasterType[];
  soundEnabled: boolean;
  onToggleSound: () => void;
  onClassicMode: () => void;
  onStartMission: (zoneId: DisasterType) => void;
  onMarkZoneRead: (zoneId: DisasterType) => void;
  onExit?: () => void;
  playSound?: (type: string) => void;
}

interface WorldSceneProps {
  joystickRef: { current: MoveVector };
  poseRef: { current: PlayerPose };
  avatar: Avatar | null;
  teamName: string;
  completedZones: DisasterType[];
  nextZone?: MissionZone;
  kaptenMessage: string;
  paused: boolean;
  onNearZone: (zone: MissionZone | null) => void;
  onNearBoard: (board: InfoBoard | null) => void;
}

const WorldScene: React.FC<WorldSceneProps> = ({
  joystickRef,
  poseRef,
  avatar,
  teamName,
  completedZones,
  nextZone,
  kaptenMessage,
  paused,
  onNearZone,
  onNearBoard,
}) => (
  <>
    <Sky distance={180} sunPosition={[60, 32, 45]} turbidity={6} rayleigh={0.55} mieCoefficient={0.005} mieDirectionalG={0.8} />
    <fog attach="fog" args={['#cfe4db', 62, 165]} />

    <hemisphereLight args={['#d8efff', '#3f6b2f', 1.05]} />
    <directionalLight position={[30, 42, 20]} intensity={1.65} color="#fff4df" />
    <directionalLight position={[-22, 20, -16]} intensity={0.35} color="#bfe3ff" />
    <ambientLight intensity={0.22} />

    <NatureEnvironment />

    {MISSION_ZONES.map((zone) => (
      <ZoneMarker key={zone.id} zone={zone} completed={completedZones.includes(zone.id)} />
    ))}

    {INFO_BOARDS.map((board) => (
      <InfoBoardMesh key={board.id} board={board} />
    ))}

    <KaptenBillboard />

    <DirectionArrow poseRef={poseRef} target={nextZone} />

    <Player
      joystickRef={joystickRef}
      poseRef={poseRef}
      avatar={avatar}
      teamName={teamName}
      paused={paused}
      onNearZone={onNearZone}
      onNearBoard={onNearBoard}
    />
  </>
);

/* ------------------------------------------------------------------ */
/* Minimap                                                             */
/* ------------------------------------------------------------------ */

const mapX = (x: number) =>
  ((x - WORLD_BOUNDS.minX) / (WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX)) * 100;
const mapZ = (z: number) =>
  ((z - WORLD_BOUNDS.minZ) / (WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ)) * 100;

/** Nama pendek untuk legenda minimap. */
const SHORT_ZONE_NAMES: Record<DisasterType, string> = {
  EARTHQUAKE: 'Gempa',
  FLOOD: 'Banjir',
  LANDSLIDE: 'Longsor',
  VOLCANO: 'Erupsi',
};

const Minimap: React.FC<{
  poseRef: { current: PlayerPose };
  completedZones: DisasterType[];
  nextZone?: MissionZone;
}> = ({ poseRef, completedZones, nextZone }) => {
  const dotRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLDivElement>(null);
  const [legendOpen, setLegendOpen] = useState(false);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const pose = poseRef.current;
      if (dotRef.current) {
        dotRef.current.style.left = `${mapX(pose.x)}%`;
        dotRef.current.style.top = `${mapZ(pose.z)}%`;
      }
      if (arrowRef.current) {
        arrowRef.current.style.transform = `rotate(${(pose.yaw * 180) / Math.PI + 180}deg)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [poseRef]);

  return (
    <div className="pointer-events-none relative z-30 flex flex-col items-end gap-2">
      <div
        className="relative h-20 w-20 overflow-hidden rounded-full border-[3px] border-white/85 bg-emerald-200/90 shadow-xl ring-2 ring-slate-900/10 backdrop-blur-sm sm:h-32 sm:w-32"
        title="Minimap alam"
      >
        {/* Perbukitan & danau */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_30%,#d9f99d,#86efac_45%,#4ade80)] opacity-90" />
        <div
          className="absolute h-6 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-500/45 blur-[1px]"
          style={{ left: `${mapX(23)}%`, top: `${mapZ(16)}%` }}
        />
        <div
          className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-600/40 blur-[1px]"
          style={{ left: `${mapX(21)}%`, top: `${mapZ(-18)}%` }}
        />
        <div
          className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-800/35 blur-[1px]"
          style={{ left: `${mapX(-22)}%`, top: `${mapZ(7)}%` }}
        />
        <div className="absolute left-1/2 top-0 h-full w-px bg-white/60" />
        <div className="absolute left-0 top-1/2 h-px w-full bg-white/60" />
        <div className="absolute left-1/2 top-0 h-full w-[44%] -translate-x-1/2 rounded-full border border-white/30" />
        <span className="absolute left-1/2 top-0.5 -translate-x-1/2 text-[8px] font-black text-emerald-900/70">
          U
        </span>

        {/* Ikon zona misi (selesai = centang) */}
        {MISSION_ZONES.map((zone) => {
          const done = completedZones.includes(zone.id);
          const isNext = nextZone?.id === zone.id;
          return (
            <div
              key={zone.id}
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${mapX(zone.position[0])}%`, top: `${mapZ(zone.position[2])}%` }}
              title={`${zone.name}${done ? ' (selesai)' : ''}`}
            >
              {isNext && (
                <span className="absolute -inset-1.5 animate-ping rounded-full bg-yellow-300/90" />
              )}
              <div
                className={`relative flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 shadow sm:h-6 sm:w-6 ${
                  done
                    ? 'border-emerald-600 bg-emerald-500 text-white'
                    : 'border-white bg-white/95'
                }`}
                style={done ? undefined : { borderColor: zone.color }}
              >
                {done ? (
                  <span className="text-[10px] font-black leading-none sm:text-xs">✓</span>
                ) : (
                  <span className="text-[10px] leading-none sm:text-xs">{zone.icon}</span>
                )}
              </div>
            </div>
          );
        })}

        {/* Posisi pemain */}
        <div
          ref={dotRef}
          className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${mapX(PLAYER_SPAWN[0])}%`, top: `${mapZ(PLAYER_SPAWN[2])}%` }}
        >
          <div ref={arrowRef} className="relative h-3.5 w-3.5" style={{ transform: 'rotate(180deg)' }}>
            <div className="absolute inset-0 rounded-full border-2 border-white bg-indigo-600 shadow-md" />
            <div className="absolute -top-1 left-1/2 h-0 w-0 -translate-x-1/2 border-x-[4px] border-b-[6px] border-x-transparent border-b-indigo-600" />
          </div>
        </div>
      </div>

      {/* Label tujuan + tombol legenda */}
      <div className="flex max-w-[172px] items-center gap-1.5 rounded-2xl border border-white/70 bg-white/95 px-2.5 py-1.5 shadow-md backdrop-blur-sm sm:max-w-[230px]">
        {nextZone ? (
          <>
            <span className="text-sm leading-none" aria-hidden="true">
              🎯
            </span>
            <span className="min-w-0 text-xs font-black leading-tight text-slate-800 sm:text-sm">
              Tujuan:{' '}
              <span style={{ color: nextZone.color }}>{nextZone.name}</span>
            </span>
          </>
        ) : (
          <span className="flex items-center gap-1 text-xs font-black leading-tight text-emerald-600 sm:text-sm">
            <CheckCircle2 size={14} /> Semua selesai
          </span>
        )}
        <button
          type="button"
          onClick={() => setLegendOpen((open) => !open)}
          className="pointer-events-auto ml-0.5 flex h-6 flex-shrink-0 items-center gap-0.5 rounded-full bg-slate-100 px-1.5 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
          aria-expanded={legendOpen}
          aria-label={legendOpen ? 'Tutup legenda zona' : 'Buka legenda zona'}
          title="Legenda zona"
        >
          <span className="hidden text-[10px] font-bold sm:inline">Legenda</span>
          <ChevronDown size={14} className={`transition-transform ${legendOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Legenda mini: ikon + nama pendek */}
      {legendOpen && (
        <div className="pointer-events-auto w-[178px] rounded-2xl border border-white/70 bg-white/95 p-2 shadow-lg backdrop-blur-sm">
          <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-slate-400">
            Legenda zona
          </p>
          <ul className="grid grid-cols-2 gap-1">
            {MISSION_ZONES.map((zone) => {
              const done = completedZones.includes(zone.id);
              return (
                <li
                  key={zone.id}
                  className="flex items-center gap-1 rounded-lg bg-slate-50 px-1.5 py-1"
                >
                  <span className="text-xs leading-none">{zone.icon}</span>
                  <span
                    className={`min-w-0 flex-1 truncate text-[10px] font-bold ${
                      done ? 'text-emerald-600' : 'text-slate-600'
                    }`}
                  >
                    {SHORT_ZONE_NAMES[zone.id]}
                  </span>
                  {done && (
                    <CheckCircle2 size={11} className="flex-shrink-0 text-emerald-500" />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Fallback & error boundary                                           */
/* ------------------------------------------------------------------ */

const WorldFallback: React.FC<{ onClassicMode: () => void }> = ({ onClassicMode }) => (
  <div className="absolute inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-indigo-700 via-indigo-600 to-purple-700 p-5">
    <div className="w-full max-w-md rounded-[2rem] bg-white p-6 text-center shadow-2xl sm:p-8">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
        <AlertTriangle size={34} />
      </div>
      <h2 className="text-2xl font-black text-slate-800">Dunia 3D belum bisa dimuat</h2>
      <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
        Perangkat ini mungkin belum mendukung WebGL. Tenang, petualangan kalian tetap bisa
        dilanjutkan lewat <b>Mode Klasik</b>.
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

class WorldErrorBoundary extends React.Component<
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
      return <WorldFallback onClassicMode={this.props.onClassicMode} />;
    }
    return this.props.children;
  }
}

function webglSupported() {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl'))
    );
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Dunia 3D                                                            */
/* ------------------------------------------------------------------ */

export const World3D: React.FC<World3DProps> = ({
  teamName,
  avatar,
  score,
  completedZones,
  readZones,
  soundEnabled,
  onToggleSound,
  onClassicMode,
  onStartMission,
  onMarkZoneRead,
  onExit,
  playSound,
}) => {
  const joystickRef = useRef<MoveVector>({ x: 0, y: 0 });
  const poseRef = useRef<PlayerPose>({
    x: PLAYER_SPAWN[0],
    z: PLAYER_SPAWN[2],
    yaw: 0,
  });
  const [nearZone, setNearZone] = useState<MissionZone | null>(null);
  const [activeZone, setActiveZone] = useState<MissionZone | null>(null);
  const [nearBoard, setNearBoard] = useState<InfoBoard | null>(null);
  const [tip, setTip] = useState<{ text: string; key: number } | null>(null);
  const [ready, setReady] = useState(false);
  const [webglOk] = useState(webglSupported);
  const [compact, setCompact] = useState(false);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [controlsDismissed, setControlsDismissed] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(pointer: coarse)');
    const update = () => {
      setCompact(
        media.matches || navigator.maxTouchPoints > 0 || window.innerWidth < 900
      );
    };
    update();

    const onChange = () => update();
    if (media.addEventListener) media.addEventListener('change', onChange);
    else media.addListener(onChange);
    window.addEventListener('resize', update);

    return () => {
      if (media.removeEventListener) media.removeEventListener('change', onChange);
      else media.removeListener(onChange);
      window.removeEventListener('resize', update);
    };
  }, []);

  const nextZone = useMemo(
    () => MISSION_ZONES.find((zone) => !completedZones.includes(zone.id)),
    [completedZones]
  );

  // Panel KONTROL pudar otomatis: setelah pemain mulai berjalan atau ~10 detik.
  useEffect(() => {
    if (controlsDismissed) return;
    const startX = poseRef.current.x;
    const startZ = poseRef.current.z;
    const dismiss = () => {
      setControlsVisible(false);
      setControlsDismissed(true);
    };
    const timer = window.setTimeout(dismiss, 10000);
    const walkTimer = window.setInterval(() => {
      const moved = Math.hypot(poseRef.current.x - startX, poseRef.current.z - startZ);
      if (moved > 0.8) dismiss();
    }, 300);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(walkTimer);
    };
  }, [controlsDismissed]);

  const toggleControls = useCallback(() => {
    setControlsDismissed(true);
    setControlsVisible((visible) => !visible);
  }, []);

  const handleNearZone = useCallback(
    (zone: MissionZone | null) => {
      setNearZone(zone);
      if (zone) playSound?.('click');
    },
    [playSound]
  );

  const nearZoneDone = nearZone ? completedZones.includes(nearZone.id) : false;
  const zoneCardOpen = activeZone !== null;

  const openZoneCard = useCallback(
    (zone: MissionZone) => {
      playSound?.('click');
      // Membuka kartu berarti papan zona tersebut sudah dibaca.
      onMarkZoneRead(zone.id);
      setActiveZone(zone);
    },
    [onMarkZoneRead, playSound]
  );

  const closeZoneCard = useCallback(() => {
    setActiveZone(null);
  }, []);

  const startMissionFromCard = useCallback(
    (zoneId: DisasterType) => {
      if (completedZones.includes(zoneId)) return;
      setActiveZone(null);
      onStartMission(zoneId);
    },
    [completedZones, onStartMission]
  );

  const handleNearBoard = useCallback((board: InfoBoard | null) => {
    setNearBoard(board);
  }, []);

  const kaptenMessage = useMemo(() => {
    if (completedZones.length >= MISSION_ZONES.length) {
      return 'Semua zona selesai! Kamu luar biasa!';
    }
    return `Halo ${teamName || 'Agen'}! Cari tiang bercahaya dan baca papan fakta ya!`;
  }, [completedZones.length, teamName]);

  useEffect(() => {
    let message: string;
    if (completedZones.length >= MISSION_ZONES.length) {
      message = 'Semua zona selesai! Misi penyelamatan bumi berhasil!';
    } else if (nearBoard) {
      message = 'Papan fakta! Tekan E untuk membaca isinya.';
    } else if (nearZone) {
      message = nearZoneDone
        ? `${nearZone.name} sudah selesai! Tekan E untuk melihat ringkasannya.`
        : `Kamu di zona ${nearZone.name}. Tekan E untuk membaca kartunya!`;
    } else {
      const next = MISSION_ZONES.find((zone) => !completedZones.includes(zone.id));
      message = next
        ? `Halo ${teamName || 'Agen'}! Cari tiang bercahaya. Berikutnya: ${next.name}.`
        : 'Semua zona selesai!';
    }
    setTip({ text: message, key: Date.now() });
    const timer = window.setTimeout(() => setTip(null), 9000);
    return () => window.clearTimeout(timer);
  }, [completedZones, nearBoard, nearZone, nearZoneDone, teamName]);

  const nearBoardZone = useMemo(
    () =>
      nearBoard
        ? MISSION_ZONES.find((zone) => zone.id === nearBoard.zoneId) || null
        : null,
    [nearBoard]
  );

  // Target baca: papan informasi diutamakan, lalu tiang zona.
  const readTargetZone = nearBoardZone || nearZone;

  // Tekan E di dekat papan/tiang zona = buka kartu informasi, bukan langsung
  // memulai misi. Misi hanya dimulai dari tombol "Mulai Misi" di kartu.
  useEffect(() => {
    if (!readTargetZone || zoneCardOpen || exitDialogOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'KeyE' || event.repeat) return;
      event.preventDefault();
      openZoneCard(readTargetZone);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [readTargetZone, zoneCardOpen, exitDialogOpen, openZoneCard]);

  // Kartu zona dan dialog Keluar tidak boleh tampil bersamaan.
  useEffect(() => {
    if (zoneCardOpen) setExitDialogOpen(false);
  }, [zoneCardOpen]);

  // Lepaskan input joystick saat kartu terbuka supaya pemain tidak meluncur.
  useEffect(() => {
    if (!zoneCardOpen) return;
    joystickRef.current = { x: 0, y: 0 };
  }, [zoneCardOpen]);

  const handleSound = () => {
    onToggleSound();
    playSound?.('click');
  };

  return (
    <div
      className="fixed inset-0 z-30 overflow-hidden bg-sky-200 select-none"
      style={{ touchAction: 'none' }}
    >
      {webglOk ? (
        <WorldErrorBoundary onClassicMode={onClassicMode}>
          <Canvas
            className="absolute inset-0"
            dpr={[1, compact ? 1.25 : 1.5]}
            shadows={false}
            performance={{ min: 0.5 }}
            camera={{ position: [0, 5, 21], fov: 55, near: 0.1, far: 220 }}
            gl={{ antialias: !compact, powerPreference: 'high-performance', alpha: false }}
            onCreated={() => setReady(true)}
          >
            <Suspense fallback={null}>
              <WorldScene
                joystickRef={joystickRef}
                poseRef={poseRef}
                avatar={avatar}
                teamName={teamName}
                completedZones={completedZones}
                nextZone={nextZone}
                kaptenMessage={kaptenMessage}
                paused={zoneCardOpen}
                onNearZone={handleNearZone}
                onNearBoard={handleNearBoard}
              />
            </Suspense>
          </Canvas>
        </WorldErrorBoundary>
      ) : (
        <WorldFallback onClassicMode={onClassicMode} />
      )}

      {/* Scrim atas & bawah supaya HUD mudah dibaca */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-slate-900/45 via-slate-900/10 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-900/35 to-transparent" />

      {/* ---------- HUD ATAS ---------- */}
      <div className="pointer-events-none absolute inset-x-0 top-0 p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex items-center gap-2 rounded-2xl border border-white/60 bg-white/90 px-2.5 py-2 shadow-lg backdrop-blur-sm sm:gap-3 sm:px-3">
              <div
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-xl shadow-inner sm:h-12 sm:w-12 sm:text-2xl ${
                  avatar?.bgGradient || 'from-indigo-400 to-purple-600'
                }`}
              >
                {avatar?.icon || <Shield size={20} />}
              </div>
              <div className="min-w-0 leading-tight">
                <p className="max-w-[30vw] truncate text-sm font-black text-slate-800 sm:max-w-[220px] sm:text-base">
                  {teamName || 'Tim Agent'}
                </p>
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
                  Unit Penyelamat
                </p>
              </div>
            </div>

            <div className="flex w-max items-center gap-1.5 rounded-xl border border-white/40 bg-indigo-600/90 px-3 py-1.5 text-white shadow-md backdrop-blur-sm">
              <Shield size={14} className="text-yellow-300" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-100">
                Skor
              </span>
              <span className="font-mono text-sm font-black">{score}</span>
            </div>

          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="pointer-events-auto flex items-center gap-2">
              <button
                onClick={handleSound}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/60 bg-white/90 text-slate-700 shadow-lg backdrop-blur-sm transition-colors hover:bg-white active:scale-95"
                aria-label={soundEnabled ? 'Matikan suara' : 'Nyalakan suara'}
                title={soundEnabled ? 'Matikan suara' : 'Nyalakan suara'}
              >
                {soundEnabled ? <Volume2 size={21} /> : <VolumeX size={21} className="text-slate-400" />}
              </button>
              {onExit && (
                <button
                  onClick={() => {
                    playSound?.('click');
                    setExitDialogOpen(true);
                  }}
                  className="flex h-11 min-h-[44px] items-center justify-center gap-1 rounded-2xl border border-white/60 bg-white/90 px-2.5 text-xs font-black text-slate-700 shadow-lg backdrop-blur-sm transition-colors hover:bg-white active:scale-95 sm:gap-1.5 sm:px-3 sm:text-sm"
                  aria-label="Keluar dari dunia 3D"
                  title="Keluar"
                >
                  <LogOut size={19} />
                  <span>Keluar</span>
                </button>
              )}
            </div>

            <Minimap poseRef={poseRef} completedZones={completedZones} nextZone={nextZone} />
          </div>
        </div>
      </div>

      {/* ---------- PESAN KAPTEN SIAGA ---------- */}
      {tip && ready && (
        <div className="pointer-events-none absolute inset-x-0 top-[192px] z-20 flex justify-center pl-3 pr-[104px] sm:top-[178px] sm:pr-40 lg:pr-3">
          <div
            key={tip.key}
            className="pointer-events-auto flex max-w-md items-start gap-2 rounded-2xl border-2 border-amber-300 bg-white/95 px-2.5 py-2 shadow-xl backdrop-blur-sm"
          >
            <img
              src="/assets/kapten-idle.png"
              alt="Kapten Siaga"
              className="h-10 w-10 flex-shrink-0 object-contain sm:h-12 sm:w-12"
              style={{ imageRendering: 'pixelated' }}
            />
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-amber-600">
                Kapten Siaga
              </p>
              <p className="text-[11px] font-bold leading-snug text-slate-700 sm:text-xs">
                {tip.text}
              </p>
            </div>
            <button
              onClick={() => setTip(null)}
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              aria-label="Tutup pesan Kapten Siaga"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ---------- PETUNJUK BACA (papan informasi / tiang zona) ---------- */}
      {readTargetZone && !zoneCardOpen && !exitDialogOpen && (
        <div className="pointer-events-none absolute inset-x-0 bottom-32 z-20 flex justify-center px-3 sm:bottom-24">
          <div
            className="pointer-events-auto flex max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-full border-2 bg-white/95 py-1.5 pl-2 pr-2.5 shadow-xl backdrop-blur-md"
            style={{ borderColor: readTargetZone.color }}
          >
            <span
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-lg"
              style={{ backgroundColor: `${readTargetZone.color}22` }}
              aria-hidden="true"
            >
              {readTargetZone.icon}
            </span>
            <div className="min-w-0 leading-tight">
              <p
                className="text-[9px] font-black uppercase tracking-widest"
                style={{ color: readTargetZone.color }}
              >
                {nearBoard ? 'Papan informasi' : 'Tiang zona'} • {ZONE_INFO[readTargetZone.id].code}
              </p>
              <p className="max-w-[42vw] truncate text-xs font-black text-slate-800 sm:max-w-none">
                {ZONE_INFO[readTargetZone.id].title}
              </p>
            </div>

            {compact ? (
              <button
                type="button"
                onClick={() => openZoneCard(readTargetZone)}
                className="ml-1 flex min-h-[40px] flex-shrink-0 items-center justify-center gap-1 rounded-full bg-emerald-500 px-3 text-sm font-black text-white shadow-md transition-transform active:scale-95"
                aria-label={`Baca informasi ${ZONE_INFO[readTargetZone.id].title}`}
              >
                <BookOpen size={16} />
                Baca
              </button>
            ) : (
              <p className="ml-1 flex flex-shrink-0 items-center gap-1 rounded-full bg-slate-900/85 px-2.5 py-1 text-[11px] font-bold text-white">
                Tekan
                <kbd className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-black">E</kbd>
                untuk membaca
              </p>
            )}
          </div>
        </div>
      )}

      {/* ---------- PROGRES & KONTROL BAWAH ---------- */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 p-2 sm:p-4"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      >
        <div className="relative flex items-end justify-between gap-2">
          <ZoneProgressCard
            completedZones={completedZones}
            readZones={readZones}
            nextZone={nextZone}
          />

          {/* HP: joystick pindah ke kanan supaya tidak menutupi kartu progres. */}
          {compact && <Joystick valueRef={joystickRef} />}

          {/* Desktop: petunjuk kontrol di tengah-bawah, memudar setelah 10 detik. */}
          {!compact && (
            <div className="absolute bottom-0 left-1/2 flex -translate-x-1/2 items-center gap-2">
              <div
                className={`pointer-events-auto rounded-2xl border border-white/25 bg-slate-900/60 px-4 py-3 text-white shadow-xl backdrop-blur-sm transition-all duration-500 ${
                  controlsVisible
                    ? 'translate-y-0 opacity-100'
                    : 'pointer-events-none translate-y-2 opacity-0'
                }`}
              >
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200">
                  Kontrol
                </p>
                <p className="mt-1 text-sm font-bold">
                  <span className="rounded bg-white/20 px-1.5 py-0.5">W A S D</span> atau{' '}
                  <span className="rounded bg-white/20 px-1.5 py-0.5">← ↑ ↓ →</span> untuk berjalan
                </p>
                <p className="text-xs font-medium text-white/70">
                  Tahan & geser mouse untuk memutar kamera
                </p>
              </div>
              <button
                onClick={() => {
                  playSound?.('click');
                  toggleControls();
                }}
                className="pointer-events-auto flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-white/50 bg-slate-900/60 text-sm font-black text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-slate-900/80 active:scale-95"
                aria-label={controlsVisible ? 'Sembunyikan petunjuk kontrol' : 'Tampilkan petunjuk kontrol'}
                aria-expanded={controlsVisible}
                title={controlsVisible ? 'Sembunyikan petunjuk kontrol' : 'Tampilkan petunjuk kontrol'}
              >
                ?
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ---------- KARTU INFORMASI ZONA ---------- */}
      <AnimatePresence>
        {activeZone && (
          <ZoneInfoCard
            key={activeZone.id}
            zone={activeZone}
            completed={completedZones.includes(activeZone.id)}
            read={readZones.includes(activeZone.id)}
            onClose={closeZoneCard}
            onStartMission={startMissionFromCard}
            playSound={playSound}
          />
        )}
      </AnimatePresence>

      {/* ---------- KONFIRMASI KELUAR ---------- */}
      <ExitConfirmDialog
        open={exitDialogOpen}
        onClose={() => setExitDialogOpen(false)}
        onConfirm={() => {
          setExitDialogOpen(false);
          onExit?.();
        }}
        onClassicMode={() => {
          setExitDialogOpen(false);
          onClassicMode();
        }}
        onRequestOpen={zoneCardOpen ? undefined : () => setExitDialogOpen(true)}
        playSound={playSound}
      />

      {/* ---------- LOADING ---------- */}
      {!ready && webglOk && <WorldLoadingScreen message="Menyiapkan alam petualangan..." />}
    </div>
  );
};

export default World3D;
