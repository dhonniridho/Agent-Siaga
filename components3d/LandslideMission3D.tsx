import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Avatar } from '../types';
import { Agent3D } from './Agent3D';
import { MissionCanvas } from './MissionCanvas';
import { makeBoardTexture } from './missionTextures';
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

export interface LandslideDetail {
  survived: boolean;
  heartsRemaining: number;
  distance: number;
  cause: 'fall' | 'rock' | null;
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
  onComplete: (score: number, detail: LandslideDetail) => void;
  onReplay?: () => void;
}

type Status = 'READY' | 'PLAY' | 'RESULT';
type TileState = 'INTACT' | 'CRACKING' | 'FALLING' | 'GONE';

interface Tile {
  id: number;
  state: TileState;
  crackAt: number;
  fallAt: number;
  fuse: number;
}

interface Rock {
  id: number;
  active: boolean;
  x: number;
  y: number;
  z: number;
  speed: number;
  spin: number;
}

interface FallenTree {
  id: number;
  x: number;
  z: number;
  active: boolean;
}

interface GameState {
  status: Status;
  elapsed: number;
  z: number;
  x: number;
  hearts: number;
  furthest: number;
  tiles: Tile[];
  rocks: Rock[];
  trees: FallenTree[];
  nextRock: number;
  spawnTimer: number;
  invincibleUntil: number;
  finished: boolean;
  shake: number;
  cause: 'fall' | 'rock' | null;
}

const TILE_COUNT = 34;
const TILE_LEN = 2.15;
const SAFE_Z = TILE_COUNT * TILE_LEN;
const FINISH_Z = SAFE_Z + 2.5;
const RUN_SPEED = 6.4;
const HILL_GRADE = 0.11;
const terrainHeight = (z: number) => Math.min(SAFE_Z, Math.max(0, z)) * HILL_GRADE;
const STRAFE_SPEED = 5.8;
const PLAYER_MIN_X = -4.0;
const PLAYER_MAX_X = 4.0;
const GRACE_SECONDS = 0.35;
const ROCK_GRACE = 2.4;
const MAX_ROCKS = 16;
const RAIN_COUNT = 240;

const newTiles = (): Tile[] =>
  Array.from({ length: TILE_COUNT }, (_, id) => ({
    id,
    state: 'INTACT',
    crackAt: 0,
    fallAt: 0,
    fuse: 1.05 + Math.random() * 0.55,
  }));

const newRocks = (): Rock[] =>
  Array.from({ length: MAX_ROCKS }, (_, id) => ({
    id,
    active: false,
    x: 0,
    y: 0,
    z: 0,
    speed: 8,
    spin: 0,
  }));

// Pohon tumbang yang menghalangi jalur evakuasi menuju bukit aman.
const newTrees = (): FallenTree[] =>
  [16, 31, 46].map((z, id) => ({
    id,
    z,
    x: id % 2 === 0 ? -2.1 : 2.1,
    active: true,
  }));

const LandslideSlope: React.FC<{ side: -1 | 1; z: number }> = ({ side, z }) => {
  const rocks = useRef<Array<THREE.Mesh | null>>([]);
  const dust = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    rocks.current.forEach((rock, index) => {
      if (!rock) return;
      rock.rotation.x += delta * (0.12 + index * 0.025);
      rock.rotation.z += delta * (index % 2 ? 0.08 : -0.1);
      rock.position.y = 0.12 + Math.sin(t * 1.5 + index) * 0.035;
    });
    if (dust.current) {
      dust.current.scale.setScalar(0.96 + Math.sin(t * 1.3 + z) * 0.06);
      dust.current.position.y = 0.7 + Math.sin(t * 1.6 + z) * 0.08;
    }
  });

  return (
    <group position={[side * 7.55, terrainHeight(z) - 0.45, z]}>
      <mesh position={[0, 0.15, 0]} scale={[1.65, 1.1, 2.25]}>
        <dodecahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color="#704326" roughness={1} flatShading />
      </mesh>
      <mesh position={[-side * 0.55, 0.6, -0.45]} scale={[1.15, 0.75, 1.55]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color="#9a6138" roughness={1} flatShading />
      </mesh>
      <mesh position={[-side * 0.9, 0.18, 0.95]} scale={[0.85, 0.38, 1.2]}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#b87942" roughness={1} flatShading />
      </mesh>
      {[
        [-side * 0.6, 0.12, 0.05, 0.62],
        [side * 0.15, 0.12, 0.82, 0.43],
        [side * 0.3, 0.12, -0.9, 0.52],
        [-side * 1.05, 0.12, 1.55, 0.36],
      ].map(([x, y, rockZ, radius], index) => (
        <mesh key={index} ref={(mesh) => { rocks.current[index] = mesh; }} position={[x, y, rockZ]}>
          <dodecahedronGeometry args={[radius, 0]} />
          <meshStandardMaterial color={index % 2 ? '#70513a' : '#a4774d'} roughness={0.95} flatShading />
        </mesh>
      ))}
      <group position={[-side * 0.35, 0.3, -1.1]} rotation-z={0.9 * side}>
        <mesh rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.12, 0.18, 2.5, 7]} />
          <meshStandardMaterial color="#684226" roughness={1} />
        </mesh>
        {[-0.65, 0.45].map((branch, index) => (
          <mesh key={index} position={[0, branch, index ? 0.18 : -0.18]} rotation-z={index ? 0.55 : -0.6}>
            <cylinderGeometry args={[0.045, 0.09, 0.85, 6]} />
            <meshStandardMaterial color="#51351f" roughness={1} />
          </mesh>
        ))}
        {[-0.12, 0.12].map((rootX) => (
          <mesh key={rootX} position={[rootX, -0.15, 0.22]} rotation-x={0.7}>
            <cylinderGeometry args={[0.025, 0.07, 0.85, 5]} />
            <meshStandardMaterial color="#58391f" roughness={1} />
          </mesh>
        ))}
      </group>
      <group ref={dust} position={[0, 0.7, 0.35]}>
        {[-0.8, 0, 0.75].map((x, index) => (
          <mesh key={index} position={[x, index * 0.12, index * 0.22]} scale={[1.1, 0.55, 0.75]}>
            <sphereGeometry args={[0.48, 7, 6]} />
            <meshStandardMaterial color="#c4a484" transparent opacity={0.22} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

interface SceneProps {
  avatar: Avatar | null;
  teamName: string;
  inputRef: { current: { forward: number; strafe: number; jump: boolean } };
  joystickRef: { current: { x: number; y: number } };
  gameRef: { current: GameState };
  playSound: (type: string) => void;
  onSync: (snapshot: {
    hearts: number;
    progress: number;
    invincible: boolean;
    status: Status;
  }) => void;
  onFinish: (survived: boolean, hearts: number, progress: number, cause: 'fall' | 'rock' | null) => void;
}

const LandslideScene: React.FC<SceneProps> = ({
  avatar,
  teamName,
  inputRef,
  joystickRef,
  gameRef,
  playSound,
  onSync,
  onFinish,
}) => {
  const agent = useRef<THREE.Group>(null);
  const tileRefs = useRef<Array<THREE.Group | null>>([]);
  const rockRefs = useRef<Array<THREE.Group | null>>([]);
  const treeRefs = useRef<Array<THREE.Group | null>>([]);
  const rainRef = useRef<THREE.Points>(null);
  const cameraPos = useMemo(() => new THREE.Vector3(), []);
  const lookAt = useMemo(() => new THREE.Vector3(), []);
  const lastSync = useRef(0);
  const jumpY = useRef(0);
  const jumpVelocity = useRef(0);
  const jumpCooldown = useRef(0);
  const lastBoom = useRef(0);

  const rainGeometry = useMemo(() => {
    const positions = new Float32Array(RAIN_COUNT * 3);
    for (let i = 0; i < RAIN_COUNT; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 26;
      positions[i * 3 + 1] = Math.random() * 16;
      positions[i * 3 + 2] = Math.random() * 80 - 8;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, []);

  const hillTexture = useMemo(
    () =>
      makeBoardTexture({
        title: 'Bukit Aman',
        text: 'Tanah stabil & jauh dari lereng',
        emoji: '🏠',
        accent: '#16a34a',
        background: '#ecfdf5',
        width: 640,
        height: 320,
        titleSize: 40,
        textSize: 42,
      }),
    []
  );

  // Warna tanah bergantian supaya permukaan tidak terlihat datar.
  const tileColors = useMemo(
    () => Array.from({ length: TILE_COUNT }, (_, i) => (i % 2 === 0 ? '#8a5a35' : '#7c4f2d')),
    []
  );

  useFrame((state, rawDelta) => {
    const game = gameRef.current;
    const dt = Math.min(rawDelta, 0.05);
    const t = state.clock.elapsedTime;

    // Hujan tetap turun agar suasana tetap hidup.
    if (rainRef.current) {
      const attribute = rainRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
      const array = attribute.array as Float32Array;
      for (let i = 0; i < RAIN_COUNT; i += 1) {
        array[i * 3 + 1] -= (10 + (i % 6)) * dt;
        if (array[i * 3 + 1] < 0) {
          array[i * 3 + 1] = 16;
          array[i * 3] = (Math.random() - 0.5) * 26;
          array[i * 3 + 2] = game.z + Math.random() * 70 - 10;
        }
      }
      attribute.needsUpdate = true;
    }

    if (game.status === 'PLAY' && !game.finished) {
      game.elapsed += dt;
      jumpCooldown.current = Math.max(0, jumpCooldown.current - dt);
      if (inputRef.current.jump && jumpY.current === 0 && jumpCooldown.current === 0) {
        jumpVelocity.current = 5.3;
        jumpCooldown.current = 0.28;
        playSound('whoosh');
      }
      inputRef.current.jump = false;
      if (jumpY.current > 0 || jumpVelocity.current > 0) {
        jumpVelocity.current -= 13 * dt;
        jumpY.current = Math.max(0, jumpY.current + jumpVelocity.current * dt);
        if (jumpY.current === 0) jumpVelocity.current = 0;
      }

      const joy = joystickRef.current;
      const forwardInput = THREE.MathUtils.clamp(inputRef.current.forward - joy.y, -1, 1);
      const strafeInput = Math.max(-1, Math.min(1, inputRef.current.strafe + joy.x));

      if (forwardInput > 0) {
        game.z = Math.min(FINISH_Z + 0.4, game.z + RUN_SPEED * dt);
      } else if (forwardInput < 0) {
        game.z = Math.max(0.9, game.z + forwardInput * RUN_SPEED * 0.65 * dt);
      } else {
        // Jika berhenti di tanah rapuh, fuse tetap menyala.
        const idx = Math.min(TILE_COUNT - 1, Math.floor(game.z / TILE_LEN));
        const tile = game.tiles[idx];
        if (tile && tile.state === 'INTACT' && game.elapsed > GRACE_SECONDS) {
          tile.state = 'CRACKING';
          tile.crackAt = game.elapsed;
        }
      }

      // Kamera menatap +Z (menuju bukit), jadi layar kanan adalah -X.
      game.x = THREE.MathUtils.clamp(
        game.x - strafeInput * STRAFE_SPEED * dt,
        PLAYER_MIN_X,
        PLAYER_MAX_X
      );
      game.furthest = Math.max(game.furthest, game.z);

      // Langkah kaki menyalakan fuse ubin yang dipijak.
      const idx = Math.min(TILE_COUNT - 1, Math.floor(game.z / TILE_LEN));
      if (game.z < SAFE_Z && game.elapsed > GRACE_SECONDS) {
        const tile = game.tiles[idx];
        if (tile && tile.state === 'INTACT') {
          tile.state = 'CRACKING';
          tile.crackAt = game.elapsed;
        }
      }

      // Fuse -> runtuh -> hilang.
      for (const tile of game.tiles) {
        if (tile.state === 'CRACKING' && game.elapsed - tile.crackAt >= tile.fuse) {
          tile.state = 'FALLING';
          tile.fallAt = game.elapsed;
          if (game.elapsed - lastBoom.current > 0.18) {
            lastBoom.current = game.elapsed;
          }
        } else if (tile.state === 'FALLING' && game.elapsed - tile.fallAt >= 0.85) {
          tile.state = 'GONE';
        }
      }

      // Berdiri di ubin yang runtuh = jatuh ke jurang.
      if (game.z < SAFE_Z) {
        const standing = game.tiles[idx];
        if (jumpY.current < 0.25 && standing && (standing.state === 'FALLING' || standing.state === 'GONE')) {
          game.finished = true;
          game.status = 'RESULT';
          game.cause = 'fall';
          game.shake = 1;
          onFinish(false, game.hearts, Math.round((game.furthest / SAFE_Z) * 100), 'fall');
          return;
        }
      }

      // Spawn batu vulkanik/longsor dari lereng.
      if (game.elapsed > ROCK_GRACE) {
        game.spawnTimer -= dt;
        if (game.spawnTimer <= 0) {
          game.spawnTimer = Math.max(0.8, 1.45 - game.elapsed * 0.03);
          const rock = game.rocks.find((entry) => !entry.active);
          if (rock) {
            const lane = THREE.MathUtils.randInt(-2, 2) * 2.1;
            const aim = Math.random() < 0.62 ? game.x + (Math.random() < 0.5 ? -1.3 : 1.3) : lane;
            rock.active = true;
            rock.x = THREE.MathUtils.clamp(aim, PLAYER_MIN_X, PLAYER_MAX_X);
            rock.z = game.z + 13 + Math.random() * 12;
            rock.y = terrainHeight(rock.z) + 11 + Math.random() * 4;
            rock.speed = 8.5 + Math.random() * 3;
            rock.spin = Math.random() * 3;
          }
        }
      }

      // Gerak batu + deteksi tabrakan.
      for (const rock of game.rocks) {
        if (!rock.active) continue;
        rock.y -= rock.speed * dt;
        if (rock.y <= terrainHeight(rock.z) + 0.55) {
          const hit =
            Math.abs(rock.x - game.x) < 1.25 &&
            Math.abs(rock.z - game.z) < 1.9 &&
            jumpY.current < 0.8 &&
            t > game.invincibleUntil;
          if (hit) {
            game.hearts = Math.max(0, game.hearts - 1);
            game.invincibleUntil = t + 1.1;
            game.shake = 1;
            if (game.hearts <= 0) {
              game.finished = true;
              game.status = 'RESULT';
              game.cause = 'rock';
              onFinish(false, 0, Math.round((game.furthest / SAFE_Z) * 100), 'rock');
              return;
            }
          }
          rock.active = false;
        }
      }

      // Pohon tumbang di jalur evakuasi juga bisa melukai pemain.
      for (const tree of game.trees) {
        if (!tree.active) continue;
        const hit =
          Math.abs(tree.x - game.x) < 1.6 &&
          Math.abs(tree.z - game.z) < 1.5 &&
          t > game.invincibleUntil;
        if (!hit) continue;
        tree.active = false;
        game.hearts = Math.max(0, game.hearts - 1);
        game.invincibleUntil = t + 1.1;
        game.shake = 1;
        playSound('explosion');
        if (game.hearts <= 0) {
          game.finished = true;
          game.status = 'RESULT';
          game.cause = 'rock';
          onFinish(false, 0, Math.round((game.furthest / SAFE_Z) * 100), 'rock');
          return;
        }
      }

      game.shake = Math.max(0, game.shake - dt * 3);

      if (game.z >= FINISH_Z) {
        game.finished = true;
        game.status = 'RESULT';
        game.cause = null;
        onFinish(true, game.hearts, 100, null);
        return;
      }

      if (t - lastSync.current > 0.07) {
        lastSync.current = t;
        onSync({
          hearts: game.hearts,
          progress: Math.min(100, Math.round((game.z / SAFE_Z) * 100)),
          invincible: t < game.invincibleUntil,
          status: game.status,
        });
      }
    }

    if (agent.current) {
      agent.current.position.set(game.x, terrainHeight(game.z) + jumpY.current, game.z);
      // Menghadap +Z, searah jalur evakuasi menuju bukit aman.
      agent.current.rotation.y = 0;
      const hitFlash = t < game.invincibleUntil;
      agent.current.visible =
        !(game.status === 'RESULT' && game.cause === 'fall') &&
        !(hitFlash && Math.floor(t * 16) % 2 === 0);
    }

    // Update visual ubin dari state game.
    game.tiles.forEach((tile, index) => {
      const group = tileRefs.current[index];
      if (!group) return;
      if (tile.state === 'GONE') {
        group.visible = false;
        return;
      }
      group.visible = true;
      const baseY = terrainHeight((tile.id + 0.5) * TILE_LEN);
      if (tile.state === 'FALLING') {
        const p = Math.min(1, (game.elapsed - tile.fallAt) / 0.85);
        group.position.y = baseY - p * 7;
        group.rotation.z = p * (tile.id % 2 === 0 ? 0.5 : -0.5);
        group.rotation.x = p * 0.4;
      } else {
        group.position.y = baseY;
        group.rotation.z = 0;
        group.rotation.x = 0;
      }
      const body = group.children[1] as THREE.Mesh | undefined;
      if (body) {
        const material = body.material as THREE.MeshStandardMaterial;
        material.color.set(
          tile.state === 'CRACKING' ? '#b45309' : tile.state === 'FALLING' ? '#6b4423' : tileColors[index]
        );
      }
      if (tile.state === 'CRACKING') {
        group.position.x = Math.sin(t * 34 + tile.id) * 0.025;
      } else {
        group.position.x = 0;
      }
    });

    // Update batu.
    game.rocks.forEach((rock, index) => {
      const group = rockRefs.current[index];
      if (!group) return;
      group.visible = rock.active;
      if (!rock.active) return;
      group.position.set(rock.x, rock.y, rock.z);
      group.rotation.x = t * rock.spin;
      group.rotation.z = t * rock.spin * 0.7;
    });

    // Sembunyikan pohon yang sudah dilalui/ditabrak pemain.
    game.trees.forEach((tree, index) => {
      const group = treeRefs.current[index];
      if (group) group.visible = tree.active;
    });

    // Kamera orang ketiga di belakang pelari.
    const shake = game.shake;
    cameraPos.set(
      game.x * 0.45 + (Math.random() - 0.5) * shake * 0.4,
      terrainHeight(game.z) + 5.4 + (Math.random() - 0.5) * shake * 0.3,
      game.z - 7.4
    );
    state.camera.position.lerp(cameraPos, 1 - Math.exp(-7 * dt));
    lookAt.set(game.x * 0.3, terrainHeight(game.z + 6.2) + 1.6, game.z + 6.2);
    state.camera.lookAt(lookAt);
  });

  return (
    <>
      <fog attach="fog" args={['#5a6b80', 20, 64]} />

      {/* Jurang di bawah jalur */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -5.4, 34]}>
        <planeGeometry args={[70, 140]} />
        <meshStandardMaterial color="#1a120b" roughness={1} />
      </mesh>

      {/* Lereng kiri yang longsor */}
      <group position={[-12, 0, 22]} rotation={[0, 0.16, 0.42]}>
        <mesh position={[0, -1.5, 0]}>
          <boxGeometry args={[12, 8, 78]} />
          <meshStandardMaterial color="#6f4527" roughness={1} />
        </mesh>
        <mesh position={[3.5, 2.2, 0]} rotation-z={-0.3}>
          <boxGeometry args={[8, 5, 76]} />
          <meshStandardMaterial color="#3f6b46" roughness={1} />
        </mesh>
        {Array.from({ length: 7 }, (_, i) => (
          <mesh key={i} position={[4.4, 4.4 - i * 0.1, -30 + i * 11]} rotation={[0.3, i, 0.8]}>
            <dodecahedronGeometry args={[1.1, 0]} />
            <meshStandardMaterial color="#8a5c35" roughness={1} />
          </mesh>
        ))}
      </group>

      {/* Tebing kanan */}
      <group position={[13, 0, 28]} rotation={[0, -0.2, -0.36]}>
        <mesh position={[0, -1.8, 0]}>
          <boxGeometry args={[14, 9, 86]} />
          <meshStandardMaterial color="#52688a" roughness={1} />
        </mesh>
        <mesh position={[-4, 2.6, 0]} rotation-z={0.28}>
          <boxGeometry args={[9, 5, 82]} />
          <meshStandardMaterial color="#35583b" roughness={1} />
        </mesh>
      </group>

      <LandslideSlope side={-1} z={29} />
      <LandslideSlope side={1} z={49} />

      {/* Jalur ubin yang runtuh */}
      {Array.from({ length: TILE_COUNT }, (_, index) => (
        <group
          key={index}
          ref={(group) => {
            tileRefs.current[index] = group;
          }}
          position={[0, terrainHeight((index + 0.5) * TILE_LEN), (index + 0.5) * TILE_LEN]}
        >
          <mesh position={[0, -0.12, 0]}>
            <boxGeometry args={[9.4, 0.2, TILE_LEN]} />
            <meshStandardMaterial color="#7cc24e" roughness={0.95} />
          </mesh>
          <mesh position={[0, -0.62, 0]}>
            <boxGeometry args={[9.4, 0.82, TILE_LEN]} />
            <meshStandardMaterial color={tileColors[index]} roughness={1} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * 4.58, 0.08, 0]}>
              <boxGeometry args={[0.16, 0.24, TILE_LEN]} />
              <meshStandardMaterial color="#d6b269" roughness={0.8} />
            </mesh>
          ))}
          {index % 4 === 1 && (
            <mesh position={[index % 8 === 1 ? -3.2 : 3.2, 0.12, 0]}>
              <dodecahedronGeometry args={[0.3, 0]} />
              <meshStandardMaterial color="#94a3b8" roughness={1} />
            </mesh>
          )}
        </group>
      ))}

      {/* Bukit aman di ujung jalur */}
      <group position={[0, terrainHeight(SAFE_Z), SAFE_Z + 9]}>
        <mesh position={[0, -0.6, 0]}>
          <boxGeometry args={[16, 1.2, 18]} />
          <meshStandardMaterial color="#55a136" roughness={0.95} />
        </mesh>
        <mesh position={[0, -0.02, -8.6]}>
          <boxGeometry args={[16, 0.12, 1.2]} />
          <meshStandardMaterial color="#7cc24e" roughness={0.9} />
        </mesh>
        {/* Rumah panggung sederhana */}
        <group position={[1.6, 1.4, 1.5]}>
          <mesh position={[0, 1.1, 0]}>
            <boxGeometry args={[3.4, 2.4, 3]} />
            <meshStandardMaterial color="#f5e6c8" roughness={0.85} />
          </mesh>
          <mesh position={[0, 2.7, 0]} rotation-y={0.78}>
            <coneGeometry args={[2.8, 1.5, 4]} />
            <meshStandardMaterial color="#c9553f" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.8, 1.55]}>
            <boxGeometry args={[0.95, 1.6, 0.1]} />
            <meshStandardMaterial color="#7c5127" roughness={0.9} />
          </mesh>
        </group>
        {/* Tiang bendera AMAN */}
        <group position={[-4.2, 1.2, -8.4]}>
          <mesh position={[0, 1.8, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 3.6, 8]} />
            <meshStandardMaterial color="#475569" roughness={0.8} />
          </mesh>
          <mesh position={[1.15, 3, 0]}>
            <planeGeometry args={[2.2, 1.1]} />
            <meshBasicMaterial map={hillTexture} transparent toneMapped={false} />
          </mesh>
        </group>
        {[
          [-5, 2.2, 3],
          [5.6, 2.3, -1],
          [-3.4, 2, 5.6],
        ].map(([x, y, z], i) => (
          <group key={i} position={[x, y, z]}>
            <mesh position={[0, 1.2, 0]}>
              <cylinderGeometry args={[0.22, 0.3, 2.4, 7]} />
              <meshStandardMaterial color="#6b4526" roughness={0.95} />
            </mesh>
            <mesh position={[0, 3, 0]}>
              <coneGeometry args={[1.4, 2.8, 8]} />
              <meshStandardMaterial color="#2f6b3d" roughness={0.9} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Garis finish melintasi jalur dengan permukaan aman yang menyambung. */}
      <mesh rotation-x={-Math.PI / 2} position={[0, terrainHeight(SAFE_Z) + 0.035, SAFE_Z + 0.55]}>
        <planeGeometry args={[9.25, 0.28]} />
        <meshBasicMaterial color="#facc15" toneMapped={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, terrainHeight(SAFE_Z) + 0.04, SAFE_Z + 0.55]}>
        <planeGeometry args={[9.25, 0.07]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>

      {/* Pohon tumbang yang menghalangi jalur evakuasi dengan tanda bahaya mencolok */}
      {newTrees().map((tree, index) => (
        <group
          key={`tree-${tree.id}`}
          ref={(group) => {
            treeRefs.current[index] = group;
          }}
          position={[tree.x, terrainHeight(tree.z), tree.z]}
          rotation-y={index % 2 === 0 ? 0.5 : -0.6}
        >
          <mesh position={[0, 0.42, 0]} rotation-z={Math.PI / 2}>
            <cylinderGeometry args={[0.34, 0.44, 4.2, 8]} />
            <meshStandardMaterial color="#78350f" roughness={0.8} />
          </mesh>
          <mesh position={[0.4, 0.85, 0]} rotation-z={0.5}>
            <coneGeometry args={[1.1, 2, 7]} />
            <meshStandardMaterial color="#14532d" roughness={0.85} />
          </mesh>
          {/* Pita reflektif bahaya pada batang pohon */}
          {[-1.2, 0, 1.2].map((sX, sIdx) => (
            <mesh key={sIdx} position={[sX, 0.43, 0]} rotation-z={Math.PI / 2}>
              <cylinderGeometry args={[0.36, 0.36, 0.35, 8]} />
              <meshStandardMaterial color="#facc15" emissive="#eab308" emissiveIntensity={0.6} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Batu yang berjatuhan: batu tajam dengan efek bahaya mencolok */}
      {Array.from({ length: MAX_ROCKS }, (_, index) => (
        <group
          key={index}
          ref={(group) => {
            rockRefs.current[index] = group;
          }}
          visible={false}
        >
          <mesh>
            <dodecahedronGeometry args={[0.62, 0]} />
            <meshStandardMaterial
              color="#57534e"
              roughness={0.7}
              emissive="#ea580c"
              emissiveIntensity={0.6}
            />
          </mesh>
        </group>
      ))}

      {/* Indikator bahaya jatuhan batu di tanah */}
      {gameRef.current.rocks.map((rock, index) =>
        rock.active ? (
          <group key={`landslide-shadow-${index}`} position={[rock.x, terrainHeight(rock.z) + 0.04, rock.z]}>
            <mesh rotation-x={-Math.PI / 2}>
              <circleGeometry args={[0.65, 16]} />
              <meshBasicMaterial color="#ef4444" transparent opacity={0.6} />
            </mesh>
            <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 0]}>
              <ringGeometry args={[0.7, 0.9, 18]} />
              <meshBasicMaterial color="#f97316" transparent opacity={0.85} side={THREE.DoubleSide} />
            </mesh>
          </group>
        ) : null
      )}

      <Agent3D
        ref={agent}
        avatar={avatar}
        label={teamName}
        mode={jumpY.current > 0.1 ? 'jump' : gameRef.current.status === 'PLAY' ? 'run' : 'idle'}
        scale={1}
      />

      <points ref={rainRef} geometry={rainGeometry}>
        <pointsMaterial color="#c7d2fe" size={0.13} transparent opacity={0.55} depthWrite={false} />
      </points>
    </>
  );
};

export const LandslideMission3D: React.FC<Props> = ({
  avatar,
  teamName,
  playSound,
  updateSideNarrator,
  onComplete,
  onReplay,
}) => {
  const [status, setStatus] = useState<Status>('READY');
  const [hearts, setHearts] = useState(3);
  const [progress, setProgress] = useState(0);
  const [invincible, setInvincible] = useState(false);
  const [result, setResult] = useState<{ score: number; detail: LandslideDetail } | null>(null);

  const inputRef = useRef({ forward: 0, strafe: 0, jump: false });
  const joystickRef = useRef({ x: 0, y: 0 });
  const heldKeys = useRef<Set<string>>(new Set());
  const gameRef = useRef<GameState>({
    status: 'READY',
    elapsed: 0,
    z: 0.9,
    x: 0,
    hearts: 3,
    furthest: 0.9,
    tiles: newTiles(),
    rocks: newRocks(),
    trees: newTrees(),
    nextRock: 0,
    spawnTimer: 0.8,
    invincibleUntil: 0,
    finished: false,
    shake: 0,
    cause: null,
  });

  useEffect(() => {
    const syncMovement = () => {
      const keys = heldKeys.current;
      inputRef.current.forward = Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown'));
      inputRef.current.strafe = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'));
    };
    const clearInputs = () => {
      heldKeys.current.clear();
      inputRef.current = { forward: 0, strafe: 0, jump: false };
      joystickRef.current = { x: 0, y: 0 };
    };
    const down = (event: KeyboardEvent) => {
      if (gameRef.current.status !== 'PLAY') return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) {
        clearInputs();
        return;
      }
      if (event.code === 'Space' && !event.repeat) {
        inputRef.current.jump = true;
        event.preventDefault();
        return;
      }
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
        heldKeys.current.add(event.code);
        syncMovement();
        event.preventDefault();
      }
    };
    const up = (event: KeyboardEvent) => {
      heldKeys.current.delete(event.code);
      syncMovement();
    };
    const modalObserver = new MutationObserver(() => {
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) clearInputs();
    });
    modalObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-modal'] });
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clearInputs);
    document.addEventListener('visibilitychange', clearInputs);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clearInputs);
      document.removeEventListener('visibilitychange', clearInputs);
      modalObserver.disconnect();
    };
  }, []);

  const start = () => {
    gameRef.current = {
      status: 'PLAY',
      elapsed: 0,
      z: 0.9,
      x: 0,
      hearts: 3,
      furthest: 0.9,
      tiles: newTiles(),
      rocks: newRocks(),
      trees: newTrees(),
      nextRock: 0,
      spawnTimer: 1.4,
      invincibleUntil: 0,
      finished: false,
      shake: 0,
      cause: null,
    };
    inputRef.current = { forward: 0, strafe: 0, jump: false };
    heldKeys.current.clear();
    joystickRef.current = { x: 0, y: 0 };
    setStatus('PLAY');
    setHearts(3);
    setProgress(0);
    setInvincible(false);
    setResult(null);
    playSound('levelStart');
    updateSideNarrator?.(
      'Tanahnya rapuh! Tahan LARI untuk menanjak ke dataran tinggi yang aman. Geser kiri-kanan untuk menghindari batu yang jatuh dari atas.',
      false,
      'warning'
    );
  };

  const finish = (survived: boolean, finalHearts: number, distance: number, cause: 'fall' | 'rock' | null) => {
    const score = survived
      ? Math.max(60, 100 - (3 - finalHearts) * 12)
      : Math.max(10, Math.round((distance / 100) * 45));
    const detail: LandslideDetail = {
      survived,
      heartsRemaining: finalHearts,
      distance,
      cause,
    };
    setResult({ score, detail });
    setStatus('RESULT');
    setHearts(finalHearts);
    setProgress(distance);
    playSound(survived ? 'success' : 'error');
    updateSideNarrator?.(
      survived
        ? finalHearts === 3
          ? 'Sempurna! Kamu terus bergerak dan lolos tanpa terkena batu sama sekali.'
          : 'Hebat! Kamu sampai di bukit aman. Terus bergerak adalah kunci selamat dari longsor.'
        : cause === 'rock'
          ? 'Kamu tertimpa batuan longsor. Lihat bayangan batu, lalu geser untuk menghindar!'
          : 'Tanah runtuh sebelum kamu lewat. Saat longsor, jangan berhenti — terus lari ke tanah stabil!',
      false,
      survived ? 'success' : 'error'
    );
  };

  return (
    <MissionPanel accent="border-b-stone-500">
      <MissionScene
        hud={
          <>
            <div className="flex flex-wrap items-center gap-2">
              <HudChip tone={status === 'PLAY' ? 'amber' : 'stone'} pulse={status === 'PLAY'}>
                ⛰️ {progress}% menuju bukit aman
              </HudChip>
              <HudChip tone="red">🪨 {3 - hearts} kali tertimpa</HudChip>
            </div>
            <HealthBar value={(hearts / 3) * 100} label={`${hearts} nyawa`} />
          </>
        }
        controls={
          <div className="flex items-end justify-between gap-2">
            <div className="flex items-center gap-2">
              <TouchJoystick valueRef={joystickRef} label="GESER" />
              <div className="hidden text-[11px] font-bold text-white/70 sm:block">
                <span className="rounded bg-white/15 px-1.5 py-0.5">W / ↑</span> lari •{' '}
                <span className="rounded bg-white/15 px-1.5 py-0.5">A / D</span> geser
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ActionButton
                tone="sky"
                active={status === 'PLAY'}
                onClick={() => { inputRef.current.jump = true; }}
                className="min-w-[90px]"
              >
                ⤴ LOMPAT
              </ActionButton>
              <ActionButton
                tone="emerald"
                active={status === 'PLAY'}
                onPointerDown={() => {
                  inputRef.current.forward = 1;
                }}
                onPointerUp={() => {
                  inputRef.current.forward = 0;
                }}
                className="min-w-[132px]"
              >
                🏃 LARI
              </ActionButton>
            </div>
          </div>
        }
        overlay={
          status === 'READY' ? (
            <StartOverlay
              emoji="⛰️"
              tone="stone"
              title="Lari dari Longsor!"
              description={
                <>
                  Lereng sedang longsor! <b>Tahan tombol LARI</b> untuk menanjak ke dataran tinggi yang aman.
                  Tanah yang kamu pijak akan retak lalu runtuh. Geser <b>kiri-kanan</b> untuk
                  menghindari batu dan tanah yang gugur dari atas. Kena <b>3 kali</b> = gagal!
                </>
              }
              buttonLabel="MULAI EVAKUASI"
              onStart={start}
            />
          ) : status === 'RESULT' && result ? (
            <ResultOverlay
              survived={result.detail.survived}
              title={
                result.detail.survived
                  ? 'Sampai di Bukit Aman!'
                  : result.detail.cause === 'rock'
                    ? 'Tertimpa Batuan Longsor!'
                    : 'Terjatuh Bersama Longsoran!'
              }
              message={
                result.detail.survived
                  ? 'Kamu terus bergerak tanpa berhenti. Saat longsor, jangan menunggu — lari ke samping menjauhi lereng!'
                  : result.detail.cause === 'rock'
                    ? 'Perhatikan bayangan batu di tanah, lalu geser ke jalur yang kosong.'
                    : 'Jangan berhenti di tanah rapuh. Terus lari menuju tanah yang stabil dan lebih tinggi.'
              }
              stars={result.detail.survived ? (result.detail.heartsRemaining === 3 ? 3 : result.detail.heartsRemaining === 2 ? 2 : 1) : 0}
              score={result.score}
              stats={[
                { label: 'Jarak', value: `${result.detail.distance}%` },
                { label: 'Nyawa', value: `${result.detail.heartsRemaining}/3` },
                { label: 'Penyebab', value: result.detail.cause === 'rock' ? 'Batu' : result.detail.cause === 'fall' ? 'Tanah runtuh' : 'Selamat' },
              ]}
              onReplay={onReplay}
              onContinue={() => onComplete(result.score, result.detail)}
              continueLabel="Lanjut ke Kuis"
            />
          ) : null
        }
      >
        <MissionCanvas
          background="#5a6b80"
          fog={{ color: '#5a6b80', near: 20, far: 64 }}
          camera={{ position: [0, 5.4, -6.4], fov: 60 }}
        >
          <LandslideScene
            avatar={avatar}
            teamName={teamName}
            inputRef={inputRef}
            joystickRef={joystickRef}
            gameRef={gameRef}
            playSound={playSound}
            onSync={(snapshot) => {
              setHearts(snapshot.hearts);
              setProgress(snapshot.progress);
              setInvincible(snapshot.invincible);
            }}
            onFinish={finish}
          />
        </MissionCanvas>
      </MissionScene>

      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 px-4 py-3 text-xs text-white/70">
        <span>
          <b className="text-white">Misi:</b> capai bukit aman. Jangan berhenti di tanah yang retak.
        </span>
        <div className="h-2 w-36 overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </MissionPanel>
  );
};

export default LandslideMission3D;
