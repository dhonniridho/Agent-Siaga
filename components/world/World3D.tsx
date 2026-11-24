import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sky, Sparkles } from '@react-three/drei';
import { AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  BookOpen,
  Compass,
  Gamepad2,
  Home,
  ListChecks,
  Play,
  RefreshCw,
  RotateCcw,
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
import { GuideBoard } from './GuideBoard';
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
import { LearningObjectivesModal } from '../LearningObjectivesModal';
import { GuideCard } from './GuideCard';
import { WelcomeModal } from './WelcomeModal';

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
  paused: boolean;
  onNearZone: (zone: MissionZone | null) => void;
  onNearBoard: (board: InfoBoard | null) => void;
  onNearGuide: (near: boolean) => void;
  /** Klik langsung pada tiang/papan zona di dunia 3D. */
  onSelectZone: (zone: MissionZone) => void;
  /** Klik pada papan "Panduan Bermain" di base camp. */
  onOpenGuide: () => void;
}

const WorldScene: React.FC<WorldSceneProps> = ({
  joystickRef,
  poseRef,
  avatar,
  teamName,
  completedZones,
  paused,
  onNearZone,
  onNearBoard,
  onNearGuide,
  onSelectZone,
  onOpenGuide,
}) => (
  <>
    {/* Langit cerah & atmosfer segar supaya lembah terlihat hidup. */}
    <Sky
      distance={200}
      sunPosition={[58, 30, -28]}
      turbidity={3.2}
      rayleigh={1.05}
      mieCoefficient={0.012}
      mieDirectionalG={0.86}
      inclination={0.48}
      azimuth={0.22}
    />
    <fog attach="fog" args={['#dcefe6', 74, 190]} />

    <hemisphereLight args={['#eaf6ff', '#4b7a3a', 1.35]} />
    <directionalLight position={[38, 52, 26]} intensity={2.1} color="#fff6e4" />
    <directionalLight position={[-26, 24, -18]} intensity={0.55} color="#cfe8ff" />
    <ambientLight intensity={0.3} />
    {/* Kilau halus memberi kesan udara pagi yang berembun. */}
    <Sparkles count={70} scale={[64, 16, 64]} size={2.2} speed={0.25} color="#fff8cf" opacity={0.45} />

    <NatureEnvironment />

    {MISSION_ZONES.map((zone) => (
      <ZoneMarker
        key={zone.id}
        zone={zone}
        completed={completedZones.includes(zone.id)}
        onSelect={() => onSelectZone(zone)}
      />
    ))}

    {INFO_BOARDS.map((board) => {
      const zone = MISSION_ZONES.find((item) => item.id === board.zoneId);
      return (
        <InfoBoardMesh
          key={board.id}
          board={board}
          completed={completedZones.includes(board.zoneId)}
          onSelect={zone ? () => onSelectZone(zone) : undefined}
        />
      );
    })}

    <KaptenBillboard />

    {/* Papan panduan di area terbuka base camp — bebas dibuka kapan saja. */}
    <GuideBoard onSelect={onOpenGuide} />

    <Player
      joystickRef={joystickRef}
      poseRef={poseRef}
      avatar={avatar}
      teamName={teamName}
      paused={paused}
      onNearZone={onNearZone}
      onNearBoard={onNearBoard}
      onNearGuide={onNearGuide}
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

const Minimap: React.FC<{
  poseRef: { current: PlayerPose };
  completedZones: DisasterType[];
}> = ({ poseRef, completedZones }) => {
  const dotRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLDivElement>(null);

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
          return (
            <div
              key={zone.id}
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${mapX(zone.position[0])}%`, top: `${mapZ(zone.position[2])}%` }}
              title={`${zone.name}${done ? ' (selesai)' : ''}`}
            >
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
  /** Sapaan Kapten Siaga — tampil setiap kali masuk ke Dunia 3D. */
  const [welcomeOpen, setWelcomeOpen] = useState(true);
  const [ready, setReady] = useState(false);
  const [webglOk] = useState(webglSupported);
  const [compact, setCompact] = useState(false);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [controlsDismissed, setControlsDismissed] = useState(false);
  /** Panel daftar misi (akses cepat ke keempat mini-game + replay). */
  const [missionListOpen, setMissionListOpen] = useState(false);
  /** Modal Tujuan Pembelajaran (dibuka dari tombol "TP" di HUD). */
  const [objectivesOpen, setObjectivesOpen] = useState(false);
  /** Kartu Panduan Bermain (papan di base camp). */
  const [guideOpen, setGuideOpen] = useState(false);

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

  // Klik penanda / papan di dunia 3D → buka kartu misi zona tersebut.
  const handleSelectZone = useCallback(
    (zone: MissionZone) => {
      setMissionListOpen(false);
      joystickRef.current = { x: 0, y: 0 };
      openZoneCard(zone);
    },
    [openZoneCard]
  );

  // Daftar misi dibuka langsung dari HUD; tiap tombol masuk ke mini-game 2D.
  const startFromList = useCallback(
    (zoneId: DisasterType) => {
      setMissionListOpen(false);
      setActiveZone(null);
      onStartMission(zoneId);
    },
    [onStartMission]
  );

  // Misi yang sudah selesai tetap bisa dimainkan ulang kapan saja (replay).
  const startMissionFromCard = useCallback(
    (zoneId: DisasterType) => {
      setActiveZone(null);
      setMissionListOpen(false);
      onStartMission(zoneId);
    },
    [onStartMission]
  );

  const handleNearBoard = useCallback((board: InfoBoard | null) => {
    setNearBoard(board);
  }, []);

  // Mendekati papan panduan di camp langsung membuka kartu petunjuk (sekali
  // masuk radius). Callback Player hanya dipanggil saat status berubah.
  const handleNearGuide = useCallback((near: boolean) => {
    if (!near) return;
    setMissionListOpen(false);
    setExitDialogOpen(false);
    setObjectivesOpen(false);
    setGuideOpen(true);
  }, []);

  const openGuide = useCallback(() => {
    playSound?.('click');
    setMissionListOpen(false);
    setExitDialogOpen(false);
    setObjectivesOpen(false);
    setGuideOpen(true);
  }, [playSound]);

  const openObjectives = useCallback(() => {
    playSound?.('click');
    setMissionListOpen(false);
    setExitDialogOpen(false);
    setGuideOpen(false);
    setObjectivesOpen(true);
  }, [playSound]);

  const closeGuide = useCallback(() => setGuideOpen(false), []);
  const closeObjectives = useCallback(() => setObjectivesOpen(false), []);
  const closeWelcome = useCallback(() => {
    playSound?.('click');
    setWelcomeOpen(false);
  }, [playSound]);

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
    if (!readTargetZone || zoneCardOpen || exitDialogOpen || guideOpen || objectivesOpen || welcomeOpen)
      return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'KeyE' || event.repeat) return;
      event.preventDefault();
      openZoneCard(readTargetZone);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    readTargetZone,
    zoneCardOpen,
    exitDialogOpen,
    guideOpen,
    objectivesOpen,
    welcomeOpen,
    openZoneCard,
  ]);

  // Kartu zona dan dialog lain tidak boleh tampil bersamaan.
  useEffect(() => {
    if (zoneCardOpen) {
      setExitDialogOpen(false);
      setMissionListOpen(false);
      setGuideOpen(false);
      setObjectivesOpen(false);
    }
    if (welcomeOpen) {
      setExitDialogOpen(false);
      setMissionListOpen(false);
      setGuideOpen(false);
      setObjectivesOpen(false);
      setActiveZone(null);
    }
  }, [zoneCardOpen, welcomeOpen]);

  // Lepaskan input joystick saat kartu petunjuk/tujuan atau popup sapaan terbuka.
  useEffect(() => {
    if (!guideOpen && !objectivesOpen && !welcomeOpen) return;
    joystickRef.current = { x: 0, y: 0 };
  }, [guideOpen, objectivesOpen, welcomeOpen]);

  // Esc menutup panel daftar misi.
  useEffect(() => {
    if (!missionListOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setMissionListOpen(false);
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [missionListOpen]);

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
                paused={zoneCardOpen || missionListOpen || guideOpen || objectivesOpen || welcomeOpen}
                onNearZone={handleNearZone}
                onNearBoard={handleNearBoard}
                onNearGuide={handleNearGuide}
                onSelectZone={handleSelectZone}
                onOpenGuide={openGuide}
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

            {/* Daftar misi dipindah ke kiri agar kanan atas hanya: TP · Suara · Beranda */}
            <button
              onClick={() => {
                playSound?.('click');
                setMissionListOpen((open) => !open);
              }}
              className={`pointer-events-auto flex w-max items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-black shadow-md backdrop-blur-sm transition-colors active:scale-95 ${
                missionListOpen
                  ? 'border-indigo-300 bg-indigo-600 text-white'
                  : 'border-white/50 bg-white/90 text-slate-700 hover:bg-white'
              }`}
              aria-expanded={missionListOpen}
              aria-label="Buka daftar misi"
              title="Daftar misi · bisa diulang kapan saja"
            >
              {missionListOpen ? <X size={15} /> : <ListChecks size={15} />}
              Misi
            </button>

          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="pointer-events-auto flex items-center gap-2">
              {/* a. Paling kiri: Tujuan Pembelajaran */}
              <button
                onClick={openObjectives}
                className="flex h-11 min-h-[44px] items-center justify-center gap-1 rounded-2xl border border-emerald-200 bg-emerald-50 px-2 text-[10px] font-black text-emerald-700 shadow-lg backdrop-blur-sm transition-colors hover:bg-emerald-100 active:scale-95 sm:px-3 sm:text-xs"
                aria-label="Buka tujuan pembelajaran"
                title="Tujuan Pembelajaran"
              >
                <BookOpen size={16} className="flex-shrink-0 sm:size-[18px]" />
                <span className="whitespace-nowrap">Tujuan Pembelajaran</span>
              </button>

              {/* b. Tengah: Suara */}
              <button
                onClick={handleSound}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/60 bg-white/90 text-slate-700 shadow-lg backdrop-blur-sm transition-colors hover:bg-white active:scale-95"
                aria-label={soundEnabled ? 'Matikan suara' : 'Nyalakan suara'}
                title={soundEnabled ? 'Matikan suara' : 'Nyalakan suara'}
              >
                {soundEnabled ? <Volume2 size={21} /> : <VolumeX size={21} className="text-slate-400" />}
              </button>

              {/* c. Paling kanan: Beranda (menggantikan tombol Keluar) */}
              {onExit && (
                <button
                  onClick={() => {
                    playSound?.('click');
                    setExitDialogOpen(true);
                  }}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/60 bg-white/90 text-slate-700 shadow-lg backdrop-blur-sm transition-colors hover:bg-white active:scale-95"
                  aria-label="Kembali ke beranda"
                  title="Beranda"
                >
                  <Home size={21} />
                </button>
              )}
            </div>

            <Minimap poseRef={poseRef} completedZones={completedZones} />
          </div>
        </div>
      </div>

      {/* ---------- PANEL DAFTAR MISI (akses cepat + replay) ---------- */}
      {missionListOpen && (
        <div className="pointer-events-auto absolute right-3 top-[76px] z-40 w-[min(92vw,330px)] rounded-3xl border-2 border-white bg-white/95 p-3 shadow-2xl backdrop-blur-md sm:right-4 sm:top-[86px]">
          <div className="mb-2 flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <Compass size={18} className="text-indigo-600" />
              <div className="leading-tight">
                <p className="font-display text-sm font-black text-slate-800">Pusat Misi</p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Pilih zona · bisa diulang
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                playSound?.('click');
                setMissionListOpen(false);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
              aria-label="Tutup daftar misi"
            >
              <X size={16} />
            </button>
          </div>

          <div className="max-h-[48vh] space-y-1.5 overflow-y-auto pr-0.5">
            {MISSION_ZONES.map((zone) => {
              const done = completedZones.includes(zone.id);
              const isNext = nextZone?.id === zone.id;
              return (
                <div
                  key={zone.id}
                  className={`flex items-center gap-2 rounded-2xl border-2 p-2 ${
                    isNext && !done ? 'border-amber-300 bg-amber-50' : 'border-slate-100 bg-slate-50'
                  }`}
                >
                  <span
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-lg shadow-inner"
                    style={{ backgroundColor: `${zone.color}25` }}
                  >
                    {zone.icon}
                  </span>
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="truncate text-xs font-black text-slate-800">
                      {ZONE_INFO[zone.id].title}
                    </p>
                    <p className="text-[9px] font-black uppercase tracking-wider" style={{ color: zone.color }}>
                      {ZONE_INFO[zone.id].code} · {done ? 'Selesai' : isNext ? 'Rekomendasi' : 'Tersedia'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => startFromList(zone.id)}
                    className={`flex h-9 flex-shrink-0 items-center gap-1 rounded-xl px-2 text-[11px] font-black text-white shadow-md transition active:scale-95 ${
                      done ? 'bg-slate-500 hover:bg-slate-600' : 'bg-emerald-500 hover:bg-emerald-600'
                    }`}
                    title={done ? `Mainkan ulang ${zone.name}` : `Mulai misi ${zone.name}`}
                  >
                    {done ? <RotateCcw size={13} /> : <Play size={13} fill="currentColor" />}
                    {done ? 'Ulangi' : 'Mainkan'}
                  </button>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-center text-[9px] font-bold text-slate-400">
            Tips: klik langsung tiang bercahaya atau papan fakta di peta juga bisa membuka misi.
          </p>
        </div>
      )}

      {/* ---------- PETUNJUK BACA (papan informasi / tiang zona) ---------- */}
      {readTargetZone && !zoneCardOpen && !exitDialogOpen && !welcomeOpen && (
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
                  Klik tiang / papan zona atau tombol <b className="text-amber-300">Misi</b> untuk masuk misi
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

      {/* ---------- MODAL TUJUAN PEMBELAJARAN ---------- */}
      <AnimatePresence>
        {objectivesOpen && (
          <LearningObjectivesModal onClose={closeObjectives} playSound={playSound} />
        )}
      </AnimatePresence>

      {/* ---------- KARTU PANDUAN BERMAIN ---------- */}
      <AnimatePresence>
        {guideOpen && <GuideCard onClose={closeGuide} playSound={playSound} />}
      </AnimatePresence>

      {/* ---------- SAPAAN KAPTEN SIAGA (popup awal) ---------- */}
      <AnimatePresence>
        {welcomeOpen && (
          <WelcomeModal
            teamName={teamName}
            onClose={closeWelcome}
            playSound={playSound}
          />
        )}
      </AnimatePresence>

      {/* ---------- KONFIRMASI KEMBALI KE BERANDA ---------- */}
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
        onRequestOpen={
          zoneCardOpen || missionListOpen || guideOpen || objectivesOpen || welcomeOpen
            ? undefined
            : () => setExitDialogOpen(true)
        }
        playSound={playSound}
        title="Kembali ke beranda?"
        description={'Progres tim akan dihapus kalau kamu kembali ke halaman utama. Pilih "Lanjut Main" untuk tetap menjelajah.'}
        confirmLabel="Kembali ke Beranda"
      />

      {/* ---------- LOADING ---------- */}
      {!ready && webglOk && <WorldLoadingScreen message="Menyiapkan alam petualangan..." />}
    </div>
  );
};

export default World3D;
