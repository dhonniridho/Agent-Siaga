import React, { useMemo, useRef, useState } from 'react';
import { Billboard } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Avatar } from '../types';
import { Agent3D } from './Agent3D';
import { MissionCanvas } from './MissionCanvas';
import { makeBoardTexture, makeEmojiTexture } from './missionTextures';
import {
  ActionButton,
  HealthBar,
  HudChip,
  MissionPanel,
  MissionScene,
  ResultOverlay,
  StartOverlay,
  TouchJoystick,
} from './MissionUi';

export interface EarthquakeDetail {
  survived: boolean;
  healthRemaining: number;
  stars: number;
  quakesSafe: number;
}

interface Props {
  avatar: Avatar | null;
  teamName: string;
  playSound: (type: string) => void;
  updateSideNarrator?: (
    message: string,
    isTyping?: boolean,
    status?: 'idle' | 'warning' | 'success' | 'error'
  ) => void;
  onComplete: (score: number, detail: EarthquakeDetail) => void;
  onReplay?: () => void;
}

const QUAKE_ZONES = [
  { z: 16, duration: 3.0 },
  { z: 38, duration: 3.2 },
  { z: 60, duration: 3.4 },
  { z: 82, duration: 3.6 },
];
const QUAKE_WARNING_DISTANCE = 12;
const QUAKE_TRIGGER_DISTANCE = 2.2;
const GATE_Z = 96;
const EXIT_Z = 108;
const PLAYER_START = 2;
const PLAYER_SPEED = 5.6;
const STRAFE_SPEED = 4.6;
const TABLE_HIDE_RADIUS = 3.0;
const PLAYER_RADIUS = 0.5;

// Batas lorong: lebar lorong -4.6 s/d +4.6.
// Puing di GATE_Z memblokir area tengah, menyisakan jalur aman di kedua sisi.
const DEBRIS_X_MIN = -2.0;
const DEBRIS_X_MAX = 2.0;
const DEBRIS_Z_MIN = GATE_Z - 1.2;
const DEBRIS_Z_MAX = GATE_Z + 1.2;

const TABLES = [
  { id: 0, x: -1.7, z: 16 },
  { id: 1, x: 1.7, z: 38 },
  { id: 2, x: -1.7, z: 60 },
  { id: 3, x: 1.7, z: 82 },
  { id: 4, x: 1.7, z: 102 },
];

type ObstacleKind = 'cabinet' | 'shelf';

interface StaticObstacle {
  id: string;
  kind: ObstacleKind;
  x: number;
  z: number;
  width: number;
  depth: number;
  tilt: number;
}

// Lemari/rak miring yang hanya menutup satu sisi lorong. Sisi lainnya
// selalu menjadi celah aman yang cukup lebar untuk dilewati anak.
const STATIC_OBSTACLES: StaticObstacle[] = [
  { id: 'lemari-1', kind: 'cabinet', x: -3.35, z: 30, width: 2.3, depth: 1.5, tilt: 0.16 },
  { id: 'rak-1', kind: 'shelf', x: 3.35, z: 52, width: 2.3, depth: 1.6, tilt: -0.22 },
  { id: 'lemari-2', kind: 'cabinet', x: -3.35, z: 74, width: 2.3, depth: 1.5, tilt: 0.12 },
  { id: 'rak-2', kind: 'shelf', x: -3.35, z: 100, width: 2.2, depth: 1.5, tilt: -0.18 },
];

interface LightTrap {
  id: number;
  z: number;
  safeX: number;
  lamps: number[];
}

// Lampu/panel plafon jatuh berurutan. Dua lampu jatuh, satu jalur
// dibiarkan kosong sebagai celah aman (ditandai cincin hijau).
const LIGHT_TRAPS: LightTrap[] = [
  { id: 0, z: 24, safeX: 3.2, lamps: [-3.2, 0] },
  { id: 1, z: 46, safeX: -3.2, lamps: [0, 3.2] },
  { id: 2, z: 68, safeX: 0, lamps: [-3.2, 3.2] },
  { id: 3, z: 90, safeX: 3.2, lamps: [-3.2, 0] },
];

const LAMP_LAYOUT = LIGHT_TRAPS.flatMap((trap) =>
  trap.lamps.map((x) => ({ trapId: trap.id, z: trap.z, x }))
);
const LAMP_START_INDEX = LIGHT_TRAPS.map((_, index) =>
  LIGHT_TRAPS.slice(0, index).reduce((total, trap) => total + trap.lamps.length, 0)
);

type Status = 'READY' | 'PLAY' | 'RESULT';
type InputState = { forward: number; strafe: number; crouch: boolean; jump: boolean };

interface EarthquakeSceneProps {
  avatar: Avatar | null;
  teamName: string;
  playSound: (type: string) => void;
  inputRef: { current: InputState };
  joystickRef: { current: { x: number; y: number } };
  gameRef: {
    current: {
      status: Status;
      elapsed: number;
      health: number;
      z: number;
      x: number;
      crouch: boolean;
      nearTable: boolean;
      nearTableId: number | null;
      activeQuake: number;
      nextQuake: number;
      quakeEndAt: number;
      safeQuakes: number;
      exposedTime: number;
      finished: boolean;
    };
  };
  quaking: boolean;
  gateOpen: boolean;
  crouchHeld: boolean;
  nearTableId: number | null;
  onSync: (snapshot: {
    health: number;
    elapsed: number;
    quakeIndex: number;
    nearTable: boolean;
    nearTableId: number | null;
    safeQuakes: number;
    progress: number;
    warning: boolean;
    quaking: boolean;
    gateOpen: boolean;
  }) => void;
  onFinish: (survived: boolean, health: number, safeQuakes: number) => void;
}

const SchoolTable: React.FC<{ x: number; z: number; highlighted: boolean; hidden: boolean }> = ({
  x,
  z,
  highlighted,
  hidden,
}) => (
  <group position={[x, 0, z]} visible={!hidden}>
    <mesh position={[0, 0.86, 0]}>
      <boxGeometry args={[2.5, 0.16, 1.5]} />
      <meshStandardMaterial color="#d9a066" roughness={0.65} />
    </mesh>
    <mesh position={[0, 0.78, 0]}>
      <boxGeometry args={[2.3, 0.05, 1.3]} />
      <meshStandardMaterial color="#b97b45" roughness={0.8} />
    </mesh>
    {[
      [-1.05, -0.58],
      [1.05, -0.58],
      [-1.05, 0.58],
      [1.05, 0.58],
    ].map(([lx, lz], index) => (
      <mesh key={index} position={[lx, 0.42, lz]}>
        <boxGeometry args={[0.12, 0.84, 0.12]} />
        <meshStandardMaterial color="#8b5a2b" roughness={0.85} />
      </mesh>
    ))}
    {!highlighted && (
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
        <ringGeometry args={[1.45, 1.65, 32]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.32} side={THREE.DoubleSide} />
      </mesh>
    )}
    {highlighted && (
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.03, 0]}>
        <ringGeometry args={[1.6, 1.85, 36]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.85} side={THREE.DoubleSide} />
      </mesh>
    )}
  </group>
);

const FallingDebris: React.FC<{ active: boolean }> = ({ active }) => {
  const group = useRef<THREE.Group>(null);
  const pieces = useMemo(
    () =>
      Array.from({ length: 18 }, (_, index) => ({
        x: (Math.random() - 0.5) * 10,
        z: 6 + Math.random() * 98,
        y: 1 + Math.random() * 5,
        speed: 3 + Math.random() * 4,
        spin: Math.random() * 4,
        size: 0.12 + Math.random() * 0.2,
        id: index,
      })),
    []
  );
  const refs = useRef<Array<THREE.Mesh | null>>([]);

  useFrame((_, delta) => {
    if (!active) return;
    const dt = Math.min(delta, 0.05);
    pieces.forEach((piece, index) => {
      const mesh = refs.current[index];
      if (!mesh) return;
      mesh.position.y -= piece.speed * dt;
      mesh.rotation.x += piece.spin * dt;
      mesh.rotation.z += piece.spin * 0.7 * dt;
      if (mesh.position.y < 0.1) {
        mesh.position.y = 5 + Math.random() * 2;
        mesh.position.x = (Math.random() - 0.5) * 10;
        mesh.position.z = 6 + Math.random() * 98;
      }
    });
  });

  if (!active) return null;

  return (
    <group ref={group}>
      {pieces.map((piece, index) => (
        <mesh
          key={piece.id}
          ref={(mesh) => {
            refs.current[index] = mesh;
          }}
          position={[piece.x, piece.y, piece.z]}
        >
          <boxGeometry args={[piece.size, piece.size, piece.size]} />
          <meshStandardMaterial color={index % 3 === 0 ? '#cbd5e1' : '#94a3b8'} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
};

const TiltedFurniture: React.FC<{ obstacle: StaticObstacle }> = ({ obstacle }) => {
  const isCabinet = obstacle.kind === 'cabinet';
  const gapX = obstacle.x > 0 ? -2.7 : 2.7;

  return (
    <>
      <group position={[obstacle.x, 0, obstacle.z]} rotation-z={obstacle.tilt}>
        <mesh position={[0, 1.15, 0]}>
          <boxGeometry args={[obstacle.width, 2.3, obstacle.depth]} />
          <meshStandardMaterial color={isCabinet ? '#64748b' : '#a16207'} roughness={0.82} />
        </mesh>

        {isCabinet ? (
          <>
            <mesh position={[0, 1.28, obstacle.depth / 2 + 0.02]}>
              <boxGeometry args={[obstacle.width - 0.2, 1.9, 0.06]} />
              <meshStandardMaterial color="#94a3b8" roughness={0.7} />
            </mesh>
            <mesh position={[-obstacle.width * 0.22, 1.28, obstacle.depth / 2 + 0.07]} rotation-z={0.12}>
              <boxGeometry args={[0.16, 0.16, 0.08]} />
              <meshStandardMaterial color="#f8fafc" metalness={0.5} roughness={0.4} />
            </mesh>
            <mesh position={[obstacle.width * 0.22, 1.28, obstacle.depth / 2 + 0.07]}>
              <boxGeometry args={[0.16, 0.16, 0.08]} />
              <meshStandardMaterial color="#f8fafc" metalness={0.5} roughness={0.4} />
            </mesh>
            {/* Pintu lemari yang terkelupas */}
            <mesh position={[obstacle.width * 0.5 + 0.12, 1.2, 0.22]} rotation-y={0.5}>
              <boxGeometry args={[0.08, 1.7, 0.7]} />
              <meshStandardMaterial color="#cbd5e1" roughness={0.8} />
            </mesh>
          </>
        ) : (
          <>
            {[0.65, 1.25, 1.85].map((y) => (
              <mesh key={y} position={[0, y, 0]}>
                <boxGeometry args={[obstacle.width - 0.16, 0.09, obstacle.depth - 0.12]} />
                <meshStandardMaterial color="#d6a35c" roughness={0.85} />
              </mesh>
            ))}
            {Array.from({ length: 9 }, (_, index) => (
              <mesh
                key={`book-${index}`}
                position={[
                  -obstacle.width * 0.32 + (index % 3) * 0.42,
                  0.85 + Math.floor(index / 3) * 0.6,
                  0.1,
                ]}
                rotation-z={(index % 2 === 0 ? 1 : -1) * 0.08}
              >
                <boxGeometry args={[0.24, 0.4, 0.4]} />
                <meshStandardMaterial
                  color={index % 3 === 0 ? '#ef4444' : index % 3 === 1 ? '#3b82f6' : '#22c55e'}
                  roughness={0.75}
                />
              </mesh>
            ))}
          </>
        )}

        {/* Pita peringatan di badan furnitur */}
        <mesh position={[0, 2.15, obstacle.depth / 2 + 0.035]}>
          <planeGeometry args={[obstacle.width * 0.8, 0.18]} />
          <meshBasicMaterial color="#facc15" transparent opacity={0.95} />
        </mesh>
      </group>

      {/* Celah aman di sisi lorong yang tidak tertutup */}
      <group position={[gapX, 0.03, obstacle.z]}>
        <mesh rotation-x={-Math.PI / 2}>
          <planeGeometry args={[2.1, obstacle.depth + 1.8]} />
          <meshBasicMaterial color="#22c55e" transparent opacity={0.2} />
        </mesh>
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 0]}>
          <ringGeometry args={[0.55, 0.82, 24]} />
          <meshBasicMaterial color="#4ade80" transparent opacity={0.9} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </>
  );
};

const FallingLamp: React.FC<{
  x: number;
  z: number;
  variant: number;
  registerRef: (group: THREE.Group | null) => void;
}> = ({ x, z, variant, registerRef }) => (
  <group ref={registerRef} position={[x, 5.4, z]}>
    {variant % 5 === 0 ? (
      <>
        <mesh position={[0, 0.62, 0]}><cylinderGeometry args={[0.045, 0.045, 1.2, 6]} /><meshStandardMaterial color="#475569" metalness={0.45} roughness={0.5} /></mesh>
        <mesh><boxGeometry args={[1.15, 0.18, 0.55]} /><meshStandardMaterial color="#fef9c3" emissive="#fde68a" emissiveIntensity={1.7} /></mesh>
        <mesh position={[0, -0.14, 0]}><boxGeometry args={[1.28, 0.1, 0.64]} /><meshStandardMaterial color="#e2e8f0" roughness={0.6} /></mesh>
      </>
    ) : variant % 5 === 1 ? (
      <group rotation-y={0.35}>
        {[-0.32, 0, 0.32].map((x, index) => <mesh key={x} position={[x, index % 2 ? 0.12 : 0, 0]} rotation-z={index % 2 ? -0.12 : 0.1}><boxGeometry args={[0.72, 0.2, 0.58]} /><meshStandardMaterial color={index % 2 ? '#3b82f6' : '#ef4444'} roughness={0.7} /></mesh>)}
      </group>
    ) : variant % 5 === 2 ? (
      <group>
        <mesh position={[0, -0.15, 0]}><cylinderGeometry args={[0.28, 0.2, 0.48, 8]} /><meshStandardMaterial color="#c75b39" roughness={0.8} /></mesh>
        <mesh position={[0, 0.28, 0]}><dodecahedronGeometry args={[0.48, 0]} /><meshStandardMaterial color="#3f8f4b" roughness={0.8} /></mesh>
        <mesh position={[-0.22, 0.48, 0.08]}><sphereGeometry args={[0.2, 8, 8]} /><meshStandardMaterial color="#65a30d" /></mesh>
      </group>
    ) : variant % 5 === 3 ? (
      <group rotation-z={0.18}><mesh><boxGeometry args={[2.1, 0.34, 0.52]} /><meshStandardMaterial color="#8b5a2b" roughness={0.95} /></mesh><mesh position={[0, 0.24, 0]}><boxGeometry args={[1.8, 0.12, 0.48]} /><meshStandardMaterial color="#d6a35c" roughness={0.9} /></mesh></group>
    ) : (
      <group rotation-y={0.3}>
        {[-0.28, 0, 0.28].map((x, index) => <mesh key={x} position={[x, 0, index % 2 ? 0.1 : -0.1]} rotation={[0.2, 0.2 * index, 0.3 * index]}><tetrahedronGeometry args={[0.5, 0]} /><meshStandardMaterial color="#a5f3fc" emissive="#67e8f9" emissiveIntensity={0.25} transparent opacity={0.85} /></mesh>)}
      </group>
    )}
  </group>
);

const ImpactDust: React.FC<{ active: boolean; position: [number, number, number] }> = ({ active, position }) => {
  const refs = useRef<Array<THREE.Mesh | null>>([]);
  const startAt = useRef<number | null>(null);
  useFrame((state) => {
    if (!active) { startAt.current = null; return; }
    if (startAt.current === null) startAt.current = state.clock.elapsedTime;
    const progress = Math.min(1, (state.clock.elapsedTime - startAt.current) / 0.65);
    refs.current.forEach((mesh, index) => {
      if (!mesh) return;
      const angle = (index / 6) * Math.PI * 2;
      mesh.position.set(Math.cos(angle) * progress * 1.5, 0.1 + progress * (0.8 + index % 2 * 0.3), Math.sin(angle) * progress * 1.5);
      mesh.scale.setScalar(0.35 + progress * 0.45);
      (mesh.material as THREE.MeshStandardMaterial).opacity = (1 - progress) * 0.75;
    });
  });
  if (!active) return null;
  return <group position={position}>{Array.from({ length: 6 }, (_, index) => <mesh key={index} ref={(mesh) => { refs.current[index] = mesh; }}><sphereGeometry args={[0.32, 7, 7]} /><meshStandardMaterial color="#d6d3d1" transparent opacity={0.75} depthWrite={false} /></mesh>)}</group>;
};

const LightTrapMarker: React.FC<{ trap: LightTrap; active: boolean; landed: boolean }> = ({ trap, active, landed }) => {
  const targetRef = useRef<THREE.Mesh>(null);
  const dustRingRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (targetRef.current) {
      const pulse = active && !landed ? 1 + Math.sin(state.clock.elapsedTime * 10) * 0.18 : 1;
      targetRef.current.scale.set(pulse, 1, pulse);
    }
    if (dustRingRef.current) {
      const pulse = landed ? 1.2 + (Math.sin(state.clock.elapsedTime * 7) + 1) * 0.18 : 0.8;
      dustRingRef.current.scale.set(pulse, 1, pulse);
      (dustRingRef.current.material as THREE.MeshBasicMaterial).opacity = landed ? 0.36 : 0;
    }
  });
  return (
  <group position={[trap.safeX, 0.03, trap.z]}>
    <mesh rotation-x={-Math.PI / 2}>
      <planeGeometry args={[1.7, 3.0]} />
      <meshBasicMaterial color="#22c55e" transparent opacity={0.2} />
    </mesh>
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 0]}>
      <ringGeometry args={[0.55, 0.82, 24]} />
      <meshBasicMaterial color="#4ade80" transparent opacity={0.9} side={THREE.DoubleSide} />
    </mesh>
    {[-0.8, 0, 0.8].map((z) => (
      <mesh key={z} rotation-x={-Math.PI / 2} position={[0, 0.02, z]}>
        <planeGeometry args={[0.5, 0.26]} />
        <meshBasicMaterial color="#bbf7d0" transparent opacity={0.75} />
      </mesh>
    ))}
    {/* Zona bahaya di bawah lampu yang akan jatuh */}
    {trap.lamps.map((lampX) => (
      <mesh
        key={`danger-${lampX}`}
        rotation-x={-Math.PI / 2}
        position={[lampX - trap.safeX, 0.015, 0]}
      >
        <ringGeometry args={[0.7, 0.95, 24]} />
        <meshBasicMaterial color="#facc15" transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>
    ))}
    <mesh ref={targetRef} rotation-x={-Math.PI / 2} position={[0, 0.025, 0]}>
      <ringGeometry args={[1.25, 1.45, 28]} />
      <meshBasicMaterial color="#fb923c" transparent opacity={active && !landed ? 0.9 : 0.25} side={THREE.DoubleSide} />
    </mesh>
    <mesh ref={dustRingRef} rotation-x={-Math.PI / 2} position={[0, 0.035, 0]}>
      <ringGeometry args={[1.5, 1.9, 32]} />
      <meshBasicMaterial color="#cbd5e1" transparent opacity={0} side={THREE.DoubleSide} />
    </mesh>
  </group>
  );
};

const EarthquakeScene: React.FC<EarthquakeSceneProps> = ({
  avatar,
  teamName,
  playSound,
  inputRef,
  joystickRef,
  gameRef,
  quaking,
  gateOpen,
  crouchHeld,
  nearTableId,
  onSync,
  onFinish,
}) => {
  const agent = useRef<THREE.Group>(null);
  const cameraShake = useRef(0);
  const jumpY = useRef(0);
  const jumpVelocity = useRef(0);
  const jumpWasDown = useRef(false);
  const jumpCooldown = useRef(0);
  const hitUntil = useRef(0);
  const stunUntil = useRef(0);
  const collisionInvincibleUntil = useRef(0);
  const collisionFlashUntil = useRef(0);
  const collisionContact = useRef(false);
  const [hitFlash, setHitFlash] = useState(false);
  const [collisionStunned, setCollisionStunned] = useState(false);
  const [damageVisible, setDamageVisible] = useState(false);
  const [walking, setWalking] = useState(false);
  const lastSync = useRef(0);
  const lastNear = useRef(false);
  const lampRefs = useRef<Array<THREE.Group | null>>([]);
  const lightRuntime = useRef(
    LIGHT_TRAPS.map((trap) => ({
      triggered: false,
      triggerAt: 0,
      hit: trap.lamps.map(() => false),
      landed: trap.lamps.map(() => false),
    }))
  );
  const wasPlaying = useRef(false);
  const cameraPos = useMemo(() => new THREE.Vector3(), []);
  const lookAt = useMemo(() => new THREE.Vector3(), []);
  const collisionTexture = useMemo(() => makeEmojiTexture('⭐', '-10 HP', '#f97316', true), []);
  const damageTexture = useMemo(() => makeEmojiTexture(String.fromCodePoint(11088), '-10 HP', '#ef4444', true), []);

  const exitTexture = useMemo(
    () =>
      makeBoardTexture({
        title: 'Pintu Keluar',
        text: 'Lapangan terbuka',
        emoji: '🚪',
        accent: '#16a34a',
        background: '#ecfdf5',
        width: 640,
        height: 320,
        textSize: 46,
        titleSize: 40,
      }),
    []
  );

  useFrame((state, rawDelta) => {
    const game = gameRef.current;
    if (game.status !== 'PLAY' || game.finished) {
      wasPlaying.current = false;
      return;
    }
    const delta = Math.min(rawDelta, 0.05);
    if (document.querySelector('[role="dialog"][aria-modal="true"]')) {
      inputRef.current = { forward: 0, strafe: 0, crouch: false, jump: false };
      joystickRef.current = { x: 0, y: 0 };
      jumpWasDown.current = false;
    }
    game.elapsed += delta;
    jumpCooldown.current = Math.max(0, jumpCooldown.current - delta);
    const controlsLocked = game.elapsed < stunUntil.current;

    // Mulai lari baru: kembalikan semua lampu ke posisi menggantung.
    if (!wasPlaying.current) {
      wasPlaying.current = true;
      stunUntil.current = 0;
      collisionInvincibleUntil.current = 0;
      collisionFlashUntil.current = 0;
      collisionContact.current = false;
      hitUntil.current = 0;
      jumpY.current = 0;
      jumpVelocity.current = 0;
      jumpWasDown.current = false;
      setCollisionStunned(false);
      setDamageVisible(false);
      setWalking(false);
      lightRuntime.current = LIGHT_TRAPS.map((trap) => ({
        triggered: false,
        triggerAt: 0,
        hit: trap.lamps.map(() => false),
        landed: trap.lamps.map(() => false),
      }));
      LAMP_LAYOUT.forEach((lamp, index) => {
        const group = lampRefs.current[index];
        if (!group) return;
        group.position.set(lamp.x, 5.4, lamp.z);
        group.rotation.set(0, 0, 0);
      });
    }

    const joy = joystickRef.current;
    const forwardInput = controlsLocked ? 0 : Math.max(-1, Math.min(1, inputRef.current.forward - joy.y));
    const strafeInput = controlsLocked ? 0 : Math.max(-1, Math.min(1, inputRef.current.strafe + joy.x));
    const crouch = inputRef.current.crouch;

    const jumpDown = inputRef.current.jump;
    if (jumpDown && !jumpWasDown.current && jumpY.current === 0 && !crouch && !controlsLocked && jumpCooldown.current === 0) {
      jumpVelocity.current = 5.2;
      jumpCooldown.current = 0.28;
      playSound('whoosh');
    }
    jumpWasDown.current = jumpDown;
    if (jumpY.current > 0 || jumpVelocity.current > 0) {
      jumpVelocity.current -= 13 * delta;
      jumpY.current = Math.max(0, jumpY.current + jumpVelocity.current * delta);
      if (jumpY.current === 0) {
        jumpVelocity.current = 0;
      }
    }

    let forward = 0;
    if (forwardInput > 0.08 && !crouch) forward = Math.min(1, forwardInput);
    else if (forwardInput < -0.08 && !crouch) forward = Math.max(-0.65, forwardInput);

    const prevX = game.x;
    const prevZ = game.z;

    const newZ = prevZ + forward * PLAYER_SPEED * delta;
    // Kamera menatap +Z, sehingga layar kanan = -X. Invert strafe agar
    // tombol A/Left benar-benar menggeser ke kiri layar dan D/Right ke kanan.
    const newX = prevX - strafeInput * STRAFE_SPEED * delta;

    const isGateOpen = game.nextQuake >= QUAKE_ZONES.length && game.activeQuake < 0;
    const inDebris = (x: number, z: number) =>
      !isGateOpen && x > DEBRIS_X_MIN - PLAYER_RADIUS && x < DEBRIS_X_MAX + PLAYER_RADIUS &&
      z > DEBRIS_Z_MIN - 0.2 && z < DEBRIS_Z_MAX + 0.2;
    const inTable = (x: number, z: number) => TABLES.some((table) => {
      const dx = x - table.x;
      const dz = z - table.z;
      const tabletop = !crouch && Math.abs(dx) < 1.25 + PLAYER_RADIUS && Math.abs(dz) < 0.75 + PLAYER_RADIUS;
      const legs = [-1, 1].some((sideX) => [-1, 1].some((sideZ) =>
        Math.hypot(dx - sideX * 1.05, dz - sideZ * 0.58) < PLAYER_RADIUS + 0.08
      ));
      return tabletop || legs;
    });
    const inFurniture = (x: number, z: number) =>
      STATIC_OBSTACLES.some((obstacle) =>
        Math.abs(x - obstacle.x) < obstacle.width / 2 + Math.abs(Math.sin(obstacle.tilt)) * 1.15 + PLAYER_RADIUS &&
        Math.abs(z - obstacle.z) < obstacle.depth / 2 + PLAYER_RADIUS
      );
    const blocked = (x: number, z: number) => Math.abs(x) > 6.08 || inDebris(x, z) || inFurniture(x, z) || inTable(x, z);
    const blockedX = blocked(newX, prevZ);
    const blockedZ = blocked(prevX, newZ);
    const hitSpeed = Math.max(
      blockedX ? Math.abs(newX - prevX) / Math.max(delta, 0.001) : 0,
      blockedZ ? Math.abs(newZ - prevZ) / Math.max(delta, 0.001) : 0
    );

    const solidContact = blockedX || blockedZ;
    if (solidContact && hitSpeed > 1.8 && !collisionContact.current && game.elapsed >= collisionInvincibleUntil.current) {
      game.health = Math.max(0, game.health - 10);
      stunUntil.current = game.elapsed + 0.72;
      collisionInvincibleUntil.current = game.elapsed + 1.25;
      collisionFlashUntil.current = game.elapsed + 0.75;
      game.x = prevX;
      game.z = prevZ;
      const moveLength = Math.hypot(newX - prevX, newZ - prevZ) || 1;
      const pushX = prevX - ((newX - prevX) / moveLength) * 0.22;
      const pushZ = prevZ - ((newZ - prevZ) / moveLength) * 0.22;
      if (!blocked(pushX, pushZ)) {
        game.x = pushX;
        game.z = pushZ;
      }
      cameraShake.current = Math.max(cameraShake.current, 0.55);
      hitUntil.current = state.clock.elapsedTime + 0.75;
      playSound('error');
    } else if (blockedX || blockedZ) {
      // Sliding collision: periksa apakah salah satu sumbu masih bebas
      if (!blockedX) {
        game.x = newX;
      } else if (!blockedZ) {
        game.z = newZ;
      } else {
        // Kedua sumbu terhalang: tetap di posisi sebelumnya agar pemain
        // tidak menembus lemari/rak atau terlempar ke puing.
        game.x = prevX;
        game.z = prevZ;
      }
    } else {
      game.x = newX;
      game.z = newZ;
    }
    collisionContact.current = solidContact;

    game.z = THREE.MathUtils.clamp(game.z, PLAYER_START, EXIT_Z + 0.6);
    game.crouch = crouch;

    const near = TABLES.some(
      (table) => Math.hypot(game.x - table.x, game.z - table.z) < TABLE_HIDE_RADIUS
    );
    game.nearTable = near;
    const nearest = TABLES.reduce<{ id: number; distance: number } | null>((best, table) => {
      const distance = Math.hypot(game.x - table.x, game.z - table.z);
      if (distance >= TABLE_HIDE_RADIUS) return best;
      if (!best || distance < best.distance) return { id: table.id, distance };
      return best;
    }, null);
    game.nearTableId = nearest?.id ?? null;

    const movingNow = !controlsLocked && (Math.abs(forward) > 0.08 || Math.abs(strafeInput) > 0.08);
    if (movingNow !== walking) setWalking(movingNow);
    const collisionStunNow = game.elapsed < stunUntil.current;
    if (collisionStunNow !== collisionStunned) setCollisionStunned(collisionStunNow);
    const damageNow = game.elapsed < collisionFlashUntil.current;
    if (damageNow !== damageVisible) setDamageVisible(damageNow);

    // Gempa dipicu berdasarkan posisi lorong, sehingga setiap bagian
    // lintasan punya tantangan gempa yang berurutan dan adil.
    const nextZone = QUAKE_ZONES[game.nextQuake];
    const warning =
      !!nextZone &&
      game.activeQuake < 0 &&
      game.z >= nextZone.z - QUAKE_WARNING_DISTANCE &&
      game.z < nextZone.z - QUAKE_TRIGGER_DISTANCE;

    if (nextZone && game.activeQuake < 0 && game.z >= nextZone.z - QUAKE_TRIGGER_DISTANCE) {
      game.activeQuake = game.nextQuake;
      game.quakeEndAt = game.elapsed + nextZone.duration;
      game.nextQuake += 1;
      game.exposedTime = 0;
      cameraShake.current = 0.8;
      playSound('explosion');
    }

    const active = game.activeQuake >= 0 && game.elapsed < game.quakeEndAt;

    if (game.activeQuake >= 0 && !active) {
      if (game.exposedTime < 0.6) {
        game.safeQuakes += 1;
        playSound('success');
      }
      game.activeQuake = -1;
      game.exposedTime = 0;
    }

    if (active) {
      cameraShake.current = Math.min(1, cameraShake.current + delta * 6);
      if (!(crouch && near)) {
        game.exposedTime += delta;
        if (game.exposedTime > 0.65) {
          game.health = Math.max(0, game.health - 18 * delta);
        }
      } else {
        game.exposedTime = 0;
      }
      if (game.health <= 0) {
        game.finished = true;
        game.status = 'RESULT';
        onFinish(false, 0, game.safeQuakes);
        return;
      }
    } else {
      game.exposedTime = 0;
    }

    // Lampu/panel plafon jatuh berurutan saat pemain mendekat.
    let hazardHit = false;
    LIGHT_TRAPS.forEach((trap, trapIndex) => {
      const runtime = lightRuntime.current[trapIndex];
      if (!runtime.triggered && game.z >= trap.z - 9) {
        runtime.triggered = true;
        runtime.triggerAt = game.elapsed;
        playSound('warning');
      }
      if (!runtime.triggered) return;

      trap.lamps.forEach((lampX, lampIndex) => {
        const group = lampRefs.current[LAMP_START_INDEX[trapIndex] + lampIndex];
        if (!group) return;
        const t = game.elapsed - runtime.triggerAt - lampIndex * 0.42;

        if (t < 0) {
          group.position.y = 5.4 + Math.sin(state.clock.elapsedTime * 16 + lampIndex) * 0.06;
          group.rotation.z = Math.sin(state.clock.elapsedTime * 12 + lampIndex) * 0.06;
        } else {
          const fallY = Math.max(0.5, 5.4 - 0.5 * 18 * t * t);
          group.position.y = fallY > 0.5 ? fallY : 0.5 + Math.max(0, Math.sin((t - 0.55) * 16)) * 0.12;
          group.rotation.z = Math.min(0.65, t * 1.1);
          group.rotation.x = Math.min(0.28, t * 0.5);
          if (fallY <= 0.5 && !runtime.landed[lampIndex]) {
            runtime.landed[lampIndex] = true;
            cameraShake.current = 0.7;
            playSound('explosion');
          }
        }

        if (t > 0.3 && !runtime.hit[lampIndex]) {
          const closeX = Math.abs(game.x - lampX) < 1.05;
          const closeZ = Math.abs(game.z - trap.z) < 1.15;
          const sheltered = crouch && near;
          const jumpedClear = jumpY.current > 1.1;
          const avatarHeight = crouch ? 0.95 : 1.7;
          const fallingObjectBottom = group.position.y - 0.55;
          const verticalOverlap =
            jumpY.current < group.position.y + 0.45 &&
            jumpY.current + avatarHeight > fallingObjectBottom;
          if (closeX && closeZ && verticalOverlap && !sheltered && !jumpedClear && game.elapsed >= collisionInvincibleUntil.current) {
            runtime.hit[lampIndex] = true;
            game.health = Math.max(0, game.health - 16);
            stunUntil.current = game.elapsed + 0.72;
            collisionInvincibleUntil.current = game.elapsed + 1.25;
            collisionFlashUntil.current = game.elapsed + 0.75;
            cameraShake.current = 1;
            hazardHit = true;
            hitUntil.current = state.clock.elapsedTime + 1.15;
          }
        }
      });
    });

    if (hazardHit) playSound('error');
    const flashing = state.clock.elapsedTime < hitUntil.current;
    if (flashing !== hitFlash) setHitFlash(flashing);

    if (game.health <= 0) {
      game.finished = true;
      game.status = 'RESULT';
      onFinish(false, 0, game.safeQuakes);
      return;
    }

    if (game.z >= EXIT_Z) {
      game.finished = true;
      game.status = 'RESULT';
      onFinish(true, Math.round(game.health), game.safeQuakes);
      return;
    }

    if (agent.current) {
      agent.current.position.set(game.x, jumpY.current, game.z);
      // Agent3D menghadap +Z secara default — searah lorong tujuan.
      agent.current.rotation.y = 0;
      agent.current.visible = !collisionStunNow || Math.floor(state.clock.elapsedTime * 18) % 2 === 0;
    }

    // Kamera orang ketiga, sedikit di belakang dan atas.
    const targetZ = game.z - 7.2;
    const targetX = game.x * 0.55;
    const shake = active ? cameraShake.current : 0;
    cameraPos.set(
      targetX + (Math.random() - 0.5) * shake * 0.32,
      4.9 + (Math.random() - 0.5) * shake * 0.24,
      targetZ
    );
    state.camera.position.lerp(cameraPos, 1 - Math.exp(-8 * delta));
    lookAt.set(game.x * 0.4, 1.55, game.z + 4.4);
    state.camera.lookAt(lookAt);
    if (!active) cameraShake.current = Math.max(0, cameraShake.current - delta * 3);

    // Sinkronisasi HUD maksimal ~15x/detik.
    const now = state.clock.elapsedTime;
    if (now - lastSync.current > 0.06) {
      lastSync.current = now;
      onSync({
        health: Math.round(game.health),
        elapsed: game.elapsed,
        quakeIndex: game.activeQuake >= 0 ? game.activeQuake + 1 : 0,
        nearTable: near,
        nearTableId: nearest?.id ?? null,
        safeQuakes: game.safeQuakes,
        progress: Math.round((game.z / EXIT_Z) * 100),
        warning,
        quaking: active,
        gateOpen: isGateOpen,
      });
    }

    if (near !== lastNear.current) {
      lastNear.current = near;
    }
  });

  return (
    <>
      <fog attach="fog" args={['#7c8aa0', 22, 62]} />

      {/* Lantai koridor */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 54]} receiveShadow>
        <planeGeometry args={[13.6, 124]} />
        <meshStandardMaterial color="#9aa6b2" roughness={0.92} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 54]}>
        <planeGeometry args={[2.4, 124]} />
        <meshStandardMaterial color="#b8c2cc" roughness={0.8} />
      </mesh>

      {/* Dinding + loker */}
      {[-6.7, 6.7].map((x) => (
        <group key={x} position={[x, 0, 54]}>
          <mesh position={[0, 3.1, 0]}>
            <boxGeometry args={[0.32, 6.2, 124]} />
            <meshStandardMaterial color="#d8dee6" roughness={0.9} />
          </mesh>
          {Array.from({ length: 15 }, (_, index) => (
            <mesh key={index} position={[x > 0 ? -0.19 : 0.19, 1.55, -56 + index * 8]}>
              <boxGeometry args={[0.14, 2.4, 4.2]} />
              <meshStandardMaterial
                color={index % 3 === 0 ? '#64748b' : index % 3 === 1 ? '#7c8ea3' : '#526173'}
                roughness={0.7}
              />
            </mesh>
          ))}
        </group>
      ))}

      {/* Langit-langit + lampu */}
      <mesh position={[0, 6.2, 54]}>
        <boxGeometry args={[13.6, 0.25, 124]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.95} />
      </mesh>
      {Array.from({ length: 14 }, (_, index) => (
        <mesh key={index} position={[0, 6.02, -2 + index * 8.4]}>
          <boxGeometry args={[3.4, 0.08, 0.5]} />
          <meshStandardMaterial color="#fef9c3" emissive="#fde68a" emissiveIntensity={1.3} />
        </mesh>
      ))}

      {/* Meja-meja perlindungan */}
      {TABLES.map((table) => (
        <SchoolTable
          key={table.id}
          x={table.x}
          z={table.z}
          highlighted={nearTableId === table.id}
          hidden={false}
        />
      ))}

      {/* Lemari/rak miring: menutup satu sisi, menyisakan celah aman */}
      {STATIC_OBSTACLES.map((obstacle) => (
        <TiltedFurniture key={obstacle.id} obstacle={obstacle} />
      ))}

      {/* Lampu/panel plafon yang jatuh berurutan + penanda jalur aman */}
      {LIGHT_TRAPS.map((trap) => {
        const runtime = lightRuntime.current[trap.id];
        return <LightTrapMarker key={`trap-marker-${trap.id}`} trap={trap} active={runtime.triggered} landed={runtime.landed.some(Boolean)} />;
      })}
      {LAMP_LAYOUT.map((lamp, index) => (
        <React.Fragment key={`lamp-${lamp.trapId}-${lamp.x}`}>
          <FallingLamp
            x={lamp.x}
            z={lamp.z}
            variant={index}
            registerRef={(group) => { lampRefs.current[index] = group; }}
          />
          <ImpactDust
            active={!!lightRuntime.current[lamp.trapId]?.landed[LIGHT_TRAPS[lamp.trapId].lamps.indexOf(lamp.x)]}
            position={[lamp.x, 0.04, lamp.z]}
          />
        </React.Fragment>
      ))}

      {/* Puing reruntuhan di tengah lorong (menyisakan jalur luas di kiri dan kanan) */}
      {!gateOpen && (
        <group position={[0, 0, GATE_Z]}>
          {/* Blok reruntuhan utama di tengah */}
          <mesh position={[0, 0.6, 0]}>
            <boxGeometry args={[3.8, 1.2, 1.8]} />
            <meshStandardMaterial color="#64748b" roughness={0.95} />
          </mesh>
          {Array.from({ length: 9 }, (_, index) => (
            <mesh
              key={index}
              position={[(index % 3 - 1) * 1.1, 0.4 + Math.floor(index / 3) * 0.5, (index % 2 - 0.5) * 0.7]}
              rotation={[0.2, index * 0.5, index * 0.3]}
            >
              <boxGeometry args={[1.2, 0.6, 0.9]} />
              <meshStandardMaterial color={index % 2 ? '#94a3b8' : '#475569'} roughness={1} />
            </mesh>
          ))}
          {/* Papan peringatan reruntuhan */}
          <mesh position={[0, 1.6, 0.2]}>
            <planeGeometry args={[2.8, 0.7]} />
            <meshBasicMaterial color="#f59e0b" transparent opacity={0.95} />
          </mesh>
        </group>
      )}

      {/* Rambu jalur evakuasi terbuka di sisi kiri & kanan reruntuhan */}
      {[-3.3, 3.3].map((sideX) => (
        <group key={`evac-lane-${sideX}`} position={[sideX, 0.02, GATE_Z]}>
          <mesh rotation-x={-Math.PI / 2}>
            <planeGeometry args={[2.2, 3.6]} />
            <meshBasicMaterial color="#22c55e" transparent opacity={0.25} />
          </mesh>
          <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 0]}>
            <ringGeometry args={[0.7, 0.95, 24]} />
            <meshBasicMaterial color="#4ade80" transparent opacity={0.75} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}

      {/* Pintu keluar */}
      <group position={[0, 0, EXIT_Z + 1.5]}>
        <mesh position={[0, 1.6, 0]}>
          <boxGeometry args={[4.4, 3.2, 0.35]} />
          <meshStandardMaterial color="#166534" roughness={0.6} emissive="#22c55e" emissiveIntensity={0.25} />
        </mesh>
        <mesh position={[0, 1.6, -0.22]}>
          <planeGeometry args={[4.8, 3.6]} />
          <meshBasicMaterial color="#22c55e" transparent opacity={0.25} />
        </mesh>
        <mesh position={[0, 3.7, 0]}>
          <planeGeometry args={[3.2, 1.2]} />
          <meshBasicMaterial map={exitTexture} transparent toneMapped={false} />
        </mesh>
      </group>

      <FallingDebris active={quaking} />

      <Agent3D
        ref={agent}
        avatar={avatar}
        label={teamName}
        mode={jumpY.current > 0 ? 'jump' : collisionStunned || quaking ? (crouchHeld && !collisionStunned ? 'crouch' : 'panic') : crouchHeld ? 'crouch' : walking ? 'run' : 'idle'}
        hitFlash={hitFlash || collisionStunned}
        scale={0.92}
      />
      {collisionStunned && (
        <Billboard position={[gameRef.current.x, jumpY.current + 3.05, gameRef.current.z]}>
          <mesh>
            <planeGeometry args={[1.05, 1.05]} />
            <meshBasicMaterial map={collisionTexture} transparent depthWrite={false} toneMapped={false} />
          </mesh>
        </Billboard>
      )}
      {damageVisible && (
        <Billboard position={[gameRef.current.x, jumpY.current + 2.45, gameRef.current.z]}>
          <mesh>
            <planeGeometry args={[0.9, 0.9]} />
            <meshBasicMaterial map={damageTexture} transparent depthWrite={false} toneMapped={false} />
          </mesh>
        </Billboard>
      )}
    </>
  );
};

export const EarthquakeMission3D: React.FC<Props> = ({
  avatar,
  teamName,
  playSound,
  updateSideNarrator,
  onComplete,
  onReplay,
}) => {
  const [status, setStatus] = useState<Status>('READY');
  const [health, setHealth] = useState(100);
  const [nearTable, setNearTable] = useState(false);
  const [quaking, setQuaking] = useState(false);
  const [warning, setWarning] = useState(false);
  const [quakeIndex, setQuakeIndex] = useState(0);
  const [safeQuakes, setSafeQuakes] = useState(0);
  const [progress, setProgress] = useState(0);
  const [gateOpen, setGateOpen] = useState(false);
  const [crouchHeld, setCrouchHeld] = useState(false);
  const [nearTableId, setNearTableId] = useState<number | null>(null);
  const [result, setResult] = useState<{ score: number; detail: EarthquakeDetail } | null>(null);

  const inputRef = useRef<InputState>({ forward: 0, strafe: 0, crouch: false, jump: false });
  const joystickRef = useRef({ x: 0, y: 0 });
  const heldKeys = useRef<Set<string>>(new Set());
  const touchCrouch = useRef(false);
  const touchJump = useRef(false);
  const gameRef = useRef({
    status: 'READY' as Status,
    elapsed: 0,
    health: 100,
    z: PLAYER_START,
    x: 0,
    crouch: false,
    nearTable: false,
    nearTableId: null,
    activeQuake: -1,
    nextQuake: 0,
    quakeEndAt: 0,
    safeQuakes: 0,
    exposedTime: 0,
    finished: false,
  });

  React.useEffect(() => {
    const updateInputs = () => {
      const keys = heldKeys.current;
      const fwd =
        (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) -
        (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
      const str =
        (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) -
        (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
      const isCrouch =
        touchCrouch.current ||
        keys.has('ShiftLeft') ||
        keys.has('ShiftRight');

      inputRef.current.forward = fwd;
      inputRef.current.strafe = str;
      inputRef.current.crouch = isCrouch;
      inputRef.current.jump = keys.has('Space') || touchJump.current;
      setCrouchHeld(isCrouch);
    };

    const down = (event: KeyboardEvent) => {
      if (gameRef.current.status !== 'PLAY') return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) {
        clearInputs();
        return;
      }
      const code = event.code;
      if (
        code === 'KeyW' ||
        code === 'KeyS' ||
        code === 'KeyA' ||
        code === 'KeyD' ||
        code === 'ArrowUp' ||
        code === 'ArrowDown' ||
        code === 'ArrowLeft' ||
        code === 'ArrowRight' ||
        code === 'Space' ||
        code === 'ShiftLeft' ||
        code === 'ShiftRight'
      ) {
        heldKeys.current.add(code);
        updateInputs();
        event.preventDefault();
      }
    };

    const up = (event: KeyboardEvent) => {
      heldKeys.current.delete(event.code);
      updateInputs();
    };

    const clearInputs = () => {
      heldKeys.current.clear();
      touchCrouch.current = false;
      touchJump.current = false;
      inputRef.current = { forward: 0, strafe: 0, crouch: false, jump: false };
      joystickRef.current = { x: 0, y: 0 };
      setCrouchHeld(false);
    };
    const resetKeys = () => {
      clearInputs();
      updateInputs();
    };

    const onVisibilityChange = () => {
      if (document.hidden) clearInputs();
    };
    const modalObserver = new MutationObserver(() => {
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) clearInputs();
    });
    modalObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-modal'] });

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', resetKeys);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', resetKeys);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      modalObserver.disconnect();
    };
  }, []);

  const start = () => {
    heldKeys.current.clear();
    touchCrouch.current = false;
    touchJump.current = false;
    gameRef.current = {
      status: 'PLAY',
      elapsed: 0,
      health: 100,
      z: PLAYER_START,
      x: 0,
      crouch: false,
      nearTable: false,
      nearTableId: null,
      activeQuake: -1,
      nextQuake: 0,
      quakeEndAt: 0,
      safeQuakes: 0,
      exposedTime: 0,
      finished: false,
    };
    inputRef.current = { forward: 0, strafe: 0, crouch: false, jump: false };
    joystickRef.current = { x: 0, y: 0 };
    setStatus('PLAY');
    setHealth(100);
    setNearTable(false);
    setQuaking(false);
    setWarning(false);
    setQuakeIndex(0);
    setSafeQuakes(0);
    setProgress(0);
    setGateOpen(false);
    setCrouchHeld(false);
    setResult(null);
    playSound('levelStart');
    updateSideNarrator?.(
      'Hindari lemari miring dan lampu yang jatuh berurutan. Ikuti cincin hijau sebagai celah aman. Saat gempa, berhenti di dekat meja lalu tahan SEMBUNYI!',
      false,
      'warning'
    );
  };

  const finish = (survived: boolean, finalHealth: number, safe: number) => {
    const score = survived
      ? Math.max(20, Math.round(finalHealth))
      : Math.max(10, Math.round((progress / 100) * 40));
    const detail: EarthquakeDetail = {
      survived,
      healthRemaining: Math.round(finalHealth),
      stars: score >= 85 ? 3 : score >= 60 ? 2 : 1,
      quakesSafe: safe,
    };
    setResult({ score, detail });
    setStatus('RESULT');
    setQuaking(false);
    setWarning(false);
    playSound(survived ? 'success' : 'error');
    updateSideNarrator?.(
      survived
        ? safe >= 3
          ? 'Hebat! Kamu selalu berlindung di bawah meja tepat waktu.'
          : 'Kamu berhasil keluar. Ingat: saat gempa, segera berlindung di bawah meja kuat.'
        : 'Kamu terkena reruntuhan. Lain kali cepat cari meja dan tahan SEMBUNYI.',
      false,
      survived ? 'success' : 'error'
    );
  };

  const handleSync = (snapshot: {
    health: number;
    quakeIndex: number;
    nearTable: boolean;
    nearTableId: number | null;
    safeQuakes: number;
    progress: number;
    warning: boolean;
    quaking: boolean;
    gateOpen: boolean;
  }) => {
    setHealth(snapshot.health);
    setNearTable(snapshot.nearTable);
    setNearTableId(snapshot.nearTableId);
    setQuakeIndex(snapshot.quakeIndex);
    setSafeQuakes(snapshot.safeQuakes);
    setProgress(snapshot.progress);
    setWarning(snapshot.warning);
    setQuaking(snapshot.quaking);
    setGateOpen(snapshot.gateOpen);
  };

  const statusChip = quaking
    ? `GEMPA ${quakeIndex}/${QUAKE_ZONES.length} — SEMBUNYI!`
    : warning
      ? 'GEMPA SEBENTAR LAGI!'
      : gateOpen
        ? 'JALAN KELUAR TERBUKA'
        : 'MENUJU PINTU KELUAR';

  return (
    <MissionPanel accent="border-b-amber-400">
      <MissionScene
        hud={
          <>
            <div className="flex flex-wrap items-center gap-2">
              <HudChip tone={quaking ? 'red' : warning ? 'amber' : 'emerald'} pulse={quaking || warning}>
                {statusChip}
              </HudChip>
              <HudChip tone="stone">🛡️ {safeQuakes}/{QUAKE_ZONES.length} aman</HudChip>
            </div>
            <div className="flex items-center gap-2">
              <HealthBar value={health} />
            </div>
          </>
        }
        controls={
          <div className="flex items-end justify-between gap-2">
            <div className="flex items-center gap-2">
              <TouchJoystick valueRef={joystickRef} />
              <div className="hidden text-[11px] font-bold text-white/70 sm:block">
                <span className="rounded bg-white/15 px-1.5 py-0.5">W A S D</span> bergerak •{' '}
                <span className="rounded bg-white/15 px-1.5 py-0.5">SHIFT</span> berlindung •{' '}
                <span className="rounded bg-white/15 px-1.5 py-0.5">SPASI</span> lompat
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ActionButton
                tone="sky"
                active={status === 'PLAY'}
                onPointerDown={() => {
                  touchJump.current = true;
                  inputRef.current.jump = true;
                }}
                onPointerUp={() => {
                  touchJump.current = false;
                  inputRef.current.jump = heldKeys.current.has('Space');
                }}
                className="min-w-[92px]"
              >
                ⤴ LOMPAT
              </ActionButton>
              <ActionButton
                tone={crouchHeld ? 'emerald' : quaking ? 'red' : 'slate'}
                active={crouchHeld}
                onPointerDown={() => {
                  touchCrouch.current = true;
                  inputRef.current.crouch = true;
                  setCrouchHeld(true);
                }}
                onPointerUp={() => {
                  touchCrouch.current = false;
                  const stillKey =
                    heldKeys.current.has('ShiftLeft') ||
                    heldKeys.current.has('ShiftRight');
                  inputRef.current.crouch = stillKey;
                  setCrouchHeld(stillKey);
                }}
                className="min-w-[130px]"
              >
                🙇 SEMBUNYI
              </ActionButton>
            </div>
          </div>
        }
        overlay={
          status === 'READY' ? (
            <StartOverlay
              emoji="🏫"
              tone="amber"
              title="Evakuasi Gempa"
              description={
                <>
                  Koridor sekolah berguncang! Hindari <b>lemari miring</b> dan <b>lampu yang jatuh</b>{' '}
                  berurutan — lewati <b>cincin hijau</b> sebagai celah aman. Saat peringatan gempa,
                  berhenti di dekat <b>meja</b> dan tahan <b>SEMBUNYI</b>. Ada{' '}
                  <b>{QUAKE_ZONES.length} gempa</b> — jangan terlambat!
                </>
              }
              buttonLabel="MULAI EVAKUASI"
              onStart={start}
            />
          ) : status === 'RESULT' && result ? (
            <ResultOverlay
              survived={result.detail.survived}
              title={result.detail.survived ? 'Selamat Sampai di Pintu Keluar!' : 'Terkena Reruntuhan'}
              message={
                result.detail.survived
                  ? 'Kamu berhasil menerapkan Drop, Cover, Hold On. Gempa susulan tetap waspada, ya!'
                  : 'Cari meja terdekat saat peringatan muncul, lalu tahan tombol SEMBUNYI sampai guncangan berhenti.'
              }
              stars={result.detail.stars}
              score={result.score}
              stats={[
                { label: 'Gempa aman', value: `${result.detail.quakesSafe}/${QUAKE_ZONES.length}` },
                { label: 'Sisa nyawa', value: `${result.detail.healthRemaining}/100` },
                { label: 'Progres', value: `${progress}%` },
              ]}
              onReplay={onReplay}
              onContinue={() => onComplete(result.score, result.detail)}
              continueLabel="Lanjut ke Kuis"
            />
          ) : null
        }
      >
        <MissionCanvas
          background="#7c8aa0"
          fog={{ color: '#7c8aa0', near: 22, far: 62 }}
          camera={{ position: [0, 4.9, -5], fov: 58 }}
        >
          <EarthquakeScene
            avatar={avatar}
            teamName={teamName}
            playSound={playSound}
            inputRef={inputRef}
            joystickRef={joystickRef}
            gameRef={gameRef}
            quaking={quaking}
            gateOpen={gateOpen}
            crouchHeld={crouchHeld}
            nearTableId={nearTableId}
            onSync={handleSync}
            onFinish={finish}
          />
        </MissionCanvas>
      </MissionScene>

      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 px-4 py-3 text-xs text-white/70">
        <span>
          <b className="text-white">Misi:</b> lewati celah aman, hindari lampu jatuh, dan capai pintu keluar.
        </span>
        <div className="h-2 w-36 overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </MissionPanel>
  );
};
