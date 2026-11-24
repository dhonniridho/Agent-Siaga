/// <reference types="react" />
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Shield, Trophy, RefreshCw, ChevronRight, CheckCircle, XCircle, AlertTriangle, Backpack, Heart, Star, CloudRain, Flame, Mountain, ArrowUp, User, Users, Medal, Volume2, VolumeX, X, BookOpen } from 'lucide-react';
import { LEVELS, FLOOD_BAG_ITEMS, FLOOD_BAG_CAPACITY, FLOOD_BAG_USEFUL_COUNT, FloodBagItem, AVATARS } from './constants';
import { GamePhase, LevelConfig, PlayerState, Item, DisasterType, Avatar } from './types';
import { Button } from './components/Button';
import { LEVEL_COLOR_CLASSES, AVATAR_STYLE_CLASSES } from './colorUtils';
import { useSoundEffects } from './useSoundEffects';
import { AINarrator } from './components/AINarrator';
import { SideNarrator } from './components/SideNarrator';
import { ExitConfirmDialog } from './components/ExitConfirmDialog';
import { MateriSingkat } from './components/MateriSingkat';
import {
  WorldLoadingScreen,
  WorldLoadBoundary,
} from './components/world/WorldLoadingScreen';
import { PerformanceData, generateQuestionFeedback } from './services/geminiService';
import { GuideCarousel } from './components3d/GuideCarousel';
import { SceneBackdrop3D } from './components3d/SceneBackdrop3D';
import { EarthquakeMission3D } from './components3d/EarthquakeMission3D';
import { FloodMission3D } from './components3d/FloodMission3D';
import { LandslideMission3D } from './components3d/LandslideMission3D';
import { VolcanoMission3D } from './components3d/VolcanoMission3D';
import { Recovery3D } from './components3d/Recovery3D';
import { MissionCelebration } from './components3d/MissionCelebration';
import {
  ApiError,
  getLeaderboard,
  registerTeam as registerTeamApi,
  saveResult,
  type LeaderboardTeam,
} from './services/api';

// Dunia 3D diunduh terpisah supaya menu dan panduan tetap ringan.
const World3D = React.lazy(() => import('./components/world/World3D'));

// Fix for framer-motion type issues in this environment
const MotionDiv = motion.div as any;
const MotionButton = motion.button as any;
const MotionSpan = motion.span as any;

// --- Visual Effect Components ---

// Floating Background Particles
const FloatingParticles = ({ colors = ['#818cf8', '#a78bfa', '#c084fc', '#e879f9'] }: { colors?: string[] }) => {
  const particles = useMemo(() => Array.from({ length: 20 }, (_, i) => ({
    id: i,
    size: Math.random() * 8 + 4,
    left: Math.random() * 100,
    delay: Math.random() * 8,
    duration: Math.random() * 8 + 10,
    color: colors[Math.floor(Math.random() * colors.length)],
  })), [colors]);

  return (
    <div className="particles-container">
      {particles.map(p => (
        <div
          key={p.id}
          className="particle"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.left}%`,
            backgroundColor: p.color,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
};

// Dust particles for earthquake
const DustParticles = () => {
  const dusts = useMemo(() => Array.from({ length: 12 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    dx: (Math.random() - 0.5) * 60,
    dy: -(Math.random() * 60 + 20),
    duration: Math.random() * 2 + 1,
    delay: Math.random() * 2,
  })), []);

  return (
    <>
      {dusts.map(d => (
        <div
          key={d.id}
          className="dust-particle"
          style={{
            left: `${d.left}%`,
            top: `${d.top}%`,
            '--dust-x': `${d.dx}px`,
            '--dust-y': `${d.dy}px`,
            animationDuration: `${d.duration}s`,
            animationDelay: `${d.delay}s`,
          } as React.CSSProperties}
        />
      ))}
    </>
  );
};

// Improved Confetti
const Confetti = () => {
  const particles = useMemo(() => Array.from({ length: 60 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: ['#FFD700', '#FF6347', '#4169E1', '#32CD32', '#FF69B4', '#9B59B6', '#FF8C00', '#00CED1'][Math.floor(Math.random() * 8)],
    size: Math.random() * 8 + 4,
    duration: Math.random() * 2 + 2,
    delay: Math.random() * 3,
    rotate: Math.random() * 720,
    shape: Math.random() > 0.5 ? 'rounded-sm' : 'rounded-full',
  })), []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map(p => (
        <MotionDiv
          key={p.id}
          initial={{ y: -20, x: `${p.x}vw`, rotate: 0, opacity: 1 }}
          animate={{ y: '110vh', rotate: p.rotate, opacity: [1, 1, 0.8, 0] }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "linear"
          }}
          className={`absolute ${p.shape}`}
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            left: 0,
          }}
        />
      ))}
    </div>
  );
};

// Score counter with animation
const AnimatedScore = ({ value, duration = 1500 }: { value: number, duration?: number }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime: number;
    const animate = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value, duration]);

  return <span className="score-counter">{displayValue}</span>;
};

// Sound Toggle Button
const SoundToggle = ({ isEnabled, onToggle }: { isEnabled: boolean, onToggle: () => void }) => (
  <button
    onClick={onToggle}
    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-sm border border-white/10"
    title={isEnabled ? 'Matikan suara' : 'Nyalakan suara'}
  >
    {isEnabled ? <Volume2 size={18} className="text-white/80" /> : <VolumeX size={18} className="text-white/50" />}
  </button>
);

// --- Sub-Components ---

// 0. Team Registration (Replaces Avatar Selection)
const TeamRegistration = ({
  onRegister,
  playSound,
}: {
  onRegister: (name: string, avatar: Avatar, classCode: string, offline: boolean) => void;
  playSound: (type: string) => void;
}) => {
  const [teamName, setTeamName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);
  const [classCode, setClassCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    if (busy) return;
    if (!teamName.trim()) {
      setError("Nama kelompok belum diisi!");
      playSound('warning');
      return;
    }
    if (!selectedAvatar) {
      setError("Pilih maskot tim dulu!");
      playSound('warning');
      return;
    }

    setBusy(true);
    setError("");
    const cleanName = teamName.trim();
    const cleanCode = classCode.trim().toUpperCase();

    try {
      const session = await registerTeamApi(cleanName, selectedAvatar.id, cleanCode);
      playSound('success');
      onRegister(cleanName, selectedAvatar, session.team.classCode, false);
    } catch (err) {
      // Server lokal tidak aktif: permainan tetap bisa dimainkan (mode offline).
      if (err instanceof ApiError && err.status === 0) {
        playSound('success');
        onRegister(cleanName, selectedAvatar, cleanCode, true);
        return;
      }
      setError(err instanceof ApiError ? err.message : 'Gagal mendaftarkan tim. Coba lagi.');
      playSound('warning');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-display font-bold text-gray-800 mb-2">Registrasi Tim</h2>
        <p className="text-gray-500 text-lg">Buat nama kelompok kalian sekeren mungkin!</p>
      </div>

      <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-xl border-4 border-indigo-100 max-w-2xl mx-auto">
        {/* Input Nama Tim */}
        <div className="mb-6">
          <label className="block text-indigo-900 font-bold text-lg mb-2 ml-2">Nama Kelompok / Tim:</label>
          <input
            type="text"
            placeholder="Contoh: Tim Harimau, Kelompok 1, Avengers..."
            className="w-full text-2xl font-bold p-4 rounded-2xl border-4 border-indigo-200 focus:border-indigo-500 focus:outline-none text-indigo-700 placeholder-indigo-300 transition-colors bg-indigo-50/50"
            value={teamName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setTeamName(e.target.value);
              setError("");
            }}
            maxLength={15}
            disabled={busy}
          />
        </div>

        {/* Kode kelas dari guru */}
        <div className="mb-8">
          <label className="block text-indigo-900 font-bold text-sm mb-2 ml-2">
            Kode Kelas dari Guru <span className="font-medium text-indigo-400">(opsional)</span>
          </label>
          <input
            type="text"
            placeholder="Contoh: SIAGA6A"
            className="w-full text-lg font-black tracking-[0.18em] p-3.5 rounded-2xl border-4 border-indigo-100 focus:border-indigo-400 focus:outline-none text-indigo-700 placeholder-indigo-200 transition-colors bg-white uppercase"
            value={classCode}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setClassCode(e.target.value.toUpperCase().replace(/\s+/g, ''));
              setError("");
            }}
            maxLength={20}
            disabled={busy}
          />
          <p className="mt-1.5 ml-2 text-xs font-medium text-indigo-400">
            Minta kode kelas kepada gurumu agar skor masuk ke papan peringkat kelas.
          </p>
        </div>

        {/* Pilih Avatar */}
        <div className="mb-8">
          <label className="block text-indigo-900 font-bold text-lg mb-4 ml-2">Pilih Maskot Tim:</label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {AVATARS.map((avatar) => (
              <MotionDiv
                key={avatar.id}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  if (busy) return;
                  setSelectedAvatar(avatar);
                  setError("");
                  playSound('click');
                }}
                className={`cursor-pointer rounded-2xl p-2 border-4 flex flex-col items-center justify-center aspect-square transition-all ${selectedAvatar?.id === avatar.id ? AVATAR_STYLE_CLASSES[avatar.color as keyof typeof AVATAR_STYLE_CLASSES] : 'border-gray-100 bg-gray-50 hover:bg-gray-100'}`}
              >
                <div className="text-3xl">{avatar.icon}</div>
              </MotionDiv>
            ))}
          </div>
        </div>

        {error && (
          <MotionDiv
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-red-100 text-red-600 p-3 rounded-xl font-bold text-center mb-6 animate-pulse border border-red-200 answer-shake"
          >
            ⚠️ {error}
          </MotionDiv>
        )}

        <Button
          size="lg"
          fullWidth
          onClick={handleSubmit}
          className="text-xl py-4 shadow-xl glow-pulse"
          playSound={() => { }}
        >
          {busy ? 'MENDAFTARKAN...' : 'DAFTARKAN TIM'}
        </Button>
      </div>
    </div>
  );
};

// 1. Level Selection Card
const LevelCard = ({ level, onClick, completed, playSound }: { level: LevelConfig, onClick: () => void, completed?: boolean, playSound?: () => void }) => {
  const Icon = level.id === 'EARTHQUAKE' ? AlertTriangle : level.id === 'FLOOD' ? CloudRain : level.id === 'LANDSLIDE' ? Mountain : Flame;

  const colorClasses = LEVEL_COLOR_CLASSES[level.color as keyof typeof LEVEL_COLOR_CLASSES];

  return (
    <MotionDiv
      whileHover={!completed ? { y: -8, scale: 1.02 } : {}}
      whileTap={!completed ? { scale: 0.98 } : {}}
      className={`relative overflow-hidden rounded-3xl p-6 border-b-8 cursor-pointer transition-all card-glow ${completed ? 'bg-gray-100 border-gray-300 opacity-70' : `bg-white ${colorClasses.border} hover:${colorClasses.borderDark} shadow-xl`}`}
      onClick={!completed ? () => { if (playSound) playSound(); onClick(); } : undefined}
    >
      <div className={`absolute -top-6 -right-6 p-4 opacity-10 ${colorClasses.bg} rotate-12`}>
        <Icon size={160} />
      </div>
      <div className="relative z-10">
        <MotionDiv
          animate={{ rotate: [0, -5, 5, -5, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          className={`inline-flex p-4 rounded-2xl ${colorClasses.bgLight} ${colorClasses.text} mb-4 shadow-inner`}
        >
          <Icon size={32} />
        </MotionDiv>
        <h3 className="text-2xl font-display font-bold text-gray-800 mb-1">{level.title}</h3>
        <p className="text-gray-600 mb-6 mt-3 text-sm leading-relaxed">{level.description}</p>

        {completed ? (
          <div className="flex items-center text-emerald-600 font-bold bg-emerald-100 py-2 px-4 rounded-xl w-max">
            ✅ Selesai
          </div>
        ) : (
          <Button variant="primary" className={`${colorClasses.bg} ${colorClasses.shadow} w-full`}>
            Mulai Misi
          </Button>
        )}
      </div>
    </MotionDiv>
  );
};


// 5. Result & Leaderboard with Team Name & Rewards
const VictoryScreen = ({
  totalScore,
  onRestart,
  avatar,
  teamName,
  classCode,
  playSound,
}: {
  totalScore: number;
  onRestart: () => void;
  avatar: Avatar | null;
  teamName: string;
  classCode: string;
  playSound: (type: string) => void;
}) => {
  // Reward logic
  const isGold = totalScore >= 280;
  const isSilver = !isGold && totalScore >= 200;

  const rewardTitle = isGold ? "MEDALI EMAS" : isSilver ? "MEDALI PERAK" : "MEDALI PERUNGGU";
  const rewardColor = isGold ? "text-yellow-500" : isSilver ? "text-gray-400" : "text-orange-500";
  const rewardBg = isGold ? "bg-yellow-100" : isSilver ? "bg-gray-100" : "bg-orange-100";
  const medalIcon = <Medal size={48} className={`${rewardColor} medal-glow`} />;

  // Papan peringkat dari server lokal; bila offline, tampilkan tim ini saja.
  const [remoteTeams, setRemoteTeams] = useState<LeaderboardTeam[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [leaderboardOffline, setLeaderboardOffline] = useState(false);

  useEffect(() => {
    let alive = true;
    setLeaderboardLoading(true);
    getLeaderboard(classCode || undefined)
      .then((data) => {
        if (!alive) return;
        setRemoteTeams(data.teams);
        setLeaderboardOffline(false);
      })
      .catch(() => {
        if (!alive) return;
        setRemoteTeams([]);
        setLeaderboardOffline(true);
      })
      .finally(() => {
        if (alive) setLeaderboardLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [classCode]);

  const finalLeaderboard = useMemo(() => {
    if (remoteTeams.length > 0) {
      return remoteTeams.map((entry) => ({
        id: entry.id,
        name: entry.name,
        score: entry.totalScore,
        missionsDone: entry.missionsDone,
        isLocal: false,
      }));
    }
    return [
      {
        id: -1,
        name: teamName,
        score: totalScore,
        missionsDone: 4,
        isLocal: true,
      },
    ];
  }, [remoteTeams, teamName, totalScore]);

  const myRank =
    finalLeaderboard.findIndex((entry) => entry.name === teamName && !entry.isLocal) + 1 ||
    finalLeaderboard.findIndex((entry) => entry.name === teamName) + 1;

  // Play victory sound on mount
  useEffect(() => {
    playSound('victory');
  }, [playSound]);

  return (
    <div className="max-w-4xl mx-auto relative z-10">
      {isGold && <Confetti />}

      <div className="grid md:grid-cols-2 gap-8 items-start">
        {/* Certificate Card */}
        <MotionDiv
          initial={{ scale: 0.8, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", bounce: 0.5 }}
          className="bg-white rounded-[2rem] p-8 shadow-2xl border-8 border-double border-indigo-100 text-center relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-indigo-50 to-white -z-0"></div>

          <div className="relative z-10">
            <div className="flex justify-center mb-4">
              {avatar && (
                <MotionDiv
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
                  className={`w-20 h-20 rounded-full bg-gradient-to-br ${avatar.bgGradient} flex items-center justify-center text-4xl shadow-xl border-4 border-white`}
                >
                  {avatar.icon}
                </MotionDiv>
              )}
            </div>

            <h2 className="text-xl font-bold text-gray-400 mb-1 tracking-widest uppercase">SERTIFIKAT PENGHARGAAN</h2>
            <h1 className="text-3xl font-display font-black text-indigo-900 mb-4">{teamName}</h1>

            <MotionDiv
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", bounce: 0.5, delay: 0.5 }}
              className={`rounded-3xl p-6 mb-6 ${rewardBg} border-2 border-dashed border-white shadow-inner`}
            >
              <div className="flex justify-center mb-2 medal-reveal">{medalIcon}</div>
              <div className={`text-2xl font-black ${rewardColor} tracking-tight`}>{rewardTitle}</div>
              <div className="text-gray-500 text-sm font-bold">
                Skor Akhir: <AnimatedScore value={totalScore} />
              </div>
            </MotionDiv>

            <p className="text-gray-500 text-sm mb-6 px-4">
              Atas keberhasilan menyelesaikan simulasi tanggap bencana dengan sangat baik.
            </p>

            <Button onClick={onRestart} fullWidth variant="primary" size="lg" playSound={() => playSound('click')}>Misi Baru</Button>
          </div>
        </MotionDiv>

        {/* Leaderboard */}
        <div className="bg-white/90 backdrop-blur-sm rounded-[2rem] p-6 sm:p-8 shadow-xl border border-white/50">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-2">
            <h3 className="text-xl font-bold text-gray-700 text-left flex items-center gap-2">
              <Trophy size={20} className="text-yellow-500" /> Papan Peringkat
            </h3>
            {classCode && (
              <span className="rounded-lg bg-indigo-50 px-2.5 py-1 font-mono text-[10px] font-black tracking-wider text-indigo-600">
                KELAS {classCode}
              </span>
            )}
          </div>

          {leaderboardLoading ? (
            <div className="flex items-center justify-center py-10 text-sm font-bold text-gray-400">
              <RefreshCw size={18} className="mr-2 animate-spin" /> Memuat papan peringkat...
            </div>
          ) : (
            <div className="space-y-3">
              {finalLeaderboard.map((entry, idx) => (
                <MotionDiv
                  key={`${entry.id}-${idx}`}
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: idx * 0.08 }}
                  className={`flex items-center justify-between gap-3 p-3.5 rounded-2xl border-2 transition-transform hover:scale-[1.02] ${entry.name === teamName ? 'bg-indigo-100 border-indigo-400 shadow-lg' : 'bg-white border-transparent hover:border-gray-200'}`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full font-black text-sm ${idx === 0 ? 'bg-yellow-400 text-yellow-900' : idx === 1 ? 'bg-gray-300 text-gray-800' : idx === 2 ? 'bg-orange-300 text-orange-900' : 'bg-gray-100 text-gray-400'}`}>
                      {idx + 1}
                    </div>
                    <div className="min-w-0 text-left">
                      <div className={`truncate font-bold ${entry.name === teamName ? 'text-indigo-800' : 'text-gray-700'}`}>
                        {entry.name} {entry.name === teamName && '(Kalian)'}
                      </div>
                      <div className="text-[10px] font-bold uppercase text-gray-400">
                        {entry.missionsDone}/4 misi selesai
                        {idx === 0 && <span className="ml-2 text-yellow-600">Juara Bertahan</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 rounded-lg border border-gray-100 bg-white/60 px-3 py-1 font-mono font-black text-gray-600">
                    {entry.score}
                  </div>
                </MotionDiv>
              ))}
            </div>
          )}

          {leaderboardOffline && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-center text-xs font-bold text-amber-700">
              Server lokal tidak aktif. Skor tim ini tetap ditampilkan, tetapi papan peringkat
              kelas belum tersedia.
            </div>
          )}

          {myRank === 1 && !leaderboardOffline && !leaderboardLoading && (
            <MotionDiv
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.5 }}
              className="mt-5 bg-yellow-100 text-yellow-800 p-4 rounded-xl text-center text-sm font-bold border border-yellow-200 animate-pulse"
            >
              🏆 LUAR BIASA! Kalian memimpin papan peringkat kelas!
            </MotionDiv>
          )}
        </div>
      </div>
    </div>
  );
};

// Main App Component
const App: React.FC = () => {
  const [phase, setPhase] = useState<GamePhase>('MENU');
  const [currentLevelId, setCurrentLevelId] = useState<DisasterType | null>(null);
  const [phaseScores, setPhaseScores] = useState<number[]>([]);
  // Bumping this remounts the current 3D mission for a clean replay.
  const [actionReplayKey, setActionReplayKey] = useState(0);
  const [completedLevelScores, setCompletedLevelScores] = useState<Partial<Record<DisasterType, number>>>({});
  // Ringkasan misi untuk layar perayaan setelah kuis terakhir.
  const [missionSummary, setMissionSummary] = useState<{
    levelId: DisasterType;
    actionScore: number;
    recoveryScore: number;
    bestScore: number;
    previousBest: number;
    quizCorrect: number;
    quizTotal: number;
    healthRemaining?: number;
    itemsSaved?: number;
    totalItems?: number;
    survived?: boolean;
    totalTeamScore: number;
    allMissionsDone: boolean;
  } | null>(null);
  // Zona yang papan informasinya sudah dibaca (tanpa localStorage, cukup sesi ini).
  const [readZoneIds, setReadZoneIds] = useState<DisasterType[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);
  const [teamName, setTeamName] = useState<string>('');
  const [teamClassCode, setTeamClassCode] = useState<string>('');
  const [offlineMode, setOfflineMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      return window.localStorage.getItem('agent-siaga-sound') !== 'off';
    } catch {
      return true;
    }
  });
  const bgmStarted = useRef(false);
  // Dialog konfirmasi keluar di layar misi (ACTION / RECOVERY).
  const [showExitDialog, setShowExitDialog] = useState(false);
  // Detail aksi terakhir, dipakai saat menyimpan hasil setelah kuis.
  const actionResultRef = useRef<{ score: number; detail: Record<string, unknown> } | null>(null);
  // Waktu mulai misi dipakai untuk mencatat durasi pengerjaan di database.
  const missionStartRef = useRef<number>(Date.now());

  // --- AI Narrator (Kapten Siaga) state ---
  const [showNarrator, setShowNarrator] = useState(false);
  const [narratorData, setNarratorData] = useState<PerformanceData | null>(null);
  const [pendingNextPhase, setPendingNextPhase] = useState<GamePhase | null>(null);
  // Track detailed performance for ACTION phase
  // Ref dipakai (bukan state) karena onComplete memperbarui nilai ini lalu
  // langsung memanggil handlePhaseComplete dalam event yang sama.
  const actionPerformanceRef = useRef<{
    healthRemaining?: number;
    itemsSaved?: number;
    totalItems?: number;
    survived?: boolean;
  }>({});
  const recordActionPerformance = useCallback(
    (performance: {
      healthRemaining?: number;
      itemsSaved?: number;
      totalItems?: number;
      survived?: boolean;
    }) => {
      actionPerformanceRef.current = performance;
    },
    []
  );
  const resetActionPerformance = useCallback(() => {
    actionPerformanceRef.current = {};
  }, []);
  // Side Narrator State
  const [sideNarrator, setSideNarrator] = useState<{
    message: string;
    isTyping: boolean;
    status: 'idle' | 'warning' | 'success' | 'error';
    visible: boolean;
  }>({
    message: '',
    isTyping: false,
    status: 'idle',
    visible: false,
  });

  const updateSideNarrator = useCallback((message: string, isTyping = false, status: 'idle' | 'warning' | 'success' | 'error' = 'idle') => {
    setSideNarrator({ message, isTyping, status, visible: true });
  }, []);

  const { play, toggleSound, isEnabled, startBGM, stopBGM } = useSoundEffects(soundEnabled);

  const completedScore = Object.entries(completedLevelScores)
    .filter(([id]) => id !== currentLevelId)
    .reduce((acc, [_, score]) => acc + (score || 0), 0);
  const totalScore = completedScore + phaseScores.reduce((a, b) => a + b, 0);

  const playSound = useCallback((type: string) => {
    // Guard di level aplikasi memastikan seluruh sumber suara ikut mute,
    // termasuk event yang terjadi sebelum render ulang state toggle selesai.
    if (!soundEnabled) return;
    play(type as any);
  }, [play, soundEnabled]);

  const handleToggleSound = useCallback(() => {
    const newState = toggleSound();
    setSoundEnabled(newState);
    try {
      window.localStorage.setItem('agent-siaga-sound', newState ? 'on' : 'off');
    } catch {
      // Suara tetap berfungsi meski penyimpanan lokal tidak tersedia.
    }
  }, [toggleSound]);

  useEffect(() => {
    if (phase !== 'MENU' && !bgmStarted.current && soundEnabled) {
      startBGM();
      bgmStarted.current = true;
    }
  }, [phase, startBGM, soundEnabled]);

  // Mulai misi langsung dari zona dunia 3D (panel zona sudah menampilkan
  // judul & deskripsi misi, jadi tidak perlu layar briefing terpisah).
  const startWorldMission = (levelId: DisasterType) => {
    missionStartRef.current = Date.now();
    setCurrentLevelId(levelId);
    setPhaseScores([]);
    setMissionSummary(null);
    resetActionPerformance();
    actionResultRef.current = null;
    setActionReplayKey(k => k + 1);
    setShowNarrator(false);
    setNarratorData(null);
    setPendingNextPhase(null);
    setSideNarrator(prev => ({ ...prev, visible: false }));
    setPhase('ACTION');
    playSound('levelStart');
  };

  const markZoneRead = useCallback((zoneId: DisasterType) => {
    setReadZoneIds((prev) => (prev.includes(zoneId) ? prev : [...prev, zoneId]));
  }, []);

  const handleTeamRegister = (name: string, avatar: Avatar, classCode: string, offline: boolean) => {
    setTeamName(name);
    setSelectedAvatar(avatar);
    setTeamClassCode(classCode);
    setOfflineMode(offline);
    setPhase('GUIDE');
    setSideNarrator(prev => ({ ...prev, visible: false }));
  };

  // Replay the current ACTION game. Called from a mission's result screen before
  // any score is recorded, so we just remount it fresh via a new key.
  const handleReplayAction = () => {
    playSound('click');
    setActionReplayKey(k => k + 1);
    updateSideNarrator('Ayo coba lagi! Kamu pasti bisa lebih baik.', false, 'warning');
  };

  // Ulangi misi dari layar kuis: kembali ke ACTION dengan skor bersih.
  const handleReplayMission = () => {
    if (!currentLevelId) return;
    missionStartRef.current = Date.now();
    playSound('click');
    setPhaseScores([]);
    setMissionSummary(null);
    resetActionPerformance();
    actionResultRef.current = null;
    setActionReplayKey(k => k + 1);
    setShowNarrator(false);
    setNarratorData(null);
    setPendingNextPhase(null);
    setPhase('ACTION');
  };

  const handlePhaseComplete = (score: number, quizStats?: { correct: number; total: number }) => {
    const newScores = [...phaseScores, score];
    setPhaseScores(newScores);

    const level = currentLevelId ? LEVELS[currentLevelId] : LEVELS.EARTHQUAKE;

    if (phase === 'ACTION') {
      // Kuis langsung terbuka begitu misi 3D selesai. Tidak ada overlay
      // narrator yang menghalangi akses ke soal.
      setShowNarrator(false);
      setNarratorData(null);
      setPendingNextPhase(null);
      updateSideNarrator('Misi selesai! Sekarang uji pemahamanmu di kuis pemulihan.', false, 'success');
      setPhase('RECOVERY');
    } else if (phase === 'RECOVERY') {
      const quizTotal = quizStats?.total ?? level.quizQuestions.length;
      const quizCorrect =
        quizStats?.correct ?? Math.round((score / 100) * quizTotal);
      const actionScore = actionResultRef.current?.score ?? newScores[0] ?? 0;
      const currentLevelScore = actionScore + score;
      const previousBest = currentLevelId ? completedLevelScores[currentLevelId] ?? 0 : 0;
      // Replay tidak boleh menurunkan skor terbaik yang tampil di Dashboard Guru.
      const bestLevelScore = Math.max(previousBest, currentLevelScore);

      const newCompletedLevelScores = {
        ...completedLevelScores,
        ...(currentLevelId ? { [currentLevelId]: bestLevelScore } : {}),
      };
      setCompletedLevelScores(newCompletedLevelScores);

      // Simpan setiap percobaan ke server lokal. Dashboard Guru memakai
      // MAX(total_score) per misi, jadi skor terbaik tetap terjaga.
      if (currentLevelId) {
        const detail = actionResultRef.current?.detail;
        const durationSeconds = Math.max(
          0,
          Math.round((Date.now() - missionStartRef.current) / 1000)
        );
        void saveResult(currentLevelId, actionScore, score, detail, durationSeconds).catch(() => {
          // Mode offline: skor tetap tampil di layar, papan peringkat memakai fallback.
        });
      }

      const totalTeamScore = Object.values(newCompletedLevelScores).reduce(
        (total, value) => total + (value || 0),
        0
      );
      const allMissionsDone =
        Object.keys(newCompletedLevelScores).length >= Object.keys(LEVELS).length;

      // Langsung tampilkan layar perayaan setelah "Selesaikan Misi" diklik.
      setShowNarrator(false);
      setNarratorData(null);
      setPendingNextPhase(null);
      setSideNarrator((prev) => ({ ...prev, visible: false }));
      setMissionSummary({
        levelId: currentLevelId || 'EARTHQUAKE',
        actionScore,
        recoveryScore: score,
        bestScore: bestLevelScore,
        previousBest,
        quizCorrect,
        quizTotal,
        healthRemaining: actionPerformanceRef.current.healthRemaining,
        itemsSaved: actionPerformanceRef.current.itemsSaved,
        totalItems: actionPerformanceRef.current.totalItems,
        survived: actionPerformanceRef.current.survived,
        totalTeamScore,
        allMissionsDone,
      });
      setPhase('MISSION_COMPLETE');
    }
  };

  // Called when narrator is dismissed
  const handleNarratorContinue = () => {
    setShowNarrator(false);
    setNarratorData(null);
    if (pendingNextPhase) {
      setPhase(pendingNextPhase);
      setPendingNextPhase(null);

      if (pendingNextPhase === 'WORLD_3D' || pendingNextPhase === 'VICTORY') {
        // Skor misi sudah tersimpan di completedLevelScores; kosongkan level aktif
        // agar totalScore tidak menghitung dua kali.
        setCurrentLevelId(null);
        setPhaseScores([]);
        resetActionPerformance();
        actionResultRef.current = null;
      }

      // Setup side narrator for the new phase
      if (pendingNextPhase === 'RECOVERY') {
        updateSideNarrator('Mari kita uji pemahamanmu. Pilih jawaban dengan hati-hati!', false, 'idle');
      } else {
        setSideNarrator(prev => ({ ...prev, visible: false }));
      }
    }
  };

  // Main lagi dari layar perayaan: mulai ACTION baru dengan skor bersih,
  // tetapi skor terbaik sebelumnya tetap tersimpan.
  const handleCelebrationReplay = () => {
    if (!currentLevelId) return;
    missionStartRef.current = Date.now();
    playSound('click');
    setMissionSummary(null);
    setPhaseScores([]);
    resetActionPerformance();
    actionResultRef.current = null;
    setActionReplayKey((key) => key + 1);
    setSideNarrator((prev) => ({ ...prev, visible: false }));
    setPhase('ACTION');
  };

  // Pilih misi lain dari layar perayaan: kembali ke peta dunia 3D.
  const handleCelebrationChooseMission = () => {
    playSound('click');
    setMissionSummary(null);
    setCurrentLevelId(null);
    setPhaseScores([]);
    resetActionPerformance();
    actionResultRef.current = null;
    setSideNarrator((prev) => ({ ...prev, visible: false }));
    setPhase('WORLD_3D');
  };

  const handleCelebrationAwards = () => {
    playSound('click');
    setMissionSummary(null);
    setCurrentLevelId(null);
    setPhaseScores([]);
    resetActionPerformance();
    actionResultRef.current = null;
    setSideNarrator((prev) => ({ ...prev, visible: false }));
    setPhase('VICTORY');
  };

  const resetGame = () => {
    // Hentikan musik latar (dan hentikan penjadwalan nada berikutnya) sebelum
    // kembali ke menu supaya tidak ada suara yang "nyangkut".
    stopBGM();
    bgmStarted.current = false;
    setShowExitDialog(false);
    setPhase('MENU');
    setCurrentLevelId(null);
    setPhaseScores([]);
    setMissionSummary(null);
    setCompletedLevelScores({});
    setReadZoneIds([]);
    setSelectedAvatar(null);
    setTeamName('');
    setTeamClassCode('');
    setOfflineMode(false);
    setSideNarrator(prev => ({ ...prev, visible: false }));
    setShowNarrator(false);
    setNarratorData(null);
    setPendingNextPhase(null);
    resetActionPerformance();
    actionResultRef.current = null;
  };

  // Keluar dari misi menuju dunia 3D tanpa menghapus progres zona.
  // completedLevelScores sengaja TIDAK direset.
  const exitLevelToWorld = () => {
    setShowExitDialog(false);
    setShowNarrator(false);
    setNarratorData(null);
    setPendingNextPhase(null);
    setCurrentLevelId(null);
    setPhaseScores([]);
    setMissionSummary(null);
    resetActionPerformance();
    actionResultRef.current = null;
    setSideNarrator(prev => ({ ...prev, visible: false }));
    setPhase('WORLD_3D');
  };

  // Mulai petualangan baru dari layar kemenangan.
  const startNewAdventure = () => {
    playSound('click');
    setCompletedLevelScores({});
    setCurrentLevelId(null);
    setPhaseScores([]);
    setMissionSummary(null);
    setReadZoneIds([]);
    resetActionPerformance();
    actionResultRef.current = null;
    setSideNarrator(prev => ({ ...prev, visible: false }));
    setShowNarrator(false);
    setNarratorData(null);
    setPendingNextPhase(null);
    setPhase('WORLD_3D');
  };

  // Pastikan dialog tidak "menempel" saat fase berganti (mis. narrator selesai).
  useEffect(() => {
    setShowExitDialog(false);
  }, [phase]);

  const isLevelMissionPhase =
    phase === 'ACTION' || phase === 'RECOVERY';

  const currentLevel = currentLevelId ? LEVELS[currentLevelId] : LEVELS.EARTHQUAKE;

  // Background style based on phase/level
  const getBgClass = () => {
    if (phase === 'MENU' || phase === 'TEAM_SETUP') return 'bg-gradient-to-br from-indigo-600 to-purple-700';
    if (phase === 'VICTORY') return 'bg-gradient-to-br from-indigo-700 via-purple-700 to-indigo-950';
    if (phase === 'ACTION' || phase === 'RECOVERY') return 'bg-slate-950';
    if (!currentLevelId) return 'bg-slate-50';
    if (currentLevelId === 'EARTHQUAKE') return 'bg-amber-50/50';
    if (currentLevelId === 'FLOOD') return 'bg-blue-50/50';
    if (currentLevelId === 'LANDSLIDE') return 'bg-stone-100/60';
    return 'bg-gray-50';
  };

  // Particle colors based on phase
  const getParticleColors = () => {
    if (phase === 'MENU' || phase === 'TEAM_SETUP') return ['rgba(255,255,255,0.3)', 'rgba(199,210,254,0.4)', 'rgba(167,139,250,0.3)'];
    return undefined;
  };

  useEffect(() => {
    if (phase === 'ACTION') {
      updateSideNarrator(
        currentLevelId === 'EARTHQUAKE' ? "Ingat urutannya: Merunduk, cari tempat Berlindung, lalu Bertahan sampai gempa reda!" :
          currentLevelId === 'FLOOD' ? "Banjir datang! Pertama isi tas siaga, lalu lari ke tempat aman." :
            currentLevelId === 'LANDSLIDE' ? "Tanah longsor! Tanah yang kamu injak akan retak lalu runtuh — terus lari ke bukit aman, jangan berhenti!" :
              "Amati gunung berapi. Temukan dan klik tanda-tanda gunung mau erupsi!",
        false,
        'warning'
      );
    }
  }, [phase, currentLevelId, updateSideNarrator]);

  // Panduan singkat tampil segera setelah tim selesai mendaftar.
  if (phase === 'GUIDE') {
    return (
      <GuideCarousel
        teamName={teamName}
        avatar={selectedAvatar}
        offline={offlineMode}
        onFinish={() => {
          playSound('click');
          setPhase('WORLD_3D');
        }}
        playSound={playSound}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
      />
    );
  }

  // Dunia 3D tampil penuh layar (tanpa header/footer HTML).
  if (phase === 'WORLD_3D') {
    return (
      <WorldLoadBoundary>
        <React.Suspense
          fallback={<WorldLoadingScreen message="Menyiapkan dunia 3D..." />}
        >
          <World3D
            teamName={teamName}
            avatar={selectedAvatar}
            score={totalScore}
            completedZones={Object.keys(completedLevelScores) as DisasterType[]}
            readZones={readZoneIds}
            onMarkZoneRead={markZoneRead}
            soundEnabled={soundEnabled}
            onToggleSound={handleToggleSound}
            onStartMission={startWorldMission}
            onExit={resetGame}
            playSound={playSound}
          />
        </React.Suspense>
      </WorldLoadBoundary>
    );
  }

  // Layar misi 3D selalu memenuhi seluruh viewport. Header HTML biasa tidak
  // dipakai supaya kanvas dan HUD punya ruang penuh (w-full h-screen).
  if (isLevelMissionPhase) {
    return (
      <div className="fixed inset-0 z-40 flex h-screen w-full flex-col overflow-hidden bg-slate-950 font-sans">
        <div className="relative flex min-h-0 w-full flex-1 flex-col">
          <AnimatePresence mode="wait">
            {phase === 'ACTION' && currentLevelId && (
              <MotionDiv
                key="action"
                initial={{ scale: 0.98, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.01, opacity: 0 }}
                className="flex h-full w-full flex-col"
              >
                {currentLevelId === 'EARTHQUAKE' ? (
                  <EarthquakeMission3D
                    key={`earthquake-${actionReplayKey}`}
                    avatar={selectedAvatar}
                    teamName={teamName}
                    playSound={playSound}
                    updateSideNarrator={updateSideNarrator}
                    onReplay={handleReplayAction}
                    onComplete={(score, detail) => {
                      actionResultRef.current = { score, detail: { ...detail } };
                      recordActionPerformance({
                        healthRemaining: detail.healthRemaining ?? score,
                        survived: detail.survived ?? (score > 0),
                      });
                      handlePhaseComplete(score);
                    }}
                  />
                ) : currentLevelId === 'FLOOD' ? (
                  <FloodMission3D
                    key={`flood-${actionReplayKey}`}
                    avatar={selectedAvatar}
                    teamName={teamName}
                    playSound={playSound}
                    updateSideNarrator={updateSideNarrator}
                    onReplay={handleReplayAction}
                    onComplete={(score, detail) => {
                      actionResultRef.current = { score, detail: { ...detail } };
                      recordActionPerformance({
                        itemsSaved: detail.usefulPicked,
                        totalItems: detail.usefulTotal,
                        survived: detail.survived,
                        healthRemaining: Math.round((detail.livesRemaining / 3) * 100),
                      });
                      handlePhaseComplete(score);
                    }}
                  />
                ) : currentLevelId === 'LANDSLIDE' ? (
                  <LandslideMission3D
                    key={`landslide-${actionReplayKey}`}
                    avatar={selectedAvatar}
                    teamName={teamName}
                    playSound={playSound}
                    updateSideNarrator={updateSideNarrator}
                    onReplay={handleReplayAction}
                    onComplete={(score, detail) => {
                      actionResultRef.current = { score, detail: { ...detail } };
                      recordActionPerformance({
                        healthRemaining: Math.round((detail.heartsRemaining / 3) * 100),
                        survived: detail.survived,
                      });
                      handlePhaseComplete(score);
                    }}
                  />
                ) : (
                  <VolcanoMission3D
                    key={`volcano-${actionReplayKey}`}
                    avatar={selectedAvatar}
                    teamName={teamName}
                    playSound={playSound}
                    updateSideNarrator={updateSideNarrator}
                    onReplay={handleReplayAction}
                    onComplete={(score, detail) => {
                      actionResultRef.current = { score, detail: { ...detail } };
                      recordActionPerformance({
                        healthRemaining: detail.healthRemaining ?? score,
                        survived: detail.survived ?? (score > 0),
                      });
                      handlePhaseComplete(score);
                    }}
                  />
                )}
              </MotionDiv>
            )}

            {phase === 'RECOVERY' && (
              <MotionDiv
                key="recovery"
                initial={{ x: 60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -60, opacity: 0 }}
                className="flex h-full w-full flex-col"
              >
                <Recovery3D
                  level={currentLevel}
                  teamName={teamName}
                  avatar={selectedAvatar}
                  playSound={playSound}
                  updateNarrator={updateSideNarrator}
                  onReplay={handleReplayMission}
                  onComplete={(score, correct, total) => {
                    handlePhaseComplete(score, { correct, total });
                  }}
                />
              </MotionDiv>
            )}
          </AnimatePresence>
        </div>

        {/* Tombol keluar mengambang; HUD sudah diberi ruang di kanan atas. */}
        <button
          onClick={() => {
            playSound('click');
            setShowExitDialog(true);
          }}
          className="absolute right-2 top-2 z-50 flex h-10 w-10 items-center justify-center rounded-xl border-2 border-white/70 bg-white/90 text-slate-500 shadow-lg backdrop-blur-sm transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500 active:scale-95"
          aria-label="Keluar dari misi"
          title="Keluar dari misi"
        >
          <X size={19} />
        </button>

        <SideNarrator {...sideNarrator} variant="mission" />

        <ExitConfirmDialog
          open={showExitDialog}
          onClose={() => setShowExitDialog(false)}
          onConfirm={resetGame}
          onExitToWorld={exitLevelToWorld}
          onRequestOpen={() => setShowExitDialog(true)}
          playSound={playSound}
          description="Zona misi yang sudah selesai tetap tersimpan di dunia 3D. Tapi kalau memilih Keluar ke Menu, semua progres tim akan dihapus."
        />
      </div>
    );
  }

  // Layar perayaan misi (setelah tombol "Selesaikan Misi" di kuis).
  if (phase === 'MISSION_COMPLETE') {
    if (!missionSummary) return null;
    const summaryLevel = LEVELS[missionSummary.levelId];
    return (
      <MissionCelebration
        teamName={teamName}
        avatar={selectedAvatar}
        level={summaryLevel}
        actionScore={missionSummary.actionScore}
        recoveryScore={missionSummary.recoveryScore}
        quizCorrect={missionSummary.quizCorrect}
        quizTotal={missionSummary.quizTotal}
        healthRemaining={missionSummary.healthRemaining}
        itemsSaved={missionSummary.itemsSaved}
        totalItems={missionSummary.totalItems}
        survived={missionSummary.survived}
        bestScore={missionSummary.bestScore}
        previousBest={missionSummary.previousBest}
        totalTeamScore={missionSummary.totalTeamScore}
        allMissionsDone={missionSummary.allMissionsDone}
        onReplay={handleCelebrationReplay}
        onChooseMission={handleCelebrationChooseMission}
        onViewAwards={missionSummary.allMissionsDone ? handleCelebrationAwards : undefined}
        playSound={playSound}
      />
    );
  }

  return (
    <div className={`relative min-h-screen transition-colors duration-500 ${getBgClass()} font-sans selection:bg-indigo-200 overflow-x-hidden`}>
      {/* Latar pulau 3D untuk menu, registrasi, dan layar kemenangan */}
      {(phase === 'MENU' || phase === 'TEAM_SETUP') && (
        <SceneBackdrop3D variant="menu" accent="#a5b4fc" />
      )}
      {phase === 'VICTORY' && (
        <SceneBackdrop3D variant="victory" accent="#facc15" />
      )}

      {/* Background particles for menu */}
      {(phase === 'MENU' || phase === 'TEAM_SETUP') && (
        <FloatingParticles colors={getParticleColors()} />
      )}

      {/* Subtle grid background for gameplay */}
      {phase !== 'MENU' && phase !== 'TEAM_SETUP' && phase !== 'VICTORY' && (
        <div className="fixed inset-0 bg-grid pointer-events-none opacity-50" />
      )}

      <div className="container mx-auto px-3 py-4 sm:px-4 sm:py-6 min-h-screen flex flex-col relative z-10">

        {/* Header */}
        {phase !== 'MENU' && phase !== 'TEAM_SETUP' && (
          <header className="flex items-center justify-between mb-4 sm:mb-8 sticky top-0 z-40 bg-white/90 backdrop-blur-md p-2 rounded-2xl shadow-sm border border-white/50">
            {/* Team ID Card */}
            <div
              className="flex items-center gap-3 cursor-pointer hover:opacity-70 transition-opacity bg-indigo-50 p-2 pr-4 sm:pr-6 rounded-xl border border-indigo-100"
              onClick={() => {
                playSound('click');
                if (isLevelMissionPhase) {
                  setShowExitDialog(true);
                } else {
                  setPhase('WORLD_3D');
                  setSideNarrator(prev => ({ ...prev, visible: false }));
                  setShowNarrator(false);
                }
              }}
            >
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${selectedAvatar?.bgGradient || 'from-gray-400 to-gray-600'} flex items-center justify-center text-xl shadow-sm`}>
                {selectedAvatar?.icon || <Users className="text-white" size={20} />}
              </div>
              <div className="leading-tight">
                <h1 className="font-display font-bold text-indigo-900 text-sm max-w-[100px] sm:max-w-[160px] truncate">{teamName || 'Tim Agent'}</h1>
                <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">
                  {offlineMode ? 'Mode Offline' : teamClassCode ? `Kelas ${teamClassCode}` : 'Unit Penyelamat'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isLevelMissionPhase && (
                <div className="hidden sm:flex items-center gap-4 px-4">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Status Misi</span>
                    <span className="font-bold text-indigo-600 text-sm">{phase === 'ACTION' ? 'Evakuasi' : 'Pemulihan'}</span>
                  </div>
                  <div className="h-2 w-24 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-indigo-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${phase === 'ACTION' ? 50 : 100}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              )}

              {phase === 'VICTORY' && (
                <button
                  onClick={() => { playSound('click'); setPhase('WORLD_3D'); }}
                  className="hidden sm:flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-500 hover:bg-slate-50"
                >
                  <MapPin size={14} /> Dunia 3D
                </button>
              )}

              {isLevelMissionPhase && (
                <button
                  onClick={() => {
                    playSound('click');
                    setShowExitDialog(true);
                  }}
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border-2 border-slate-200 bg-white text-slate-400 shadow-sm transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500 active:scale-95"
                  aria-label="Keluar dari misi"
                  title="Keluar dari misi"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          </header>
        )}

        {/* Content Area */}
        <main className="flex-grow flex flex-col justify-center">
          <AnimatePresence mode="wait">

            {/* 1. Main Menu */}
            {phase === 'MENU' && (
              <MotionDiv
                key="menu"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center text-white relative z-10"
              >
                <div className="mb-10 sm:mb-12 relative inline-block">
                  <MotionDiv
                    animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                    className="absolute -top-16 -right-12 text-8xl filter drop-shadow-2xl"
                  >
                    🌏
                  </MotionDiv>
                  <MotionDiv
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <h1 className="text-6xl md:text-9xl font-display font-black tracking-tighter mb-0 text-shimmer filter drop-shadow-sm leading-none">
                      AGENT<br />SIAGA
                    </h1>
                    <div className="h-2 w-full bg-white/20 rounded-full mt-4 mb-4 mx-auto max-w-[200px]"></div>
                    <p className="text-xl md:text-2xl font-bold text-indigo-100 tracking-[0.2em] uppercase">Misi Penyelamatan Bumi</p>
                  </MotionDiv>
                </div>

                {/* Sound toggle on menu */}
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <SoundToggle isEnabled={soundEnabled} onToggle={handleToggleSound} />
                </div>

                <MotionDiv
                  whileHover={{ scale: 1.02 }}
                  className="max-w-md mx-auto bg-white/10 backdrop-blur-lg p-6 sm:p-8 rounded-[2rem] border border-white/20 shadow-2xl relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600/50 to-purple-600/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative z-10">
                    <p className="mb-8 text-lg font-medium leading-relaxed text-indigo-50">
                      Halo Tim Penyelamat! Warga membutuhkan keahlian kelompok kalian. Siap berlomba dalam kebaikan?
                    </p>
                    <Button
                      size="lg"
                      fullWidth
                      className="!bg-yellow-400 !text-yellow-900 !shadow-yellow-600 hover:!bg-yellow-300 text-xl py-4 glow-pulse"
                      onClick={() => { playSound('click'); setPhase('TEAM_SETUP'); }}
                      playSound={() => playSound('click')}
                    >
                      DAFTARKAN TIM!
                    </Button>
                    <a
                      href="#/guru"
                      onClick={() => {
                        window.location.hash = '#/guru';
                      }}
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-indigo-100 backdrop-blur-sm transition-colors hover:bg-white/20 hover:text-white"
                    >
                      <Shield size={15} /> Mode Guru · Dashboard
                    </a>
                  </div>
                </MotionDiv>
              </MotionDiv>
            )}

            {/* 1.5 Team Registration */}
            {phase === 'TEAM_SETUP' && (
              <MotionDiv
                key="team-setup"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <TeamRegistration onRegister={handleTeamRegister} playSound={playSound} />
              </MotionDiv>
            )}

            {/* 4. Victory */}
            {phase === 'VICTORY' && (
              <MotionDiv
                key="victory"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <VictoryScreen
                  totalScore={totalScore}
                  onRestart={startNewAdventure}
                  avatar={selectedAvatar}
                  teamName={teamName}
                  classCode={teamClassCode}
                  playSound={playSound}
                />
              </MotionDiv>
            )}
          </AnimatePresence>
        </main>

        {/* Side Narrator Component rendered fixed globally */}
        <SideNarrator {...sideNarrator} />

        {isLevelMissionPhase && (
          <ExitConfirmDialog
            open={showExitDialog}
            onClose={() => setShowExitDialog(false)}
            onConfirm={resetGame}
            onExitToWorld={exitLevelToWorld}
            onRequestOpen={() => setShowExitDialog(true)}
            playSound={playSound}
            description="Zona misi yang sudah selesai tetap tersimpan di dunia 3D. Tapi kalau memilih Keluar ke Menu, semua progres tim akan dihapus."
          />
        )}

        <footer className="mt-8 text-center text-slate-400/70 text-xs font-medium py-3">
          Agent Siaga - Tim Adhista
        </footer>
      </div>
    </div>
  );
};

export default App;
