import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { AnimatePresence, motion } from 'framer-motion';
import * as THREE from 'three';
import type { Avatar, LevelConfig } from '../types';
import { generateQuestionFeedback } from '../services/geminiService';
import { Agent3D } from './Agent3D';
import { MissionCanvas } from './MissionCanvas';
import { makeBoardTexture, makePodiumTexture } from './missionTextures';
import { HudChip, MissionPanel, MissionScene } from './MissionUi';

interface Props {
  level: LevelConfig;
  teamName: string;
  avatar: Avatar | null;
  playSound: (type: string) => void;
  updateNarrator: (
    message: string,
    isTyping: boolean,
    status: 'idle' | 'warning' | 'success' | 'error'
  ) => void;
  onComplete: (score: number, correct: number, total: number) => void;
  onReplay?: () => void;
}

type AnswerState = 'correct' | 'wrong' | 'dim' | 'idle';

const LETTERS = ['A', 'B', 'C', 'D'];
// Posisi podium diatur berundak: C & D di baris belakang namun bergeser ke tengah (-2.4 dan +2.4)
// dan terangkat sedikit (y = 0.45), sehingga tidak tertutup oleh podium A & B di baris depan
const PODIUM_POSITIONS: Array<[number, number, number]> = [
  [-4.8, 0, 2.2],
  [4.8, 0, 2.2],
  [-2.4, 0.45, -1.8],
  [2.4, 0.45, -1.8],
];

const Podium: React.FC<{
  letter: string;
  text: string;
  state: AnswerState;
  position: [number, number, number];
  accent: string;
  onSelect: () => void;
  disabled: boolean;
}> = ({ letter, text, state, position, accent, onSelect, disabled }) => {
  const texture = useMemo(
    () => makePodiumTexture(letter, text, state, accent),
    [letter, text, state, accent]
  );
  const group = useRef<THREE.Group>(null);

  useFrame((state3d) => {
    if (!group.current) return;
    const t = state3d.clock.elapsedTime;
    group.current.position.y =
      position[1] + (state === 'correct' ? Math.abs(Math.sin(t * 3)) * 0.16 : 0);
    if (state === 'correct') {
      group.current.rotation.z = Math.sin(t * 4) * 0.02;
    } else {
      group.current.rotation.z = 0;
    }
  });

  return (
    <group
      ref={group}
      position={position}
      onClick={(event) => {
        event.stopPropagation();
        if (!disabled) onSelect();
      }}
      onPointerOver={() => {
        if (!disabled) document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      {/* Alas podium */}
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[1.55, 1.75, 0.36, 20]} />
        <meshStandardMaterial
          color={state === 'correct' ? '#16a34a' : state === 'wrong' ? '#dc2626' : '#312e81'}
          roughness={0.45}
          metalness={0.25}
        />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[1.82, 1.9, 0.14, 20]} />
        <meshStandardMaterial color="#0f172a" roughness={0.6} />
      </mesh>
      {/* Tiang */}
      <mesh position={[0, 0.9, -0.15]}>
        <boxGeometry args={[2.2, 1.2, 0.36]} />
        <meshStandardMaterial
          color={state === 'correct' ? '#bbf7d0' : state === 'wrong' ? '#fecaca' : '#e2e8f0'}
          roughness={0.7}
        />
      </mesh>
      {/* Papan jawaban */}
      <mesh position={[0, 2.25, 0]}>
        <planeGeometry args={[3.7, 1.75]} />
        <meshBasicMaterial map={texture} transparent toneMapped={false} />
      </mesh>
      {state === 'correct' && (
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.38, 0]}>
          <ringGeometry args={[1.9, 2.2, 32]} />
          <meshBasicMaterial color="#22c55e" transparent opacity={0.75} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};

const QuizArena: React.FC<{
  level: LevelConfig;
  currentQ: number;
  selected: number | null;
  answered: boolean;
  avatar: Avatar | null;
  teamName: string;
  onSelect: (index: number) => void;
}> = ({ level, currentQ, selected, answered, avatar, teamName, onSelect }) => {
  const question = level.quizQuestions[currentQ];
  const boardTexture = useMemo(
    () =>
      makeBoardTexture({
        title: `Soal ${currentQ + 1} / ${level.quizQuestions.length}`,
        text: question.question,
        footer: level.title,
        emoji: 'â“',
        accent: '#6366f1',
        background: '#f8fafc',
        width: 1500,
        height: 760,
        titleSize: 46,
        textSize: 52,
      }),
    [currentQ, level.quizQuestions.length, level.title, question.question]
  );
  const ring = useRef<THREE.Mesh>(null);
  const orbs = useRef<Array<THREE.Mesh | null>>([]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (ring.current) ring.current.rotation.z += delta * 0.28;
    orbs.current.forEach((orb, index) => {
      if (!orb) return;
      orb.position.y = 4.6 + Math.sin(t * 1.3 + index * 1.6) * 0.5;
      orb.rotation.y += delta * 0.8;
    });
    // Menjaga sudut kamera tepat ke pusat papan soal dan podium
    state.camera.lookAt(0, 2.7, 0);
  });

  return (
    <>
      <fog attach="fog" args={['#1e1b4b', 20, 52]} />

      {/* Lantai arena bundar */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.04, 0]}>
        <circleGeometry args={[16, 64]} />
        <meshStandardMaterial color="#312e81" roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 0]}>
        <ringGeometry args={[7.4, 7.75, 64]} />
        <meshBasicMaterial color="#818cf8" transparent opacity={0.65} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={ring} rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
        <ringGeometry args={[10.6, 11.2, 64, 1, 0, Math.PI * 1.4]} />
        <meshBasicMaterial color="#c7d2fe" transparent opacity={0.35} side={THREE.DoubleSide} />
      </mesh>

      {/* Ornamen melayang */}
      {Array.from({ length: 8 }, (_, index) => {
        const angle = (index / 8) * Math.PI * 2;
        return (
          <mesh
            key={index}
            ref={(mesh) => {
              orbs.current[index] = mesh;
            }}
            position={[Math.cos(angle) * 9.4, 4.6, Math.sin(angle) * 9.4]}
          >
            <octahedronGeometry args={[0.42, 0]} />
            <meshStandardMaterial
              color={index % 2 ? '#fbbf24' : '#818cf8'}
              emissive={index % 2 ? '#f59e0b' : '#6366f1'}
              emissiveIntensity={0.8}
              roughness={0.3}
            />
          </mesh>
        );
      })}

      {/* Papan pertanyaan melayang di belakang: diturunkan agar terbaca utuh dan tidak terpotong atasnya */}
      <group position={[0, 4.8, -6.8]} rotation-x={0.05}>
        <mesh position={[0, 0, -0.12]}>
          <boxGeometry args={[13.2, 5.4, 0.22]} />
          <meshStandardMaterial color="#4338ca" roughness={0.45} />
        </mesh>
        <mesh>
          <planeGeometry args={[12.8, 5.0]} />
          <meshBasicMaterial map={boardTexture} toneMapped={false} />
        </mesh>
      </group>

      {/* Podium jawaban */}
      {question.options.map((option, index) => {
        let state: AnswerState = 'idle';
        if (answered) {
          if (index === question.correctIndex) state = 'correct';
          else if (index === selected) state = 'wrong';
          else state = 'dim';
        }
        return (
          <Podium
            key={`${currentQ}-${index}`}
            letter={LETTERS[index]}
            text={option}
            state={state}
            position={PODIUM_POSITIONS[index]}
            accent={['#6366f1', '#0ea5e9', '#8b5cf6', '#f59e0b'][index]}
            disabled={answered}
            onSelect={() => onSelect(index)}
          />
        );
      })}

      {/* Agen di tengah arena */}
      <group position={[0, 0, 7.2]}>
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
          <cylinderGeometry args={[1.6, 1.8, 0.24, 28]} />
          <meshStandardMaterial color="#4338ca" roughness={0.5} />
        </mesh>
        <Agent3D avatar={avatar} label={teamName} mode="idle" scale={0.86} />
      </group>
    </>
  );
};

export const Recovery3D: React.FC<Props> = ({
  level,
  teamName,
  avatar,
  playSound,
  updateNarrator,
  onComplete,
  onReplay,
}) => {
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const pendingAnswer = useRef<number | null>(null);
  const answerTimer = useRef<number | null>(null);

  const question = level.quizQuestions[currentQ];
  const total = level.quizQuestions.length;

  useEffect(() => {
    updateNarrator('Ayo pilih jawaban yang tepat di podium!', false, 'idle');
  }, [currentQ, updateNarrator]);

  const resolveAnswer = useCallback(
    async (index: number) => {
      if (answered) return;
      if (answerTimer.current !== null) window.clearTimeout(answerTimer.current);
      answerTimer.current = null;
      pendingAnswer.current = null;
      const isCorrect = index === question.correctIndex;
      setSelected(index);
      setAnswered(true);
      playSound(isCorrect ? 'success' : 'error');
      if (isCorrect) setCorrectCount((value) => value + 1);
      setLoadingFeedback(true);
      setFeedback('');
      updateNarrator('', true, 'idle');

      const text = await generateQuestionFeedback(
        teamName,
        question.question,
        question.options[index],
        question.options[question.correctIndex],
        isCorrect,
        question.explanation
      );
      setFeedback(text);
      setLoadingFeedback(false);
      updateNarrator(text, false, isCorrect ? 'success' : 'error');
    },
    [answered, playSound, question, teamName, updateNarrator]
  );

  const selectAnswer = useCallback((index: number) => {
    if (answered || index < 0 || index >= question.options.length) return;
    pendingAnswer.current = index;
    setSelected(index);
    playSound('click');
    if (answerTimer.current !== null) window.clearTimeout(answerTimer.current);
    answerTimer.current = window.setTimeout(() => void resolveAnswer(index), 950);
  }, [answered, playSound, question.options.length, resolveAnswer]);

  const confirmAnswer = useCallback(() => {
    if (pendingAnswer.current !== null) void resolveAnswer(pendingAnswer.current);
  }, [resolveAnswer]);

  const next = () => {
    if (answerTimer.current !== null) window.clearTimeout(answerTimer.current);
    answerTimer.current = null;
    pendingAnswer.current = null;
    playSound('click');
    if (currentQ < total - 1) {
      setCurrentQ((value) => value + 1);
      setSelected(null);
      setAnswered(false);
      setFeedback('');
      setLoadingFeedback(false);
    } else {
      const finalCorrect = correctCount;
      onComplete(Math.round((finalCorrect / total) * 100), finalCorrect, total);
    }
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!answered) {
        const key = event.key.toUpperCase();
        const index = LETTERS.indexOf(key);
        if (index >= 0 && index < question.options.length) {
          event.preventDefault();
          selectAnswer(index);
        } else if (/^[1-4]$/.test(event.key)) {
          event.preventDefault();
          selectAnswer(Number(event.key) - 1);
        } else if (event.key === 'Enter') {
          event.preventDefault();
          confirmAnswer();
        }
      } else if (event.key === 'Enter' || event.code === 'Space' || event.key === 'ArrowRight') {
        event.preventDefault();
        next();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [answered, confirmAnswer, next, question.options.length, selectAnswer]);

  useEffect(() => () => {
    if (answerTimer.current !== null) window.clearTimeout(answerTimer.current);
  }, []);

  // Skor sementara dipakai untuk indikator HUD.
  const liveCorrect = correctCount;

  return (
    <div
      className="fixed inset-0 z-[45] h-[100dvh] w-[100vw] overflow-hidden text-center text-white"
      style={{
        backgroundColor: '#111637',
        backgroundImage: 'radial-gradient(ellipse at 50% 34%, rgba(129,140,248,.42), transparent 42%), radial-gradient(ellipse at 50% 100%, rgba(126,34,206,.28), transparent 55%), linear-gradient(135deg,#111827,#17153d 52%,#20143f)',
      }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'radial-gradient(#c7d2fe 0.8px, transparent 0.8px)', backgroundSize: '24px 24px' }} />
      <main className="relative mx-auto flex h-full w-full max-w-[1800px] flex-col items-center gap-[clamp(8px,1.5vh,16px)] overflow-hidden px-[clamp(12px,3vw,40px)] py-[clamp(10px,1.8vh,18px)]">
        <header className="flex w-full max-w-[1450px] shrink-0 items-center justify-between gap-3 text-center">
          <div className="flex-1">
            <p className="text-[clamp(0.75rem,1.8vh,1rem)] font-black uppercase tracking-[0.16em] text-indigo-200">Soal {currentQ + 1} dari {total}</p>
          </div>
          <div className="flex-1 text-right">
            <p className="text-[clamp(0.7rem,1.6vh,0.9rem)] font-black uppercase tracking-[0.15em] text-violet-200">Skor hadiah</p>
            <p className="text-[clamp(1rem,2.4vh,1.4rem)] font-black text-amber-300">{liveCorrect * 100} poin</p>
          </div>
        </header>

        <section className="flex w-full max-w-[1500px] flex-[0.85] items-center justify-center px-2 text-center">
          <p className="max-w-[1200px] text-[clamp(1.55rem,4.1vh,2rem)] font-black leading-tight text-white [text-shadow:0_2px_5px_rgba(0,0,0,.8)]">{question.question}</p>
        </section>

        <section className="grid w-full max-w-[1450px] flex-[2] min-h-0 grid-cols-1 grid-rows-4 gap-[clamp(7px,1.25vh,13px)] sm:grid-cols-2 sm:grid-rows-2 sm:gap-x-[clamp(12px,3vw,42px)]" aria-label="Pilihan jawaban">
          {question.options.map((option, index) => {
            const correct = answered && index === question.correctIndex;
            const wrong = answered && index === selected && !correct;
            const pending = !answered && index === selected;
            const tone = correct
              ? 'border-emerald-300 bg-emerald-500/30 shadow-[0_0_28px_rgba(52,211,153,.4)]'
              : wrong
                ? 'border-rose-300 bg-rose-500/30 shadow-[0_0_28px_rgba(251,113,133,.35)]'
                : pending
                  ? 'animate-pulse border-amber-300 bg-orange-500/40 shadow-[0_0_30px_rgba(251,191,36,.5)]'
                  : 'border-indigo-200/70 bg-indigo-950/65 hover:border-amber-300 hover:bg-amber-500/20 hover:shadow-[0_0_24px_rgba(251,191,36,.35)]';
            return (
              <button key={index} type="button" disabled={answered} onClick={() => selectAnswer(index)} className={`relative flex h-full min-h-0 items-center justify-center rounded-[1.35rem] border-[3px] px-4 py-2 text-center transition-all duration-200 disabled:cursor-default sm:rounded-[1.6rem] sm:px-6 ${tone}`}>
                <span className={`absolute left-3 flex h-[clamp(32px,6vh,46px)] w-[clamp(32px,6vh,46px)] flex-shrink-0 items-center justify-center rounded-full border-2 font-mono text-[clamp(1rem,2.8vh,1.45rem)] font-black sm:left-4 ${correct ? 'border-emerald-200 bg-emerald-400 text-slate-950' : wrong ? 'border-rose-200 bg-rose-400 text-slate-950' : pending ? 'border-amber-100 bg-orange-400 text-slate-950' : 'border-amber-300 bg-amber-400 text-slate-950'}`}>{LETTERS[index]}</span>
                <span className="mx-[clamp(2.5rem,7vw,4rem)] text-[clamp(1rem,2.8vh,1.5rem)] font-extrabold leading-snug text-white">{option}</span>
                {correct && <span className="absolute right-4 text-2xl font-black text-emerald-200">✓</span>}
                {wrong && <span className="absolute right-4 text-2xl font-black text-rose-200">✕</span>}
              </button>
            );
          })}
        </section>

        <AnimatePresence>
          {answered && (
            <motion.div
              className="absolute inset-0 z-20 grid place-items-center bg-slate-950/40 px-4 py-3 backdrop-blur-[2px]"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <motion.div
                className="w-full max-w-[min(760px,94vw)] rounded-[1.5rem] bg-gradient-to-br from-indigo-950/95 via-[#27235f]/95 to-violet-950/95 px-[clamp(16px,3vw,32px)] py-[clamp(14px,2.5vh,24px)] text-center shadow-2xl"
                initial={{ opacity: 0, scale: 0.88, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 6 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                <p className={`text-[clamp(1.2rem,3vh,1.7rem)] font-black ${selected === question.correctIndex ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {selected === question.correctIndex ? 'Benar! Hebat!' : `Belum tepat. Jawabannya: ${LETTERS[question.correctIndex]}`}
                </p>
                <p className="mt-1 text-[clamp(0.9rem,1.8vh,1.05rem)] font-bold text-indigo-100">{question.explanation}</p>
                {feedback && <p className="mt-1 text-sm text-indigo-200">{loadingFeedback ? 'Kapten Siaga sedang menyiapkan analisis...' : feedback}</p>}
                <button type="button" autoFocus onClick={next} className="mt-3 min-h-12 rounded-full bg-amber-400 px-9 py-2 text-base font-black text-slate-950 shadow-lg transition hover:bg-amber-300 focus-visible:outline focus-visible:outline-4 focus-visible:outline-amber-200">
                  {currentQ < total - 1 ? 'Lanjut' : 'Lihat Hasil'}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Recovery3D;
