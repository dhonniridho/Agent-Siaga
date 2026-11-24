import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  BASE_CAMP,
  FLOWER_SPOTS,
  ROCKS,
  TRAILS,
  TREES,
  WORLD_BOUNDS,
  type RockSpot,
  type TreeSpot,
} from './worldConfig';
import {
  useDirtTexture,
  useGrassTexture,
  useSignTexture,
  useWoodTexture,
} from './worldTextures';

/* ------------------------------------------------------------------ */
/* Pohon                                                               */
/* ------------------------------------------------------------------ */

const Tree: React.FC<{ spot: TreeSpot; index: number }> = ({ spot, index }) => {
  const { x, z, scale, variant } = spot;
  const rotation = ((index * 97) % 360) * (Math.PI / 180);

  return (
    <group position={[x, 0, z]} scale={[scale, scale, scale]} rotation-y={rotation}>
      {/* Bayangan lembut */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.03, 0]}>
        <circleGeometry args={[1.05, 14]} />
        <meshBasicMaterial color="#1f3a1a" transparent opacity={0.18} depthWrite={false} />
      </mesh>

      {variant === 'pine' && (
        <>
          <mesh position={[0, 1.15, 0]}>
            <cylinderGeometry args={[0.16, 0.26, 2.3, 7]} />
            <meshStandardMaterial color="#6d4522" roughness={1} />
          </mesh>
          <mesh position={[0, 2.5, 0]}>
            <coneGeometry args={[1.45, 2.6, 8]} />
            <meshStandardMaterial color="#2c6e3f" roughness={1} flatShading />
          </mesh>
          <mesh position={[0, 3.55, 0]}>
            <coneGeometry args={[1.1, 2.1, 8]} />
            <meshStandardMaterial color="#357f49" roughness={1} flatShading />
          </mesh>
          <mesh position={[0, 4.45, 0]}>
            <coneGeometry args={[0.72, 1.5, 8]} />
            <meshStandardMaterial color="#429455" roughness={1} flatShading />
          </mesh>
        </>
      )}

      {variant === 'oak' && (
        <>
          <mesh position={[0, 1.2, 0]}>
            <cylinderGeometry args={[0.19, 0.32, 2.4, 7]} />
            <meshStandardMaterial color="#6d4522" roughness={1} />
          </mesh>
          <mesh position={[0, 2.75, 0]}>
            <sphereGeometry args={[1.4, 10, 8]} />
            <meshStandardMaterial color="#3f8a45" roughness={1} flatShading />
          </mesh>
          <mesh position={[0.7, 2.35, 0.25]}>
            <sphereGeometry args={[0.95, 9, 7]} />
            <meshStandardMaterial color="#4b9c52" roughness={1} flatShading />
          </mesh>
          <mesh position={[-0.65, 2.4, -0.2]}>
            <sphereGeometry args={[0.9, 9, 7]} />
            <meshStandardMaterial color="#367a3d" roughness={1} flatShading />
          </mesh>
          <mesh position={[0.1, 3.25, 0.05]}>
            <sphereGeometry args={[0.85, 9, 7]} />
            <meshStandardMaterial color="#58a95e" roughness={1} flatShading />
          </mesh>
        </>
      )}

      {variant === 'birch' && (
        <>
          <mesh position={[0, 1.4, 0]}>
            <cylinderGeometry args={[0.14, 0.22, 2.8, 7]} />
            <meshStandardMaterial color="#e8e2d4" roughness={0.9} />
          </mesh>
          {[0.6, 1.35, 2.1].map((y) => (
            <mesh key={y} position={[0, y, 0]}>
              <cylinderGeometry args={[0.155, 0.19, 0.12, 7]} />
              <meshStandardMaterial color="#5b4a3a" roughness={1} />
            </mesh>
          ))}
          <mesh position={[0, 3.05, 0]}>
            <sphereGeometry args={[1.2, 9, 7]} />
            <meshStandardMaterial color="#6faf57" roughness={1} flatShading />
          </mesh>
          <mesh position={[0.55, 3.5, 0.15]}>
            <sphereGeometry args={[0.8, 8, 6]} />
            <meshStandardMaterial color="#82c066" roughness={1} flatShading />
          </mesh>
        </>
      )}
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Semak, bunga, batu                                                  */
/* ------------------------------------------------------------------ */

const Bush: React.FC<{ position: [number, number, number]; scale?: number; tint?: string }> = ({
  position,
  scale = 1,
  tint = '#3f7d3f',
}) => (
  <group position={position} scale={[scale, scale, scale]}>
    <mesh position={[0, 0.36, 0]}>
      <sphereGeometry args={[0.62, 8, 6]} />
      <meshStandardMaterial color={tint} roughness={1} flatShading />
    </mesh>
    <mesh position={[0.42, 0.28, 0.18]}>
      <sphereGeometry args={[0.42, 8, 6]} />
      <meshStandardMaterial color="#4d9150" roughness={1} flatShading />
    </mesh>
    <mesh position={[-0.38, 0.25, -0.14]}>
      <sphereGeometry args={[0.38, 8, 6]} />
      <meshStandardMaterial color="#356d38" roughness={1} flatShading />
    </mesh>
  </group>
);

const FlowerPatch: React.FC<{ x: number; z: number; color: string; index: number }> = ({
  x,
  z,
  color,
  index,
}) => {
  const offsets = useMemo(
    () => [
      [0, 0],
      [0.28, 0.12],
      [-0.24, 0.18],
      [0.1, -0.22],
    ],
    []
  );
  return (
    <group position={[x, 0, z]}>
      {offsets.map(([dx, dz], offsetIndex) => (
        <group key={offsetIndex} position={[dx, 0, dz]}>
          <mesh position={[0, 0.14, 0]}>
            <cylinderGeometry args={[0.018, 0.022, 0.28, 4]} />
            <meshStandardMaterial color="#3f7d3f" roughness={1} />
          </mesh>
          <mesh position={[0, 0.3, 0]} scale={0.7 + ((index + offsetIndex) % 3) * 0.12}>
            <sphereGeometry args={[0.1, 6, 5]} />
            <meshStandardMaterial color={color} roughness={0.8} emissive={color} emissiveIntensity={0.12} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

const RockFormation: React.FC<{ spot: RockSpot; index: number }> = ({ spot, index }) => (
  <group position={[spot.x, 0, spot.z]} rotation-y={spot.rotation}>
    <mesh position={[0, spot.scale * 0.45, 0]} scale={spot.scale} castShadow>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial
        color={index % 2 === 0 ? '#8d8577' : '#9a9284'}
        roughness={1}
        flatShading
      />
    </mesh>
    <mesh position={[spot.scale * 0.75, spot.scale * 0.18, spot.scale * 0.3]} scale={spot.scale * 0.38}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#7d7568" roughness={1} flatShading />
    </mesh>
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.025, 0]}>
      <circleGeometry args={[spot.scale * 0.95, 14]} />
      <meshBasicMaterial color="#20351c" transparent opacity={0.16} depthWrite={false} />
    </mesh>
  </group>
);

/* ------------------------------------------------------------------ */
/* Rumput instanced                                                    */
/* ------------------------------------------------------------------ */

const GRASS_COUNT = 180;

const GrassField: React.FC = () => {
  const mesh = useRef<THREE.InstancedMesh>(null);

  const matrices = useMemo(() => {
    const result: THREE.Matrix4[] = [];
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i < GRASS_COUNT; i += 1) {
      const angle = (i * 2.399963) % (Math.PI * 2);
      const radius = 6 + ((i * 37) % 23);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius + 3;
      if (Math.abs(x) > WORLD_BOUNDS.maxX - 2 || Math.abs(z) > WORLD_BOUNDS.maxZ - 2) continue;
      // Jangan menutupi jalur utama.
      if (Math.abs(x) < 2.3 && z > 4 && z < 24) continue;
      position.set(x, 0.16, z);
      quaternion.setFromAxisAngle(up, (i * 1.7) % (Math.PI * 2));
      const height = 0.7 + ((i * 13) % 5) * 0.08;
      scale.set(0.75 + ((i * 7) % 4) * 0.12, height, 0.75);
      result.push(new THREE.Matrix4().compose(position, quaternion, scale));
    }
    return result;
  }, []);

  useEffect(() => {
    if (!mesh.current) return;
    matrices.forEach((matrix, index) => mesh.current!.setMatrixAt(index, matrix));
    mesh.current.count = matrices.length;
    mesh.current.instanceMatrix.needsUpdate = true;
  }, [matrices]);

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, GRASS_COUNT]} frustumCulled={false}>
      <coneGeometry args={[0.075, 0.34, 4]} />
      <meshStandardMaterial color="#67a64e" roughness={1} side={THREE.DoubleSide} />
    </instancedMesh>
  );
};

/* ------------------------------------------------------------------ */
/* Awan & burung                                                       */
/* ------------------------------------------------------------------ */

const Clouds: React.FC = () => {
  const group = useRef<THREE.Group>(null);
  const clusters = useMemo(
    () => [
      { x: -22, y: 18, z: -20, s: 1.4 },
      { x: 8, y: 22, z: -38, s: 1.9 },
      { x: 26, y: 16, z: 6, s: 1.15 },
      { x: -28, y: 20, z: 22, s: 1.35 },
      { x: 2, y: 17, z: 36, s: 1.2 },
    ],
    []
  );

  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.position.x += delta * 0.55;
    if (group.current.position.x > 24) group.current.position.x = -24;
  });

  return (
    <group ref={group}>
      {clusters.map((cloud, index) => (
        <group key={index} position={[cloud.x, cloud.y, cloud.z]} scale={cloud.s}>
          <mesh>
            <sphereGeometry args={[2.5, 10, 7]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.9} depthWrite={false} />
          </mesh>
          <mesh position={[2.2, -0.25, 0.3]}>
            <sphereGeometry args={[1.75, 10, 7]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.85} depthWrite={false} />
          </mesh>
          <mesh position={[-2.1, -0.35, -0.2]}>
            <sphereGeometry args={[1.55, 10, 7]} />
            <meshBasicMaterial color="#f8fbff" transparent opacity={0.82} depthWrite={false} />
          </mesh>
          <mesh position={[0.4, 0.75, -0.4]}>
            <sphereGeometry args={[1.35, 9, 7]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.88} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

const Birds: React.FC = () => {
  const flock = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (flock.current) flock.current.rotation.y += delta * 0.08;
  });
  const birds = useMemo(
    () => [
      { x: 10, y: 15, z: -12, s: 1 },
      { x: 13, y: 16.5, z: -8, s: 0.8 },
      { x: 7, y: 17, z: -6, s: 0.9 },
    ],
    []
  );
  return (
    <group ref={flock} position={[0, 0, 2]}>
      {birds.map((bird, index) => (
        <group key={index} position={[bird.x, bird.y, bird.z]} scale={bird.s} rotation-y={index * 1.7}>
          <mesh rotation-z={0.45}>
            <boxGeometry args={[1, 0.05, 0.12]} />
            <meshBasicMaterial color="#3f3f46" />
          </mesh>
          <mesh rotation-z={-0.45}>
            <boxGeometry args={[1, 0.05, 0.12]} />
            <meshBasicMaterial color="#3f3f46" />
          </mesh>
        </group>
      ))}
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Pegunungan latar                                                    */
/* ------------------------------------------------------------------ */

const DistantMountains: React.FC = () => {
  const mountains = useMemo(
    () => [
      { angle: 0.2, radius: 62, height: 24, width: 17 },
      { angle: 0.85, radius: 70, height: 29, width: 21 },
      { angle: 1.6, radius: 60, height: 20, width: 15 },
      { angle: 2.35, radius: 68, height: 27, width: 19 },
      { angle: 3.1, radius: 64, height: 22, width: 16 },
      { angle: 3.9, radius: 72, height: 30, width: 22 },
      { angle: 4.6, radius: 61, height: 21, width: 15 },
      { angle: 5.35, radius: 69, height: 26, width: 18 },
      { angle: 5.95, radius: 58, height: 18, width: 14 },
    ],
    []
  );

  return (
    <group>
      {mountains.map((mountain, index) => {
        const x = Math.sin(mountain.angle) * mountain.radius;
        const z = Math.cos(mountain.angle) * mountain.radius;
        return (
          <group key={index} position={[x, 0, z]}>
            <mesh position={[0, mountain.height / 2, 0]}>
              <coneGeometry args={[mountain.width, mountain.height, 7]} />
              <meshStandardMaterial
                color={index % 2 === 0 ? '#6d8276' : '#788b7f'}
                roughness={1}
                flatShading
              />
            </mesh>
            <mesh position={[0, mountain.height * 0.85, 0]}>
              <coneGeometry args={[mountain.width * 0.3, mountain.height * 0.3, 7]} />
              <meshStandardMaterial color="#e8eef2" roughness={0.95} flatShading />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Base camp                                                           */
/* ------------------------------------------------------------------ */

const Campfire: React.FC = () => {
  const flame = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const smoke = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (flame.current) {
      const pulse = 0.9 + Math.sin(t * 9.1) * 0.12 + Math.sin(t * 13.7) * 0.06;
      flame.current.scale.set(pulse, 1 + Math.sin(t * 7.3) * 0.14, pulse);
      flame.current.rotation.y = t * 1.4;
    }
    if (light.current) {
      light.current.intensity = 12 + Math.sin(t * 8.5) * 3 + Math.sin(t * 15) * 2;
    }
    if (smoke.current) {
      smoke.current.children.forEach((child, index) => {
        const phase = ((t * 0.18 + index * 0.3) % 1 + 1) % 1;
        child.position.y = 1.2 + phase * 3.2;
        child.position.x = Math.sin(t * 0.5 + index) * 0.35;
        child.scale.setScalar(0.25 + phase * 0.55);
        const material = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
        material.opacity = (1 - phase) * 0.22;
      });
    }
  });

  return (
    <group position={[BASE_CAMP.fire.x, 0, BASE_CAMP.fire.z]}>
      {[0, 1, 2, 3, 4, 5, 6].map((stone) => {
        const angle = (stone / 7) * Math.PI * 2;
        return (
          <mesh key={stone} position={[Math.cos(angle) * 0.72, 0.12, Math.sin(angle) * 0.72]} scale={0.19}>
            <dodecahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color="#8b8377" roughness={1} flatShading />
          </mesh>
        );
      })}
      {[0.3, 1.35, 2.4].map((rotation) => (
        <mesh key={rotation} position={[0, 0.28, 0]} rotation={[0.12, rotation, Math.PI / 2 - 0.08]}>
          <cylinderGeometry args={[0.09, 0.11, 1.5, 6]} />
          <meshStandardMaterial color="#5f4024" roughness={1} />
        </mesh>
      ))}

      <group ref={flame} position={[0, 0.55, 0]}>
        <mesh position={[0, 0.35, 0]}>
          <coneGeometry args={[0.4, 1.05, 8]} />
          <meshStandardMaterial
            color="#f97316"
            emissive="#ea580c"
            emissiveIntensity={2.1}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[0, 0.22, 0]}>
          <coneGeometry args={[0.24, 0.75, 8]} />
          <meshStandardMaterial
            color="#fde047"
            emissive="#facc15"
            emissiveIntensity={2.3}
            toneMapped={false}
          />
        </mesh>
      </group>

      <group ref={smoke}>
        {Array.from({ length: 5 }, (_, index) => (
          <mesh key={index} position={[0, 1.2 + index * 0.7, 0]}>
            <sphereGeometry args={[0.45, 6, 5]} />
            <meshBasicMaterial color="#cbd5e1" transparent opacity={0.18} depthWrite={false} />
          </mesh>
        ))}
      </group>

      <pointLight ref={light} position={[0, 1.4, 0]} color="#ff9d4d" intensity={12} distance={10} decay={2} />
    </group>
  );
};

const BaseCamp: React.FC = () => {
  const sign = useSignTexture();
  const wood = useWoodTexture(1, 1);

  return (
    <group>
      {/* Papan petunjuk */}
      <group position={[BASE_CAMP.sign.x, 0, BASE_CAMP.sign.z]} rotation-y={0.16}>
        {[-1.35, 1.35].map((x) => (
          <mesh key={x} position={[x, 1.2, 0]}>
            <cylinderGeometry args={[0.09, 0.12, 2.4, 7]} />
            <meshStandardMaterial color="#6b4a2e" roughness={1} map={wood} />
          </mesh>
        ))}
        <mesh position={[0, 2.05, 0.06]}>
          <planeGeometry args={[3.5, 1.09]} />
          <meshBasicMaterial map={sign} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.04, 0]}>
          <boxGeometry args={[3.1, 0.08, 0.6]} />
          <meshStandardMaterial color="#8d8577" roughness={1} />
        </mesh>
      </group>

      {/* Tenda */}
      <group position={[BASE_CAMP.tent.x, 0, BASE_CAMP.tent.z]}>
        <mesh position={[0, 1.15, 0]} rotation-y={Math.PI / 4}>
          <coneGeometry args={[2.2, 2.3, 4]} />
          <meshStandardMaterial color="#d97706" roughness={0.85} flatShading />
        </mesh>
        <mesh position={[0, 1.15, 0.02]} rotation-y={Math.PI / 4} scale={[0.94, 0.94, 0.94]}>
          <coneGeometry args={[2.2, 2.3, 4, 1, true]} />
          <meshStandardMaterial color="#f59e0b" roughness={0.9} side={THREE.DoubleSide} flatShading />
        </mesh>
        <mesh position={[0, 0.62, 1.28]} rotation-x={-0.18}>
          <planeGeometry args={[0.85, 1.35]} />
          <meshStandardMaterial color="#7c3a10" roughness={0.95} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 2.38, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.9, 6]} />
          <meshStandardMaterial color="#475569" />
        </mesh>
        <mesh position={[0.3, 2.72, 0]}>
          <planeGeometry args={[0.6, 0.32]} />
          <meshBasicMaterial color="#fbbf24" side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Peti & tong */}
      <group position={[BASE_CAMP.crate.x, 0, BASE_CAMP.crate.z]} rotation-y={-0.35}>
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[1.1, 1, 1.1]} />
          <meshStandardMaterial color="#a16207" roughness={0.85} map={wood} />
        </mesh>
        <mesh position={[0, 1.08, 0]}>
          <boxGeometry args={[1.2, 0.16, 1.2]} />
          <meshStandardMaterial color="#7c4a21" roughness={0.9} />
        </mesh>
        <mesh position={[1.1, 0.4, 0.25]}>
          <cylinderGeometry args={[0.38, 0.42, 0.8, 10]} />
          <meshStandardMaterial color="#8b5a2b" roughness={0.9} map={wood} />
        </mesh>
      </group>

      {/* Bangku kayu */}
      {[
        [1.8, 16.6, 0.3],
        [-1.2, 18.4, -0.6],
      ].map(([x, z, rotation], index) => (
        <group key={index} position={[x, 0, z]} rotation-y={rotation}>
          <mesh position={[0, 0.42, 0]} rotation-z={Math.PI / 2}>
            <cylinderGeometry args={[0.22, 0.22, 1.9, 8]} />
            <meshStandardMaterial color="#7c4a21" roughness={1} map={wood} />
          </mesh>
          {[-0.65, 0.65].map((offset) => (
            <mesh key={offset} position={[offset, 0.21, 0]}>
              <boxGeometry args={[0.18, 0.42, 0.5]} />
              <meshStandardMaterial color="#5c3f24" roughness={1} />
            </mesh>
          ))}
        </group>
      ))}

      <Campfire />
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Partikel serbuk sari                                                */
/* ------------------------------------------------------------------ */

const Pollen: React.FC = () => {
  const points = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const array = new Float32Array(90 * 3);
    for (let i = 0; i < 90; i += 1) {
      array[i * 3] = (Math.random() - 0.5) * 46;
      array[i * 3 + 1] = 1 + Math.random() * 8;
      array[i * 3 + 2] = (Math.random() - 0.5) * 46 + 2;
    }
    return array;
  }, []);

  useFrame((state) => {
    if (!points.current) return;
    const attribute = points.current.geometry.getAttribute('position') as THREE.BufferAttribute;
    const array = attribute.array as Float32Array;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < array.length; i += 3) {
      array[i] += Math.sin(t * 0.4 + i) * 0.0025;
      array[i + 1] += 0.004;
      if (array[i + 1] > 10) array[i + 1] = 1;
    }
    attribute.needsUpdate = true;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#fff7cc"
        size={0.09}
        transparent
        opacity={0.6}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

/* ------------------------------------------------------------------ */
/* Lingkungan alam utama                                               */
/* ------------------------------------------------------------------ */

export const NatureEnvironment: React.FC = () => {
  const grass = useGrassTexture();
  const dirt = useDirtTexture(1, 2);

  return (
    <group>
      {/* Padang rumput */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[82, 82]} />
        <meshStandardMaterial map={grass} color="#ffffff" roughness={0.95} />
      </mesh>

      {/* Area tengah yang lebih terang */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.012, 4]}>
        <circleGeometry args={[10.5, 40]} />
        <meshStandardMaterial color="#8cc767" roughness={0.95} transparent opacity={0.65} />
      </mesh>

      {/* Jalur tanah */}
      {TRAILS.map((trail, index) => (
        <mesh
          key={index}
          rotation-x={-Math.PI / 2}
          rotation-z={trail.rotation}
          position={[trail.x, 0.022, trail.z]}
        >
          <planeGeometry args={[trail.width, trail.length]} />
          <meshStandardMaterial map={dirt} color="#e0c193" roughness={0.98} transparent opacity={0.95} />
        </mesh>
      ))}

      {/* Bukit latar yang lembut */}
      {[
        [-34, -18, 10, 0.55],
        [34, -22, 12, 0.5],
        [-35, 16, 9, 0.45],
        [35, 18, 11, 0.55],
        [-20, -35, 13, 0.6],
        [22, -34, 11, 0.5],
        [-14, 35, 12, 0.55],
        [18, 36, 10, 0.5],
      ].map(([x, z, radius, height], index) => (
        <mesh key={index} position={[x, 0.4, z]} scale={[1.15, height, 1.15]}>
          <sphereGeometry args={[radius, 14, 10]} />
          <meshStandardMaterial
            color={index % 2 === 0 ? '#4f7c43' : '#5c8b4b'}
            roughness={1}
            flatShading
          />
        </mesh>
      ))}

      <DistantMountains />
      <Clouds />
      <Birds />

      {/* Pepohonan */}
      {TREES.map((tree, index) => (
        <Tree key={`${tree.x}-${tree.z}`} spot={tree} index={index} />
      ))}

      {/* Batu */}
      {ROCKS.map((rock, index) => (
        <RockFormation key={`${rock.x}-${rock.z}`} spot={rock} index={index} />
      ))}

      {/* Semak */}
      {[
        [-17, -4, 1.1],
        [-26, 13, 0.95],
        [18, 4, 1.05],
        [24, -13, 0.9],
        [-13, 21, 1],
        [6, 14, 0.8],
        [-7, 8, 0.7],
        [12, -5, 0.85],
        [-20, 8, 1],
        [19, 16, 0.9],
        [-2, 22, 0.75],
        [14, 24, 0.8],
      ].map(([x, z, scale], index) => (
        <Bush key={index} position={[x, 0, z]} scale={scale} tint={index % 2 === 0 ? '#3f7d3f' : '#4a8a45'} />
      ))}

      {/* Bunga */}
      {FLOWER_SPOTS.map((flower, index) => (
        <FlowerPatch key={`${flower.x}-${flower.z}`} x={flower.x} z={flower.z} color={flower.color} index={index} />
      ))}

      <GrassField />
      <Pollen />
      <BaseCamp />
    </group>
  );
};
