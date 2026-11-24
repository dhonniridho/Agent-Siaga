/// <reference types="react" />
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Shield, Trophy, RefreshCw, ChevronRight, CheckCircle, XCircle, AlertTriangle, Backpack, Heart, Star, CloudRain, Flame, Mountain, ArrowUp, User, Users, Medal, Volume2, VolumeX, X, BookOpen } from 'lucide-react';
import { LEVELS, LEADERBOARD_DATA, FLOOD_BAG_ITEMS, FLOOD_BAG_CAPACITY, FLOOD_BAG_USEFUL_COUNT, FloodBagItem, AVATARS } from './constants';
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

// Dunia 3D diunduh terpisah supaya Mode Klasik dan menu tetap ringan.
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
const TeamRegistration = ({ onRegister, playSound }: { onRegister: (name: string, avatar: Avatar) => void, playSound: (type: string) => void }) => {
  const [teamName, setTeamName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);
  const [error, setError] = useState("");

  const handleSubmit = () => {
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
    playSound('success');
    onRegister(teamName, selectedAvatar);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-display font-bold text-gray-800 mb-2">Registrasi Tim</h2>
        <p className="text-gray-500 text-lg">Buat nama kelompok kalian sekeren mungkin!</p>
      </div>

      <div className="bg-white rounded-[2rem] p-8 shadow-xl border-4 border-indigo-100 max-w-2xl mx-auto">
        {/* Input Nama Tim */}
        <div className="mb-8">
          <label className="block text-indigo-900 font-bold text-lg mb-2 ml-2">Nama Kelompok / Tim:</label>
          {/* @ts-ignore - environment JSX types can be finicky here, provide explicit event typing below */}
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
          />
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

        <Button size="lg" fullWidth onClick={handleSubmit} className="text-xl py-4 shadow-xl glow-pulse" playSound={() => { }}>
          DAFTARKAN TIM
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


// 3A. Action Phase: Earthquake — Corridor Evacuation
// Hold JALAN to walk right; the corridor, tables, and exit scroll left together.
// Tables appear periodically — park at one when a quake warns, then hold SEMBUNYI
// to duck under it while the camera shakes and debris falls. Reach the EXIT that
// arrives at second 30. Health remaining -> star score.
type QuakeDoneDetail = {
  survived: boolean;
  healthRemaining: number;
  stars: number;
  quakesSafe: number;
};

const EarthquakeAction = ({
  onComplete,
  onReplay,
  playSound,
  updateSideNarrator,
}: {
  onComplete: (score: number, detail: QuakeDoneDetail) => void;
  onReplay?: () => void;
  playSound: (type: string) => void;
  updateSideNarrator?: (message: string, isTyping?: boolean, status?: 'idle' | 'warning' | 'success' | 'error') => void;
}) => {
  const SCENE_H = 420;
  const PLAYER_X = 24;           // player's fixed screen position (%)
  const PLAYER_HALF_W = 9;       // % half-width for debris collision
  const HIT_Y = SCENE_H - 130;   // debris impact line (px from top)
  const WORLD_SPEED = 0.03;      // % of scene width per ms (tables + exit)
  const BG_RATE = WORLD_SPEED / 2; // bg track is 200% wide, so translate% moves 2x on screen
  const TABLE_GAP = 165;         // spacing between tables in scroll-% (walk past them freely)
  const ATTABLE_RANGE = 13;      // table within this many % of player = usable
  const TABLE_LEAD_MS = 4000;    // warning shows only this long before a quake starts
  const QUAKE_DURATION = 5000;
  const QUAKE_CALM_GAP = 9000;   // calm walking time between one quake ending and the next warning
  const QUAKES = [
    { start: 6000, end: 6000 + QUAKE_DURATION },
  ];
  QUAKES.push({ start: QUAKES[0].end + QUAKE_CALM_GAP + TABLE_LEAD_MS, end: 0 });
  QUAKES[1].end = QUAKES[1].start + QUAKE_DURATION;
  QUAKES.push({ start: QUAKES[1].end + QUAKE_CALM_GAP + TABLE_LEAD_MS, end: 0 });
  QUAKES[2].end = QUAKES[2].start + QUAKE_DURATION;
  const LAST_QUAKE_END = QUAKES[2].end;
  const EXIT_SPAWN_MS = LAST_QUAKE_END + 9000; // give a calm walk after the last quake before the exit appears
  const EXIT_REACH = 60; // short walk after the exit-hallway cross-fade starts before the level completes

  type Sub = 'READY' | 'PLAY' | 'RESULT';
  const [sub, setSub] = useState<Sub>('READY');
  const [health, setHealth] = useState(100);
  const [walking, setWalking] = useState(false);
  const [hiding, setHiding] = useState(false);
  const [inQuake, setInQuake] = useState(false);
  const [quakeIdx, setQuakeIdx] = useState(0);
  const [safeCount, setSafeCount] = useState(0);
  const [bgScroll, setBgScroll] = useState(0);
  const [runFrame, setRunFrame] = useState<1 | 2>(1);
  const [debris, setDebris] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [tables, setTables] = useState<Array<{ id: number; x: number }>>([]);
  const [exitX, setExitX] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);
  const [warning, setWarning] = useState(false);
  const [result, setResult] = useState<{ total: number; detail: QuakeDoneDetail } | null>(null);

  const subRef = useRef<Sub>('READY');
  const walkRef = useRef(false);
  const hidingRef = useRef(false);
  const healthRef = useRef(100);
  const debrisRef = useRef<Array<{ id: number; x: number; y: number }>>([]);
  const nextDebrisId = useRef(0);
  const spawnAccRef = useRef(0);
  const tablesRef = useRef<Array<{ id: number; x: number }>>([]);
  const nextTableId = useRef(0);
  const tableDistRef = useRef(TABLE_GAP); // trip immediately so a table exists early
  const bgScrollRef = useRef(0);
  const exitXRef = useRef<number | null>(null);
  const startRef = useRef(0);
  const lastTickRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const rumbleRef = useRef<number | null>(null);
  const finishedRef = useRef(false);
  const quakesSafeRef = useRef(0);
  const quakeExposedRef = useRef(false);
  const activeQuakeRef = useRef(-1);

  useEffect(() => { subRef.current = sub; }, [sub]);
  useEffect(() => { hidingRef.current = hiding; }, [hiding]);
  useEffect(() => { walkRef.current = walking; }, [walking]);

  const [assetsLoaded, setAssetsLoaded] = useState(false);

  // Preload + wait for all earthquake assets
  useEffect(() => {
    let loadedCount = 0;
    const assets = [
      '/assets/player-idle.png',
      '/assets/player-run-1.png',
      '/assets/player-run-2.png',
      '/assets/player-panic.png',
      '/assets/player-hide.png',
      '/assets/table.png',
      '/assets/corridor-bg.jpg',
      '/assets/exit-hallway-bg.png',
    ];

    assets.forEach(src => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        loadedCount++;
        if (loadedCount === assets.length) {
          setAssetsLoaded(true);
        }
      };
      img.onerror = () => {
        // Even if one fails, we should eventually let them play or it hangs
        loadedCount++;
        if (loadedCount === assets.length) {
          setAssetsLoaded(true);
        }
      };
    });
  }, []);

  const clearAll = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (rumbleRef.current) clearInterval(rumbleRef.current);
  }, []);
  useEffect(() => () => clearAll(), [clearAll]);

  const finish = useCallback((reached: boolean) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    clearAll();
    const h = Math.max(0, Math.round(healthRef.current));
    const total = h;
    const stars = total >= 85 ? 3 : total >= 60 ? 2 : 1;
    const survived = reached && h > 0;
    const detail: QuakeDoneDetail = { survived, healthRemaining: h, stars, quakesSafe: quakesSafeRef.current };
    setResult({ total, detail });
    setSub('RESULT');
    subRef.current = 'RESULT';
    playSound(survived ? 'success' : 'error');
    if (updateSideNarrator) {
      updateSideNarrator(
        survived
          ? (quakesSafeRef.current === 3
            ? 'Hebat! Kamu selalu sembunyi di bawah meja tepat waktu dan selamat keluar.'
            : 'Kamu berhasil keluar! Ingat, segera sembunyi di bawah meja setiap gempa.')
          : 'Kamu terkena reruntuhan. Lain kali cepat menuju meja dan sembunyi ya!',
        false,
        survived ? 'success' : 'warning'
      );
    }
  }, [clearAll, playSound, updateSideNarrator]);

  const start = () => {
    finishedRef.current = false;
    quakesSafeRef.current = 0;
    activeQuakeRef.current = -1;
    healthRef.current = 100;
    setHealth(100);
    setSafeCount(0);
    bgScrollRef.current = 0;
    setBgScroll(0);
    tablesRef.current = [];
    setTables([]);
    nextTableId.current = 0;
    tableDistRef.current = TABLE_GAP;
    exitXRef.current = null;
    setExitX(null);
    debrisRef.current = [];
    setDebris([]);
    spawnAccRef.current = 0;
    nextDebrisId.current = 0;
    hidingRef.current = false; setHiding(false);
    walkRef.current = false; setWalking(false);
    setInQuake(false);
    setWarning(false);
    setQuakeIdx(0);
    setSub('PLAY');
    subRef.current = 'PLAY';
    startRef.current = performance.now();
    lastTickRef.current = performance.now();
    playSound('levelStart');
    if (updateSideNarrator) updateSideNarrator('Tekan JALAN untuk maju ke kanan menuju pintu keluar. Waspada gempa!', false, 'idle');

    const tick = (now: number) => {
      const dt = Math.min(50, now - lastTickRef.current);
      lastTickRef.current = now;
      if (subRef.current !== 'PLAY') return;
      const elapsed = now - startRef.current;

      // Active quake?
      let active = -1;
      for (let i = 0; i < QUAKES.length; i++) {
        if (elapsed >= QUAKES[i].start && elapsed < QUAKES[i].end) { active = i; break; }
      }
      // Pre-warning window
      let warn = false;
      for (let i = 0; i < QUAKES.length; i++) {
        if (elapsed >= QUAKES[i].start - TABLE_LEAD_MS && elapsed < QUAKES[i].start) { warn = true; break; }
      }
      setWarning(warn);

      // Quake start / end transitions
      if (active !== activeQuakeRef.current) {
        if (active !== -1) {
          quakeExposedRef.current = false;
          playSound('levelStart');
          if (!rumbleRef.current) rumbleRef.current = window.setInterval(() => playSound('earthquake'), 500);
          if (updateSideNarrator) updateSideNarrator('GEMPA! Sembunyi di bawah meja sekarang!', false, 'warning');
        } else {
          if (rumbleRef.current) { clearInterval(rumbleRef.current); rumbleRef.current = null; }
          if (activeQuakeRef.current !== -1 && !quakeExposedRef.current) {
            quakesSafeRef.current += 1;
            setSafeCount(quakesSafeRef.current);
          }
          debrisRef.current = [];
          setDebris([]);
          if (updateSideNarrator) updateSideNarrator('Gempa berhenti. Lanjut jalan ke pintu keluar!', false, 'idle');
        }
        activeQuakeRef.current = active;
        setQuakeIdx(active === -1 ? 0 : active + 1);
        setInQuake(active !== -1);
      }
      // untuk vr sendiri aku gatau harus gimana nih jadi mending kita selesaikan dulu bagian gameplay
      // nanti vr kita akan menggunakan library three js
      const quaking = active !== -1;
      const isWalking = walkRef.current && !hidingRef.current;

      // Dock the nearby table exactly under the player while hiding, so the
      // hide sprite (which already draws its own table) lines up perfectly
      // with no jump when swapping away from the standalone table art.
      if (hidingRef.current) {
        const near = tablesRef.current.find(t => Math.abs(t.x - PLAYER_X) < ATTABLE_RANGE);
        if (near && near.x !== PLAYER_X) {
          tablesRef.current = tablesRef.current.map(t => t.id === near.id ? { ...t, x: PLAYER_X } : t);
          setTables(tablesRef.current);
        }
      }

      // World scroll (bg + tables + exit share one speed)
      if (isWalking) {
        bgScrollRef.current = (bgScrollRef.current + BG_RATE * dt) % 50;
        setBgScroll(bgScrollRef.current);
        setRunFrame(Math.floor(now / 120) % 2 === 0 ? 1 : 2);

        const move = WORLD_SPEED * dt;

        // Spawn periodic tables (stop once heading to the exit)
        if (elapsed < LAST_QUAKE_END) {
          tableDistRef.current += move;
          if (tableDistRef.current >= TABLE_GAP) {
            tableDistRef.current -= TABLE_GAP;
            tablesRef.current = [...tablesRef.current, { id: nextTableId.current++, x: 112 }];
          }
        }

        // Scroll tables left, cull off-screen
        tablesRef.current = tablesRef.current
          .map(t => ({ ...t, x: t.x - move }))
          .filter(t => t.x > -25);
        setTables(tablesRef.current);

        // Scroll exit left; reaching the player wins
        if (exitXRef.current !== null) {
          exitXRef.current -= move;
          setExitX(exitXRef.current);
          if (exitXRef.current <= EXIT_REACH) { finish(true); return; }
        }
      }

      // Exit-hallway backdrop begins sliding in from the right at 30s
      if (elapsed >= EXIT_SPAWN_MS && exitXRef.current === null) {
        exitXRef.current = 100;
        setExitX(100);
        if (updateSideNarrator) updateSideNarrator('Pintu keluar muncul — terus jalan ke kanan!', false, 'success');
      }

      // Is a table over the player right now?
      const atTable = tablesRef.current.some(t => Math.abs(t.x - PLAYER_X) < ATTABLE_RANGE);
      const safe = quaking && atTable && hidingRef.current;

      // Debris during a quake
      if (quaking) {
        spawnAccRef.current += dt;
        if (spawnAccRef.current >= 360) {
          spawnAccRef.current = 0;
          const nearP = Math.random() < 0.6;
          const x = nearP
            ? Math.max(6, Math.min(94, PLAYER_X + (Math.random() * 24 - 12)))
            : 8 + Math.random() * 84;
          debrisRef.current = [...debrisRef.current, { id: nextDebrisId.current++, x, y: 0 }];
        }
      }

      // Advance debris + collision (safe only when hiding under a table)
      const fall = 0.42 * dt;
      const remaining: Array<{ id: number; x: number; y: number }> = [];
      let hit = false;
      for (const d of debrisRef.current) {
        const ny = d.y + fall;
        if (ny >= HIT_Y) {
          if (!safe && Math.abs(d.x - PLAYER_X) < PLAYER_HALF_W) {
            healthRef.current = Math.max(0, healthRef.current - 10);
            hit = true;
            quakeExposedRef.current = true;
          }
          continue;
        }
        remaining.push({ ...d, y: ny });
      }
      debrisRef.current = remaining;
      setDebris(remaining);
      if (hit) {
        setHealth(healthRef.current);
        setFlash(true);
        playSound('explosion');
        setTimeout(() => setFlash(false), 160);
        if (healthRef.current <= 0) { finish(false); return; }
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  // Keyboard: ArrowRight = walk, Space/ArrowDown = hide
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (subRef.current !== 'PLAY') return;
      if (e.code === 'ArrowRight') { setWalking(true); walkRef.current = true; e.preventDefault(); }
      else if (e.code === 'Space' || e.code === 'ArrowDown') { setHiding(true); hidingRef.current = true; e.preventDefault(); }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'ArrowRight') { setWalking(false); walkRef.current = false; }
      else if (e.code === 'Space' || e.code === 'ArrowDown') { setHiding(false); hidingRef.current = false; }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  const nearTableX = tables.reduce<number | null>((best, t) => {
    if (Math.abs(t.x - PLAYER_X) >= ATTABLE_RANGE) return best;
    if (best === null) return t.x;
    return Math.abs(t.x - PLAYER_X) < Math.abs(best - PLAYER_X) ? t.x : best;
  }, null);
  const atTableNow = nearTableX !== null;
  const hidingUnderTable = hiding && atTableNow;
  // Only shake while actually playing — once the run ends (RESULT / game over)
  // the scene must stay still even though `inQuake` may still be true.
  const shakeClass = inQuake && sub === 'PLAY' ? 'screen-shake-intense' : '';
  const playerSrc = hidingUnderTable
    ? '/assets/player-hide.png'
    : inQuake && hiding ? '/assets/player-panic.png'
      : walking ? `/assets/player-run-${runFrame}.png`
        : inQuake ? '/assets/player-panic.png'
          : '/assets/player-idle.png';

  return (
    <div className={`relative max-w-4xl mx-auto bg-white rounded-3xl p-6 sm:p-8 border-b-8 border-gray-200 overflow-hidden ${flash && sub === 'PLAY' ? 'screen-shake-intense' : ''}`}>
      {/* HUD */}
      {sub === 'PLAY' && (
        <div className="flex justify-between items-center mb-4 gap-2">
          <div className="flex items-center gap-2">
            <Heart className={`${health < 30 ? 'text-red-500 animate-pulse' : 'text-red-400'}`} fill="currentColor" />
            <div className="w-28 h-4 bg-gray-200 rounded-full overflow-hidden">
              <motion.div className={`h-full ${health < 30 ? 'health-danger' : 'bg-red-500'}`} animate={{ width: `${health}%` }} />
            </div>
          </div>
          <div className={`text-xs font-black uppercase px-3 py-1 rounded-lg ${inQuake ? 'bg-red-100 text-red-700 animate-pulse' : warning ? 'bg-yellow-100 text-yellow-700 animate-pulse' : 'bg-emerald-100 text-emerald-700'}`}>
            {inQuake ? `GEMPA ${quakeIdx}/3 — SEMBUNYI!` : warning ? 'GEMPA DATANG!' : exitX !== null ? 'MENUJU KELUAR' : 'Ayo segera ke tempat terbuka!'}
          </div>
          <div className="text-xs font-bold text-gray-500">🛡️ {safeCount}/3</div>
        </div>
      )}

      {/* Scene */}
      <div className={`relative rounded-2xl border-4 border-amber-100 mb-6 overflow-hidden bg-slate-700 ${shakeClass}`} style={{ height: `${SCENE_H}px` }}>
        {/* Seamless corridor background — always fully covers the scene (no gaps), using the
            same two-tile scroll for both the normal corridor and the exit-hallway backdrop.
            The exit art cross-fades in once triggered, so the two never show as a mismatched
            split (one photo peeking through beside the other) — just a smooth dissolve. */}
        {sub !== 'READY' && (
          <div className="absolute inset-0 z-0 overflow-hidden">
            <div className="flex h-full" style={{ width: '200%', transform: `translateX(-${bgScroll}%)` }}>
              <div style={{ width: '50%', height: '100%', backgroundImage: "url('/assets/corridor-bg.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <div style={{ width: '50%', height: '100%', backgroundImage: "url('/assets/corridor-bg.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
            </div>
            <div
              className="flex h-full absolute top-0 left-0"
              style={{ width: '200%', transform: `translateX(-${bgScroll}%)`, opacity: exitX !== null ? 1 : 0, transition: 'opacity 1200ms ease-in' }}
            >
              <div style={{ width: '50%', height: '100%', backgroundImage: "url('/assets/exit-hallway-bg.png')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <div style={{ width: '50%', height: '100%', backgroundImage: "url('/assets/exit-hallway-bg.png')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
            </div>
          </div>
        )}

        {sub === 'PLAY' && inQuake && <div className="crack-overlay" />}
        {sub === 'PLAY' && inQuake && <DustParticles />}

        {/* READY */}
        {sub === 'READY' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-slate-800/50">
            <MotionDiv animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
              <AlertTriangle size={72} className="mx-auto text-amber-300 mb-3" />
            </MotionDiv>
            <p className="text-white font-black text-2xl mb-2">Evakuasi Gempa!</p>
            <p className="text-amber-100 text-base max-w-md">Tekan <b>JALAN</b> untuk maju ke kanan menuju pintu keluar. Meja lewat sesekali — saat <b>gempa</b>, berhenti di dekat meja lalu tekan <b>SEMBUNYI</b> untuk berlindung. Ada 3 gempa!</p>
          </div>
        )}

        {/* Tables (world objects). Hide the one directly over the player when ducking. */}
        {sub === 'PLAY' && tables.map(t => {
          if (hidingUnderTable && Math.abs(t.x - PLAYER_X) < ATTABLE_RANGE) return null;
          return (
            <div key={t.id} className="absolute z-10" style={{ left: `${t.x}%`, bottom: '10px', width: '96px', height: '126px', transform: 'translateX(-50%)' }}>
              <img src="/assets/table.png" alt="Meja" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'bottom' }} />
            </div>
          );
        })}

        {/* Debris */}
        {sub === 'PLAY' && debris.map(d => (
          <div key={d.id} className="absolute z-30 text-4xl" style={{ left: `${d.x}%`, top: `${d.y}px`, transform: 'translateX(-50%)' }}>
            {d.id % 3 === 0 ? '🧱' : d.id % 3 === 1 ? '🪨' : '📚'}
          </div>
        ))}

        {/* Player — scale up only the hide sprite so the "berlindung di bawah
            meja" pose reads bigger. Anchored bottom-center (grows upward, feet
            stay on the floor). No size transition, so releasing hide swaps back
            to the walk sprite instantly with no squish. */}
        {sub === 'PLAY' && (
          <div
            className="absolute z-20"
            style={{
              left: `${PLAYER_X}%`,
              bottom: '10px',
              width: hidingUnderTable ? '130px' : '96px',
              height: hidingUnderTable ? '170px' : '126px',
              transform: 'translateX(-50%)',
            }}
          >
            {[
              '/assets/player-idle.png',
              '/assets/player-run-1.png',
              '/assets/player-run-2.png',
              '/assets/player-panic.png',
              '/assets/player-hide.png'
            ].map(src => (
              <img
                key={src}
                src={src}
                alt="Pemain"
                draggable={false}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  objectPosition: 'bottom',
                  filter: flash ? 'drop-shadow(0 0 6px rgba(239,68,68,0.9))' : 'drop-shadow(0 3px 4px rgba(0,0,0,0.4))',
                  opacity: playerSrc === src ? 1 : 0,
                  transition: 'none'
                }}
              />
            ))}
          </div>
        )}

        {/* Cover cue banner */}
        {sub === 'PLAY' && ((warning && !inQuake) || (inQuake && !hidingUnderTable)) && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-red-500 text-white text-xs font-black px-4 py-1.5 rounded-full shadow-lg animate-pulse">
            {inQuake ? (atTableNow ? '⚠️ TEKAN SEMBUNYI!' : '⚠️ CEPAT KE MEJA!') : '⚠️ GEMPA SEBENTAR LAGI — BERHENTI DI MEJA!'}
          </div>
        )}

        {/* RESULT */}
        {sub === 'RESULT' && result && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 bg-white/75 backdrop-blur-sm">
            <div className="text-6xl mb-1">{result.detail.survived ? '🏫' : '🩹'}</div>
            <div className="text-4xl mb-2 tracking-widest">
              {'⭐'.repeat(result.detail.stars)}<span className="opacity-20">{'⭐'.repeat(3 - result.detail.stars)}</span>
            </div>
            <p className={`font-black text-lg mb-3 ${result.detail.survived ? 'text-green-600' : 'text-orange-600'}`}>
              {result.detail.survived ? 'Berhasil Keluar dengan Selamat!' : 'Terkena Reruntuhan'}
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm w-full max-w-xs">
              <span className="text-gray-500 text-left">Gempa dilalui aman</span><span className="font-bold text-right">{result.detail.quakesSafe}/3</span>
              <span className="text-gray-500 text-left">Sisa Health</span><span className="font-bold text-right">{result.detail.healthRemaining}/100</span>
              <span className="text-gray-800 font-black text-left border-t border-gray-200 mt-1 pt-1">TOTAL</span>
              <span className="text-gray-800 font-black text-right border-t border-gray-200 mt-1 pt-1">{result.total}/100</span>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="select-none">
        {sub === 'READY' && (
          <Button
            onClick={start}
            size="lg"
            disabled={!assetsLoaded}
            className={`${assetsLoaded ? 'bg-red-500 shadow-red-700 glow-pulse' : 'bg-gray-400 shadow-gray-600 cursor-not-allowed'} w-full text-xl py-6`}
            playSound={() => playSound('click')}
          >
            {assetsLoaded ? 'MULAI SIMULASI!' : 'MEMUAT ASET...'}
          </Button>
        )}

        {sub === 'PLAY' && (
          <>
            <div className="flex items-stretch gap-2">
              <MotionButton
                onMouseDown={() => { setHiding(true); hidingRef.current = true; }}
                onMouseUp={() => { setHiding(false); hidingRef.current = false; }}
                onMouseLeave={() => { setHiding(false); hidingRef.current = false; }}
                onTouchStart={() => { setHiding(true); hidingRef.current = true; }}
                onTouchEnd={() => { setHiding(false); hidingRef.current = false; }}
                whileTap={{ scale: 0.97 }}
                className={`flex-1 py-6 rounded-2xl font-black text-base shadow-xl border-b-8 touch-none transition-colors ${hidingUnderTable ? 'bg-green-500 border-green-700 text-white' : inQuake ? 'bg-orange-500 border-orange-700 text-white animate-pulse' : 'bg-gray-200 border-gray-300 text-gray-500'}`}
              >
                🙇 SEMBUNYI
              </MotionButton>

              <MotionButton
                onMouseDown={() => { setWalking(true); walkRef.current = true; }}
                onMouseUp={() => { setWalking(false); walkRef.current = false; }}
                onMouseLeave={() => { setWalking(false); walkRef.current = false; }}
                onTouchStart={() => { setWalking(true); walkRef.current = true; }}
                onTouchEnd={() => { setWalking(false); walkRef.current = false; }}
                whileTap={{ scale: 0.97 }}
                className="flex-1 py-6 rounded-2xl font-black text-base shadow-xl border-b-8 bg-indigo-500 border-indigo-700 text-white touch-none"
              >
                🚶 JALAN →
              </MotionButton>
            </div>
            <p className="text-center text-[11px] text-gray-400 mt-2">Tahan JALAN (→) untuk maju. Saat gempa, berhenti di dekat meja lalu tahan SEMBUNYI (SPASI).</p>
          </>
        )}

        {sub === 'RESULT' && result && (
          <div className="flex flex-col sm:flex-row gap-2">
            {onReplay && (
              <Button onClick={onReplay} variant="secondary" size="lg" className="flex-1" playSound={() => playSound('click')}>
                <RefreshCw className="mr-1" size={18} /> Ulangi Game
              </Button>
            )}
            <Button onClick={() => onComplete(result.total, result.detail)} variant="success" size="lg" className="flex-1" playSound={() => playSound('click')}>
              Lanjut ke Pemulihan <ChevronRight />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// 3B-1. Flood Phase 1 — Backpack packing
// Player picks 5 of 10 items. Useful items score points, useless ones don't.
type BackpackDoneDetail = { usefulPicked: number; usefulTotal: number };

const FloodBackpack = ({
  onDone,
  playSound,
  updateSideNarrator,
}: {
  onDone: (score: number, detail: BackpackDoneDetail) => void;
  playSound: (type: string) => void;
  updateSideNarrator?: (message: string, isTyping?: boolean, status?: 'idle' | 'warning' | 'success' | 'error') => void;
}) => {
  // Shuffle once per mount so item positions vary
  const shuffledItems = useMemo(() => {
    const arr = [...FLOOD_BAG_ITEMS];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, []);

  const [picked, setPicked] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(25);
  const [gameState, setGameState] = useState<'PLAYING' | 'FINISHED'>('PLAYING');
  const [revealReasons, setRevealReasons] = useState(false);
  const timerRef = useRef<number | null>(null);

  const finish = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setGameState('FINISHED');
    setRevealReasons(true);
    playSound('success');
  }, [playSound]);

  useEffect(() => {
    if (updateSideNarrator) {
      updateSideNarrator('Air datang cepat! Ambil hanya barang penting — tas cuma muat 5.', false, 'warning');
    }
    timerRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          finish();
          return 0;
        }
        if (prev <= 5) playSound('countdown');
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (picked.length >= FLOOD_BAG_CAPACITY && gameState === 'PLAYING') {
      finish();
    }
  }, [picked.length, gameState, finish]);

  const toggle = (id: string) => {
    if (gameState !== 'PLAYING') return;
    if (picked.includes(id)) {
      setPicked(prev => prev.filter(x => x !== id));
      playSound('click');
    } else {
      if (picked.length >= FLOOD_BAG_CAPACITY) return;
      setPicked(prev => [...prev, id]);
      playSound('itemPick');
    }
  };

  const usefulPicked = picked.filter(id => shuffledItems.find(i => i.id === id)?.isUseful).length;
  const score = Math.round((usefulPicked / FLOOD_BAG_USEFUL_COUNT) * 100);

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-3xl p-8 border-b-8 border-blue-200 overflow-hidden">
      <div className="flex justify-between items-center mb-6 gap-3">
        <div>
          <h3 className="font-black text-gray-800 text-2xl leading-tight">🎒 Isi Tas Siaga</h3>
          <p className="text-base text-gray-500 mt-1">Pilih 5 barang paling penting untuk dibawa mengungsi.</p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <div className={`font-mono text-3xl font-black rounded-lg px-4 py-1 ${timeLeft <= 5 ? 'timer-warning' : 'bg-gray-100 text-gray-700'}`}>
            00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
          </div>
          <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg font-bold text-base">
            {picked.length}/{FLOOD_BAG_CAPACITY} barang
          </div>
        </div>
      </div>

      {/* Bag preview slots */}
      <div className="mb-6 bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
        <div className="text-base font-bold text-amber-700 uppercase mb-3 flex items-center gap-1.5">
          <Backpack size={20} /> Isi Tas
        </div>
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: FLOOD_BAG_CAPACITY }).map((_, idx) => {
            const id = picked[idx];
            const item = id ? shuffledItems.find(i => i.id === id) : undefined;
            return (
              <div
                key={idx}
                className={`aspect-square rounded-xl flex items-center justify-center text-5xl border-2 ${item ? 'bg-white border-amber-300' : 'bg-amber-100/60 border-dashed border-amber-300'}`}
              >
                {item ? item.icon : <span className="text-amber-300 text-2xl font-bold">{idx + 1}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Item grid */}
      <div className="grid grid-cols-5 gap-3 sm:gap-4">
        {shuffledItems.map(item => {
          const isPicked = picked.includes(item.id);
          const revealCorrect = revealReasons && item.isUseful;
          const revealWrong = revealReasons && isPicked && !item.isUseful;
          return (
            <MotionDiv
              key={item.id}
              whileTap={{ scale: 0.92 }}
              whileHover={{ y: -3 }}
              onClick={() => toggle(item.id)}
              className={`cursor-pointer rounded-xl p-3 flex flex-col items-center gap-1.5 border-2 transition-colors ${revealCorrect ? 'bg-emerald-50 border-emerald-400' :
                revealWrong ? 'bg-red-50 border-red-400' :
                  isPicked ? 'bg-blue-50 border-blue-400' :
                    'bg-white border-gray-200 hover:border-blue-300'
                }`}
            >
              <div className="text-5xl">{item.icon}</div>
              <span className="text-sm font-bold text-gray-600 text-center leading-tight">{item.name}</span>
              {revealReasons && (
                <span className={`text-xs leading-tight text-center ${item.isUseful ? 'text-emerald-700' : 'text-red-700'}`}>
                  {item.isUseful ? '✓ Perlu' : '✗ Tidak perlu'}
                </span>
              )}
            </MotionDiv>
          );
        })}
      </div>

      {gameState === 'FINISHED' && (
        <MotionDiv
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-5 text-center"
        >
          <div className="text-2xl font-black mb-1">
            {usefulPicked}/{FLOOD_BAG_USEFUL_COUNT}
            <span className="text-sm font-bold text-gray-500 ml-2">barang penting terambil</span>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            {usefulPicked === FLOOD_BAG_USEFUL_COUNT ? 'Sempurna! Tas kalian isinya semua penting.' :
              usefulPicked >= 3 ? 'Cukup baik, tapi ada barang penting yang tertinggal.' :
                'Terlalu banyak barang tidak esensial. Lihat kenapa di atas.'}
          </p>
          <Button onClick={() => onDone(score, { usefulPicked, usefulTotal: FLOOD_BAG_USEFUL_COUNT })} variant="primary" size="lg" fullWidth playSound={() => playSound('click')}>
            Lari ke Tempat Aman <ChevronRight />
          </Button>
        </MotionDiv>
      )}
    </div>
  );
};

// 3B-2. Flood Phase 2 — Escape run (side-scroller with jump mechanic)
// 30 seconds, 3 lives. Jump over electric water & floating wood.
type EscapeDoneDetail = { hits: number; survived: boolean };

const FloodEscape = ({
  onDone,
  onReplay,
  playSound,
  updateSideNarrator,
}: {
  onDone: (score: number, detail: EscapeDoneDetail) => void;
  onReplay?: () => void;
  playSound: (type: string) => void;
  updateSideNarrator?: (message: string, isTyping?: boolean, status?: 'idle' | 'warning' | 'success' | 'error') => void;
}) => {
  const SURVIVE_SECONDS = 30;
  const JUMP_DURATION_MS = 620; // total time in the air, start to landing
  const JUMP_HEIGHT_PX = 110;   // peak height of the arc
  const PLAYER_X_PCT = 30;
  const PLAYER_HALF_WIDTH_PCT = 3.5;
  const OBSTACLE_HALF_WIDTH_PCT = 3;
  const OBSTACLE_HEIGHT_PX = 42;
  const PLAYER_SPRITE_HEIGHT_PX = 56;
  const GROUND_PX = 175; // height of the flood water surface = ground line the runner/obstacles stand on
  const BUILDING_APPEAR_AT = 3;             // seconds left when the finish building slides in (27s elapsed)
  const BUILDING_REACH_PCT = PLAYER_X_PCT + 8; // building's center stops just past the player = "arrived"
  const BUILDING_SPEED_PCT_PER_MS = 0.028;  // fixed approach speed — slower than obstacles, for a natural drift-in

  const [gameState, setGameState] = useState<'READY' | 'PLAYING' | 'FINISHED'>('READY');
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(SURVIVE_SECONDS);
  const [playerY, setPlayerY] = useState(0);
  const [isJumping, setIsJumping] = useState(false);
  const [obstacles, setObstacles] = useState<Array<{ id: number; x: number; type: 'electric' | 'wood' }>>([]);
  const [survived, setSurvived] = useState(false);
  const [invincible, setInvincible] = useState(false);
  const [flashHit, setFlashHit] = useState(false);
  const [runFrame, setRunFrame] = useState<1 | 2>(1);
  const [waveFrame, setWaveFrame] = useState<1 | 2>(1);
  const [waveSurge, setWaveSurge] = useState(false);
  const [buildingX, setBuildingX] = useState<number | null>(null); // %, null = not shown yet

  const jumpStartRef = useRef<number | null>(null);
  const playerYRef = useRef(0);
  const invincibleRef = useRef(false);
  const livesRef = useRef(3);
  const nextObstacleId = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
  const spawnTimerRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const gameSpeedRef = useRef(0.045); // % per ms
  const spawnIntervalRef = useRef(1600); // ms
  const stateRef = useRef<'READY' | 'PLAYING' | 'FINISHED'>('READY');
  const obstaclesRef = useRef<Array<{ id: number; x: number; type: 'electric' | 'wood' }>>([]);
  const buildingActiveRef = useRef(false);
  const buildingXRef = useRef<number | null>(null);

  useEffect(() => { stateRef.current = gameState; }, [gameState]);
  useEffect(() => { livesRef.current = lives; }, [lives]);

  const endGame = useCallback((didSurvive: boolean, currentLives: number) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    stateRef.current = 'FINISHED';
    setGameState('FINISHED');
    setSurvived(didSurvive);
    if (didSurvive) playSound('victory'); else playSound('error');
    if (updateSideNarrator) {
      updateSideNarrator(
        didSurvive ? 'Selamat! Kalian sampai di gedung aman. Fase evakuasi selesai.' : 'Air dan listrik menghadang. Latihan lagi ya, jangan takut!',
        false,
        didSurvive ? 'success' : 'error'
      );
    }
  }, [playSound, updateSideNarrator]);

  const jump = useCallback(() => {
    if (stateRef.current !== 'PLAYING') return;
    if (jumpStartRef.current !== null) return; // already jumping
    jumpStartRef.current = performance.now();
    setIsJumping(true);
    playSound('whoosh');
  }, [playSound]);

  const hitObstacle = useCallback((type: 'electric' | 'wood') => {
    if (invincibleRef.current) return;
    invincibleRef.current = true;
    setInvincible(true);
    setFlashHit(true);
    playSound(type === 'electric' ? 'explosion' : 'splash');
    setTimeout(() => setFlashHit(false), 250);
    setTimeout(() => {
      invincibleRef.current = false;
      setInvincible(false);
    }, 900);
    // Wave lurches forward to "catch" the player on a hit, then recedes
    setWaveSurge(true);
    setTimeout(() => setWaveSurge(false), 500);
    livesRef.current = Math.max(0, livesRef.current - 1);
    setLives(livesRef.current);
    if (livesRef.current <= 0) {
      endGame(false, 0);
    }
  }, [endGame, playSound]);

  const startGame = () => {
    setGameState('PLAYING');
    stateRef.current = 'PLAYING';
    setLives(3);
    livesRef.current = 3;
    setTimeLeft(SURVIVE_SECONDS);
    obstaclesRef.current = [];
    setObstacles([]);
    setPlayerY(0);
    setIsJumping(false);
    playerYRef.current = 0;
    jumpStartRef.current = null;
    spawnTimerRef.current = -1200; // grace period before first obstacle
    gameSpeedRef.current = 0.045;
    spawnIntervalRef.current = 1600;
    nextObstacleId.current = 0;
    buildingActiveRef.current = false;
    buildingXRef.current = null;
    setBuildingX(null);
    playSound('levelStart');
    if (updateSideNarrator) {
      updateSideNarrator('LARI! Loncat rintangan pakai SPASI atau ketuk layar!', false, 'warning');
    }

    // Second timer
    timerRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        const next = prev - 1;
        // Finish building slides in from the right at second 27 (3s left).
        if (next <= BUILDING_APPEAR_AT && !buildingActiveRef.current) {
          buildingActiveRef.current = true;
          buildingXRef.current = 110;
          setBuildingX(110);
          if (updateSideNarrator) {
            updateSideNarrator('Gedung aman di depan! Terus lari ke sana!', false, 'success');
          }
        }
        // Timer only ends the run if the building hasn't already (safety net).
        if (prev <= 1) {
          endGame(true, livesRef.current);
          return 0;
        }
        // Gradual difficulty ramp (stops once the building is approaching)
        if (!buildingActiveRef.current && prev % 5 === 0) {
          gameSpeedRef.current = Math.min(0.09, gameSpeedRef.current + 0.008);
          spawnIntervalRef.current = Math.max(900, spawnIntervalRef.current - 100);
        }
        return next;
      });
    }, 1000);

    // Game loop
    lastTickRef.current = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(50, now - lastTickRef.current);
      lastTickRef.current = now;
      if (stateRef.current !== 'PLAYING') return;

      // Player physics — fixed-duration parabolic arc (frame-rate independent)
      if (jumpStartRef.current !== null) {
        const elapsed = now - jumpStartRef.current;
        if (elapsed >= JUMP_DURATION_MS) {
          jumpStartRef.current = null;
          playerYRef.current = 0;
          setIsJumping(false);
        } else {
          const t = elapsed / JUMP_DURATION_MS;
          // 4*H*t*(1-t): smooth symmetric arc, 0 at t=0 and t=1, peak H at t=0.5
          playerYRef.current = 4 * JUMP_HEIGHT_PX * t * (1 - t);
        }
        setPlayerY(playerYRef.current);
      }

      // Advance & cull obstacles in the ref
      const speed = gameSpeedRef.current * dt;
      const advanced: Array<{ id: number; x: number; type: 'electric' | 'wood' }> = [];
      const hitTypes: Array<'electric' | 'wood'> = [];
      const playerLeft = PLAYER_X_PCT - PLAYER_HALF_WIDTH_PCT;
      const playerRight = PLAYER_X_PCT + PLAYER_HALF_WIDTH_PCT;
      const playerBottom = playerYRef.current;
      const notHighEnough = playerBottom < OBSTACLE_HEIGHT_PX - 4;
      for (const o of obstaclesRef.current) {
        const nx = o.x - speed;
        if (nx < -5) continue;
        const obLeft = nx - OBSTACLE_HALF_WIDTH_PCT;
        const obRight = nx + OBSTACLE_HALF_WIDTH_PCT;
        const xOverlap = obRight >= playerLeft && obLeft <= playerRight;
        if (xOverlap && notHighEnough) {
          hitTypes.push(o.type);
          continue; // consume
        }
        advanced.push({ ...o, x: nx });
      }
      obstaclesRef.current = advanced;

      // Spawn (stop once the finish building is approaching, for a clean runway)
      if (!buildingActiveRef.current) {
        spawnTimerRef.current += dt;
        if (spawnTimerRef.current >= spawnIntervalRef.current) {
          spawnTimerRef.current = 0;
          const type: 'electric' | 'wood' = Math.random() < 0.5 ? 'electric' : 'wood';
          obstaclesRef.current = [...obstaclesRef.current, { id: nextObstacleId.current++, x: 105, type }];
        }
      }

      // Slide the finish building in from the right at its own (slower) pace; arrive = game won
      if (buildingActiveRef.current && buildingXRef.current !== null) {
        buildingXRef.current = Math.max(BUILDING_REACH_PCT, buildingXRef.current - BUILDING_SPEED_PCT_PER_MS * dt);
        setBuildingX(buildingXRef.current);
        if (buildingXRef.current <= BUILDING_REACH_PCT) {
          setObstacles(obstaclesRef.current);
          endGame(true, livesRef.current);
          return;
        }
      }

      // Commit to state (single update per tick — no side effects inside updater)
      setObstacles(obstaclesRef.current);

      // Apply hits after state commit — safe to call side-effectful setState here
      for (const type of hitTypes) {
        hitObstacle(type);
        if (stateRef.current !== 'PLAYING') break;
      }

      if (stateRef.current === 'PLAYING') {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  // Keyboard listener
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [jump]);

  // Running animation frame toggle (Zombie-Tsunami style 2-frame cycle)
  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    const id = window.setInterval(() => {
      setRunFrame(f => (f === 1 ? 2 : 1));
    }, 120);
    return () => window.clearInterval(id);
  }, [gameState]);

  // Chasing wave crest — bigger, slower cycle than the run animation
  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    const id = window.setInterval(() => {
      setWaveFrame(f => (f === 1 ? 2 : 1));
    }, 350);
    return () => window.clearInterval(id);
  }, [gameState]);

  // Danger grows as lives run out: the wave creeps closer to the player (at PLAYER_X_PCT ~30%).
  // Base reach ~20% of scene width, +3% per life lost, +5% surge lurch on a hit.
  const waveWidthPct = 20 + (3 - lives) * 3 + (waveSurge ? 5 : 0);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const hits = 3 - lives;
  const finalScore = survived
    ? Math.max(25, 100 - hits * 25)
    : 25;

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-3xl p-4 sm:p-6 border-b-8 border-blue-300 overflow-hidden">
      <div className="flex justify-between items-center mb-3 gap-2">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map(i => (
            <Heart
              key={i}
              size={22}
              className={i < lives ? 'text-red-500' : 'text-gray-300'}
              fill={i < lives ? 'currentColor' : 'none'}
            />
          ))}
        </div>
        <div className={`font-mono text-2xl font-black rounded-xl px-3 py-1 ${timeLeft <= 5 ? 'timer-warning' : 'text-gray-700 bg-gray-100'}`}>
          00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
        </div>
      </div>

      {/* Scene */}
      <div
        className={`relative h-96 sm:h-[30rem] rounded-2xl border-2 border-blue-300 overflow-hidden select-none ${flashHit ? 'screen-shake-intense' : ''}`}
        style={{
          background: 'linear-gradient(180deg, #1e293b 0%, #334155 40%, #475569 70%, #6b7280 100%)',
        }}
        onClick={jump}
      >
        {/* Seamless scrolling city + road backdrop (two tiles, shifts -50% = exactly one tile) */}
        <div className="absolute inset-0 z-0">
          <div
            className="scroll-bg-track"
            style={{
              // Faster while playing, frozen on READY/FINISHED overlays
              ['--scroll-duration' as any]: gameState === 'PLAYING' ? '9s' : '40s',
            }}
          >
            <div className="scroll-bg-tile" style={{ backgroundImage: "url('/assets/city-road-bg.png')" }} />
            <div className="scroll-bg-tile" style={{ backgroundImage: "url('/assets/city-road-bg.png')" }} />
          </div>
        </div>

        {/* Rain overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-30 z-10" style={{
          backgroundImage: 'repeating-linear-gradient(105deg, transparent 0 8px, rgba(191,219,254,0.25) 8px 10px)',
          animation: 'floatParticle 0.6s linear infinite',
        }} />

        {/* Rising water — fills up to the ground line, covering the dry road strip */}
        <MotionDiv
          className="absolute left-0 right-0 bottom-0 z-[1]"
          animate={{ opacity: [0.6, 0.9, 0.6] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          style={{
            height: `${GROUND_PX}px`,
            background: 'linear-gradient(180deg, rgba(59,130,246,0.7) 0%, rgba(29,78,216,0.9) 100%)',
            borderTop: '2px solid #60a5fa',
          }}
        />

        {/* Chasing wave — looms behind the player; creeps closer as lives run out, lurches on a hit */}
        <div
          className="absolute left-0 z-[5] pointer-events-none"
          style={{
            bottom: `${GROUND_PX - 8}px`,
            width: `${waveWidthPct}%`,
            height: '180px',
            transition: 'width 350ms ease-out',
          }}
        >
          {[1, 2].map(frame => (
            <img
              key={`wave-${frame}`}
              src={`/assets/wave-${frame}.png`}
              alt=""
              draggable={false}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'right bottom',
                opacity: waveFrame === frame ? 1 : 0,
                transition: 'none',
              }}
            />
          ))}
        </div>

        {/* Obstacles */}
        {obstacles.map(o => (
          <div
            key={o.id}
            className="absolute z-20"
            style={{
              left: `${o.x}%`,
              bottom: `${GROUND_PX}px`,
              transform: 'translateX(-50%)',
              width: '42px',
              height: `${OBSTACLE_HEIGHT_PX}px`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              filter: o.type === 'electric' ? 'drop-shadow(0 0 8px rgba(250,204,21,0.9))' : 'drop-shadow(0 3px 4px rgba(0,0,0,0.4))',
            }}
          >
            {o.type === 'electric' ? '⚡' : '🪵'}
          </div>
        ))}

        {/* Finish-line building — slides in from the right in the final seconds */}
        {buildingX !== null && (
          <div
            className="absolute z-[15] pointer-events-none"
            style={{
              left: `${buildingX}%`,
              bottom: `${GROUND_PX - 6}px`,
              transform: 'translateX(-50%)',
              width: '200px',
              height: '340px',
              filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.45))',
            }}
          >
            <img
              src="/assets/building.png"
              alt="Gedung aman"
              draggable={false}
              style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'bottom' }}
            />
          </div>
        )}

        {/* Player */}
        <div
          className="absolute z-30 pointer-events-none"
          style={{
            left: `${PLAYER_X_PCT}%`,
            bottom: `${GROUND_PX + playerY}px`,
            transform: 'translateX(-50%)',
            width: '64px',
            height: `${PLAYER_SPRITE_HEIGHT_PX + 8}px`,
            filter: invincible
              ? 'drop-shadow(0 0 8px rgba(239,68,68,0.9))'
              : 'drop-shadow(0 3px 4px rgba(0,0,0,0.5))',
            opacity: invincible ? 0.55 : 1,
          }}
        >
          {[1, 2].map(frame => (
            <img
              key={`run-${frame}`}
              src={`/assets/player-run-${frame}.png`}
              alt="Runner"
              draggable={false}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                imageRendering: 'pixelated',
                opacity: (isJumping ? 1 : runFrame) === frame ? 1 : 0,
                transition: 'none',
              }}
            />
          ))}
        </div>

        {/* READY overlay */}
        {gameState === 'READY' && (
          <div className="absolute inset-0 z-40 bg-black/60 flex flex-col items-center justify-center gap-3 text-center text-white p-4">
            <h3 className="font-black text-xl">Lari ke Gedung Aman!</h3>
            <p className="text-sm text-blue-100 max-w-xs">
              Bertahan <b>30 detik</b>. Loncat <b>SPASI</b> / ketuk layar untuk melewati <span className="text-yellow-300">⚡ air listrik</span> dan <span className="text-amber-300">🪵 kayu hanyut</span>.
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); startGame(); }}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-400 rounded-xl font-bold shadow-lg text-white"
            >
              MULAI LARI!
            </button>
          </div>
        )}

        {/* FINISHED overlay */}
        {gameState === 'FINISHED' && (
          <div className="absolute inset-0 z-40 bg-black/70 flex flex-col items-center justify-center gap-2 text-center text-white p-4">
            <div className="text-5xl mb-1">{survived ? '🏢' : '💧'}</div>
            <h3 className="font-black text-2xl">
              {survived ? 'Selamat Sampai!' : 'Terhempas Arus!'}
            </h3>
            <p className="text-xs text-blue-100">Nyawa tersisa: {lives}/3 • Skor: {finalScore}</p>
            <div className="mt-2 flex flex-col sm:flex-row gap-2">
              {onReplay && (
                <button
                  onClick={onReplay}
                  className="px-6 py-2 bg-white/90 hover:bg-white text-gray-700 rounded-xl font-bold shadow-lg flex items-center justify-center gap-1"
                >
                  <RefreshCw size={16} /> Ulangi Game
                </button>
              )}
              <button
                onClick={() => onDone(finalScore, { hits: 3 - lives, survived })}
                className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 rounded-xl font-bold shadow-lg text-white"
              >
                Lanjut
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile hint */}
      {gameState === 'PLAYING' && (
        <p className="text-center text-xs text-gray-500 mt-3">
          Ketuk layar atau tekan <b>SPASI</b> untuk loncat.
        </p>
      )}
    </div>
  );
};

// 3B. Action Phase wrapper: Flood — chains backpack → escape
type FloodDoneDetail = { usefulPicked: number; usefulTotal: number; survived: boolean };

const FloodAction = ({
  onComplete,
  onReplay,
  playSound,
  updateSideNarrator,
}: {
  onComplete: (score: number, detail: FloodDoneDetail) => void;
  onReplay?: () => void;
  playSound: (type: string) => void;
  updateSideNarrator?: (message: string, isTyping?: boolean, status?: 'idle' | 'warning' | 'success' | 'error') => void;
}) => {
  const [subPhase, setSubPhase] = useState<'BACKPACK' | 'ESCAPE'>('BACKPACK');
  const backpackResultRef = useRef<{ score: number; usefulPicked: number } | null>(null);

  return (
    <AnimatePresence mode="wait">
      {subPhase === 'BACKPACK' && (
        <MotionDiv
          key="backpack"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
        >
          <FloodBackpack
            playSound={playSound}
            updateSideNarrator={updateSideNarrator}
            onDone={(score, detail) => {
              backpackResultRef.current = { score, usefulPicked: detail.usefulPicked };
              setSubPhase('ESCAPE');
            }}
          />
        </MotionDiv>
      )}
      {subPhase === 'ESCAPE' && (
        <MotionDiv
          key="escape"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
        >
          <FloodEscape
            playSound={playSound}
            updateSideNarrator={updateSideNarrator}
            onReplay={onReplay}
            onDone={(escapeScore, escapeDetail) => {
              const bp = backpackResultRef.current ?? { score: 0, usefulPicked: 0 };
              const final = Math.round((bp.score + escapeScore) / 2);
              onComplete(final, {
                usefulPicked: bp.usefulPicked,
                usefulTotal: FLOOD_BAG_USEFUL_COUNT,
                survived: escapeDetail.survived,
              });
            }}
          />
        </MotionDiv>
      )}
    </AnimatePresence>
  );
};

// 3C. Action Phase: Volcano — FASE 1: Kenali Tanda-Tanda Erupsi
// The player watches a calm volcano. After ~5s idle, a volcanic tremor strikes
// (panic sprite + screen shake). Then three eruption warning signs appear one by
// one with fitting entrance effects: dark smoke rising from the crater, panicked
// birds fleeing the mountain, and cracks splitting the ground. The player must
// click all three; each correct click stamps a green check. Spotting all three
// completes Fase 1. (Fase 2 — evakuasi — akan menyusul di sini nanti.)
type VolcanoSignId = 'smoke' | 'birds' | 'crack';

interface VolcanoSignDef {
  id: VolcanoSignId;
  label: string;
  feedback: string;
  // position of the clickable hit-area inside the scene (percentages)
  pos: { left: string; top: string; width: string };
}

const VOLCANO_SIGNS: VolcanoSignDef[] = [
  {
    id: 'smoke',
    label: 'Asap Gelap',
    feedback: 'Betul! Asap tebal kehitaman keluar dari kawah — tanda magma naik dan gunung mau erupsi.',
    pos: { left: '10%', top: '1%', width: '17%' },
  },
  {
    id: 'birds',
    label: 'Hewan Panik',
    feedback: 'Tepat! Hewan punya insting kuat — mereka lari & terbang turun gunung sebelum erupsi. Percayai nalurinya!',
    pos: { left: '44%', top: '14%', width: '16%' },
  },
  {
    id: 'crack',
    label: 'Retakan di Gunung',
    feedback: 'Benar! Lereng gunung retak akibat tekanan magma dan gempa vulkanik. Ini tanda bahaya yang nyata.',
    pos: { left: '27%', top: '36%', width: '12%' },
  },
];

const VolcanoAction = ({ onComplete, onReplay, playSound, updateSideNarrator }: { onComplete: (score: number) => void, onReplay?: () => void, playSound: (type: string) => void, updateSideNarrator: (msg: string, typing: boolean, st: 'idle' | 'warning' | 'success' | 'error') => void }) => {
  // Stage machine:
  //   FASE 1 -> IDLE (calm) -> QUAKE (tremor + signs) -> SIGNS (click all 3)
  //   FASE 2 -> DODGE (avoid volcanic rocks) -> RESCUE (car pickup) -> DONE
  const [stage, setStage] = useState<'IDLE' | 'QUAKE' | 'SIGNS' | 'DODGE' | 'RESCUE' | 'DONE' | 'GAMEOVER'>('IDLE');
  const [shake, setShake] = useState(false);
  const [visibleSigns, setVisibleSigns] = useState<VolcanoSignId[]>([]);
  const [found, setFound] = useState<VolcanoSignId[]>([]);

  // FASE 2 state
  const [playerX, setPlayerX] = useState(15);      // player horizontal position (%)
  const [health, setHealth] = useState(100);
  const [timeLeft, setTimeLeft] = useState(20);     // seconds to survive
  const [rocks, setRocks] = useState<{ id: number; x: number; y: number }[]>([]);
  const [carPickedUp, setCarPickedUp] = useState(false);
  const [runFrame, setRunFrame] = useState(1);        // player run animation frame (1 or 2)
  const [moving, setMoving] = useState(false);         // is the player actively moving?
  const [facingRight, setFacingRight] = useState(true);

  const playerXRef = useRef(15);
  const healthRef = useRef(100);
  const diedRef = useRef(false);
  const rocksRef = useRef<{ id: number; x: number; y: number }[]>([]);
  const rockId = useRef(0);
  const moveDirRef = useRef(0);   // -1 = left, 1 = right, 0 = still
  useEffect(() => { playerXRef.current = playerX; }, [playerX]);

  // Rescue-car trajectory (also used to time the pickup so the player vanishes
  // exactly when the car's body reaches them, not when it reaches the far edge)
  const CAR_START = -34, CAR_END = 118, CAR_W = 26, CAR_DUR = 5.5;
  const PLAYER_SPEED = 0.6;       // % of scene width moved per ~16ms tick (smooth glide)

  // Press-and-hold to glide continuously; release to stop.
  const startMove = (dir: number) => {
    moveDirRef.current = dir;
    setFacingRight(dir > 0);
    setMoving(true);
  };
  const stopMove = () => {
    moveDirRef.current = 0;
    setMoving(false);
  };

  const allFound = found.length === VOLCANO_SIGNS.length;
  const isPhase2 = stage === 'DODGE' || stage === 'RESCUE' || stage === 'DONE' || stage === 'GAMEOVER';

  // FASE 1 — intro + 5s calm before the volcanic tremor
  useEffect(() => {
    updateSideNarrator("Amati gunung berapi dengan tenang... perhatikan kalau ada yang tidak biasa.", false, 'idle');
    const t = window.setTimeout(() => {
      setStage('QUAKE');
      setShake(true);
      playSound('earthquake');
      updateSideNarrator("Gempa vulkanik! Tanah bergetar hebat... ini pertanda bahaya!", false, 'warning');
    }, 5000);
    return () => window.clearTimeout(t);
  }, []);

  // FASE 1 — signs pop in WHILE the ground shakes, then it settles
  useEffect(() => {
    if (stage !== 'QUAKE') return;
    const order: VolcanoSignId[] = ['smoke', 'birds', 'crack'];
    const revealTimers = order.map((s, i) => window.setTimeout(() => {
      setVisibleSigns(prev => prev.includes(s) ? prev : [...prev, s]);
      playSound('whoosh');
    }, 400 + i * 600));
    const settle = window.setTimeout(() => {
      setShake(false);
      setStage('SIGNS');
      updateSideNarrator("Ada yang berubah di sekitar gunung! Klik semua tanda gunung mau erupsi.", false, 'warning');
    }, 400 + 2 * 600 + 900);
    return () => { revealTimers.forEach(t => window.clearTimeout(t)); window.clearTimeout(settle); };
  }, [stage]);

  const handleSignClick = (id: VolcanoSignId) => {
    if (found.includes(id) || !visibleSigns.includes(id)) return;
    const next = [...found, id];
    setFound(next);
    playSound('success');
    const info = VOLCANO_SIGNS.find(s => s.id === id)!;
    updateSideNarrator(info.feedback, false, 'success');

    if (next.length === VOLCANO_SIGNS.length) {
      // All signs recognised -> start FASE 2 (dodge the rocks)
      window.setTimeout(() => {
        setStage('DODGE');
        updateSideNarrator("Semua tanda dikenali! Gunung mulai erupsi — batu vulkanik berjatuhan. Lari KIRI & KANAN untuk menghindar!", false, 'warning');
      }, 1100);
    }
  };

  // FASE 2 — DODGE: spawn rocks from the top-right at 45°, move them, detect hits
  useEffect(() => {
    if (stage !== 'DODGE') return;

    const timer = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          window.clearInterval(timer);
          setStage('RESCUE');
          return 0;
        }
        if (prev <= 4) playSound('countdown');
        return prev - 1;
      });
    }, 1000);

    const spawn = window.setInterval(() => {
      // start near the top-right; move down-left at 45°
      const nr = { id: rockId.current++, x: 60 + Math.random() * 45, y: -8 };
      rocksRef.current = [...rocksRef.current, nr];
      setRocks(rocksRef.current);
      playSound('explosion');
    }, 780);

    const move = window.setInterval(() => {
      const px = playerXRef.current;
      let hits = 0;
      const survivors: { id: number; x: number; y: number }[] = [];
      for (const r0 of rocksRef.current) {
        // 45° visual: scene is 2:1, so dy% must be 2x dx% for equal on-screen slope
        const r = { ...r0, x: r0.x - 1.6, y: r0.y + 3.2 };
        if (r.y > 106 || r.x < -12) continue; // left the scene
        const inBand = r.y >= 68 && r.y <= 88;
        const overlap = Math.abs(r.x - px) < 7;
        if (inBand && overlap) { hits++; continue; } // consumed by the hit
        survivors.push(r);
      }
      rocksRef.current = survivors;
      setRocks(survivors);
      if (hits > 0 && !diedRef.current) {
        healthRef.current = Math.max(0, healthRef.current - 12 * hits);
        setHealth(healthRef.current);
        playSound('error');
        // Health depleted -> game over (stop dodging, no rescue).
        if (healthRef.current <= 0) {
          diedRef.current = true;
          setStage('GAMEOVER');
          updateSideNarrator('Aduh! Kamu tertimpa batuan vulkanik. Ayo coba lagi dan hindari batunya!', false, 'error');
        }
      }
    }, 50);

    return () => { window.clearInterval(timer); window.clearInterval(spawn); window.clearInterval(move); };
  }, [stage]);

  // FASE 2 — smooth continuous movement + keyboard hold controls + run animation
  useEffect(() => {
    if (stage !== 'DODGE') return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') startMove(-1);
      else if (e.key === 'ArrowRight') startMove(1);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if ((e.key === 'ArrowLeft' && moveDirRef.current < 0) || (e.key === 'ArrowRight' && moveDirRef.current > 0)) stopMove();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // ~60fps glide loop — moves the player smoothly while a direction is held
    const loop = window.setInterval(() => {
      const d = moveDirRef.current;
      if (d !== 0) setPlayerX(x => Math.max(8, Math.min(92, x + d * PLAYER_SPEED)));
    }, 16);

    // Alternate the two run frames while moving
    const anim = window.setInterval(() => setRunFrame(f => (f === 1 ? 2 : 1)), 130);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.clearInterval(loop);
      window.clearInterval(anim);
      moveDirRef.current = 0;
    };
  }, [stage]);

  // FASE 2 — RESCUE: the car drives in, scoops up the player, then it's done
  useEffect(() => {
    if (stage !== 'RESCUE') return;
    setRocks([]); rocksRef.current = [];
    updateSideNarrator("Mobil penyelamat datang menjemput! Ayo naik dan menjauh dari zona bahaya. 🚗", false, 'success');
    playSound('levelStart');
    // Hide the player exactly when the car's body reaches them (car center meets playerX),
    // not when the car arrives at the far edge.
    const px = playerXRef.current;
    const f = Math.min(1, Math.max(0, ((px - CAR_W / 2) - CAR_START) / (CAR_END - CAR_START)));
    const pickupMs = Math.round(f * CAR_DUR * 1000);
    const pickup = window.setTimeout(() => { setCarPickedUp(true); playSound('success'); }, pickupMs);
    const done = window.setTimeout(() => {
      setStage('DONE');
      updateSideNarrator("Selamat! Kamu berhasil dievakuasi dari erupsi. Lanjut ke kuis pemulihan ya!", false, 'success');
    }, CAR_DUR * 1000 + 400);
    return () => { window.clearTimeout(pickup); window.clearTimeout(done); };
  }, [stage]);

  // Survived the eruption -> at least 30; died (health depleted) -> 0.
  const finalScore = stage === 'GAMEOVER' ? 0 : Math.max(30, health);

  // Player sprite: run-frame animation while moving in the dodge, panicked during
  // tremor/spotting/standing-in-danger, calm otherwise.
  const playerSprite =
    stage === 'DODGE'
      ? (moving ? `/assets/player-run-${runFrame}.png` : '/assets/player-panic.png')
      : (stage === 'QUAKE' || (stage === 'SIGNS' && !allFound))
        ? '/assets/player-panic.png'
        : '/assets/player-idle.png';

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-3xl p-5 sm:p-8 border-b-8 border-orange-200 overflow-hidden">
      {/* Header: phase label + progress / vitals */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="text-xs font-black uppercase tracking-wider bg-orange-100 text-orange-700 px-3 py-1 rounded-full">
          {isPhase2 ? 'Fase 2 · Hindari Batuan' : 'Fase 1 · Kenali Tanda'}
        </div>

        {isPhase2 ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Heart className={health < 30 ? 'text-red-500 animate-pulse' : 'text-red-400'} fill="currentColor" size={18} />
              <div className="w-24 h-3 bg-gray-200 rounded-full overflow-hidden">
                <MotionDiv className={`h-full ${health < 30 ? 'bg-red-600' : 'bg-red-500'}`} animate={{ width: `${health}%` }} />
              </div>
            </div>
            {stage === 'DODGE' && (
              <div className={`font-mono font-black text-lg ${timeLeft <= 3 ? 'text-red-600' : 'text-gray-700'}`}>
                00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase hidden sm:inline">Tanda ditemukan</span>
            <div className="flex gap-1">
              {VOLCANO_SIGNS.map(s => (
                <div
                  key={s.id}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-black border-2 transition-colors ${found.includes(s.id) ? 'bg-green-100 border-green-400 text-green-600' : 'bg-gray-50 border-gray-200 text-gray-300'}`}
                >
                  {found.includes(s.id) ? '✓' : '?'}
                </div>
              ))}
            </div>
            <span className="font-mono font-black text-gray-700 text-lg">{found.length}/{VOLCANO_SIGNS.length}</span>
          </div>
        )}
      </div>

      {/* Scene */}
      <MotionDiv
        className="relative w-full rounded-2xl border-4 border-orange-200 overflow-hidden select-none"
        style={{
          aspectRatio: '2 / 1',
          backgroundImage: "url('/assets/volcano-bg.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        animate={shake ? { x: [0, -8, 7, -6, 5, -3, 0], y: [0, 4, -3, 3, -2, 0] } : { x: 0, y: 0 }}
        transition={shake ? { duration: 0.4, repeat: Infinity } : { duration: 0.2 }}
      >
        {/* IDLE hint */}
        {stage === 'IDLE' && (
          <MotionDiv
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-black/55 text-white text-xs sm:text-sm font-bold px-4 py-2 rounded-full backdrop-blur-sm"
          >
            👀 Amati gunung dengan saksama...
          </MotionDiv>
        )}

        {/* QUAKE banner */}
        {stage === 'QUAKE' && (
          <MotionDiv
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: [1, 1.08, 1], opacity: 1 }}
            transition={{ repeat: Infinity, duration: 0.5 }}
            className="absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-red-600 text-white text-sm sm:text-base font-black px-5 py-2 rounded-full shadow-lg flex items-center gap-2"
          >
            ⚠️ GEMPA VULKANIK!
          </MotionDiv>
        )}

        {/* SIGNS prompt */}
        {stage === 'SIGNS' && !allFound && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-orange-500/90 text-white text-xs sm:text-sm font-black px-4 py-2 rounded-full shadow-lg"
          >
            👆 Klik semua tanda gunung mau erupsi!
          </MotionDiv>
        )}

        {/* DODGE prompt */}
        {stage === 'DODGE' && (
          <MotionDiv
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: [1, 1.06, 1] }}
            transition={{ repeat: Infinity, duration: 0.6 }}
            className="absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-red-600/90 text-white text-xs sm:text-sm font-black px-4 py-2 rounded-full shadow-lg"
          >
            ☄️ Hindari batuan vulkanik! Gerak kiri / kanan!
          </MotionDiv>
        )}

        {/* ---- SIGN 1: Dark smoke rising from the crater (kept visible in FASE 2) ---- */}
        <AnimatePresence>
          {visibleSigns.includes('smoke') && (
            <MotionButton
              key="smoke"
              type="button"
              onClick={() => handleSignClick('smoke')}
              initial={{ opacity: 0, y: 40, scale: 0.5 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', bounce: 0.35, duration: 0.9 }}
              whileHover={!found.includes('smoke') ? { scale: 1.06 } : {}}
              whileTap={!found.includes('smoke') ? { scale: 0.95 } : {}}
              className="absolute z-20 cursor-pointer outline-none focus:outline-none focus-visible:outline-none"
              style={{ left: VOLCANO_SIGNS[0].pos.left, top: VOLCANO_SIGNS[0].pos.top, width: VOLCANO_SIGNS[0].pos.width }}
            >
              <MotionDiv
                animate={{ y: [0, -6, 0], scale: [1, 1.03, 1] }}
                transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                className="flex items-end justify-end"
              >
                {/* Two overlapping smoke images -> one bigger, denser plume above the crater. */}
                <img src="/assets/volcano-smoke.png" alt="Asap gelap" draggable={false} className="w-[64%] h-auto pointer-events-none drop-shadow-lg" />
                <img src="/assets/volcano-smoke.png" alt="" draggable={false} className="w-[64%] h-auto pointer-events-none drop-shadow-lg -ml-[45%]" />
              </MotionDiv>
              {found.includes('smoke') && <SignCheck />}
            </MotionButton>
          )}
        </AnimatePresence>

        {/* ---- SIGN 2: Panicked birds fleeing the mountain ---- */}
        <AnimatePresence>
          {visibleSigns.includes('birds') && (
            <MotionButton
              key="birds"
              type="button"
              onClick={() => handleSignClick('birds')}
              initial={{ opacity: 0, x: -60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              whileHover={!found.includes('birds') ? { scale: 1.06 } : {}}
              whileTap={!found.includes('birds') ? { scale: 0.95 } : {}}
              className="absolute z-20 cursor-pointer outline-none focus:outline-none focus-visible:outline-none"
              style={{ left: VOLCANO_SIGNS[1].pos.left, top: VOLCANO_SIGNS[1].pos.top, width: VOLCANO_SIGNS[1].pos.width }}
            >
              <MotionDiv
                animate={{ x: [0, 10, 0], y: [0, -5, 0] }}
                transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
              >
                <img src="/assets/panic-birds.png" alt="Burung panik" draggable={false} className="w-full h-auto pointer-events-none drop-shadow" />
              </MotionDiv>
              {found.includes('birds') && <SignCheck />}
            </MotionButton>
          )}
        </AnimatePresence>

        {/* ---- SIGN 3: Cracks splitting the ground ---- */}
        <AnimatePresence>
          {visibleSigns.includes('crack') && (
            <MotionButton
              key="crack"
              type="button"
              onClick={() => handleSignClick('crack')}
              initial={false}
              whileHover={!found.includes('crack') ? { scale: 1.06 } : {}}
              whileTap={!found.includes('crack') ? { scale: 0.95 } : {}}
              className="absolute z-20 cursor-pointer outline-none focus:outline-none focus-visible:outline-none"
              style={{ left: VOLCANO_SIGNS[2].pos.left, top: VOLCANO_SIGNS[2].pos.top, width: VOLCANO_SIGNS[2].pos.width }}
            >
              <img src="/assets/volcano-crack.png" alt="Tanah retak" draggable={false} className="w-full h-auto pointer-events-none drop-shadow-md" />
              {found.includes('crack') && <SignCheck />}
            </MotionButton>
          )}
        </AnimatePresence>

        {/* Falling volcanic rocks — from the top-right at 45° */}
        {stage === 'DODGE' && rocks.map(r => (
          <div
            key={r.id}
            className="absolute z-30 pointer-events-none"
            style={{ left: `${r.x}%`, top: `${r.y}%`, width: '9%', transform: 'translate(-50%, -50%)' }}
          >
            <img src="/assets/volcano-rock.png" alt="" draggable={false} className="w-full h-auto drop-shadow-lg" />
          </div>
        ))}

        {/* Player — fixed at the left in FASE 1, movable in FASE 2 */}
        {!carPickedUp && (
          <MotionDiv
            className="absolute z-30"
            style={{ left: `${playerX}%`, bottom: '20%', width: '58px', transform: 'translateX(-50%)' }}
            animate={stage === 'QUAKE' ? { rotate: [0, -4, 4, -3, 0] } : { rotate: 0 }}
            transition={stage === 'QUAKE' ? { repeat: Infinity, duration: 0.35 } : { duration: 0.15 }}
          >
            <img
              src={playerSprite}
              alt="Pemain"
              draggable={false}
              style={{ width: '100%', height: 'auto', objectFit: 'contain', imageRendering: 'auto', transform: facingRight ? 'none' : 'scaleX(-1)' }}
              className="drop-shadow-xl"
            />
          </MotionDiv>
        )}

        {/* Rescue car — drives across the road (faces right) and scoops up the player */}
        {stage === 'RESCUE' && (
          <MotionDiv
            className="absolute z-30"
            style={{ bottom: '15%', width: `${CAR_W}%` }}
            initial={{ left: `${CAR_START}%` }}
            animate={{ left: `${CAR_END}%` }}
            transition={{ duration: CAR_DUR, ease: 'linear' }}
          >
            <img src="/assets/rescue-car.png" alt="Mobil penyelamat" draggable={false} className="w-full h-auto drop-shadow-2xl" />
          </MotionDiv>
        )}

        {/* Completion overlay */}
        <AnimatePresence>
          {stage === 'DONE' && (
            <MotionDiv
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-40 bg-black/55 flex items-center justify-center"
            >
              <MotionDiv
                initial={{ scale: 0, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: 'spring', bounce: 0.5 }}
                className="text-center text-white px-6"
              >
                <div className="text-6xl mb-2">🚗✅</div>
                <p className="text-2xl font-display font-black mb-1">Berhasil Dievakuasi!</p>
                <p className="text-sm text-white/80">Kamu mengenali tanda erupsi, menghindari batu vulkanik, dan dijemput mobil penyelamat.</p>
              </MotionDiv>
            </MotionDiv>
          )}
          {stage === 'GAMEOVER' && (
            <MotionDiv
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-40 bg-black/65 flex items-center justify-center"
            >
              <MotionDiv
                initial={{ scale: 0, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: 'spring', bounce: 0.5 }}
                className="text-center text-white px-6"
              >
                <div className="text-6xl mb-2">🪨💥</div>
                <p className="text-2xl font-display font-black mb-1">Tertimpa Batuan!</p>
                <p className="text-sm text-white/80">Nyawamu habis terkena batu vulkanik. Coba lagi dan lebih gesit menghindar!</p>
              </MotionDiv>
            </MotionDiv>
          )}
        </AnimatePresence>
      </MotionDiv>

      {/* Controls / footer */}
      <div className="mt-5">
        {stage === 'DONE' || stage === 'GAMEOVER' ? (
          <div className="flex flex-col sm:flex-row gap-2">
            {onReplay && (
              <Button onClick={onReplay} variant="secondary" size="lg" className="flex-1" playSound={() => { }}>
                <RefreshCw className="mr-1" size={18} /> Ulangi Game
              </Button>
            )}
            <Button onClick={() => { playSound('click'); onComplete(finalScore); }} variant="success" size="lg" className="flex-1" playSound={() => { }}>
              Lanjut ke Kuis <ChevronRight className="ml-1" />
            </Button>
          </div>
        ) : stage === 'DODGE' ? (
          <div className="w-full flex gap-2">
            <Button
              onPointerDown={() => startMove(-1)}
              onPointerUp={stopMove}
              onPointerLeave={stopMove}
              onPointerCancel={stopMove}
              className="flex-1 bg-orange-500 shadow-orange-700 select-none touch-none"
              playSound={() => { }}
            >
              ← KIRI
            </Button>
            <Button
              onPointerDown={() => startMove(1)}
              onPointerUp={stopMove}
              onPointerLeave={stopMove}
              onPointerCancel={stopMove}
              className="flex-1 bg-orange-500 shadow-orange-700 select-none touch-none"
              playSound={() => { }}
            >
              KANAN →
            </Button>
          </div>
        ) : stage === 'RESCUE' ? (
          <p className="text-center text-sm font-bold text-emerald-600">🚗 Mobil penyelamat menjemputmu...</p>
        ) : (
          <p className="text-center text-xs text-gray-500">
            💡 Tanda erupsi: asap gelap dari kawah, hewan turun gunung, dan tanah retak. Klik ketiganya!
          </p>
        )}
      </div>
    </div>
  );
};

// Green check stamp shown on a correctly spotted sign
const SignCheck = () => (
  <MotionDiv
    initial={{ scale: 0, rotate: -30, opacity: 0 }}
    animate={{ scale: 1, rotate: 0, opacity: 1 }}
    transition={{ type: 'spring', bounce: 0.6, duration: 0.6 }}
    className="absolute -top-3 -right-3 z-40 pointer-events-none"
    style={{ width: '44px', height: '44px' }}
  >
    <img src="/assets/check.png" alt="Benar" draggable={false} className="w-full h-full object-contain drop-shadow-lg" />
  </MotionDiv>
);

// 3D. Action Phase: Landslide — Run Across the Crumbling Ridge
// The rain-soaked ridge is giving way. Every ground tile CRACKS the moment the
// player steps on it (step detection), a short per-tile countdown (fuse) burns,
// then the tile crumbles into the ravine below. Run RIGHT to the solid safe
// hill before the ground under your feet disappears — standing still (or
// running back over broken ground) drops the player into the gap: game over.
type LsTileState = 'INTACT' | 'CRACKING' | 'FALLING' | 'GONE';
type LsTile = { id: number; state: LsTileState; crackAt: number; fallAt: number; fuse: number };
type LsRock = { id: number; x: number; y: number };

const LandslideAction = ({ onComplete, onReplay, playSound, updateSideNarrator }: { onComplete: (score: number, health: number) => void, onReplay?: () => void, playSound: (type: string) => void, updateSideNarrator: (msg: string, typing: boolean, st: 'idle' | 'warning' | 'success' | 'error') => void }) => {
  const SCENE_H = 420;           // scene height (px)
  const GROUND_H = 96;           // crumbling ground strip height (px)
  const TILE_COUNT = 35;         // tiles across the run track (world ~2.5 screens wide)
  const SAFE_START = 210;        // world-x% where the solid safe hill begins (never crumbles)
  const TILE_W = SAFE_START / TILE_COUNT; // one tile's width (%)
  const WIN_X = 222;             // reach this world-x% to finish
  const CAM_MAX = 150;           // camera stops here so the safe hill fills the view
  const SPEED = 0.015;           // player speed (% of scene width per ms) — full track ~14s
  const GRACE_MS = 1500;         // opening grace — tiles don't crack yet
  const ROCK_GRACE_MS = 3000;    // rockfall obstacles start after this
  const ROCK_SPEED = 0.38;       // rockfall speed (px per ms)
  const GROUND_TOP = SCENE_H - GROUND_H; // y (px) of the ground surface
  const FALL_ANIM_MS = 850;      // broken tile drop animation duration

  const [gameState, setGameState] = useState<'READY' | 'PLAYING' | 'FALLING' | 'FINISHED'>('READY');
  const [survived, setSurvived] = useState(false);
  const [px, setPx] = useState(3);
  const [tiles, setTiles] = useState<LsTile[]>([]);
  const [runFrame, setRunFrame] = useState<1 | 2>(1);
  const [moving, setMoving] = useState(false);
  const [facingRight, setFacingRight] = useState(true);
  const [reachedSafe, setReachedSafe] = useState(false);
  const [rocks, setRocks] = useState<LsRock[]>([]);
  const [hearts, setHearts] = useState(3);
  const [hitFlash, setHitFlash] = useState(false);
  const [deathCause, setDeathCause] = useState<'fall' | 'rock' | null>(null);

  const stateRef = useRef<'READY' | 'PLAYING' | 'FALLING' | 'FINISHED'>('READY');
  const pxRef = useRef(3);
  const furthestRef = useRef(3);
  const dirRef = useRef(0);
  const tilesRef = useRef<LsTile[]>([]);
  const reachedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef(0);
  const startAtRef = useRef(0);
  const lastBoomRef = useRef(0);
  const rocksRef = useRef<LsRock[]>([]);
  const nextRockId = useRef(0);
  const rockAccRef = useRef(0);
  const rockGapRef = useRef(1200);
  const heartsRef = useRef(3);
  const lastHitRef = useRef(0);

  // Per-mount random tile decorations so each run looks a little different
  const tileDeco = useMemo(() =>
    Array.from({ length: TILE_COUNT }, () => {
      const r = Math.random();
      return r < 0.2 ? '🌿' : r < 0.36 ? '🌱' : r < 0.46 ? '🪨' : r < 0.54 ? '🌼' : '';
    }), []);

  const stopLoop = useCallback(() => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);
  useEffect(() => () => stopLoop(), [stopLoop]);

  const finish = useCallback((didSurvive: boolean) => {
    stopLoop();
    stateRef.current = 'FINISHED';
    setGameState('FINISHED');
    setSurvived(didSurvive);
    playSound(didSurvive ? 'success' : 'error');
    updateSideNarrator(
      didSurvive
        ? 'Hebat! Kamu terus bergerak tanpa berhenti dan sampai di bukit aman!'
        : 'Tanahnya runtuh sebelum kamu lewat! Ingat: saat longsor jangan berhenti — terus lari ke tanah yang stabil.',
      false,
      didSurvive ? 'success' : 'error'
    );
  }, [playSound, stopLoop, updateSideNarrator]);

  const startMove = (dir: number) => {
    if (stateRef.current !== 'PLAYING') return;
    dirRef.current = dir;
    setFacingRight(dir > 0);
    setMoving(true);
  };
  const stopMove = () => { dirRef.current = 0; setMoving(false); };

  const startGame = () => {
    const fresh: LsTile[] = Array.from({ length: TILE_COUNT }, (_, i) => ({
      id: i, state: 'INTACT', crackAt: 0, fallAt: 0, fuse: 900 + Math.random() * 500,
    }));
    tilesRef.current = fresh;
    setTiles(fresh);
    pxRef.current = 3; setPx(3);
    furthestRef.current = 3;
    dirRef.current = 0; setMoving(false); setFacingRight(true);
    reachedRef.current = false; setReachedSafe(false);
    setSurvived(false);
    setDeathCause(null);
    rocksRef.current = []; setRocks([]);
    nextRockId.current = 0;
    rockAccRef.current = 0;
    rockGapRef.current = 1200;
    heartsRef.current = 3; setHearts(3);
    lastHitRef.current = 0;
    setHitFlash(false);
    stateRef.current = 'PLAYING';
    setGameState('PLAYING');
    startAtRef.current = performance.now();
    lastRef.current = performance.now();
    playSound('levelStart');
    updateSideNarrator('Tanahnya rapuh! Terus lari ke kanan menuju bukit aman — jangan berhenti!', false, 'warning');

    const tick = (now: number) => {
      if (stateRef.current !== 'PLAYING') return;
      const dt = Math.min(50, now - lastRef.current);
      lastRef.current = now;
      const elapsed = now - startAtRef.current;

      // Move the runner
      const d = dirRef.current;
      if (d !== 0) {
        pxRef.current = Math.max(2, Math.min(WIN_X, pxRef.current + d * SPEED * dt));
        setPx(pxRef.current);
        furthestRef.current = Math.max(furthestRef.current, pxRef.current);
        setRunFrame(Math.floor(now / 160) % 2 === 0 ? 1 : 2);
      }

      const p = pxRef.current;
      const onTrack = p < SAFE_START;
      const idx = onTrack ? Math.max(0, Math.min(TILE_COUNT - 1, Math.floor(p / TILE_W))) : -1;

      let changed = false;

      // STEP DETECTION — the tile under the player's feet starts its own fuse
      if (onTrack && elapsed > GRACE_MS) {
        const t = tilesRef.current[idx];
        if (t.state === 'INTACT') { t.state = 'CRACKING'; t.crackAt = now; changed = true; }
      }

      // Advance every burning fuse: CRACKING -> (countdown ends) -> FALLING -> GONE
      for (const t of tilesRef.current) {
        if (t.state === 'CRACKING' && now - t.crackAt >= t.fuse) {
          t.state = 'FALLING'; t.fallAt = now; changed = true;
          if (now - lastBoomRef.current > 200) { lastBoomRef.current = now; playSound('explosion'); }
        } else if (t.state === 'FALLING' && now - t.fallAt >= FALL_ANIM_MS) {
          t.state = 'GONE'; changed = true;
        }
      }
      if (changed) setTiles([...tilesRef.current]);

      // Standing on broken ground -> fall into the ravine (game over)
      if (onTrack && (tilesRef.current[idx].state === 'FALLING' || tilesRef.current[idx].state === 'GONE')) {
        stateRef.current = 'FALLING';
        setGameState('FALLING');
        setDeathCause('fall');
        dirRef.current = 0; setMoving(false);
        playSound('error');
        updateSideNarrator('Aaah! Tanahnya runtuh sebelum kamu sempat lewat!', false, 'error');
        window.setTimeout(() => finish(false), 900);
        return;
      }

      // OBSTACLE: rocks tumble from the slope ahead — a growing ground shadow
      // telegraphs where each one lands. Getting hit costs a heart.
      if (elapsed > ROCK_GRACE_MS && p < SAFE_START - 4) {
        rockAccRef.current += dt;
        if (rockAccRef.current >= rockGapRef.current) {
          rockAccRef.current = 0;
          rockGapRef.current = 900 + Math.random() * 600;
          const wx = Math.min(SAFE_START - 3, p + 12 + Math.random() * 26);
          rocksRef.current = [...rocksRef.current, { id: nextRockId.current++, x: wx, y: -36 }];
          playSound('whoosh');
        }
      }
      if (rocksRef.current.length > 0) {
        const survivors: LsRock[] = [];
        for (const r of rocksRef.current) {
          const ny = r.y + ROCK_SPEED * dt;
          if (ny >= GROUND_TOP - 40) {
            // Rock reaches the ground — does it hit the runner?
            if (p < SAFE_START && Math.abs(r.x - p) < 5.5 && now - lastHitRef.current > 900) {
              lastHitRef.current = now;
              heartsRef.current = Math.max(0, heartsRef.current - 1);
              setHearts(heartsRef.current);
              setHitFlash(true);
              window.setTimeout(() => setHitFlash(false), 350);
              playSound('explosion');
              if (heartsRef.current <= 0) {
                stateRef.current = 'FALLING';
                setGameState('FALLING');
                setDeathCause('rock');
                dirRef.current = 0; setMoving(false);
                updateSideNarrator('Kamu tertimpa batuan longsor! Perhatikan bayangan batu lalu atur langkahmu.', false, 'error');
                window.setTimeout(() => finish(false), 900);
                return;
              }
              updateSideNarrator('Aduh, kena batu! Lihat bayangan di tanah untuk menghindar!', false, 'warning');
            }
            continue; // rock shattered on the ground
          }
          survivors.push({ ...r, y: ny });
        }
        rocksRef.current = survivors;
        setRocks(survivors);
      }

      // Safe-hill feedback + win
      if (!reachedRef.current && p >= SAFE_START) {
        reachedRef.current = true;
        setReachedSafe(true);
        playSound('shield');
      }
      if (p >= WIN_X) { finish(true); return; }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  // Keyboard: hold ← / → to run
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (stateRef.current !== 'PLAYING') return;
      if (e.key === 'ArrowRight') { startMove(1); e.preventDefault(); }
      else if (e.key === 'ArrowLeft') { startMove(-1); e.preventDefault(); }
    };
    const up = (e: KeyboardEvent) => {
      if ((e.key === 'ArrowRight' && dirRef.current > 0) || (e.key === 'ArrowLeft' && dirRef.current < 0)) stopMove();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  // Score: reach the hill -> full marks minus rock hits; fall -> partial credit for distance
  const finalScore = () => survived
    ? Math.max(60, 100 - (3 - heartsRef.current) * 12)
    : Math.max(10, Math.round((furthestRef.current / SAFE_START) * 45));

  // Camera follows the runner across the long track, then parks at the safe hill
  const camX = Math.min(CAM_MAX, Math.max(0, px - 32));
  const progressPct = Math.min(100, Math.round((px / WIN_X) * 100));
  const playerSprite =
    gameState === 'FALLING' ? '/assets/player-panic.png'
      : moving ? `/assets/player-run-${runFrame}.png`
        : '/assets/player-idle.png';

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-3xl p-6 sm:p-8 border-b-8 border-stone-200 overflow-hidden">
      {/* HUD: status chip + progress toward the safe hill */}
      <div className="flex justify-between items-center mb-4 gap-3">
        <div className={`text-xs font-black uppercase px-3 py-1 rounded-lg ${gameState === 'FALLING' ? 'bg-red-100 text-red-700' : reachedSafe ? 'bg-green-100 text-green-700' : gameState === 'PLAYING' ? 'bg-amber-100 text-amber-700 animate-pulse' : 'bg-stone-100 text-stone-600'}`}>
          {gameState === 'FALLING' ? '💥 TANAH RUNTUH!' : reachedSafe ? '✅ BUKIT AMAN' : '⚠️ TANAH RAPUH — TERUS LARI!'}
        </div>
        <div className="flex items-center gap-1 text-lg flex-shrink-0">
          {[0, 1, 2].map(i => <span key={i}>{i < hearts ? '❤️' : '🤍'}</span>)}
        </div>
        <div className="flex items-center gap-2 flex-1 max-w-[280px]">
          <span className="text-lg">🏃</span>
          <div className="flex-1 h-3 bg-stone-200 rounded-full overflow-hidden">
            <motion.div className="h-full bg-gradient-to-r from-amber-400 to-green-500" animate={{ width: `${progressPct}%` }} />
          </div>
          <span className="text-lg">🏠</span>
        </div>
      </div>

      {/* Scene */}
      <div className="relative rounded-2xl border-4 border-stone-300 mb-6 overflow-hidden select-none" style={{ height: `${SCENE_H}px` }}>
        {/* Stormy sky */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, #35455e 0%, #52688a 34%, #7e93ad 62%, #b3c2cd 100%)' }} />

        {/* Layered ridge backdrop + collapsed hillside (hand-drawn SVG),
            on a slow parallax layer so the long run reads as real distance */}
        <div className="absolute inset-y-0 left-0 pointer-events-none" style={{ width: '145%', transform: `translateX(${-camX * 0.18}%)` }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 420" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="lsMist" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="1" stopColor="#dfe8ee" stopOpacity="0.35" />
            </linearGradient>
          </defs>
          {/* far ridge */}
          <path d="M0 240 L90 160 L180 225 L290 130 L400 215 L520 150 L640 230 L760 155 L880 220 L1000 170 L1000 420 L0 420 Z" fill="#5e7391" opacity="0.55" />
          {/* mid ridge */}
          <path d="M0 285 L120 200 L250 275 L380 195 L520 280 L660 205 L800 275 L920 215 L1000 260 L1000 420 L0 420 Z" fill="#4a5f78" opacity="0.75" />
          {/* green hills */}
          <path d="M0 330 Q140 255 300 320 Q460 380 620 315 Q790 255 1000 325 L1000 420 L0 420 Z" fill="#3f6b46" />
          <path d="M0 355 Q200 300 420 350 Q640 398 1000 345 L1000 420 L0 420 Z" fill="#35583b" />
          {/* pine silhouettes */}
          <g fill="#274430">
            <path d="M180 300 l13 24 h-8 l10 18 h-30 l10 -18 h-8 Z" />
            <path d="M655 296 l14 26 h-9 l11 20 h-32 l11 -20 h-9 Z" />
            <path d="M700 305 l11 20 h-7 l9 16 h-26 l9 -16 h-7 Z" />
            <path d="M840 300 l12 22 h-8 l10 17 h-28 l10 -17 h-8 Z" />
          </g>
          {/* collapsed hillside on the left: exposed earth + slide scars */}
          <path d="M0 110 L70 145 L140 225 L205 300 L262 355 L300 420 L0 420 Z" fill="#7a4f2c" />
          <path d="M0 150 L55 180 L120 255 L180 325 L225 380 L245 420 L0 420 Z" fill="#8a5c35" />
          <g stroke="#5c3a1e" strokeWidth="6" strokeLinecap="round" opacity="0.65" fill="none">
            <path d="M40 170 Q90 230 150 300" />
            <path d="M80 195 Q140 262 205 340" />
            <path d="M22 225 Q70 285 122 362" />
          </g>
          <g fill="#9c6b3f">
            <ellipse cx="150" cy="312" rx="16" ry="11" />
            <ellipse cx="210" cy="362" rx="20" ry="13" />
            <ellipse cx="95" cy="258" rx="12" ry="9" />
          </g>
          {/* mist band above the ravine */}
          <rect x="0" y="290" width="1000" height="70" fill="url(#lsMist)" />
        </svg>

        {/* Decorative rocks tumbling down the broken hillside (parallax layer) */}
        <MotionDiv className="absolute text-xl pointer-events-none" style={{ left: '7%', top: 0 }} animate={{ x: [-6, -52], y: [130, 320], rotate: [0, 360], opacity: [0, 1, 1, 0] }} transition={{ repeat: Infinity, duration: 2.6, ease: 'easeIn' }}>🪨</MotionDiv>
        <MotionDiv className="absolute text-sm pointer-events-none" style={{ left: '12%', top: 0 }} animate={{ x: [0, -40], y: [170, 340], rotate: [0, -300], opacity: [0, 1, 1, 0] }} transition={{ repeat: Infinity, duration: 3.2, delay: 1.1, ease: 'easeIn' }}>🪨</MotionDiv>
        </div>

        {/* Drifting storm clouds */}
        <MotionDiv className="absolute rounded-full bg-white/15 blur-xl pointer-events-none" style={{ width: '220px', height: '58px', top: '26px', left: '12%' }} animate={{ x: [0, 60, 0] }} transition={{ repeat: Infinity, duration: 16, ease: 'easeInOut' }} />
        <MotionDiv className="absolute rounded-full bg-slate-900/20 blur-xl pointer-events-none" style={{ width: '300px', height: '70px', top: '8px', left: '48%' }} animate={{ x: [0, -80, 0] }} transition={{ repeat: Infinity, duration: 21, ease: 'easeInOut' }} />

        {/* Ravine under the track — revealed when tiles fall away */}
        <div className="absolute bottom-0 left-0 right-0" style={{ height: `${GROUND_H + 16}px`, background: 'linear-gradient(to bottom, #2c1d10 0%, #1a1008 45%, #0a0604 100%)' }}>
          <div className="absolute inset-x-0 top-0 h-3 bg-black/40" />
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.08) 1.5px, transparent 1.5px)', backgroundSize: '26px 22px' }} />
        </div>

        {/* Crumbling ground tiles (step -> crack -> countdown -> collapse) */}
        {tiles.map(t => {
          if (t.state === 'GONE') return null;
          const tileLeft = t.id * TILE_W - camX;
          if (tileLeft < -12 || tileLeft > 112) return null; // off-camera
          const falling = t.state === 'FALLING';
          return (
            <MotionDiv
              key={t.id}
              className={`absolute z-10 ${t.state === 'CRACKING' ? 'ls-tile-cracking' : ''}`}
              style={{ left: `${tileLeft}%`, width: `${TILE_W}%`, bottom: 0, height: `${GROUND_H}px` }}
              animate={falling ? { y: 340, rotate: t.id % 2 === 0 ? 14 : -12, opacity: 0 } : { y: 0, rotate: 0, opacity: 1 }}
              transition={falling ? { duration: FALL_ANIM_MS / 1000, ease: 'easeIn' } : { duration: 0 }}
            >
              {/* grass cap */}
              <div className="absolute top-0 left-0 right-0" style={{ height: '20px', background: 'linear-gradient(to bottom, #86c956 0%, #61a83e 55%, #4c8a30 100%)', borderTop: '3px solid #a5dd7a', boxShadow: 'inset -3px 0 0 rgba(0,0,0,0.08)' }} />
              {/* dirt body */}
              <div className="absolute left-0 right-0 bottom-0" style={{ top: '20px', background: 'linear-gradient(to bottom, #8a5a35 0%, #6f4527 55%, #54301a 100%)', boxShadow: 'inset -3px 0 0 rgba(0,0,0,0.12), inset 3px 0 0 rgba(255,255,255,0.05)' }}>
                <div className="absolute inset-0 opacity-35" style={{ backgroundImage: 'radial-gradient(rgba(0,0,0,0.35) 2px, transparent 2.5px), radial-gradient(rgba(255,255,255,0.12) 1.5px, transparent 2px)', backgroundSize: '22px 18px, 17px 13px', backgroundPosition: `${t.id * 7}px 3px, ${t.id * 5}px 9px` }} />
              </div>
              {/* decoration */}
              {tileDeco[t.id] && <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-base pointer-events-none">{tileDeco[t.id]}</div>}
              {/* cracks while the fuse burns */}
              {(t.state === 'CRACKING' || falling) && (
                <svg className="absolute inset-0 w-full h-full ls-crack-in" viewBox="0 0 60 96" preserveAspectRatio="none">
                  <g stroke="#2b1a10" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.9">
                    <path d="M30 0 L26 18 L34 34 L27 52 L33 70 L29 96" />
                    <path d="M30 22 L14 34 L8 52" />
                    <path d="M31 40 L46 50 L52 68" />
                  </g>
                </svg>
              )}
            </MotionDiv>
          );
        })}

        {/* Safe hill — solid ground that never crumbles */}
        <div className="absolute z-10 bottom-0" style={{ left: `${SAFE_START - camX}%`, width: '55%', height: `${GROUND_H + 30}px` }}>
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, #7cc24e 0%, #55a136 20%, #7a5233 21%, #5c3a20 70%, #472811 100%)', borderTopLeftRadius: '16px', boxShadow: 'inset 4px 3px 0 rgba(255,255,255,0.2)' }} />
          {/* tree + hut on the hill */}
          <div className="absolute text-3xl" style={{ left: '52%', bottom: 'calc(100% - 10px)' }}>🌳</div>
          <svg className="absolute" style={{ left: '26%', transform: 'translateX(-50%)', bottom: 'calc(100% - 8px)', width: '84px', height: '76px' }} viewBox="0 0 86 78" aria-hidden="true">
            <rect x="16" y="34" width="54" height="40" rx="3" fill="#a9743f" stroke="#7c5127" strokeWidth="2.5" />
            <path d="M8 38 L43 8 L78 38 Z" fill="#c9553f" stroke="#933b2b" strokeWidth="2.5" strokeLinejoin="round" />
            <rect x="36" y="50" width="14" height="24" rx="2" fill="#6b4526" stroke="#4f321b" strokeWidth="2" />
            <rect x="22" y="42" width="11" height="10" rx="1.5" fill="#cfe9f5" stroke="#7c5127" strokeWidth="2" />
            <rect x="53" y="42" width="11" height="10" rx="1.5" fill="#cfe9f5" stroke="#7c5127" strokeWidth="2" />
          </svg>
          {/* AMAN signpost at the hill's edge */}
          <div className="absolute flex flex-col items-center" style={{ left: '-2px', bottom: 'calc(100% - 6px)' }}>
            <div className="bg-green-600 text-white text-[10px] font-black px-2 py-0.5 rounded border-2 border-green-800 shadow">AMAN</div>
            <div className="w-1 h-4 bg-stone-600" />
          </div>
        </div>

        {/* Falling rock obstacles + their landing-spot shadows */}
        {rocks.map(r => {
          const rockLeft = r.x - camX;
          if (rockLeft < -8 || rockLeft > 108) return null;
          const prog = Math.max(0, Math.min(1, (r.y + 36) / (GROUND_TOP - 4)));
          const shadowW = 18 + prog * 26;
          return (
            <React.Fragment key={r.id}>
              <div className="absolute rounded-full bg-black z-10 pointer-events-none" style={{ left: `${rockLeft}%`, top: `${GROUND_TOP - 8}px`, width: `${shadowW}px`, height: '9px', marginLeft: `${-shadowW / 2}px`, opacity: 0.2 + prog * 0.4 }} />
              <div className="absolute z-20 text-4xl pointer-events-none" style={{ left: `${rockLeft}%`, top: `${r.y}px`, transform: `translateX(-50%) rotate(${r.y * 1.6}deg)`, filter: 'drop-shadow(0 3px 3px rgba(0,0,0,0.4))' }}>🪨</div>
            </React.Fragment>
          );
        })}

        {/* Player (existing run sprites: frame 1 & 2) */}
        {gameState !== 'READY' && (
          <MotionDiv
            className="absolute z-20"
            style={{ left: `${px - camX}%`, width: '86px', height: '112px', marginLeft: '-43px', bottom: `${px >= SAFE_START ? GROUND_H + 30 : GROUND_H}px`, transition: 'bottom 0.15s ease-out' }}
            animate={gameState === 'FALLING'
              ? (deathCause === 'rock' ? { y: 6, rotate: -75 } : { y: 320, rotate: 26, opacity: 0.15 })
              : reachedSafe ? { y: [0, -8, 0] } : { y: 0 }}
            transition={gameState === 'FALLING' ? { duration: 0.85, ease: 'easeIn' } : reachedSafe ? { repeat: Infinity, duration: 0.7 } : { duration: 0.1 }}
          >
            <img src={playerSprite} alt="Pemain" draggable={false} className="w-full h-full object-contain" style={{ objectPosition: 'bottom', transform: facingRight ? 'none' : 'scaleX(-1)', filter: hitFlash ? 'drop-shadow(0 0 8px rgba(239,68,68,0.95)) brightness(1.35)' : 'drop-shadow(0 3px 4px rgba(0,0,0,0.4))' }} />
          </MotionDiv>
        )}

        {/* Rain overlay — individual animated droplets (particle style) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-[15]">
          {Array.from({ length: 40 }, (_, i) => {
            const left = ((i * 2.57 + (i * 13) % 100)) % 100;
            const delay = ((i * 0.07) + (i * 3) % 7 * 0.12) % 2.4;
            const dur = 0.45 + (i % 5) * 0.08;
            const h = 18 + (i % 6) * 5;
            const op = 0.22 + (i % 4) * 0.08;
            const w = 1.2 + (i % 3) * 0.4;
            return (
              <svg
                key={`rain-${i}`}
                className="ls-raindrop absolute"
                style={{
                  left: `${left}%`,
                  top: `-${h + 10}px`,
                  width: `${w + 4}px`,
                  height: `${h}px`,
                  animationDuration: `${dur}s`,
                  animationDelay: `${delay}s`,
                  opacity: op,
                }}
                viewBox={`0 0 6 ${h}`}
                fill="none"
              >
                <line x1="3" y1="0" x2="1" y2={h} stroke="rgba(190,210,230,0.7)" strokeWidth={w} strokeLinecap="round" />
              </svg>
            );
          })}
        </div>

        {/* READY overlay */}
        {gameState === 'READY' && (
          <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/55">
            <div className="text-center text-white px-6">
              <MotionDiv
                animate={{ y: [0, -10, 0], rotate: [0, -4, 4, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="text-6xl mb-4"
              >
                ⛰️
              </MotionDiv>
              <p className="text-2xl font-black mb-2">Lari dari Longsor!</p>
              <p className="text-sm max-w-md mx-auto">Tanah yang kamu injak akan <b>retak</b> lalu <b>runtuh</b> beberapa saat kemudian. Terus lari ke <b>KANAN</b> menuju bukit aman 🏠 — kalau berhenti, kamu ikut jatuh! Awas <b>batu 🪨</b> berjatuhan dari lereng: lihat <b>bayangannya</b> di tanah dan atur langkahmu. Kena 3 kali = gagal!</p>
              <p className="text-xs mt-2 opacity-80">Tahan tombol di bawah atau panah ← →</p>
            </div>
          </div>
        )}

        {/* FINISHED overlay */}
        {gameState === 'FINISHED' && (
          <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/70">
            <MotionDiv
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', bounce: 0.5 }}
              className="text-center text-white px-4"
            >
              <div className="text-7xl mb-2">{survived ? '🎉' : deathCause === 'rock' ? '🪨' : '🕳️'}</div>
              <p className="text-2xl font-bold mb-1">{survived ? 'Sampai di Bukit Aman!' : deathCause === 'rock' ? 'Tertimpa Batuan Longsor!' : 'Terjatuh Bersama Longsoran!'}</p>
              <p className="text-sm text-white/80">
                {survived
                  ? (hearts === 3 ? 'Sempurna! Kamu lolos tanpa terkena batu sama sekali!' : 'Kamu terus bergerak dan tidak berhenti — itu kunci selamat dari longsor!')
                  : deathCause === 'rock'
                    ? 'Perhatikan bayangan batu di tanah — berhenti sejenak atau percepat lari untuk menghindar!'
                    : `Jarak ditempuh: ${Math.min(100, Math.round((furthestRef.current / SAFE_START) * 100))}% — coba lagi, jangan berhenti di tengah jalan!`}
              </p>
            </MotionDiv>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-4 mb-4">
        {gameState === 'READY' && (
          <Button onClick={startGame} size="lg" className="bg-stone-600 shadow-stone-800 w-full glow-pulse" playSound={() => playSound('click')}>
            MULAI EVAKUASI!
          </Button>
        )}
        {(gameState === 'PLAYING' || gameState === 'FALLING') && (
          <div className="w-full flex gap-2">
            <Button
              onPointerDown={() => startMove(-1)}
              onPointerUp={stopMove}
              onPointerLeave={stopMove}
              onPointerCancel={stopMove}
              className="w-1/3 bg-stone-500 shadow-stone-700 select-none touch-none"
              playSound={() => { }}
            >
              ← KIRI
            </Button>
            <Button
              onPointerDown={() => startMove(1)}
              onPointerUp={stopMove}
              onPointerLeave={stopMove}
              onPointerCancel={stopMove}
              className="flex-1 bg-green-600 shadow-green-800 select-none touch-none text-xl"
              playSound={() => { }}
            >
              LARI KE BUKIT AMAN →
            </Button>
          </div>
        )}
        {gameState === 'FINISHED' && (
          <div className="w-full flex flex-col sm:flex-row gap-2">
            {onReplay && (
              <Button onClick={onReplay} variant="secondary" size="lg" className="flex-1">
                <RefreshCw className="mr-1" size={18} /> Ulangi Game
              </Button>
            )}
            <Button onClick={() => { playSound('click'); onComplete(finalScore(), survived ? 100 : 0); }} variant="success" size="lg" className="flex-1">
              Lanjut ke Pemulihan
            </Button>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-gray-500">
        💡 Tip: Saat tanah mulai retak, jangan berhenti atau kembali — terus bergerak, dan waspadai batu yang berjatuhan dari lereng!
      </p>
    </div>
  );
};

// 4. Recovery Phase (Quiz)
const RecoveryPhase = ({ level, teamName, onComplete, playSound, updateNarrator }: { level: LevelConfig, teamName: string, onComplete: (score: number) => void, playSound: (type: string) => void, updateNarrator: (msg: string, typing: boolean, st: 'idle' | 'warning' | 'success' | 'error') => void }) => {
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answerState, setAnswerState] = useState<'correct' | 'wrong' | null>(null);

  // When a new question appears, narrator gives a generic prompt
  useEffect(() => {
    updateNarrator("Ayo pilih jawaban yang tepat!", false, 'idle');
  }, [currentQ]);

  const question = level.quizQuestions[currentQ];

  const handleAnswer = async (index: number) => {
    setSelectedOption(index);
    setShowExplanation(true);
    const isCorrect = index === question.correctIndex;

    if (isCorrect) {
      setScore(prev => prev + 1);
      setAnswerState('correct');
      playSound('success');
    } else {
      setAnswerState('wrong');
      playSound('error');
    }
    // Reset answer state after animation
    setTimeout(() => setAnswerState(null), 600);

    // Call Gemini API for personalized feedback
    updateNarrator("", true, 'idle');
    const feedback = await generateQuestionFeedback(
      teamName,
      question.question,
      question.options[index],
      question.options[question.correctIndex],
      isCorrect,
      question.explanation
    );
    updateNarrator(feedback, false, isCorrect ? 'success' : 'error');
  };

  const nextQuestion = () => {
    playSound('click');
    if (currentQ < level.quizQuestions.length - 1) {
      setCurrentQ(prev => prev + 1);
      setShowExplanation(false);
      setSelectedOption(null);
    } else {
      const finalPercentage = Math.round((score + (selectedOption === question.correctIndex ? 1 : 0)) / level.quizQuestions.length * 100);
      onComplete(finalPercentage);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className={`bg-white rounded-3xl p-8 border-b-8 border-indigo-100 shadow-xl relative overflow-hidden ${answerState === 'wrong' ? 'answer-shake' : ''}`}>
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -z-0"></div>

        {/* Correct answer celebration border */}
        {answerState === 'correct' && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 rounded-3xl border-4 border-green-400 z-0 pointer-events-none"
            style={{ boxShadow: 'inset 0 0 30px rgba(34, 197, 94, 0.1)' }}
          />
        )}

        <div className="flex justify-between items-center mb-8 relative z-10">
          <h2 className="text-2xl font-display font-bold text-gray-800">Uji Pemahaman</h2>
          <div className="flex gap-1">
            {level.quizQuestions.map((_, idx) => (
              <MotionDiv
                key={idx}
                className={`h-2 w-8 rounded-full ${idx === currentQ ? 'bg-indigo-500' : idx < currentQ ? 'bg-green-400' : 'bg-gray-200'}`}
                animate={idx === currentQ ? { scale: [1, 1.2, 1] } : {}}
                transition={{ repeat: Infinity, duration: 1 }}
              />
            ))}
          </div>
        </div>

        <MotionDiv
          key={currentQ}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative z-10"
        >
          <h3 className="text-xl md:text-2xl font-bold text-gray-700 mb-8 leading-relaxed">
            {question.question}
          </h3>

          <div className="grid md:grid-cols-2 gap-4 mb-8">
            {question.options.map((option, idx) => (
              <MotionButton
                key={idx}
                whileTap={{ scale: 0.98 }}
                whileHover={!showExplanation ? { scale: 1.02 } : {}}
                onClick={() => !showExplanation && handleAnswer(idx)}
                disabled={showExplanation}
                className={`text-left p-6 rounded-2xl border-b-4 transition-all font-semibold flex flex-col justify-center min-h-[100px]
                  ${showExplanation
                    ? idx === question.correctIndex
                      ? 'bg-green-100 border-green-500 text-green-800 celebration-burst'
                      : idx === selectedOption
                        ? 'bg-red-100 border-red-500 text-red-800'
                        : 'bg-gray-50 border-gray-200 text-gray-400 opacity-50'
                    : 'bg-white border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 text-gray-600 shadow-sm'
                  }
                `}
              >
                <span className="text-sm font-bold opacity-50 mb-1">Pilihan {['A', 'B', 'C', 'D'][idx]}</span>
                <span className="text-lg">{option}</span>
              </MotionButton>
            ))}
          </div>
        </MotionDiv>

        <AnimatePresence>
          {showExplanation && (
            <MotionDiv
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-8 pt-8 border-t border-gray-100 flex justify-end"
            >
              <Button onClick={nextQuestion} size="lg" playSound={() => { }}>
                {currentQ < level.quizQuestions.length - 1 ? 'Soal Berikutnya' : 'Selesaikan Misi'} <ChevronRight className="ml-2" />
              </Button>
            </MotionDiv>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// 5. Result & Leaderboard with Team Name & Rewards
const VictoryScreen = ({ totalScore, onRestart, avatar, teamName, playSound }: { totalScore: number, onRestart: () => void, avatar: Avatar | null, teamName: string, playSound: (type: string) => void }) => {
  // Reward logic
  const isGold = totalScore >= 280;
  const isSilver = !isGold && totalScore >= 200;

  const rewardTitle = isGold ? "MEDALI EMAS" : isSilver ? "MEDALI PERAK" : "MEDALI PERUNGGU";
  const rewardColor = isGold ? "text-yellow-500" : isSilver ? "text-gray-400" : "text-orange-500";
  const rewardBg = isGold ? "bg-yellow-100" : isSilver ? "bg-gray-100" : "bg-orange-100";
  const medalIcon = <Medal size={48} className={`${rewardColor} medal-glow`} />;

  // Dynamic Leaderboard: Insert current team and sort
  const finalLeaderboard = [
    ...LEADERBOARD_DATA.filter(p => p.name !== 'Kamu'), // Remove placeholder
    { name: teamName, score: totalScore, badge: isGold ? "Rescue Elite" : "Rescue Team" }
  ].sort((a, b) => b.score - a.score);

  const myRank = finalLeaderboard.findIndex(p => p.name == teamName) + 1;

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
        <div className="bg-white/90 backdrop-blur-sm rounded-[2rem] p-8 shadow-xl border border-white/50">
          <h3 className="text-xl font-bold text-gray-700 mb-6 text-left flex items-center gap-2">
            <Trophy size={20} className="text-yellow-500" /> Papan Peringkat
          </h3>
          <div className="space-y-4">
            {finalLeaderboard.map((entry, idx) => (
              <MotionDiv
                key={idx}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: idx * 0.15 }}
                className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-transform hover:scale-105 ${entry.name === teamName ? 'bg-indigo-100 border-indigo-400 shadow-lg scale-105' : 'bg-white border-transparent hover:border-gray-200'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full font-black text-sm ${idx === 0 ? 'bg-yellow-400 text-yellow-900' : idx === 1 ? 'bg-gray-300 text-gray-800' : idx === 2 ? 'bg-orange-300 text-orange-900' : 'bg-gray-100 text-gray-400'}`}>
                    {idx + 1}
                  </div>
                  <div className="text-left">
                    <div className={`font-bold ${entry.name === teamName ? 'text-indigo-800' : 'text-gray-700'}`}>
                      {entry.name} {entry.name === teamName && '(Kalian)'}
                    </div>
                    {idx === 0 && <div className="text-[10px] font-bold text-yellow-600 uppercase bg-yellow-100 px-2 rounded-full w-max">Juara Bertahan</div>}
                  </div>
                </div>
                <div className="font-mono font-black text-gray-600 bg-white/50 px-3 py-1 rounded-lg border border-gray-100">{entry.score}</div>
              </MotionDiv>
            ))}
          </div>

          {myRank === 1 && (
            <MotionDiv
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.8 }}
              className="mt-6 bg-yellow-100 text-yellow-800 p-4 rounded-xl text-center text-sm font-bold border border-yellow-200 animate-pulse"
            >
              🏆 LUAR BIASA! Kalian mengalahkan skor tertinggi sekolah!
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
  // Kartu materi singkat tampil di fase BRIEFING sebelum ACTION.
  const [showMateri, setShowMateri] = useState(false);
  // Bumping this remounts the current ACTION game for a clean replay.
  const [actionReplayKey, setActionReplayKey] = useState(0);
  const [completedLevelScores, setCompletedLevelScores] = useState<Partial<Record<DisasterType, number>>>({});
  // Zona yang papan informasinya sudah dibaca (tanpa localStorage, cukup sesi ini).
  const [readZoneIds, setReadZoneIds] = useState<DisasterType[]>([]);
  const [isFreePlay, setIsFreePlay] = useState<boolean>(false);
  const [gameMode, setGameMode] = useState<'adventure' | 'classic'>('adventure');
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);
  const [teamName, setTeamName] = useState<string>("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const bgmStarted = useRef(false);
  // Dialog konfirmasi keluar di layar level (BRIEFING / ACTION / RECOVERY).
  const [showExitDialog, setShowExitDialog] = useState(false);

  // --- AI Narrator (Kapten Siaga) state ---
  const [showNarrator, setShowNarrator] = useState(false);
  const [narratorData, setNarratorData] = useState<PerformanceData | null>(null);
  const [pendingNextPhase, setPendingNextPhase] = useState<GamePhase | null>(null);
  // Track detailed performance for ACTION phase
  const [actionPerformance, setActionPerformance] = useState<{
    healthRemaining?: number;
    itemsSaved?: number;
    totalItems?: number;
    survived?: boolean;
  }>({});
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

  const { play, toggleSound, isEnabled, startBGM, stopBGM } = useSoundEffects();

  useEffect(() => {
    if (phase !== 'MENU' && !bgmStarted.current && soundEnabled) {
      startBGM();
      bgmStarted.current = true;
    }
  }, [phase, startBGM, soundEnabled]);

  const completedScore = Object.entries(completedLevelScores)
    .filter(([id]) => id !== currentLevelId)
    .reduce((acc, [_, score]) => acc + (score || 0), 0);
  const totalScore = completedScore + phaseScores.reduce((a, b) => a + b, 0);

  const playSound = useCallback((type: string) => {
    play(type as any);
  }, [play]);

  const handleToggleSound = useCallback(() => {
    const newState = toggleSound();
    setSoundEnabled(newState);
  }, [toggleSound]);

  const startLevel = (levelId: DisasterType) => {
    setCurrentLevelId(levelId);
    setPhaseScores([]);
    setShowMateri(false);
    setPhase('BRIEFING');
    setSideNarrator(prev => ({ ...prev, visible: false }));
    playSound('levelStart');
  };

  // Mulai misi langsung dari zona dunia 3D (tanpa briefing, karena panel zona
  // sudah menampilkan judul & deskripsi misi).
  const startWorldMission = (levelId: DisasterType) => {
    setGameMode('adventure');
    setIsFreePlay(false);
    setCurrentLevelId(levelId);
    setPhaseScores([]);
    setActionPerformance({});
    setActionReplayKey(k => k + 1);
    setShowMateri(false);
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

  const handleTeamRegister = (name: string, avatar: Avatar) => {
    setTeamName(name);
    setSelectedAvatar(avatar);
    setPhase(gameMode === 'classic' ? 'LEVEL_SELECT' : 'WORLD_3D');
    setSideNarrator(prev => ({ ...prev, visible: false }));
  };

  // Replay the current ACTION game. Called from a game's result screen before
  // any score is recorded, so we just remount it fresh via a new key.
  const handleReplayAction = () => {
    playSound('click');
    setActionReplayKey(k => k + 1);
    updateSideNarrator('Ayo coba lagi! Kamu pasti bisa lebih baik.', false, 'warning');
  };

  const handlePhaseComplete = (score: number) => {
    const newScores = [...phaseScores, score];
    setPhaseScores(newScores);

    const level = currentLevelId ? LEVELS[currentLevelId] : LEVELS.EARTHQUAKE;

    if (phase === 'ACTION') {
      // Build performance data for ACTION narrator
      const perfData: PerformanceData = {
        teamName,
        disasterType: currentLevelId || 'EARTHQUAKE',
        disasterTitle: level.title,
        phase: 'ACTION',
        score,
        healthRemaining: actionPerformance.healthRemaining,
        itemsSaved: actionPerformance.itemsSaved,
        totalItems: actionPerformance.totalItems,
        survived: actionPerformance.survived ?? (score > 0),
      };
      setNarratorData(perfData);
      setPendingNextPhase('RECOVERY');
      setShowNarrator(true);
    } else if (phase === 'RECOVERY') {
      // Build performance data for RECOVERY narrator
      const quizTotal = level.quizQuestions.length;
      const quizCorrect = Math.round((score / 100) * quizTotal);
      const perfData: PerformanceData = {
        teamName,
        disasterType: currentLevelId || 'EARTHQUAKE',
        disasterTitle: level.title,
        phase: 'RECOVERY',
        score,
        quizCorrect,
        quizTotal,
      };
      setNarratorData(perfData);
      const currentLevelScore = newScores[0] + newScores[1];
      const newCompletedLevelScores = { ...completedLevelScores, ...(currentLevelId && !isFreePlay ? { [currentLevelId]: currentLevelScore } : {}) };
      setCompletedLevelScores(newCompletedLevelScores);

      const totalLevels = Object.keys(LEVELS).length;
      if (!isFreePlay && Object.keys(newCompletedLevelScores).length >= totalLevels) {
        setPendingNextPhase('VICTORY');
      } else if (!isFreePlay && gameMode === 'adventure') {
        // Kembali ke dunia 3D untuk memilih zona misi berikutnya.
        setPendingNextPhase('WORLD_3D');
      } else {
        setPendingNextPhase('LEVEL_SELECT');
      }
      setShowNarrator(true);
    }
  };

  // Called when narrator is dismissed
  const handleNarratorContinue = () => {
    setShowNarrator(false);
    setNarratorData(null);
    if (pendingNextPhase) {
      setPhase(pendingNextPhase);
      setPendingNextPhase(null);

      if (pendingNextPhase === 'LEVEL_SELECT' || pendingNextPhase === 'WORLD_3D') {
        // Skor misi sudah tersimpan di completedLevelScores; kosongkan level aktif
        // agar totalScore tidak menghitung dua kali.
        setCurrentLevelId(null);
        setPhaseScores([]);
        setActionPerformance({});
      }

      // Setup side narrator for the new phase
      if (pendingNextPhase === 'ACTION') {
        updateSideNarrator("Awas bahaya! Ikuti petunjukku ya!", false, 'warning');
      } else if (pendingNextPhase === 'RECOVERY') {
        updateSideNarrator("Mari kita uji pemahamanmu. Pilih jawaban dengan hati-hati!", false, 'idle');
      } else {
        setSideNarrator(prev => ({ ...prev, visible: false }));
      }
    }
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
    setShowMateri(false);
    setCompletedLevelScores({});
    setReadZoneIds([]);
    setIsFreePlay(false);
    setGameMode('adventure');
    setSideNarrator(prev => ({ ...prev, visible: false }));
    setShowNarrator(false);
    setNarratorData(null);
    setPendingNextPhase(null);
    setActionPerformance({});
  };

  // Keluar dari misi level menuju dunia 3D tanpa menghapus progres zona.
  // completedLevelScores sengaja TIDAK direset.
  const exitLevelToWorld = () => {
    setShowExitDialog(false);
    setShowNarrator(false);
    setNarratorData(null);
    setPendingNextPhase(null);
    setCurrentLevelId(null);
    setPhaseScores([]);
    setShowMateri(false);
    setActionPerformance({});
    setSideNarrator(prev => ({ ...prev, visible: false }));
    setPhase('WORLD_3D');
  };

  // Pastikan dialog tidak "menempel" saat fase berganti (mis. narrator selesai).
  useEffect(() => {
    setShowExitDialog(false);
  }, [phase]);

  const isLevelMissionPhase =
    phase === 'BRIEFING' || phase === 'ACTION' || phase === 'RECOVERY';

  const handleFreePlay = () => {
    setIsFreePlay(true);
    setPhase('LEVEL_SELECT');
    setCurrentLevelId(null);
    setPhaseScores([]);
    setShowMateri(false);
    setCompletedLevelScores({});
    setSideNarrator(prev => ({ ...prev, visible: false }));
    setShowNarrator(false);
  };

  const currentLevel = currentLevelId ? LEVELS[currentLevelId] : LEVELS.EARTHQUAKE;

  // Background style based on phase/level
  const getBgClass = () => {
    if (phase === 'MENU' || phase === 'TEAM_SETUP') return 'bg-gradient-to-br from-indigo-600 to-purple-700';
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

  // Dunia 3D tampil penuh layar (tanpa header/footer 2D).
  if (phase === 'WORLD_3D') {
    return (
      <WorldLoadBoundary
        onClassicMode={() => {
          playSound('click');
          setGameMode('classic');
          setPhase('LEVEL_SELECT');
          setCurrentLevelId(null);
          setPhaseScores([]);
          setSideNarrator(prev => ({ ...prev, visible: false }));
        }}
      >
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
            onClassicMode={() => {
              playSound('click');
              setGameMode('classic');
              setPhase('LEVEL_SELECT');
              setCurrentLevelId(null);
              setPhaseScores([]);
              setSideNarrator(prev => ({ ...prev, visible: false }));
            }}
            onExit={resetGame}
            playSound={playSound}
          />
        </React.Suspense>
      </WorldLoadBoundary>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 ${getBgClass()} font-sans selection:bg-indigo-200 overflow-x-hidden`}>
      {/* Background particles for menu */}
      {(phase === 'MENU' || phase === 'TEAM_SETUP') && (
        <FloatingParticles colors={getParticleColors()} />
      )}

      {/* Subtle grid background for gameplay */}
      {phase !== 'MENU' && phase !== 'TEAM_SETUP' && (
        <div className="fixed inset-0 bg-grid pointer-events-none opacity-50" />
      )}

      <div className="container mx-auto px-4 py-6 min-h-screen flex flex-col relative z-10">

        {/* Header */}
        {phase !== 'MENU' && phase !== 'TEAM_SETUP' && (
          <header className="flex items-center justify-between mb-8 sticky top-0 z-40 bg-white/80 backdrop-blur-md p-2 rounded-2xl shadow-sm border border-white/50">
            {/* Team ID Card */}
            <div className="flex items-center gap-3 cursor-pointer hover:opacity-70 transition-opacity bg-indigo-50 p-2 pr-6 rounded-xl border border-indigo-100" onClick={() => { playSound('click'); setPhase('LEVEL_SELECT'); setSideNarrator(prev => ({ ...prev, visible: false })); setShowNarrator(false); }}>
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${selectedAvatar?.bgGradient || 'from-gray-400 to-gray-600'} flex items-center justify-center text-xl shadow-sm`}>
                {selectedAvatar?.icon || <Users className="text-white" size={20} />}
              </div>
              <div className="leading-tight">
                <h1 className="font-display font-bold text-indigo-900 text-sm max-w-[120px] truncate">{teamName || 'Tim Agent'}</h1>
                <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Unit Penyelamat</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {phase !== 'VICTORY' && phase !== 'LEVEL_SELECT' && (
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
                <div className="mb-12 relative inline-block">
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
                <div className="absolute top-4 right-4">
                  <SoundToggle isEnabled={soundEnabled} onToggle={handleToggleSound} />
                </div>

                <MotionDiv
                  whileHover={{ scale: 1.02 }}
                  className="max-w-md mx-auto bg-white/10 backdrop-blur-lg p-8 rounded-[2rem] border border-white/20 shadow-2xl relative overflow-hidden group"
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
                      onClick={() => { playSound('click'); setGameMode('adventure'); setPhase('TEAM_SETUP'); }}
                      playSound={() => playSound('click')}
                    >
                      DAFTARKAN TIM!
                    </Button>
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

            {/* 2. Level Select */}
            {phase === 'LEVEL_SELECT' && (
              <MotionDiv
                key="level-select"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="text-center mb-10">
                  <h2 className="text-4xl font-display font-bold text-gray-800 mb-2">Pusat Komando</h2>
                  <p className="text-gray-500">Halo <span className="text-indigo-600 font-bold">{teamName}</span>! Pilih lokasi misi.</p>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto px-4">
                  <LevelCard level={LEVELS.EARTHQUAKE} onClick={() => startLevel('EARTHQUAKE')} completed={completedLevelScores['EARTHQUAKE'] !== undefined} playSound={() => playSound('click')} />
                  <LevelCard level={LEVELS.FLOOD} onClick={() => startLevel('FLOOD')} completed={completedLevelScores['FLOOD'] !== undefined} playSound={() => playSound('click')} />
                  <LevelCard level={LEVELS.VOLCANO} onClick={() => startLevel('VOLCANO')} completed={completedLevelScores['VOLCANO'] !== undefined} playSound={() => playSound('click')} />
                  <LevelCard level={LEVELS.LANDSLIDE} onClick={() => startLevel('LANDSLIDE')} completed={completedLevelScores['LANDSLIDE'] !== undefined} playSound={() => playSound('click')} />
                </div>
              </MotionDiv>
            )}

            {/* 3. Briefing */}
            {phase === 'BRIEFING' && (
              showMateri ? (
                <MateriSingkat
                  key={`materi-${currentLevel.id}`}
                  disasterType={currentLevel.id}
                  color={currentLevel.color}
                  onFinish={() => {
                    setShowMateri(false);
                    setPhase('ACTION');
                  }}
                  onSkip={() => {
                    setShowMateri(false);
                    setPhase('ACTION');
                  }}
                  playSound={playSound}
                />
              ) : (
              <MotionDiv
                key="briefing"
                initial={{ scale: 0.9, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 1.1, opacity: 0 }}
                className="max-w-2xl mx-auto bg-white rounded-[2rem] p-10 shadow-2xl border-4 border-gray-100 text-center relative overflow-hidden"
              >
                <div className={`absolute top-0 left-0 w-full h-2 ${LEVEL_COLOR_CLASSES[currentLevel.color as keyof typeof LEVEL_COLOR_CLASSES].topBar}`}></div>

                <MotionDiv
                  animate={{ y: [0, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className={`w-32 h-32 rounded-full mx-auto mb-8 flex items-center justify-center text-6xl shadow-inner border-4 border-white bg-gradient-to-br ${selectedAvatar?.bgGradient || 'from-gray-200 to-gray-400'}`}
                >
                  {selectedAvatar?.icon || '🕵️'}
                </MotionDiv>

                <div className="inline-block px-4 py-1 bg-gray-100 rounded-full text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Top Secret</div>

                <h2 className="text-4xl font-display font-black text-gray-800 mb-8 uppercase">{currentLevel.title}</h2>

                <div className="bg-gray-50 p-6 rounded-2xl mb-8 text-left border-l-4 border-gray-300">
                  <p className="text-gray-600 text-lg leading-relaxed font-medium">
                    "Kepada {teamName}, {currentLevel.description}"
                  </p>
                </div>

                <Button onClick={() => setShowMateri(true)} fullWidth size="lg" className="text-lg" playSound={() => playSound('click')}>
                  Pelajari Materi Dulu <BookOpen />
                </Button>
              </MotionDiv>
              )
            )}

            {/* AI Narrator Overlay — Kapten Siaga */}
            {showNarrator && narratorData && (
              <AINarrator
                performanceData={narratorData}
                onContinue={handleNarratorContinue}
                playSound={playSound}
              />
            )}

            {/* 5. Action Phase */}
            {phase === 'ACTION' && (
              <MotionDiv
                key="action"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.1, opacity: 0 }}
              >
                <div className="text-center mb-8">
                  <MotionDiv
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                  >
                    <h2 className="text-3xl font-display font-bold text-red-600 mb-2">⚠️ ZONA BAHAYA ⚠️</h2>
                  </MotionDiv>
                  <p className="text-gray-600 font-medium">Lakukan tindakan penyelamatan sekarang!</p>
                </div>

                {currentLevel.id === 'EARTHQUAKE' ? (
                  <EarthquakeAction
                    key={actionReplayKey}
                    playSound={playSound}
                    updateSideNarrator={updateSideNarrator}
                    onReplay={handleReplayAction}
                    onComplete={(score, detail) => {
                      setActionPerformance({
                        healthRemaining: detail.healthRemaining ?? score,
                        survived: detail.survived ?? (score > 0),
                      });
                      handlePhaseComplete(score);
                    }}
                  />
                ) : currentLevel.id === 'FLOOD' ? (
                  <FloodAction
                    key={actionReplayKey}
                    playSound={playSound}
                    updateSideNarrator={updateSideNarrator}
                    onReplay={handleReplayAction}
                    onComplete={(score, detail) => {
                      setActionPerformance({
                        itemsSaved: detail.usefulPicked,
                        totalItems: detail.usefulTotal,
                        survived: detail.survived,
                      });
                      handlePhaseComplete(score);
                    }}
                  />
                ) : currentLevel.id === 'LANDSLIDE' ? (
                  <LandslideAction key={actionReplayKey} onReplay={handleReplayAction} onComplete={(score, health) => {
                    setActionPerformance({ healthRemaining: health, survived: health > 0 });
                    handlePhaseComplete(score);
                  }} playSound={playSound} updateSideNarrator={updateSideNarrator} />
                ) : (
                  <VolcanoAction key={actionReplayKey} onReplay={handleReplayAction} onComplete={(score) => {
                    setActionPerformance({ healthRemaining: score > 50 ? 100 : score > 0 ? 50 : 0, survived: score > 0 });
                    handlePhaseComplete(score);
                  }} playSound={playSound} updateSideNarrator={updateSideNarrator} />
                )}
              </MotionDiv>
            )}

            {/* 6. Recovery Phase */}
            {phase === 'RECOVERY' && (
              <MotionDiv
                key="recovery"
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -100, opacity: 0 }}
              >
                <RecoveryPhase level={currentLevel} teamName={teamName} onComplete={handlePhaseComplete} playSound={playSound} updateNarrator={updateSideNarrator} />
              </MotionDiv>
            )}

            {/* 7. Victory */}
            {phase === 'VICTORY' && (
              <MotionDiv
                key="victory"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <VictoryScreen totalScore={totalScore} onRestart={handleFreePlay} avatar={selectedAvatar} teamName={teamName} playSound={playSound} />
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

        <footer className="mt-12 text-center text-gray-400 text-sm font-medium py-4">
          Agent Siaga - Tim Adhista
        </footer>
      </div>
    </div>
  );
};

export default App;