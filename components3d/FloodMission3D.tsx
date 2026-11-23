import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Billboard } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FLOOD_BAG_CAPACITY, FLOOD_BAG_ITEMS, FLOOD_BAG_USEFUL_COUNT } from '../constants';
import type { Avatar } from '../types';
import { Agent3D } from './Agent3D';
import { MissionCanvas } from './MissionCanvas';
import { makeEmojiTexture, makeBoardTexture } from './missionTextures';
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

export interface FloodDetail {
  usefulPicked: number;
  usefulTotal: number;
  survived: boolean;
  /** Sisa nyawa (0-3) saat fase evakuasi berakhir. */
  livesRemaining: number;
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
  onComplete: (score: number, detail: FloodDetail) => void;
  onReplay?: () => void;
}

type SubPhase = 'BACKPACK' | 'ESCAPE' | 'RESULT';

const ITEM_POSITIONS = FLOOD_BAG_ITEMS.map((_, index) => {
  const row = Math.floor(index / 5);
  const col = index % 5;
  return {
    x: (col - 2) * 2.15,
    y: 2.15 + (row === 0 ? 0 : 0.15),
    z: row === 0 ? -1.6 : 1.7,
    rotation: row === 0 ? 0 : 0,
  };
});

const SupplyCard: React.FC<{
  icon: string;
  name: string;
  accent: string;
  picked: boolean;
  position: [number, number, number];
  onClick: () => void;
}> = ({ icon, name, accent, picked, position, onClick }) => {
  const texture = useMemo(
    () => makeEmojiTexture(icon, name, accent, picked),
    [icon, name, accent, picked]
  );
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    group.current.position.y = position[1] + (picked ? 0.35 : Math.sin(t * 1.8 + position[0]) * 0.06);
    group.current.rotation.z = picked ? Math.sin(t * 2 + position[0]) * 0.03 : 0;
  });

  return (
    <group ref={group} position={position} onClick={onClick} onPointerOver={() => (document.body.style.cursor = 'pointer')} onPointerOut={() => (document.body.style.cursor = 'default')}>
      <mesh position={[0, -1.15, 0]}>
        <boxGeometry args={[0.9, 1.1, 0.9]} />
        <meshStandardMaterial color={picked ? '#86efac' : '#cbd5e1'} roughness={0.8} />
      </mesh>
      <mesh position={[0, -0.58, 0]}>
        <cylinderGeometry args={[0.36, 0.44, 0.18, 16]} />
        <meshStandardMaterial color={picked ? '#22c55e' : accent} roughness={0.55} />
      </mesh>
      <mesh>
        <planeGeometry args={[1.5, 1.5]} />
        <meshBasicMaterial map={texture} transparent toneMapped={false} />
      </mesh>
      {picked && (
        <mesh rotation-x={-Math.PI / 2} position={[0, -1.6, 0]}>
          <ringGeometry args={[0.65, 0.82, 30]} />
          <meshBasicMaterial color="#22c55e" transparent opacity={0.9} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};

const BackpackScene: React.FC<{
  picked: string[];
  onToggle: (id: string) => void;
  finished: boolean;
}> = ({ picked, onToggle, finished }) => (
  <>
    <fog attach="fog" args={['#0f2a44', 16, 34]} />
    <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
      <planeGeometry args={[22, 16]} />
      <meshStandardMaterial color="#17324d" roughness={0.95} />
    </mesh>
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
      <planeGeometry args={[13, 7]} />
      <meshStandardMaterial color="#1e405f" roughness={0.9} />
    </mesh>

    {/* Dinding gudang */}
    <mesh position={[0, 3.2, -5.4]}>
      <boxGeometry args={[22, 6.4, 0.4]} />
      <meshStandardMaterial color="#244866" roughness={0.95} />
    </mesh>
    {[-8.5, 8.5].map((x) => (
      <mesh key={x} position={[x, 3.2, 0]}>
        <boxGeometry args={[0.4, 6.4, 16]} />
        <meshStandardMaterial color="#1d3a53" roughness={0.95} />
      </mesh>
    ))}
    {Array.from({ length: 6 }, (_, index) => (
      <mesh key={index} position={[-6.5 + index * 2.6, 5.6, -3]}>
        <boxGeometry args={[1.2, 0.12, 0.5]} />
        <meshStandardMaterial color="#fef3c7" emissive="#fde68a" emissiveIntensity={1.2} />
      </mesh>
    ))}

    {FLOOD_BAG_ITEMS.map((item, index) => (
      <SupplyCard
        key={item.id}
        icon={item.icon}
        name={item.name}
        accent={item.isUseful ? '#16a34a' : '#94a3b8'}
        picked={picked.includes(item.id)}
        position={[ITEM_POSITIONS[index].x, ITEM_POSITIONS[index].y, ITEM_POSITIONS[index].z]}
        onClick={() => {
          if (!finished) onToggle(item.id);
        }}
      />
    ))}

    {/* Rak dan petunjuk */}
    <mesh position={[0, 0.6, -1.9]}>
      <boxGeometry args={[12, 0.18, 0.7]} />
      <meshStandardMaterial color="#7c5a3a" roughness={0.9} />
    </mesh>
    <mesh position={[0, 0.6, 2]}>
      <boxGeometry args={[12, 0.18, 0.7]} />
      <meshStandardMaterial color="#7c5a3a" roughness={0.9} />
    </mesh>
  </>
);

/* ------------------------------ Escape scene ----------------------------- */

const LANES = [-3.2, 0, 3.2];
const ESCAPE_SECONDS = 30;
const OBSTACLE_POOL = 14;

interface EscapeObstacle {
  active: boolean;
  lane: number;
  z: number;
  type: 'electric' | 'wood';
}

interface EscapeGame {
  status: 'READY' | 'PLAY' | 'RESULT';
  elapsed: number;
  lives: number;
  lane: number;
  x: number;
  y: number;
  jumpStart: number | null;
  obstacles: EscapeObstacle[];
  spawnTimer: number;
  speed: number;
  hits: number;
  invincibleUntil: number;
  finished: boolean;
  shake: number;
  knockback: number;
}

const RAIN_COUNT = 220;

const FloodEscapeScene: React.FC<{
  avatar: Avatar | null;
  teamName: string;
  inputRef: { current: { left: boolean; right: boolean; jump: boolean } };
  joystickRef: { current: { x: number; y: number } };
  gameRef: { current: EscapeGame };
  hitFlash: boolean;
  playSound: (type: string) => void;
  onSync: (snapshot: {
    lives: number;
    timeLeft: number;
    hits: number;
    progress: number;
    invincible: boolean;
  }) => void;
  onFinish: (survived: boolean, lives: number, hits: number) => void;
}> = ({ avatar, teamName, inputRef, joystickRef, gameRef, hitFlash, playSound, onSync, onFinish }) => {
  const agent = useRef<THREE.Group>(null);
  const obstacleRefs = useRef<Array<THREE.Group | null>>([]);
  const woodVisualRefs = useRef<Array<THREE.Group | null>>([]);
  const electricVisualRefs = useRef<Array<THREE.Group | null>>([]);
  const floodRipples = useRef<Array<THREE.Mesh | null>>([]);
  const roadStripes = useRef<Array<THREE.Mesh | null>>([]);
  const sideBuildings = useRef<Array<THREE.Mesh | null>>([]);
  const rainRef = useRef<THREE.Points>(null);
  const safeBuilding = useRef<THREE.Group>(null);
  const cameraPos = useMemo(() => new THREE.Vector3(), []);
  const lookAt = useMemo(() => new THREE.Vector3(), []);
  const lastSync = useRef(0);
  const lastJump = useRef(false);
  // Deteksi tepi tombol: satu tekan = satu jalur, bukan berulang tiap frame.
  const leftWasHeld = useRef(false);
  const rightWasHeld = useRef(false);

  const rainGeometry = useMemo(() => {
    const positions = new Float32Array(RAIN_COUNT * 3);
    for (let i = 0; i < RAIN_COUNT; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 22;
      positions[i * 3 + 1] = Math.random() * 12;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, []);

  const electricSignTexture = useMemo(
    () => makeEmojiTexture('⚡', 'BAHAYA LISTRIK!', '#facc15', true),
    []
  );

  const woodSignTexture = useMemo(
    () => makeEmojiTexture('🪵', 'KAYU HANYUT!', '#f97316', true),
    []
  );

  const buildingTexture = useMemo(
    () =>
      makeBoardTexture({
        title: 'Gedung Aman',
        text: 'Tempat tinggi & aman',
        emoji: '🏢',
        accent: '#0ea5e9',
        background: '#eff6ff',
        width: 640,
        height: 320,
        textSize: 44,
        titleSize: 38,
      }),
    []
  );

  useFrame((state, rawDelta) => {
    const game = gameRef.current;
    const dt = Math.min(rawDelta, 0.05);

    // Hujan tetap turun walau belum mulai.
    if (rainRef.current) {
      const attribute = rainRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
      const array = attribute.array as Float32Array;
      for (let i = 0; i < RAIN_COUNT; i += 1) {
        array[i * 3 + 1] -= (7 + (i % 5)) * dt;
        if (array[i * 3 + 1] < 0) {
          array[i * 3 + 1] = 12;
          array[i * 3] = (Math.random() - 0.5) * 22;
          array[i * 3 + 2] = (Math.random() - 0.5) * 60;
        }
      }
      attribute.needsUpdate = true;
    }

    if (game.status !== 'PLAY' || game.finished) return;
    game.elapsed += dt;

    const joystickX = joystickRef.current.x;
    const leftHeld = inputRef.current.left || joystickX < -0.45;
    const rightHeld = inputRef.current.right || joystickX > 0.45;

    // Pindah satu jalur setiap kali tombol/joystick ditekan. Ini membuat
    // karakter tidak "melompat" dua jalur saat tombol ditahan.
    if (leftHeld && !rightHeld && !leftWasHeld.current) {
      game.lane = THREE.MathUtils.clamp(game.lane - 1, 0, LANES.length - 1);
    } else if (rightHeld && !leftHeld && !rightWasHeld.current) {
      game.lane = THREE.MathUtils.clamp(game.lane + 1, 0, LANES.length - 1);
    }
    leftWasHeld.current = leftHeld;
    rightWasHeld.current = rightHeld;

    const targetX = LANES[game.lane];
    game.x = THREE.MathUtils.lerp(game.x, targetX, 1 - Math.exp(-14 * dt));

    // Lompat
    const jumpInput = inputRef.current.jump;
    if (jumpInput && !lastJump.current && game.jumpStart === null) {
      game.jumpStart = state.clock.elapsedTime;
    }
    lastJump.current = jumpInput;

    if (game.jumpStart !== null) {
      const t = (state.clock.elapsedTime - game.jumpStart) / 0.72;
      if (t >= 1) {
        game.jumpStart = null;
        game.y = 0;
      } else {
        game.y = 4 * 1.3 * t * (1 - t);
      }
    }

    // Kecepatan bertahap naik
    game.speed = 15 + Math.min(12, game.elapsed * 0.45);

    // Riak genangan banjir bergerak mendekati pemain.
    floodRipples.current.forEach((mesh, index) => {
      if (!mesh) return;
      mesh.position.z += (3.5 + (index % 3)) * dt;
      if (mesh.position.z > 7) mesh.position.z = -54 + (index % 4) * 2;
    });

    game.spawnTimer -= dt;
    if (game.spawnTimer <= 0) {
      game.spawnTimer = Math.max(0.62, 1.25 - game.elapsed * 0.018);
      const slot = game.obstacles.find((obstacle) => !obstacle.active);
      if (slot) {
        slot.active = true;
        slot.lane = THREE.MathUtils.randInt(0, LANES.length - 1);
        slot.z = -58;
        slot.type = Math.random() < 0.5 ? 'electric' : 'wood';
      }
    }

    game.knockback = THREE.MathUtils.damp(game.knockback, 0, 5, dt);
    const playerZ = game.knockback;
    for (let i = 0; i < game.obstacles.length; i += 1) {
      const obstacle = game.obstacles[i];
      const grp = obstacleRefs.current[i];
      if (grp) {
        grp.visible = obstacle.active;
        if (obstacle.active) {
          grp.position.set(LANES[obstacle.lane], 0, obstacle.z);
        }
      }
      if (!obstacle.active) continue;
      obstacle.z += game.speed * dt;
      if (obstacle.z > 8) {
        obstacle.active = false;
        if (grp) grp.visible = false;
        continue;
      }
      // Tampilkan rintangan sesuai jenisnya: kayu hanyut atau air beralistrik.
      if (woodVisualRefs.current[i]) {
        woodVisualRefs.current[i]!.visible = obstacle.type === 'wood';
      }
      if (electricVisualRefs.current[i]) {
        electricVisualRefs.current[i]!.visible = obstacle.type === 'electric';
      }

      const obstacleX = LANES[obstacle.lane];
      const sameLane = Math.abs(obstacleX - game.x) < 1.45;
      const atPlayer = Math.abs(obstacle.z - playerZ) < 1.3;
      const grounded = game.y < 0.85;
      if (
        sameLane &&
        atPlayer &&
        grounded &&
        state.clock.elapsedTime > game.invincibleUntil &&
        !game.finished
      ) {
        game.hits += 1;
        game.lives = Math.max(0, game.lives - 1);
        game.invincibleUntil = state.clock.elapsedTime + 1.1;
        game.shake = 1;
        game.knockback = 0.72;
        playSound('splash');
        if (game.lives <= 0) {
          game.finished = true;
          game.status = 'RESULT';
          onFinish(false, 0, game.hits);
          return;
        }
      }
    }

    if (agent.current) {
      agent.current.position.set(game.x, game.y, playerZ);
      agent.current.rotation.y = Math.PI;
    }

    if (safeBuilding.current) {
      // Gedung aman adalah patokan garis finis: posisinya hanya ditentukan
      // oleh progres lari, bukan oleh ilusi jalan yang bergulir. Semakin
      // dekat finis, gedung semakin dekat ke pemain.
      const runProgress = Math.min(1, game.elapsed / ESCAPE_SECONDS);
      safeBuilding.current.position.z = -42 + runProgress * 39;
    }

    // Jalan bergulir + gedung samping
    roadStripes.current.forEach((stripe, index) => {
      if (!stripe) return;
      stripe.position.z += game.speed * dt;
      if (stripe.position.z > 12) stripe.position.z -= 60;
    });
    sideBuildings.current.forEach((building, index) => {
      if (!building) return;
      building.position.z += game.speed * dt * 0.72;
      if (building.position.z > 14) building.position.z -= 64;
    });

    const targetCameraZ = 8.4;
    cameraPos.set(
      game.x * 0.55 + (Math.random() - 0.5) * game.shake * 0.25,
      4.5 + (Math.random() - 0.5) * game.shake * 0.2,
      targetCameraZ
    );
    state.camera.position.lerp(cameraPos, 1 - Math.exp(-8 * dt));
    lookAt.set(game.x * 0.35, 1.35 + game.y * 0.3, -6);
    state.camera.lookAt(lookAt);
    game.shake = Math.max(0, game.shake - dt * 3);

    if (game.elapsed >= ESCAPE_SECONDS) {
      game.finished = true;
      game.status = 'RESULT';
      onFinish(true, game.lives, game.hits);
      return;
    }

    if (state.clock.elapsedTime - lastSync.current > 0.07) {
      lastSync.current = state.clock.elapsedTime;
      onSync({
        lives: game.lives,
        timeLeft: Math.max(0, Math.ceil(ESCAPE_SECONDS - game.elapsed)),
        hits: game.hits,
        progress: Math.min(100, Math.round((game.elapsed / ESCAPE_SECONDS) * 100)),
        invincible: state.clock.elapsedTime < game.invincibleUntil,
      });
    }
  });

  return (
    <>
      <fog attach="fog" args={['#1e3a5f', 22, 62]} />

      {/* Air banjir */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.25, -10]}>
        <planeGeometry args={[46, 90]} />
        <meshStandardMaterial
          color="#2563eb"
          emissive="#1e40af"
          emissiveIntensity={0.4}
          roughness={0.22}
          metalness={0.25}
          transparent
          opacity={0.86}
        />
      </mesh>

      {/* Riak di permukaan genangan */}
      {Array.from({ length: 14 }, (_, index) => (
        <mesh
          key={`ripple-${index}`}
          ref={(mesh) => {
            floodRipples.current[index] = mesh;
          }}
          rotation-x={-Math.PI / 2}
          position={[((index % 5) - 2) * 7.4, -0.21, -50 + index * 3.6]}
        >
          <ringGeometry args={[0.8 + (index % 3) * 0.25, 1.05 + (index % 3) * 0.25, 20]} />
          <meshBasicMaterial color="#93c5fd" transparent opacity={0.28} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}

      {/* Jalan tempat berlari */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, -10]}>
        <planeGeometry args={[9.4, 90]} />
        <meshStandardMaterial color="#334155" roughness={0.9} />
      </mesh>
      {Array.from({ length: 16 }, (_, index) => (
        <mesh
          key={index}
          ref={(mesh) => {
            roadStripes.current[index] = mesh;
          }}
          rotation-x={-Math.PI / 2}
          position={[0, 0.03, -52 + index * 7.5]}
        >
          <planeGeometry args={[0.28, 3.4]} />
          <meshBasicMaterial color="#e2e8f0" transparent opacity={0.55} />
        </mesh>
      ))}

      {/* Trotoar + gedung samping */}
      {[-6.4, 6.4].map((x) => (
        <mesh key={x} rotation-x={-Math.PI / 2} position={[x, 0.02, -10]}>
          <planeGeometry args={[3, 90]} />
          <meshStandardMaterial color="#475569" roughness={0.9} />
        </mesh>
      ))}
      {Array.from({ length: 12 }, (_, index) => {
        const side = index % 2 === 0 ? -1 : 1;
        return (
          <mesh
            key={index}
            ref={(mesh) => {
              sideBuildings.current[index] = mesh;
            }}
            position={[side * (9 + (index % 3) * 1.6), 2.4, -54 + index * 9]}
          >
            <boxGeometry args={[4.2, 5 + (index % 4) * 1.4, 4.2]} />
            <meshStandardMaterial color={index % 2 ? '#1e293b' : '#334155'} roughness={0.9} />
          </mesh>
        );
      })}

      {/* Rintangan dari pool */}
      {Array.from({ length: OBSTACLE_POOL }, (_, index) => (
        <group
          key={index}
          ref={(group) => {
            obstacleRefs.current[index] = group;
          }}
          visible={false}
        >
          {/* Kayu hanyut: cokelat terang / oranye menyala sangat kontras di atas air biru */}
          <group
            ref={(group) => {
              woodVisualRefs.current[index] = group;
            }}
          >
            {[-0.58, 0.58].map((offset, logIndex) => (
              <mesh key={logIndex} position={[offset, 0.44, 0]} rotation-z={Math.PI / 2}>
                <cylinderGeometry args={[0.38, 0.38, 2.5, 12]} />
                <meshStandardMaterial color="#ea580c" roughness={0.65} />
              </mesh>
            ))}
            <mesh position={[0, 0.82, 0]}>
              <boxGeometry args={[2.5, 0.16, 0.8]} />
              <meshStandardMaterial color="#f97316" roughness={0.6} emissive="#c2410c" emissiveIntensity={0.35} />
            </mesh>
            {/* Garis pita bahaya reflektif kuning */}
            {[-0.8, 0, 0.8].map((stripeX, sIdx) => (
              <mesh key={sIdx} position={[stripeX, 0.84, 0]}>
                <boxGeometry args={[0.26, 0.18, 0.82]} />
                <meshStandardMaterial color="#fef08a" emissive="#facc15" emissiveIntensity={0.8} />
              </mesh>
            ))}
            {/* Buih air di sekitar kayu */}
            <mesh rotation-x={-Math.PI / 2} position={[0, 0.05, 0]}>
              <planeGeometry args={[2.8, 1.4]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.35} />
            </mesh>
            {/* Ikon bahaya kayu hanyut */}
            <Billboard position={[0, 1.9, 0]}>
              <mesh>
                <planeGeometry args={[1.8, 1.8]} />
                <meshBasicMaterial map={woodSignTexture} transparent toneMapped={false} />
              </mesh>
            </Billboard>
          </group>

          {/* Genangan air beralistrik: efek kilat kuning menyala + ikon bahaya mencolok */}
          <group
            ref={(group) => {
              electricVisualRefs.current[index] = group;
            }}
            visible={false}
          >
            {/* Genangan kuning menyala */}
            <mesh rotation-x={-Math.PI / 2} position={[0, 0.08, 0]}>
              <circleGeometry args={[1.65, 24]} />
              <meshStandardMaterial
                color="#fef08a"
                emissive="#facc15"
                emissiveIntensity={2.8}
                transparent
                opacity={0.92}
                roughness={0.15}
              />
            </mesh>
            {/* Cincin gelombang kejut berdenyut */}
            <mesh rotation-x={-Math.PI / 2} position={[0, 0.09, 0]}>
              <ringGeometry args={[1.7, 2.15, 24]} />
              <meshBasicMaterial color="#fde047" transparent opacity={0.8} side={THREE.DoubleSide} />
            </mesh>
            {/* Kilatan listrik 3D */}
            {[-0.45, 0.45].map((flashX, fIdx) => (
              <mesh key={fIdx} position={[flashX, 0.35, (fIdx - 0.5) * 0.3]} rotation={[0.4, fIdx * 0.8, -0.3]}>
                <boxGeometry args={[0.12, 0.7, 0.12]} />
                <meshStandardMaterial color="#ffffff" emissive="#fef08a" emissiveIntensity={3} />
              </mesh>
            ))}
            {/* Ikon bahaya listrik billboard */}
            <Billboard position={[0, 1.95, 0]}>
              <mesh>
                <planeGeometry args={[2.0, 2.0]} />
                <meshBasicMaterial map={electricSignTexture} transparent toneMapped={false} />
              </mesh>
            </Billboard>
          </group>
        </group>
      ))}

      <SafeBuilding ref={safeBuilding} texture={buildingTexture} />

      {/* Pemain */}
      <Agent3D
        ref={agent}
        avatar={avatar}
        label={teamName}
        mode={gameRef.current.y > 0.15 ? 'jump' : 'run'}
        hitFlash={hitFlash}
        scale={0.9}
      />

      {/* Hujan */}
      <points ref={rainRef} geometry={rainGeometry}>
        <pointsMaterial color="#bfdbfe" size={0.14} transparent opacity={0.55} depthWrite={false} />
      </points>
    </>
  );
};

const SafeBuilding = React.forwardRef<THREE.Group, { texture: THREE.Texture }>(
  ({ texture }, ref) => (
    <group ref={ref} position={[0, 0, -42]}>
      <mesh position={[0, 4, 0]}>
        <boxGeometry args={[8, 8, 5]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.8} />
      </mesh>
      {Array.from({ length: 9 }, (_, index) => (
        <mesh key={index} position={[(index % 3 - 1) * 2.2, 5.4 - Math.floor(index / 3) * 1.7, 2.55]}>
          <planeGeometry args={[1.1, 0.9]} />
          <meshStandardMaterial color="#7dd3fc" emissive="#38bdf8" emissiveIntensity={0.35} />
        </mesh>
      ))}
      <mesh position={[0, 8.8, 0]}>
        <planeGeometry args={[6.4, 3.2]} />
        <meshBasicMaterial map={texture} transparent toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.3, 3]}>
        <planeGeometry args={[9, 0.6]} />
        <meshBasicMaterial color="#22c55e" transparent opacity={0.7} />
      </mesh>
      {/* Garis finis yang ikut menempel di kaki gedung aman */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.05, 3.15]}>
        <planeGeometry args={[9.4, 1.1]} />
        <meshBasicMaterial color="#4ade80" transparent opacity={0.72} />
      </mesh>
      {[-4.2, 4.2].map((x) => (
        <mesh key={`finish-pylon-${x}`} position={[x, 1.1, 3.05]}>
          <cylinderGeometry args={[0.16, 0.22, 2.2, 12]} />
          <meshStandardMaterial color="#fef08a" emissive="#facc15" emissiveIntensity={0.8} />
        </mesh>
      ))}
    </group>
  )
);
SafeBuilding.displayName = 'SafeBuilding';

/* ------------------------------- Mission -------------------------------- */

export const FloodMission3D: React.FC<Props> = ({
  avatar,
  teamName,
  playSound,
  updateSideNarrator,
  onComplete,
  onReplay,
}) => {
  const [subPhase, setSubPhase] = useState<SubPhase>('BACKPACK');
  const [picked, setPicked] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(25);
  const [backpackDone, setBackpackDone] = useState(false);
  const [backpackScore, setBackpackScore] = useState(0);

  const [escapeLives, setEscapeLives] = useState(3);
  const [escapeTime, setEscapeTime] = useState(ESCAPE_SECONDS);
  const [escapeHits, setEscapeHits] = useState(0);
  const [escapeProgress, setEscapeProgress] = useState(0);
  const [invincible, setInvincible] = useState(false);
  const [result, setResult] = useState<{ score: number; detail: FloodDetail } | null>(null);

  const timerRef = useRef<number | null>(null);
  const finishedRef = useRef(false);
  const inputRef = useRef({ left: false, right: false, jump: false });
  const joystickRef = useRef({ x: 0, y: 0 });
  const gameRef = useRef<EscapeGame>({
    status: 'READY',
    elapsed: 0,
    lives: 3,
    lane: 1,
    x: 0,
    y: 0,
    jumpStart: null,
    obstacles: Array.from({ length: OBSTACLE_POOL }, () => ({
      active: false,
      lane: 0,
      z: 0,
      type: 'wood' as const,
    })),
    spawnTimer: 1,
    speed: 15,
    hits: 0,
    invincibleUntil: 0,
    finished: false,
    shake: 0,
    knockback: 0,
  });

  const usefulPicked = picked.filter(
    (id) => FLOOD_BAG_ITEMS.find((item) => item.id === id)?.isUseful
  ).length;

  const finishBackpack = (ids: string[]) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (timerRef.current) window.clearInterval(timerRef.current);
    const useful = ids.filter(
      (id) => FLOOD_BAG_ITEMS.find((item) => item.id === id)?.isUseful
    ).length;
    const score = Math.round((useful / FLOOD_BAG_USEFUL_COUNT) * 100);
    setBackpackScore(score);
    setBackpackDone(true);
    playSound('success');
    updateSideNarrator?.(
      useful === FLOOD_BAG_USEFUL_COUNT
        ? 'Tas siaga lengkap! Sekarang lari ke gedung aman.'
        : 'Tas sudah diisi. Masih ada barang penting yang tertinggal, tapi kita harus segera pergi!',
      false,
      useful >= 3 ? 'success' : 'warning'
    );
  };

  useEffect(() => {
    if (subPhase !== 'BACKPACK' || backpackDone) return;
    updateSideNarrator?.(
      'Air datang cepat! Klik barang penting di rak. Tas hanya muat 5 barang.',
      false,
      'warning'
    );
    timerRef.current = window.setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          finishBackpack(picked);
          return 0;
        }
        if (previous <= 6) playSound('countdown');
        return previous - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subPhase, backpackDone]);

  useEffect(() => {
    if (subPhase === 'BACKPACK' && picked.length >= FLOOD_BAG_CAPACITY && !backpackDone) {
      finishBackpack(picked);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked, subPhase, backpackDone]);

  const toggleItem = (id: string) => {
    if (backpackDone) return;
    setPicked((previous) => {
      if (previous.includes(id)) {
        playSound('click');
        return previous.filter((item) => item !== id);
      }
      if (previous.length >= FLOOD_BAG_CAPACITY) return previous;
      playSound('itemPick');
      return [...previous, id];
    });
  };

  const startEscape = () => {
    gameRef.current = {
      status: 'PLAY',
      elapsed: 0,
      lives: 3,
      lane: 1,
      x: 0,
      y: 0,
      jumpStart: null,
      obstacles: Array.from({ length: OBSTACLE_POOL }, () => ({
        active: false,
        lane: 0,
        z: 0,
        type: 'wood' as const,
      })),
      spawnTimer: 0.8,
      speed: 15,
      hits: 0,
      invincibleUntil: 0,
      finished: false,
      shake: 0,
      knockback: 0,
    };
    inputRef.current = { left: false, right: false, jump: false };
    joystickRef.current = { x: 0, y: 0 };
    setSubPhase('ESCAPE');
    setEscapeLives(3);
    setEscapeTime(ESCAPE_SECONDS);
    setEscapeHits(0);
    setEscapeProgress(0);
    setInvincible(false);
    setResult(null);
    playSound('levelStart');
    updateSideNarrator?.(
      'LARI! Geser kiri-kanan untuk pindah jalur, tekan LONCAT untuk melewati air listrik dan kayu hanyut.',
      false,
      'warning'
    );
  };

  useEffect(() => {
    if (subPhase !== 'ESCAPE') return;
    const down = (event: KeyboardEvent) => {
      if (event.code === 'KeyA' || event.code === 'ArrowLeft') {
        inputRef.current.left = true;
        event.preventDefault();
      } else if (event.code === 'KeyD' || event.code === 'ArrowRight') {
        inputRef.current.right = true;
        event.preventDefault();
      } else if (event.code === 'Space' || event.code === 'ArrowUp') {
        inputRef.current.jump = true;
        event.preventDefault();
      } else if (event.code === 'KeyW') {
        inputRef.current.jump = true;
        event.preventDefault();
      }
    };
    const up = (event: KeyboardEvent) => {
      if (event.code === 'KeyA' || event.code === 'ArrowLeft') inputRef.current.left = false;
      if (event.code === 'KeyD' || event.code === 'ArrowRight') inputRef.current.right = false;
      if (event.code === 'Space' || event.code === 'ArrowUp' || event.code === 'KeyW') {
        inputRef.current.jump = false;
      }
    };
    const resetInput = () => {
      inputRef.current = { left: false, right: false, jump: false };
      joystickRef.current = { x: 0, y: 0 };
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', resetInput);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', resetInput);
    };
  }, [subPhase, inputRef, joystickRef]);

  const finishEscape = (survived: boolean, lives: number, hits: number) => {
    const escapeScore = survived ? Math.max(25, 100 - hits * 25) : 25;
    const finalScore = Math.round((backpackScore + escapeScore) / 2);
    const detail: FloodDetail = {
      usefulPicked,
      usefulTotal: FLOOD_BAG_USEFUL_COUNT,
      survived,
      livesRemaining: lives,
    };
    setResult({ score: finalScore, detail });
    setSubPhase('RESULT');
    playSound(survived ? 'victory' : 'error');
    updateSideNarrator?.(
      survived
        ? 'Selamat! Kalian sampai di gedung aman. Fase evakuasi selesai.'
        : 'Air dan listrik menghadang. Coba lagi dan pindah jalur lebih cepat!',
      false,
      survived ? 'success' : 'error'
    );
  };

  const handleEscapeSync = (snapshot: {
    lives: number;
    timeLeft: number;
    hits: number;
    progress: number;
    invincible: boolean;
  }) => {
    setEscapeLives(snapshot.lives);
    setEscapeTime(snapshot.timeLeft);
    setEscapeHits(snapshot.hits);
    setEscapeProgress(snapshot.progress);
    setInvincible(snapshot.invincible);
  };

  return (
    <MissionPanel accent="border-b-sky-400">
      {subPhase === 'BACKPACK' && (
        <MissionScene
          hud={
            <>
              <div className="flex items-center gap-2">
                <HudChip tone="sky">🎒 TAS SIAGA</HudChip>
                <HudChip tone={timeLeft <= 5 ? 'red' : 'stone'} pulse={timeLeft <= 5}>
                  ⏱️ 00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
                </HudChip>
              </div>
              <HudChip tone="emerald">
                {picked.length}/{FLOOD_BAG_CAPACITY} barang
              </HudChip>
            </>
          }
          controls={
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-bold text-white/75">
                <b className="text-white">Klik</b> barang di rak untuk memasukkannya ke tas. Pilih 5
                barang paling penting!
              </p>
              <div className="flex gap-1">
                {Array.from({ length: FLOOD_BAG_CAPACITY }).map((_, index) => {
                  const id = picked[index];
                  const item = id ? FLOOD_BAG_ITEMS.find((entry) => entry.id === id) : null;
                  return (
                    <span
                      key={index}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg border text-base ${
                        item ? 'border-emerald-300 bg-emerald-500/25' : 'border-white/25 bg-white/10'
                      }`}
                    >
                      {item ? item.icon : '·'}
                    </span>
                  );
                })}
              </div>
            </div>
          }
          overlay={
            backpackDone ? (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
                <div className="w-full max-w-lg rounded-3xl bg-white p-6 text-center shadow-2xl">
                  <div className="text-6xl">🎒</div>
                  <h3 className="mt-2 text-2xl font-black text-slate-800">Tas Siaga Siap!</h3>
                  <p className="mt-2 text-sm text-slate-500">
                    {usefulPicked}/{FLOOD_BAG_USEFUL_COUNT} barang penting berhasil dibawa.
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {picked.map((id) => {
                      const item = FLOOD_BAG_ITEMS.find((entry) => entry.id === id);
                      if (!item) return null;
                      return (
                        <span
                          key={id}
                          className={`flex items-center gap-1 rounded-xl border px-2 py-1 text-xs font-bold ${
                            item.isUseful
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-red-200 bg-red-50 text-red-600'
                          }`}
                        >
                          {item.icon} {item.name}
                        </span>
                      );
                    })}
                  </div>
                  <div className="mt-4 rounded-2xl bg-sky-50 px-4 py-3">
                    <span className="text-xs font-black uppercase tracking-wider text-sky-500">
                      Skor tas siaga
                    </span>
                    <div className="text-3xl font-black text-sky-700">{backpackScore}</div>
                  </div>
                  <button
                    onClick={startEscape}
                    className="mt-5 w-full rounded-2xl bg-sky-500 px-4 py-3 text-base font-black text-white shadow-lg hover:bg-sky-400"
                  >
                    LARI KE GEDUNG AMAN →
                  </button>
                </div>
              </div>
            ) : null
          }
        >
          <MissionCanvas
            background="#0f2a44"
            fog={{ color: '#0f2a44', near: 16, far: 34 }}
            camera={{ position: [0, 5.2, 9], fov: 52 }}
          >
            <BackpackScene picked={picked} onToggle={toggleItem} finished={backpackDone} />
            <Agent3D avatar={avatar} label={teamName} mode="idle" scale={0.82} />
          </MissionCanvas>
        </MissionScene>
      )}

      {subPhase === 'ESCAPE' && (
        <MissionScene
          hud={
            <>
              <div className="flex flex-wrap items-center gap-2">
                <HudChip tone="red" pulse={invincible}>
                  ⏱️ 00:{escapeTime < 10 ? `0${escapeTime}` : escapeTime}
                </HudChip>
                <HudChip tone="stone">💥 {escapeHits} tabrakan</HudChip>
                <HudChip tone="emerald">🏁 {escapeProgress}% finis</HudChip>
              </div>
              <HealthBar value={(escapeLives / 3) * 100} label={`${escapeLives} nyawa`} />
            </>
          }
          controls={
            <div className="flex items-end justify-between gap-2">
              <div className="flex items-center gap-2">
                <TouchJoystick valueRef={joystickRef} label="GESER" />
                <div className="hidden text-[11px] font-bold text-white/70 sm:block">
                  <span className="rounded bg-white/15 px-1.5 py-0.5">A / D</span> pindah jalur •{' '}
                  <span className="rounded bg-white/15 px-1.5 py-0.5">SPASI</span> loncat
                </div>
              </div>
              <ActionButton
                tone="sky"
                onPointerDown={() => {
                  inputRef.current.jump = true;
                }}
                onPointerUp={() => {
                  inputRef.current.jump = false;
                }}
                className="min-w-[130px]"
              >
                ⬆️ LONCAT
              </ActionButton>
            </div>
          }
          overlay={
            result ? (
              <ResultOverlay
                survived={result.detail.survived}
                title={result.detail.survived ? 'Selamat Sampai di Gedung Aman!' : 'Terhempas Arus!'}
                message={
                  result.detail.survived
                    ? 'Kalian berhasil menghindari air listrik dan kayu hanyut. Ingat: saat banjir, jangan menyentuh listrik!'
                    : 'Pindah jalur lebih cepat dan loncat tepat sebelum rintangan. Jangan berhenti di jalur yang sama!'
                }
                stars={result.detail.survived ? (escapeHits === 0 ? 3 : escapeHits <= 1 ? 2 : 1) : 0}
                score={result.score}
                stats={[
                  { label: 'Barang penting', value: `${result.detail.usefulPicked}/${result.detail.usefulTotal}` },
                  { label: 'Tabrakan', value: escapeHits },
                  { label: 'Skor tas', value: backpackScore },
                ]}
                onReplay={onReplay}
                onContinue={() => onComplete(result.score, result.detail)}
                continueLabel="Lanjut ke Kuis"
              />
            ) : null
          }
        >
          <MissionCanvas
            background="#1e3a5f"
            fog={{ color: '#1e3a5f', near: 22, far: 62 }}
            camera={{ position: [0, 4.5, 8.4], fov: 58 }}
          >
            <FloodEscapeScene
              avatar={avatar}
              teamName={teamName}
              inputRef={inputRef}
              joystickRef={joystickRef}
              gameRef={gameRef}
              hitFlash={invincible}
              playSound={playSound}
              onSync={handleEscapeSync}
              onFinish={finishEscape}
            />
          </MissionCanvas>
        </MissionScene>
      )}

      {subPhase === 'RESULT' && result && (
        <MissionScene
          hud={null}
          controls={null}
          overlay={
            <ResultOverlay
              survived={result.detail.survived}
              title={result.detail.survived ? 'Evakuasi Banjir Berhasil!' : 'Evakuasi Gagal'}
              message={
                result.detail.survived
                  ? 'Kalian membawa barang penting dan sampai di tempat aman. Hebat!'
                  : 'Coba lagi: isi tas dengan barang penting dan hindari rintangan saat berlari.'
              }
              stars={result.detail.survived ? (escapeHits === 0 ? 3 : escapeHits <= 1 ? 2 : 1) : 0}
              score={result.score}
              stats={[
                { label: 'Barang penting', value: `${result.detail.usefulPicked}/${result.detail.usefulTotal}` },
                { label: 'Tabrakan', value: escapeHits },
              ]}
              onReplay={onReplay}
              onContinue={() => onComplete(result.score, result.detail)}
              continueLabel="Lanjut ke Kuis"
            />
          }
        >
          <MissionCanvas background="#1e3a5f" camera={{ position: [0, 4, 8] }}>
            <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
              <planeGeometry args={[20, 20]} />
              <meshStandardMaterial color="#1d4ed8" roughness={0.3} />
            </mesh>
          </MissionCanvas>
        </MissionScene>
      )}
    </MissionPanel>
  );
};
