import React, { useEffect, useMemo, useRef, useState } from 'react';
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

export interface VolcanoDetail {
  survived: boolean;
  healthRemaining: number;
  signsFound: number;
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
  onComplete: (score: number, detail: VolcanoDetail) => void;
  onReplay?: () => void;
}

type VolcanoSignId = 'smoke' | 'birds' | 'crack' | 'quake';
type Phase = 'READY' | 'OBSERVE' | 'SIGNS' | 'DODGE' | 'RESCUE' | 'RESULT';

const SIGNS: Array<{
  id: VolcanoSignId;
  label: string;
  feedback: string;
  position: [number, number, number];
  hitRadius: number;
  color: string;
}> = [
  {
    id: 'smoke',
    label: 'Awan Panas & Asap Hitam',
    feedback:
      'Betul! Asap tebal kehitaman dan awan panas dari kawah menandakan magma naik. Gunung siap erupsi!',
    position: [0, 16.5, -26],
    hitRadius: 4.8,
    color: '#ef4444',
  },
  {
    id: 'birds',
    label: 'Hewan Turun Gunung',
    feedback:
      'Tepat! Hewan punya insting kuat. Mereka turun gunung sebelum erupsi — percayai naluri mereka!',
    position: [8, 7.5, -14],
    hitRadius: 4.2,
    color: '#facc15',
  },
  {
    id: 'quake',
    label: 'Getaran Vulkanik',
    feedback: 'Benar! Getaran vulkanik membuat tanah dan bebatuan berguncang. Segera bersiap untuk evakuasi!',
    position: [-10, 0.15, -4],
    hitRadius: 4.6,
    color: '#a855f7',
  },
  {
    id: 'crack',
    label: 'Retakan Tanah Lereng',
    feedback:
      'Benar! Retakan panas di lereng muncul akibat tekanan magma dan gempa vulkanik. Segera menjauh!',
    position: [-6, 0.15, 4.5],
    hitRadius: 4.2,
    color: '#f97316',
  },
];

const DODGE_SECONDS = 20;
const PLAYER_MIN_X = -5.2;
const PLAYER_MAX_X = 5.2;
const ROCK_POOL = 16;
const VOLCANO_BLOCKERS: Array<[number, number, number]> = [
  [-9, -2, 1.8], [10, -4, 1.8], [-13, 6, 1.8], [13, 7, 1.8],
  [-16, 3, 1.1], [17, 2, 1.1], [-20, -9, 1.1], [21, -11, 1.1], [-5, 10, 1.25], [7, 11, 1.25],
];
const blocksCamera = (x: number, z: number) =>
  VOLCANO_BLOCKERS.some(([bx, bz, radius]) => Math.hypot(x - bx, z - bz) < radius + 0.5);
const RAIN_COUNT = 180;

interface DodgeRock {
  id: number;
  active: boolean;
  x: number;
  z: number;
  y: number;
  speed: number;
  spin: number;
}

interface DodgeState {
  elapsed: number;
  x: number;
  z: number;
  jumpY: number;
  jumpVelocity: number;
  health: number;
  hits: number;
  rocks: DodgeRock[];
  spawnTimer: number;
  invincibleUntil: number;
  finished: boolean;
  shake: number;
}

const makeRocks = (): DodgeRock[] =>
  Array.from({ length: ROCK_POOL }, (_, id) => ({
    id,
    active: false,
    x: 0,
    z: 2,
    y: 0,
    speed: 9,
    spin: 0,
  }));

interface VolcanoSceneProps {
  avatar: Avatar | null;
  teamName: string;
  phase: Phase;
  quaking: boolean;
  found: VolcanoSignId[];
  pickedUp: boolean;
  inputRef: { current: { strafe: number; forward: number; jump: boolean } };
  joystickRef: { current: { x: number; y: number } };
  dodgeRef: { current: DodgeState };
  onSignClick: (id: VolcanoSignId) => void;
  onDodgeSync: (snapshot: { health: number; timeLeft: number; hits: number; invincible: boolean }) => void;
  onDodgeLost: () => void;
  onDodgeSurvived: () => void;
}

const SmokePlume: React.FC<{ visible: boolean; found: boolean }> = ({ visible, found }) => {
  const group = useRef<THREE.Group>(null);
  const puffs = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => ({
        y: i * 1.4,
        scale: 1.4 + i * 0.25,
        offset: Math.random() * 6,
      })),
    []
  );
  const refs = useRef<Array<THREE.Mesh | null>>([]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    puffs.forEach((puff, index) => {
      const mesh = refs.current[index];
      if (!mesh) return;
      const cycle = (t * 0.28 + puff.offset) % 1;
      mesh.position.y = 1 + cycle * 9.5;
      mesh.position.x = Math.sin(t * 0.6 + index) * (0.45 + cycle * 1.3);
      const scale = 0.6 + cycle * 1.9 + puff.scale * 0.3;
      mesh.scale.setScalar(scale);
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.opacity = Math.max(0, 0.88 - cycle * 0.7);
    });
    if (group.current) {
      group.current.rotation.y += delta * 0.06;
    }
  });

  if (!visible) return null;

  return (
    <group ref={group} position={[0, 15.6, -26]}>
      {/* Pijar lava membara di mulut kawah */}
      <mesh position={[0, 0.2, 0]}>
        <sphereGeometry args={[2.8, 16, 16]} />
        <meshStandardMaterial
          color="#f97316"
          emissive="#ef4444"
          emissiveIntensity={found ? 1.0 : 2.8}
          roughness={0.4}
        />
      </mesh>
      {puffs.map((puff, index) => (
        <mesh
          key={index}
          ref={(mesh) => {
            refs.current[index] = mesh;
          }}
        >
          <sphereGeometry args={[1.25, 14, 14]} />
          <meshStandardMaterial
            color={found ? '#86efac' : index % 2 === 0 ? '#18181b' : '#27272a'}
            emissive={found ? '#22c55e' : index % 3 === 0 ? '#7c2d12' : '#000000'}
            emissiveIntensity={found ? 0.4 : 0.8}
            transparent
            opacity={0.85}
            roughness={0.9}
          />
        </mesh>
      ))}
    </group>
  );
};

const PanickedBirds: React.FC<{ visible: boolean; found: boolean }> = ({ visible, found }) => {
  const refs = useRef<Array<THREE.Group | null>>([]);
  const birds = useMemo(
    () =>
      Array.from({ length: 5 }, (_, i) => ({
        radius: 1.4 + i * 0.55,
        speed: 1.1 + i * 0.18,
        offset: i * 1.3,
        y: i * 0.3,
      })),
    []
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    birds.forEach((bird, index) => {
      const group = refs.current[index];
      if (!group) return;
      const angle = t * bird.speed + bird.offset;
      group.position.set(
        Math.cos(angle) * bird.radius,
        Math.sin(angle * 1.7) * 0.55 + bird.y,
        Math.sin(angle) * bird.radius
      );
      group.rotation.y = -angle + Math.PI / 2;
      group.rotation.z = Math.sin(t * 8 + index) * 0.25;
    });
  });

  if (!visible) return null;

  return (
    <group>
      {birds.map((_, index) => (
        <group
          key={index}
          ref={(group) => {
            refs.current[index] = group;
          }}
        >
          <mesh>
            <coneGeometry args={[0.17, 0.62, 6]} />
            <meshStandardMaterial color={found ? '#86efac' : '#111827'} roughness={0.8} />
          </mesh>
          <mesh position={[-0.22, 0.05, 0]} rotation-z={0.35}>
            <boxGeometry args={[0.42, 0.05, 0.24]} />
            <meshStandardMaterial color={found ? '#86efac' : '#1f2937'} roughness={0.8} />
          </mesh>
          <mesh position={[0.22, 0.05, 0]} rotation-z={-0.35}>
            <boxGeometry args={[0.42, 0.05, 0.24]} />
            <meshStandardMaterial color={found ? '#86efac' : '#1f2937'} roughness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

const GroundCrack: React.FC<{ found: boolean }> = ({ found }) => (
  <group position={[0, 0.12, 0]}>
    {/* Pijar lava membara dalam rekahan tanah lereng */}
    {[
      { x: 0, z: 0, ry: 0.2, w: 3.4, h: 0.24 },
      { x: 1.1, z: 0.7, ry: -0.6, w: 2.4, h: 0.2 },
      { x: -0.9, z: -0.6, ry: 0.75, w: 2.2, h: 0.18 },
      { x: -1.6, z: 0.95, ry: -0.25, w: 1.9, h: 0.16 },
    ].map((crack, index) => (
      <mesh key={index} position={[crack.x, 0.02, crack.z]} rotation-y={crack.ry}>
        <boxGeometry args={[crack.w, crack.h, 0.2]} />
        <meshStandardMaterial
          color={found ? '#22c55e' : '#ff4500'}
          emissive={found ? '#22c55e' : '#ef4444'}
          emissiveIntensity={found ? 0.8 : 3.2}
          roughness={0.3}
        />
      </mesh>
    ))}
    {/* Pijar panas di sekeliling rekahan */}
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 0]}>
      <circleGeometry args={[2.4, 24]} />
      <meshBasicMaterial color={found ? '#22c55e' : '#f97316'} transparent opacity={0.35} />
    </mesh>
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.03, 0]}>
      <ringGeometry args={[2.2, 2.7, 32]} />
      <meshBasicMaterial color={found ? '#4ade80' : '#fb923c'} transparent opacity={0.85} side={THREE.DoubleSide} />
    </mesh>
  </group>
);

const QuakingGround: React.FC<{ found: boolean }> = ({ found }) => {
  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    group.current.position.x = Math.sin(t * 18) * 0.16;
    group.current.rotation.z = Math.sin(t * 22) * 0.035;
  });
  return (
    <group ref={group}>
      {[2.2, 3.1, 4].map((radius, index) => (
        <mesh key={radius} rotation-x={-Math.PI / 2} position={[0, 0.05 + index * 0.015, 0]}>
          <ringGeometry args={[radius - 0.12, radius, 32]} />
          <meshBasicMaterial color={found ? '#22c55e' : '#c084fc'} transparent opacity={found ? 0.45 : 0.8 - index * 0.14} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {[-1.2, 0, 1.15].map((x, index) => (
        <mesh key={x} position={[x, 0.65 + (index % 2) * 0.25, 0.2]} rotation-z={0.3 * index}>
          <dodecahedronGeometry args={[0.42 + (index % 2) * 0.12, 0]} />
          <meshStandardMaterial color={found ? '#86efac' : '#a16207'} emissive={found ? '#22c55e' : '#7c2d12'} emissiveIntensity={found ? 0.35 : 0.8} />
        </mesh>
      ))}
    </group>
  );
};

const RescueTruck: React.FC<{ progress: number; visible: boolean }> = ({ progress, visible }) => {
  const labelTexture = useMemo(
    () => makeEmojiTexture('🚑', 'MOBIL PENYELAMAT', '#ef4444', true),
    []
  );
  if (!visible) return null;
  // Mobil melintas mulus dari kiri ke kanan dengan skala pas agar utuh di layar
  const x = -7 + progress * 14;
  return (
    <group position={[x, 0.15, 1.8]} scale={[0.92, 0.92, 0.92]}>
      {/* Bodi utama putih */}
      <mesh position={[0, 0.8, 0]}>
        <boxGeometry args={[3.8, 1.1, 1.8]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.4} />
      </mesh>
      {/* Kabin atas merah ambulans */}
      <mesh position={[0.4, 1.65, 0]}>
        <boxGeometry args={[2.6, 1.2, 1.7]} />
        <meshStandardMaterial color="#dc2626" roughness={0.4} />
      </mesh>
      {/* Strip garis merah di bodi */}
      <mesh position={[0, 0.85, 0]}>
        <boxGeometry args={[3.85, 0.28, 1.82]} />
        <meshStandardMaterial color="#ef4444" roughness={0.3} />
      </mesh>
      {/* Kaca depan */}
      <mesh position={[1.4, 1.65, 0]}>
        <boxGeometry args={[0.08, 0.85, 1.5]} />
        <meshStandardMaterial color="#bae6fd" emissive="#38bdf8" emissiveIntensity={0.6} />
      </mesh>
      {/* Kaca samping */}
      {[-0.88, 0.88].map((zSide, kIdx) => (
        <mesh key={kIdx} position={[0.6, 1.65, zSide]}>
          <boxGeometry args={[1.2, 0.7, 0.08]} />
          <meshStandardMaterial color="#bae6fd" emissive="#38bdf8" emissiveIntensity={0.5} />
        </mesh>
      ))}
      {/* Lampu sirine darurat berkedip kuning & merah */}
      <mesh position={[0.4, 2.35, -0.3]}>
        <boxGeometry args={[0.3, 0.22, 0.3]} />
        <meshStandardMaterial color="#facc15" emissive="#f59e0b" emissiveIntensity={2.5} />
      </mesh>
      <mesh position={[0.4, 2.35, 0.3]}>
        <boxGeometry args={[0.3, 0.22, 0.3]} />
        <meshStandardMaterial color="#f87171" emissive="#ef4444" emissiveIntensity={2.5} />
      </mesh>
      {/* 4 Roda kokoh */}
      {[-1.2, 1.2].map((wheelX) =>
        [-0.92, 0.92].map((wheelZ) => (
          <mesh key={`${wheelX}-${wheelZ}`} position={[wheelX, 0.32, wheelZ]} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.42, 0.42, 0.26, 16]} />
            <meshStandardMaterial color="#1f2937" roughness={0.8} />
          </mesh>
        ))
      )}
      {/* Papan nama mobil evakuasi yang rapi dan tidak terpotong */}
      <Billboard position={[0, 2.7, 0]}>
        <mesh>
          <planeGeometry args={[3.2, 1.3]} />
          <meshBasicMaterial map={labelTexture} transparent toneMapped={false} />
        </mesh>
      </Billboard>
    </group>
  );
};

const VolcanoScene: React.FC<VolcanoSceneProps> = ({
  avatar,
  teamName,
  phase,
  quaking,
  found,
  pickedUp,
  inputRef,
  joystickRef,
  dodgeRef,
  onSignClick,
  onDodgeSync,
  onDodgeLost,
  onDodgeSurvived,
}) => {
  const agent = useRef<THREE.Group>(null);
  const rockRefs = useRef<Array<THREE.Group | null>>([]);
  const rainRef = useRef<THREE.Points>(null);
  const cameraPos = useMemo(() => new THREE.Vector3(), []);
  const lookAt = useMemo(() => new THREE.Vector3(), []);
  const lastSync = useRef(0);
  const moveVelocity = useRef({ x: 0, z: 0 });
  const heading = useRef(Math.PI);
  const jumpWasDown = useRef(false);
  const [moving, setMoving] = useState(false);
  const [airborne, setAirborne] = useState(false);
  const [carProgress, setCarProgress] = useState(0);
  const rescueStart = useRef(0);

  const signTextures = useMemo(
    () =>
      Object.fromEntries(
        SIGNS.map((sign) => [
          sign.id,
          makeBoardTexture({
            title: sign.label,
            text: found.includes(sign.id) ? 'Tanda dikenali!' : 'Klik untuk periksa',
            emoji: sign.id === 'smoke' ? '💨' : sign.id === 'birds' ? '🐦' : sign.id === 'quake' ? '〰️' : '🪨',
            accent: sign.color,
            background: found.includes(sign.id) ? '#dcfce7' : '#ffffff',
            width: 640,
            height: 300,
            titleSize: 40,
            textSize: 32,
          }),
        ])
      ),
    [found]
  );

  const smokeCheck = useMemo(() => makeEmojiTexture('✅', 'Benar!', '#22c55e', true), []);

  const rainGeometry = useMemo(() => {
    const positions = new Float32Array(RAIN_COUNT * 3);
    for (let i = 0; i < RAIN_COUNT; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 34;
      positions[i * 3 + 1] = Math.random() * 20;
      positions[i * 3 + 2] = Math.random() * 40 - 10;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, []);

  useEffect(() => {
    if (phase === 'OBSERVE') {
      heading.current = Math.PI;
      moveVelocity.current = { x: 0, z: 0 };
    }
    if (phase === 'RESCUE') {
      rescueStart.current = performance.now();
      setCarProgress(0);
    }
  }, [phase]);

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const t = state.clock.elapsedTime;
    const dodge = dodgeRef.current;

    // Abu/hujan turun terus.
    if (rainRef.current) {
      const attribute = rainRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
      const array = attribute.array as Float32Array;
      for (let i = 0; i < RAIN_COUNT; i += 1) {
        array[i * 3 + 1] -= (6 + (i % 4)) * dt;
        if (array[i * 3 + 1] < 0) {
          array[i * 3 + 1] = 20;
          array[i * 3] = (Math.random() - 0.5) * 34;
          array[i * 3 + 2] = Math.random() * 40 - 10;
        }
      }
      attribute.needsUpdate = true;
    }

    if (phase === 'SIGNS' || (phase === 'DODGE' && !dodge.finished)) {
      const strafe = THREE.MathUtils.clamp(inputRef.current.strafe + joystickRef.current.x, -1, 1);
      const forward = THREE.MathUtils.clamp(inputRef.current.forward - joystickRef.current.y, -1, 1);
      const speed = phase === 'DODGE' ? 6.2 : 7.2;
      const dirX = Math.sin(heading.current);
      const dirZ = Math.cos(heading.current);
      const rightX = -dirZ;
      const rightZ = dirX;
      const desiredX = (dirX * forward + rightX * strafe) * speed;
      const desiredZ = (dirZ * forward + rightZ * strafe) * speed;
      moveVelocity.current.x = THREE.MathUtils.damp(moveVelocity.current.x, desiredX, 8, dt);
      moveVelocity.current.z = THREE.MathUtils.damp(moveVelocity.current.z, desiredZ, 8, dt);
      const nextX = THREE.MathUtils.clamp(dodge.x + moveVelocity.current.x * dt, -13, 13);
      const nextZ = THREE.MathUtils.clamp(dodge.z + moveVelocity.current.z * dt, -10, 8);
      const blocked = (x: number, z: number) =>
        VOLCANO_BLOCKERS.some(([bx, bz, radius]) => Math.hypot(x - bx, z - bz) < radius);
      const blockedX = blocked(nextX, dodge.z);
      const blockedZ = blocked(dodge.x, nextZ);
      if (!blockedX) dodge.x = nextX;
      else moveVelocity.current.x = 0;
      if (!blockedZ) dodge.z = nextZ;
      else moveVelocity.current.z = 0;
      const moveSpeed = Math.hypot(moveVelocity.current.x, moveVelocity.current.z);
      if (moveSpeed > 0.15) {
        const targetHeading = Math.atan2(moveVelocity.current.x, moveVelocity.current.z);
        const angleDifference = Math.atan2(Math.sin(targetHeading - heading.current), Math.cos(targetHeading - heading.current));
        heading.current += angleDifference * (1 - Math.exp(-8 * dt));
      }

      const jumpDown = inputRef.current.jump;
      if (jumpDown && !jumpWasDown.current && dodge.jumpY === 0) {
        dodge.jumpVelocity = 5.4;
      }
      jumpWasDown.current = jumpDown;
      if (dodge.jumpY > 0 || dodge.jumpVelocity > 0) {
        dodge.jumpVelocity -= 13.5 * dt;
        dodge.jumpY = Math.max(0, dodge.jumpY + dodge.jumpVelocity * dt);
        if (dodge.jumpY === 0) dodge.jumpVelocity = 0;
      }
      const isMoving = moveSpeed > 0.15;
      if (isMoving !== moving) setMoving(isMoving);
      const isAirborne = dodge.jumpY > 0;
      if (isAirborne !== airborne) setAirborne(isAirborne);
    }

    if (phase === 'DODGE' && !dodge.finished) {
      dodge.elapsed += dt;

      dodge.spawnTimer -= dt;
      if (dodge.spawnTimer <= 0) {
        dodge.spawnTimer = Math.max(0.45, 0.9 - dodge.elapsed * 0.02);
        const rock = dodge.rocks.find((entry) => !entry.active);
        if (rock) {
          rock.active = true;
          rock.x =
            Math.random() < 0.7
              ? THREE.MathUtils.clamp(dodge.x + (Math.random() < 0.5 ? -1.1 : 1.1), PLAYER_MIN_X, PLAYER_MAX_X)
              : THREE.MathUtils.randFloat(PLAYER_MIN_X, PLAYER_MAX_X);
          rock.z = 2 + (Math.random() - 0.5) * 4.5;
          rock.y = 13 + Math.random() * 4;
          rock.speed = 9 + Math.random() * 4;
          rock.spin = Math.random() * 3;
          state.camera.position.x += 0.03;
        }
      }

      for (const rock of dodge.rocks) {
        if (!rock.active) continue;
        rock.y -= rock.speed * dt;
        if (rock.y <= 0.55) {
          const hit =
            Math.abs(rock.x - dodge.x) < 1.35 &&
            Math.abs(rock.z - dodge.z) < 2.4 &&
            dodge.jumpY < 0.8 &&
            t > dodge.invincibleUntil;
          if (hit) {
            dodge.health = Math.max(0, dodge.health - 20);
            dodge.hits += 1;
            dodge.invincibleUntil = t + 1.05;
            dodge.shake = 1;
            if (dodge.health <= 0) {
              dodge.finished = true;
              onDodgeLost();
              return;
            }
          }
          rock.active = false;
        }
      }

      dodge.shake = Math.max(0, dodge.shake - dt * 3);

      if (dodge.elapsed >= DODGE_SECONDS) {
        dodge.finished = true;
        onDodgeSurvived();
        return;
      }

      if (t - lastSync.current > 0.08) {
        lastSync.current = t;
        onDodgeSync({
          health: dodge.health,
          timeLeft: Math.max(0, Math.ceil(DODGE_SECONDS - dodge.elapsed)),
          hits: dodge.hits,
          invincible: t < dodge.invincibleUntil,
        });
      }
    }

    // Mobil penyelamat melintas saat fase rescue.
    if (phase === 'RESCUE') {
      const progress = Math.min(1, (performance.now() - rescueStart.current) / 5200);
      setCarProgress(progress);
    }

    // Posisi agen.
    if (agent.current) {
      const displayX = phase === 'SIGNS' || phase === 'DODGE' || phase === 'RESCUE' ? dodge.x : 0;
      agent.current.position.set(displayX, phase === 'SIGNS' || phase === 'DODGE' ? dodge.jumpY : 0, dodge.z);
      agent.current.rotation.y = heading.current;
      agent.current.visible = !(phase === 'RESCUE' && pickedUp);
      const hit = phase === 'DODGE' && t < dodge.invincibleUntil;
      agent.current.scale.setScalar(hit ? 0.88 + Math.sin(t * 40) * 0.02 : 0.9);
    }

    // Update batu.
    dodge.rocks.forEach((rock, index) => {
      const group = rockRefs.current[index];
      if (!group) return;
      group.visible = rock.active;
      if (!rock.active) return;
      group.position.set(rock.x, rock.y, rock.z);
      group.rotation.x = t * rock.spin;
      group.rotation.z = t * rock.spin * 0.6;
    });

    // Kamera
    const shake = quaking ? 0.9 : dodge.shake;
    const followX = phase === 'SIGNS' || phase === 'DODGE' || phase === 'RESCUE' ? dodge.x : 0;
    if (phase === 'RESCUE') {
      // Mundurkan jarak kamera dan posisikan agar seluruh bodi mobil evakuasi terlihat utuh dan tidak terpotong
      cameraPos.set(0, 14.8, 30);
      state.camera.position.lerp(cameraPos, 1 - Math.exp(-6 * dt));
      lookAt.set(0, 3.4, 0);
      state.camera.lookAt(lookAt);
    } else {
      const forwardX = Math.sin(heading.current);
      const forwardZ = Math.cos(heading.current);
      const desiredDistance = [7, 6, 5, 4].find((distance) => {
        const cameraX = dodge.x - forwardX * distance;
        const cameraZ = dodge.z - forwardZ * distance;
        return !blocksCamera(cameraX, cameraZ);
      }) ?? 3.5;
      cameraPos.set(
        dodge.x - forwardX * desiredDistance + (Math.random() - 0.5) * shake * 0.18,
        2.8 + (Math.random() - 0.5) * shake * 0.12,
        dodge.z - forwardZ * desiredDistance
      );
      state.camera.position.lerp(cameraPos, 1 - Math.exp(-7 * dt));
      lookAt.set(dodge.x + forwardX * 13, 4.2, dodge.z + forwardZ * 13);
      state.camera.lookAt(lookAt);
    }
  });

  return (
    <>
      <fog attach="fog" args={['#9aa4ad', 42, 110]} />
      <ambientLight intensity={0.7} color="#fff4df" />
      <pointLight position={[0, 17, -24]} color="#ff8a32" intensity={18} distance={38} />

      {/* Tanah vulkanik */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 4]}>
        <planeGeometry args={[90, 90]} />
        <meshStandardMaterial color="#3f3a36" roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 3]}>
        <planeGeometry args={[34, 8]} />
        <meshStandardMaterial color="#57534e" roughness={0.95} />
      </mesh>
      {[-11, -5.5, 0, 5.5, 11].map((x) => (
        <mesh key={x} rotation-x={-Math.PI / 2} position={[x, 0.04, 3]}>
          <planeGeometry args={[2.6, 0.22]} />
          <meshBasicMaterial color="#fef3c7" />
        </mesh>
      ))}

      {/* Gunung berapi */}
      <group position={[0, 0, -26]}>
        <mesh position={[0, 7.2, 0]}>
          <cylinderGeometry args={[3.6, 12.5, 14.4, 28]} />
          <meshStandardMaterial color="#4b3b34" roughness={1} />
        </mesh>
        <mesh position={[0, 14.1, 0]} rotation-x={Math.PI}>
          <cylinderGeometry args={[3.2, 3.8, 1.1, 24, 1, true]} />
          <meshStandardMaterial color="#1c1917" roughness={1} side={THREE.DoubleSide} />
        </mesh>
        <mesh rotation-x={-Math.PI / 2} position={[0, 14.55, 0]}>
          <circleGeometry args={[3.1, 24]} />
          <meshStandardMaterial
            color="#f97316"
            emissive="#ef4444"
            emissiveIntensity={1.8}
            roughness={0.4}
          />
        </mesh>
        {/* Aliran lava */}
        {[-0.5, 0.35, 1.1].map((offset, index) => (
          <mesh
            key={index}
            position={[offset * 3.2, 6.6, 6.4]}
            rotation={[0.55, 0, offset]}
          >
            <boxGeometry args={[0.55, 0.14, 8]} />
            <meshStandardMaterial
              color="#f97316"
              emissive="#f97316"
              emissiveIntensity={1.4}
              roughness={0.5}
            />
          </mesh>
        ))}
        <SmokePlume visible={phase !== 'READY'} found={found.includes('smoke')} />
      </group>

      {/* Pegunungan latar */}
      {[
        [-28, -34, 1.2],
        [24, -38, 1.35],
        [-10, -44, 1.5],
        [36, -18, 0.9],
      ].map(([x, z, scale], index) => (
        <mesh key={index} position={[x, 3 * scale, z]} scale={scale}>
          <coneGeometry args={[9, 10, 7]} />
          <meshStandardMaterial color="#3f3a36" roughness={1} />
        </mesh>
      ))}

      {/* Rumah dan pohon yang dievakuasi */}
      {[
        [-9, 0, -2],
        [10, 0, -4],
        [-13, 0, 6],
        [13, 0, 7],
      ].map(([x, , z], index) => (
        <group key={index} position={[x, 0, z]}>
          <mesh position={[0, 1.1, 0]}>
            <boxGeometry args={[2.4, 2.2, 2.2]} />
            <meshStandardMaterial color={index % 2 ? '#d6c3a1' : '#cbb897'} roughness={0.9} />
          </mesh>
          <mesh position={[0, 2.5, 0]} rotation-y={0.78}>
            <coneGeometry args={[2.1, 1.3, 4]} />
            <meshStandardMaterial color="#7c2d12" roughness={0.85} />
          </mesh>
        </group>
      ))}
      {[
        [-16, 3],
        [17, 2],
        [-20, -9],
        [21, -11],
        [-5, 10],
        [7, 11],
      ].map(([x, z], index) => (
        <group key={index} position={[x, 0, z]}>
          <mesh position={[0, 1.5, 0]}>
            <cylinderGeometry args={[0.2, 0.3, 3, 7]} />
            <meshStandardMaterial color="#4b3621" roughness={1} />
          </mesh>
          <mesh position={[0, 3.7, 0]}>
            <coneGeometry args={[1.4, 3.1, 8]} />
            <meshStandardMaterial color="#3f4a36" roughness={1} />
          </mesh>
        </group>
      ))}

      {/* Tanda-tanda erupsi yang bisa diklik */}
      {phase !== 'READY' &&
        SIGNS.map((sign) => {
          const done = found.includes(sign.id);
          const show = phase === 'SIGNS' || phase === 'DODGE' || phase === 'RESCUE';
          if (!show || (sign.id === 'crack' && done && phase !== 'SIGNS')) return null;
          return (
            <group key={sign.id} position={sign.position}>
              <mesh
                onClick={(event) => {
                  event.stopPropagation();
                  if (!done && phase === 'SIGNS') onSignClick(sign.id);
                }}
                onPointerOver={() => {
                  if (!done && phase === 'SIGNS') document.body.style.cursor = 'pointer';
                }}
                onPointerOut={() => {
                  document.body.style.cursor = 'default';
                }}
              >
                <sphereGeometry args={[sign.hitRadius, 12, 12]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
              </mesh>

              {sign.id === 'birds' && <PanickedBirds visible found={done} />}
              {sign.id === 'crack' && <GroundCrack found={done} />}
              {sign.id === 'quake' && <QuakingGround found={done} />}

              {/* Lingkaran penanda agar pin mudah terlihat & diklik */}
              <mesh rotation-x={-Math.PI / 2} position={[0, sign.id === 'crack' ? 0.05 : 0.1, 0]}>
                <ringGeometry args={[sign.hitRadius * 0.72, sign.hitRadius * 0.82, 28]} />
                <meshBasicMaterial
                  color={done ? '#22c55e' : sign.color}
                  transparent
                  opacity={done ? 0.5 : 0.7}
                  side={THREE.DoubleSide}
                  depthWrite={false}
                />
              </mesh>

              <Billboard position={[0, sign.id === 'crack' ? 3 : 2.7, 0]}>
                <mesh>
                  <planeGeometry args={[5.2, 2.4]} />
                  <meshBasicMaterial map={signTextures[sign.id]} transparent toneMapped={false} />
                </mesh>
              </Billboard>
              {done && (
                <Billboard position={[0, sign.id === 'crack' ? 3.7 : 3.4, 0]}>
                  <mesh>
                    <planeGeometry args={[1.4, 1.4]} />
                    <meshBasicMaterial map={smokeCheck} transparent toneMapped={false} />
                  </mesh>
                </Billboard>
              )}
            </group>
          );
        })}

      {/* Batu yang berjatuhan saat fase dodge: batu vulkanik pijar membara */}
      {Array.from({ length: ROCK_POOL }, (_, index) => (
        <group
          key={index}
          ref={(group) => {
            rockRefs.current[index] = group;
          }}
          visible={false}
        >
          <mesh>
            <dodecahedronGeometry args={[0.58, 0]} />
            <meshStandardMaterial
              color="#451a03"
              roughness={0.7}
              emissive="#f97316"
              emissiveIntensity={1.8}
            />
          </mesh>
        </group>
      ))}

      {/* Peringatan jatuhan batu di tanah (lingkaran merah berdenyut kontras) */}
      {dodgeRef.current.rocks.map((rock, index) =>
        rock.active ? (
          <group key={`shadow-${index}`} position={[rock.x, 0.04, rock.z]}>
            <mesh rotation-x={-Math.PI / 2}>
              <circleGeometry args={[0.72, 18]} />
              <meshBasicMaterial color="#ef4444" transparent opacity={0.65} />
            </mesh>
            <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 0]}>
              <ringGeometry args={[0.75, 0.95, 20]} />
              <meshBasicMaterial color="#f97316" transparent opacity={0.9} side={THREE.DoubleSide} />
            </mesh>
          </group>
        ) : null
      )}

      <RescueTruck progress={carProgress} visible={phase === 'RESCUE'} />

      <Agent3D
        ref={agent}
        avatar={avatar}
        label={teamName}
        mode={airborne ? 'jump' : phase === 'OBSERVE' || quaking ? 'panic' : moving ? 'run' : 'idle'}
        scale={0.9}
      />

      <points ref={rainRef} geometry={rainGeometry}>
        <pointsMaterial color="#a8a29e" size={0.2} transparent opacity={0.7} depthWrite={false} />
      </points>
    </>
  );
};

export const VolcanoMission3D: React.FC<Props> = ({
  avatar,
  teamName,
  playSound,
  updateSideNarrator,
  onComplete,
  onReplay,
}) => {
  const [phase, setPhase] = useState<Phase>('READY');
  const [quaking, setQuaking] = useState(false);
  const [found, setFound] = useState<VolcanoSignId[]>([]);
  const [health, setHealth] = useState(100);
  const [timeLeft, setTimeLeft] = useState(DODGE_SECONDS);
  const [hits, setHits] = useState(0);
  const [invincible, setInvincible] = useState(false);
  const [pickedUp, setPickedUp] = useState(false);
  const [result, setResult] = useState<{ score: number; detail: VolcanoDetail } | null>(null);

  const timers = useRef<number[]>([]);
  const inputRef = useRef({ strafe: 0, forward: 0, jump: false });
  const joystickRef = useRef({ x: 0, y: 0 });
  const dodgeRef = useRef<DodgeState>({
    elapsed: 0,
    x: 0,
    z: 1.9,
    jumpY: 0,
    jumpVelocity: 0,
    health: 100,
    hits: 0,
    rocks: makeRocks(),
    spawnTimer: 1,
    invincibleUntil: 0,
    finished: false,
    shake: 0,
  });

  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };

  useEffect(() => () => clearTimers(), []);

  const start = () => {
    clearTimers();
    setPhase('OBSERVE');
    setQuaking(false);
    setFound([]);
    setHealth(100);
    setTimeLeft(DODGE_SECONDS);
    setHits(0);
    setInvincible(false);
    setPickedUp(false);
    setResult(null);
    dodgeRef.current = {
      elapsed: 0,
      x: 0,
      z: 1.9,
      jumpY: 0,
      jumpVelocity: 0,
      health: 100,
      hits: 0,
      rocks: makeRocks(),
      spawnTimer: 1,
      invincibleUntil: 0,
      finished: false,
      shake: 0,
    };
    playSound('levelStart');
    updateSideNarrator?.(
      'Amati gunung dengan tenang... perhatikan kalau ada yang tidak biasa.',
      false,
      'idle'
    );

    timers.current.push(
      window.setTimeout(() => {
        setQuaking(true);
        playSound('earthquake');
        updateSideNarrator?.(
          'Gempa vulkanik! Tanah bergetar hebat — ini pertanda bahaya!',
          false,
          'warning'
        );
      }, 3200)
    );
    timers.current.push(
      window.setTimeout(() => {
        setQuaking(false);
        setPhase('SIGNS');
        updateSideNarrator?.(
          'Ada yang berubah di sekitar gunung! Klik semua tanda gunung mau erupsi.',
          false,
          'warning'
        );
      }, 5400)
    );
  };

  const startDodge = () => {
    dodgeRef.current = {
      elapsed: 0,
      x: 0,
      z: 1.9,
      jumpY: 0,
      jumpVelocity: 0,
      health: 100,
      hits: 0,
      rocks: makeRocks(),
      spawnTimer: 0.8,
      invincibleUntil: 0,
      finished: false,
      shake: 0,
    };
    setHealth(100);
    setHits(0);
    setTimeLeft(DODGE_SECONDS);
    setInvincible(false);
    setPhase('DODGE');
    playSound('levelStart');
    updateSideNarrator?.(
      'Semua tanda dikenali! Gunung erupsi — batu berjatuhan. Geser kiri & kanan untuk menghindar selama 20 detik!',
      false,
      'warning'
    );
  };

  const handleSignClick = (id: VolcanoSignId) => {
    if (found.includes(id) || phase !== 'SIGNS') return;
    const sign = SIGNS.find((entry) => entry.id === id);
    const next = [...found, id];
    setFound(next);
    playSound('success');
    if (sign) updateSideNarrator?.(sign.feedback, false, 'success');
    if (next.length === SIGNS.length) {
      updateSideNarrator?.(
        'Semua tanda ditemukan! Bersiap menghindari batuan vulkanik...',
        false,
        'success'
      );
      timers.current.push(window.setTimeout(startDodge, 1100));
    }
  };

  const enterRescue = () => {
    setPhase('RESCUE');
    setPickedUp(false);
    playSound('levelStart');
    updateSideNarrator?.(
      'Mobil penyelamat datang! Naik dan menjauh dari zona bahaya.',
      false,
      'success'
    );
    timers.current.push(
      window.setTimeout(() => {
        setPickedUp(true);
        playSound('success');
      }, 2400)
    );
    timers.current.push(window.setTimeout(() => finish(true), 5600));
  };

  const finish = (survived: boolean) => {
    const detail: VolcanoDetail = {
      survived,
      healthRemaining: survived ? Math.max(0, Math.round(dodgeRef.current.health)) : 0,
      signsFound: found.length,
    };
    const score = survived
      ? Math.max(30, Math.round(dodgeRef.current.health))
      : Math.max(5, Math.round((found.length / SIGNS.length) * 25));
    setResult({ score, detail });
    setPhase('RESULT');
    setQuaking(false);
    playSound(survived ? 'success' : 'error');
    updateSideNarrator?.(
      survived
        ? 'Selamat! Kamu dievakuasi dari erupsi. Ingat: kenali tanda erupsi dan segera menjauh!'
        : 'Kamu tertimpa batuan vulkanik. Geser lebih cepat dan jangan berdiri di bawah batu!',
      false,
      survived ? 'success' : 'error'
    );
  };

  useEffect(() => {
    if (phase !== 'SIGNS' && phase !== 'DODGE') return;
    const down = (event: KeyboardEvent) => {
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      if (event.code === 'KeyA' || event.code === 'ArrowLeft') {
        inputRef.current.strafe = -1;
      } else if (event.code === 'KeyD' || event.code === 'ArrowRight') {
        inputRef.current.strafe = 1;
      } else if (event.code === 'KeyW' || event.code === 'ArrowUp') inputRef.current.forward = 1;
      else if (event.code === 'KeyS' || event.code === 'ArrowDown') inputRef.current.forward = -1;
      else if (event.code === 'Space' && !event.repeat) inputRef.current.jump = true;
      else return;
      event.preventDefault();
    };
    const up = (event: KeyboardEvent) => {
      if (event.code === 'KeyA' || event.code === 'ArrowLeft' || event.code === 'KeyD' || event.code === 'ArrowRight') {
        inputRef.current.strafe = 0;
      }
      if (event.code === 'KeyW' || event.code === 'ArrowUp' || event.code === 'KeyS' || event.code === 'ArrowDown') inputRef.current.forward = 0;
      if (event.code === 'Space') inputRef.current.jump = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [phase]);

  const statusChip =
    phase === 'DODGE'
      ? `☄️ HINDARI BATU — ${timeLeft}s`
      : phase === 'SIGNS'
        ? `🔎 TANDA ERUPSI ${found.length}/4`
        : phase === 'RESCUE'
          ? '🚑 MOBIL PENYELAMAT'
          : '🌋 AMATI GUNUNG';

  return (
    <MissionPanel accent="border-b-orange-400">
      <MissionScene
        hud={
          <>
            <div className="flex flex-wrap items-center gap-2">
              <HudChip tone={phase === 'DODGE' ? 'red' : quaking ? 'amber' : 'indigo'} pulse={phase === 'DODGE' || quaking || invincible}>
                {statusChip}
              </HudChip>
              {phase === 'DODGE' && <HudChip tone="stone">💥 {hits} tabrakan</HudChip>}
            </div>
            <HealthBar value={phase === 'DODGE' ? health : 100} label={phase === 'DODGE' ? `${health}%` : 'Nyawa'} />
          </>
        }
        controls={
          <div className="flex items-end justify-between gap-2">
            <div className="flex items-center gap-2">
              {phase === 'SIGNS' || phase === 'DODGE' ? (
                <TouchJoystick valueRef={joystickRef} label="GESER" />
              ) : (
                <div className="hidden sm:block" />
              )}
              <div className="hidden text-[11px] font-bold text-white/70 sm:block">
                {phase === 'DODGE' ? (
                  <>
                    <span className="rounded bg-white/15 px-1.5 py-0.5">A / D</span> geser •{' '}
                    <span className="rounded bg-white/15 px-1.5 py-0.5">← →</span> menghindar
                  </>
                ) : (
                  'Klik tanda erupsi di sekitar gunung.'
                )}
              </div>
            </div>
            {phase === 'DODGE' && (
              <div className="flex gap-2">
                <ActionButton
                  tone="sky"
                  onPointerDown={() => { inputRef.current.jump = true; }}
                  onPointerUp={() => { inputRef.current.jump = false; }}
                  className="min-w-[92px]"
                >
                  ⤴ LOMPAT
                </ActionButton>
                <ActionButton
                  tone="amber"
                  onPointerDown={() => {
                    inputRef.current.strafe = -1;
                  }}
                  onPointerUp={() => {
                    inputRef.current.strafe = 0;
                  }}
                  className="min-w-[92px]"
                >
                  ← KIRI
                </ActionButton>
                <ActionButton
                  tone="amber"
                  onPointerDown={() => {
                    inputRef.current.strafe = 1;
                  }}
                  onPointerUp={() => {
                    inputRef.current.strafe = 0;
                  }}
                  className="min-w-[92px]"
                >
                  KANAN →
                </ActionButton>
              </div>
            )}
          </div>
        }
        overlay={
          phase === 'READY' ? (
            <StartOverlay
              emoji="🌋"
              tone="amber"
              title="Erupsi Gunung Berapi"
              description={
                <>
                  Amati gunung dengan saksama. Setelah gempa vulkanik, <b>klik 4 tanda erupsi</b>{' '}
                  (asap dan pijar lava, getaran, hewan turun, serta retakan menyala). Lalu <b>hindari batu</b> selama 20 detik sampai
                  mobil penyelamat datang!
                </>
              }
              buttonLabel="MULAI PENGAWASAN"
              onStart={start}
            />
          ) : phase === 'RESULT' && result ? (
            <ResultOverlay
              survived={result.detail.survived}
              title={result.detail.survived ? 'Berhasil Dievakuasi!' : 'Tertimpa Batuan Vulkanik!'}
              message={
                result.detail.survived
                  ? 'Kamu mengenali tanda erupsi, menghindari batu, dan dievakuasi dengan aman. Saat hujan abu, pakai masker dan tetap di dalam ruangan.'
                  : 'Geser lebih cepat dan jangan berdiri di bawah batu. Saat erupsi, segera ikuti arahan evakuasi BPBD!'
              }
              stars={
                result.detail.survived
                  ? result.detail.healthRemaining >= 80
                    ? 3
                    : result.detail.healthRemaining >= 50
                      ? 2
                      : 1
                  : 0
              }
              score={result.score}
              stats={[
                { label: 'Tanda ditemukan', value: `${result.detail.signsFound}/4` },
                { label: 'Sisa nyawa', value: `${result.detail.healthRemaining}%` },
                { label: 'Tabrakan', value: hits },
              ]}
              onReplay={onReplay}
              onContinue={() => onComplete(result.score, result.detail)}
              continueLabel="Lanjut ke Kuis"
            />
          ) : null
        }
      >
        <MissionCanvas
          background="#8896a5"
          fog={{ color: '#8896a5', near: 28, far: 90 }}
          camera={{ position: [0, 3.2, 8], fov: 58 }}
        >
          <VolcanoScene
            avatar={avatar}
            teamName={teamName}
            phase={phase}
            quaking={quaking}
            found={found}
            pickedUp={pickedUp}
            inputRef={inputRef}
            joystickRef={joystickRef}
            dodgeRef={dodgeRef}
            onSignClick={handleSignClick}
            onDodgeSync={(snapshot) => {
              setHealth(snapshot.health);
              setTimeLeft(snapshot.timeLeft);
              setHits(snapshot.hits);
              setInvincible(snapshot.invincible);
            }}
            onDodgeLost={() => finish(false)}
            onDodgeSurvived={enterRescue}
          />
        </MissionCanvas>
      </MissionScene>

      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 px-4 py-3 text-xs text-white/70">
        <span>
          <b className="text-white">Misi:</b> kenali tanda erupsi, hindari batuan, lalu naik mobil penyelamat.
        </span>
        <div className="flex gap-1">
          {SIGNS.map((sign) => (
            <span
              key={sign.id}
              className={`flex h-7 w-7 items-center justify-center rounded-lg border text-xs font-black ${
                found.includes(sign.id)
                  ? 'border-emerald-300 bg-emerald-500/25 text-emerald-200'
                  : 'border-white/20 bg-white/10 text-white/40'
              }`}
            >
              {found.includes(sign.id) ? '✓' : '?'}
            </span>
          ))}
        </div>
      </div>
    </MissionPanel>
  );
};

export default VolcanoMission3D;
