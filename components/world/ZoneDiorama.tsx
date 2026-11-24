import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { DisasterType } from '../../types';
import { useDirtTexture, useWaterTexture, useWoodTexture } from './worldTextures';

interface ZoneDioramaProps {
  zoneId: DisasterType;
  completed: boolean;
}

/**
 * Formasi alam 3D di setiap titik misi. Masing-masing zona punya
 * visualisasi bencananya sendiri, lengkap dengan animasi ringan.
 * Semua elemen berada di belakang penanda (z negatif lokal).
 */
export const ZoneDiorama: React.FC<ZoneDioramaProps> = ({ zoneId, completed }) => {
  if (zoneId === 'VOLCANO') return <VolcanoDiorama completed={completed} />;
  if (zoneId === 'FLOOD') return <FloodDiorama completed={completed} />;
  if (zoneId === 'LANDSLIDE') return <LandslideDiorama completed={completed} />;
  return <EarthquakeDiorama completed={completed} />;
};

/* ------------------------------------------------------------------ */
/* Bantuan kecil                                                       */
/* ------------------------------------------------------------------ */

const ROCK_COLORS = ['#8f8577', '#7a7166', '#a39a8a', '#6b6257'];

const Rock: React.FC<{
  position: [number, number, number];
  scale: number | [number, number, number];
  color?: string;
  rotation?: [number, number, number];
}> = ({ position, scale, color = ROCK_COLORS[0], rotation = [0, 0, 0] }) => (
  <mesh position={position} scale={scale} rotation={rotation} castShadow>
    <dodecahedronGeometry args={[1, 0]} />
    <meshStandardMaterial color={color} roughness={1} flatShading />
  </mesh>
);

const DeadTree: React.FC<{ position: [number, number, number]; rotation?: number; scale?: number }> = ({
  position,
  rotation = 0,
  scale = 1,
}) => (
  <group position={position} rotation-y={rotation} scale={scale}>
    <mesh position={[0, 1.5, 0]} rotation-z={0.08}>
      <cylinderGeometry args={[0.08, 0.24, 3, 6]} />
      <meshStandardMaterial color="#4b3626" roughness={1} />
    </mesh>
    {[
      { y: 1.9, z: 0.42, rz: 0.7 },
      { y: 2.5, z: -0.34, rz: -0.8 },
      { y: 2.85, z: 0.26, rz: 0.6 },
    ].map((branch, index) => (
      <mesh
        key={index}
        position={[0, branch.y, branch.z]}
        rotation-z={branch.rz}
      >
        <cylinderGeometry args={[0.03, 0.07, 0.9, 5]} />
        <meshStandardMaterial color="#4b3626" roughness={1} />
      </mesh>
    ))}
  </group>
);

/* ------------------------------------------------------------------ */
/* 1. Gunung Meletus                                                   */
/* ------------------------------------------------------------------ */

const VolcanoDiorama: React.FC<{ completed: boolean }> = ({ completed }) => {
  const smoke = useRef<THREE.Group>(null);
  const embers = useRef<THREE.Group>(null);
  const lava = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);

  const lavaCurve = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.1, 7.6, -7),
      new THREE.Vector3(0.9, 5.7, -5.6),
      new THREE.Vector3(-0.5, 3.5, -4.4),
      new THREE.Vector3(0.4, 1.5, -3.1),
      new THREE.Vector3(0, 0.16, -2.5),
    ]);
    return curve;
  }, []);

  const lavaGeometry = useMemo(
    () => new THREE.TubeGeometry(lavaCurve, 36, 0.28, 8, false),
    [lavaCurve]
  );
  const glowGeometry = useMemo(
    () => new THREE.TubeGeometry(lavaCurve, 36, 0.55, 8, false),
    [lavaCurve]
  );

  useEffect(
    () => () => {
      lavaGeometry.dispose();
      glowGeometry.dispose();
    },
    [lavaGeometry, glowGeometry]
  );

  const emberData = useMemo(
    () =>
      Array.from({ length: 18 }, (_, index) => ({
        phase: index * 0.73,
        radius: 0.25 + (index % 6) * 0.28,
        speed: 1.2 + (index % 5) * 0.35,
        spin: index * 2.1,
      })),
    []
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    if (smoke.current) {
      smoke.current.children.forEach((child, index) => {
        const cycle = ((t * 0.22 + index / smoke.current!.children.length) % 1 + 1) % 1;
        child.position.y = 7.8 + cycle * 9;
        child.position.x = Math.sin(t * 0.6 + index * 1.4) * (0.5 + cycle * 1.8);
        child.position.z = -7 + Math.cos(t * 0.5 + index * 1.9) * (0.4 + cycle * 1.4);
        const size = 0.75 + cycle * 1.9;
        child.scale.setScalar(size);
        const material = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
        material.opacity = 0.38 * (1 - cycle);
      });
    }

    if (embers.current) {
      embers.current.children.forEach((child, index) => {
        const data = emberData[index];
        const cycle = ((t * data.speed * 0.18 + data.phase) % 1 + 1) % 1;
        child.position.set(
          Math.sin(data.spin + t * 1.3) * data.radius * (0.5 + cycle * 2.2),
          7.5 + cycle * 7.5,
          -7 + Math.cos(data.spin + t * 1.1) * data.radius * (0.4 + cycle * 1.8)
        );
        const scale = Math.max(0.02, 0.16 * (1 - cycle) + 0.04);
        child.scale.setScalar(scale);
      });
    }

    if (lava.current) {
      lava.current.position.y = Math.sin(t * 2.2) * 0.03;
    }
    if (light.current) {
      light.current.intensity = completed ? 4 : 10 + Math.sin(t * 5) * 2.5;
    }
  });

  return (
    <group>
      {/* Tanah vulkanik */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.028, -6.4]}>
        <circleGeometry args={[7.2, 36]} />
        <meshStandardMaterial color="#3f332c" roughness={1} />
      </mesh>

      {/* Kerucut gunung berlapis */}
      <mesh position={[0, 3.4, -7]} castShadow>
        <coneGeometry args={[6.2, 7, 9]} />
        <meshStandardMaterial color="#5b4a42" roughness={1} flatShading />
      </mesh>
      <mesh position={[0, 6.2, -7]} castShadow>
        <coneGeometry args={[3.5, 3.4, 9]} />
        <meshStandardMaterial color="#6c5347" roughness={1} flatShading />
      </mesh>

      {/* Kawah */}
      <mesh position={[0, 7.62, -7]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.9, 1.55, 18]} />
        <meshStandardMaterial color="#2a1a14" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 7.55, -7]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.92, 18]} />
        <meshStandardMaterial
          color="#ff7a18"
          emissive="#ff4d00"
          emissiveIntensity={completed ? 0.8 : 2.4}
          toneMapped={false}
        />
      </mesh>

      {/* Aliran lava */}
      <group ref={lava}>
        <mesh geometry={glowGeometry}>
          <meshBasicMaterial
            color="#ff7a18"
            transparent
            opacity={0.28}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        <mesh geometry={lavaGeometry}>
          <meshStandardMaterial
            color="#ff9a2e"
            emissive="#ff3d00"
            emissiveIntensity={completed ? 0.9 : 1.9}
            roughness={0.35}
            toneMapped={false}
          />
        </mesh>
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.1, -2.4]}>
          <circleGeometry args={[1.35, 20]} />
          <meshStandardMaterial
            color="#ff8a1f"
            emissive="#ff4500"
            emissiveIntensity={completed ? 0.8 : 1.7}
            transparent
            opacity={0.92}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* Asap kawah */}
      <group ref={smoke}>
        {Array.from({ length: 7 }, (_, index) => (
          <mesh key={index} position={[0, 8 + index, -7]}>
            <sphereGeometry args={[1.15, 8, 7]} />
            <meshBasicMaterial color={index % 2 === 0 ? '#a8a29e' : '#78716c'} transparent opacity={0.32} depthWrite={false} />
          </mesh>
        ))}
      </group>

      {/* Percikan lava */}
      <group ref={embers}>
        {emberData.map((_, index) => (
          <mesh key={index}>
            <sphereGeometry args={[1, 5, 4]} />
            <meshStandardMaterial
              color={index % 3 === 0 ? '#fde047' : '#fb923c'}
              emissive="#ff5a00"
              emissiveIntensity={2}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>

      <pointLight ref={light} position={[0, 8.2, -6.4]} color="#ff6a00" intensity={10} distance={18} decay={2} />

      {/* Batuan vulkanik di kaki gunung */}
      {[
        [-5.4, 0.55, -4.4, 1],
        [5.1, 0.5, -4.1, 0.9],
        [4.6, 0.7, -8.8, 1.25],
        [-4.9, 0.6, -9.2, 1.05],
        [-2.5, 0.4, -2.8, 0.6],
        [2.6, 0.35, -2.6, 0.55],
        [2.1, 0.5, -11.6, 0.9],
        [-3.2, 0.45, -12.2, 0.8],
      ].map(([x, y, z, scale], index) => (
        <Rock
          key={index}
          position={[x, y, z]}
          scale={scale}
          color={index % 2 === 0 ? '#3f3631' : '#51453d'}
          rotation={[index * 0.4, index * 0.8, index * 0.2]}
        />
      ))}

      <DeadTree position={[-4.9, 0, -1.9]} rotation={0.4} scale={0.9} />
      <DeadTree position={[4.6, 0, -2.4]} rotation={-0.5} scale={0.8} />
      <DeadTree position={[5.4, 0, -11]} rotation={1.2} scale={1.05} />
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* 2. Banjir Bandang                                                   */
/* ------------------------------------------------------------------ */

const FloodDiorama: React.FC<{ completed: boolean }> = ({ completed }) => {
  const water = useWaterTexture();
  const wood = useWoodTexture(2, 1);
  const ripples = useRef<THREE.Mesh[]>([]);
  const debris = useRef<THREE.Group>(null);
  const rain = useRef<THREE.Points>(null);
  const boat = useRef<THREE.Group>(null);

  const rainPositions = useMemo(() => {
    const positions = new Float32Array(70 * 3);
    for (let i = 0; i < 70; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 1] = Math.random() * 8;
      positions[i * 3 + 2] = -6.5 + (Math.random() - 0.5) * 12;
    }
    return positions;
  }, []);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    water.offset.y = (t * 0.018) % 1;
    water.offset.x = Math.sin(t * 0.18) * 0.02;

    if (rain.current) {
      const attribute = rain.current.geometry.getAttribute('position') as THREE.BufferAttribute;
      const array = attribute.array as Float32Array;
      for (let i = 0; i < array.length; i += 3) {
        array[i + 1] -= delta * (8 + (i % 5));
        if (array[i + 1] < 0.1) {
          array[i + 1] = 7 + Math.random() * 3;
          array[i] = (Math.random() - 0.5) * 14;
          array[i + 2] = -6.5 + (Math.random() - 0.5) * 12;
        }
      }
      attribute.needsUpdate = true;
    }

    ripples.current.forEach((ring, index) => {
      if (!ring) return;
      const phase = ((t * 0.35 + index * 0.34) % 1 + 1) % 1;
      ring.scale.setScalar(0.5 + phase * 1.6);
      const material = ring.material as THREE.MeshBasicMaterial;
      material.opacity = (1 - phase) * 0.55;
    });

    if (debris.current) {
      debris.current.children.forEach((child, index) => {
        child.position.y = 0.27 + Math.sin(t * 1.7 + index * 1.8) * 0.06;
        child.rotation.y = Math.sin(t * 0.5 + index) * 0.15;
      });
    }

    if (boat.current) {
      boat.current.position.y = 0.22 + Math.sin(t * 1.3) * 0.08;
      boat.current.rotation.z = Math.sin(t * 1.1) * 0.05;
      boat.current.rotation.x = Math.cos(t * 0.9) * 0.04;
    }
  });

  return (
    <group>
      {/* Tanah basah & tepi */}
      <mesh rotation-x={-Math.PI / 2} position={[0.3, 0.02, -6.2]}>
        <circleGeometry args={[7.4, 36]} />
        <meshStandardMaterial color="#9b8255" roughness={1} />
      </mesh>

      {/* Genangan dangkal & tepi berlumpur */}
      <mesh rotation-x={-Math.PI / 2} position={[0.3, 0.06, -6.2]}>
        <circleGeometry args={[6.6, 40]} />
        <meshStandardMaterial color="#6fb7d9" transparent opacity={0.5} roughness={0.25} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0.3, 0.1, -6.2]}>
        <ringGeometry args={[6.0, 7.5, 40]} />
        <meshStandardMaterial color="#8a7047" roughness={1} side={THREE.DoubleSide} />
      </mesh>

      {/* Air utama */}
      <mesh rotation-x={-Math.PI / 2} position={[0.3, 0.18, -6.2]}>
        <circleGeometry args={[6.15, 48]} />
        <meshStandardMaterial
          map={water}
          color="#7dd3fc"
          roughness={0.18}
          metalness={0.2}
          transparent
          opacity={0.82}
        />
      </mesh>

      {/* Riak air */}
      {[
        [-2.4, -4.2, 1.1],
        [2.7, -7.4, 1.4],
        [0.4, -9.6, 1.8],
        [3.6, -3.4, 0.9],
      ].map(([x, z, scale], index) => (
        <mesh
          key={index}
          ref={(element) => {
            if (element) ripples.current[index] = element;
          }}
          rotation-x={-Math.PI / 2}
          position={[x, 0.195, z]}
          scale={scale}
        >
          <ringGeometry args={[0.6, 0.78, 24]} />
          <meshBasicMaterial color="#e0f2fe" transparent opacity={0.4} depthWrite={false} />
        </mesh>
      ))}

      {/* Hujan lokal */}
      <points ref={rain}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[rainPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#cfeaff" size={0.14} transparent opacity={0.75} depthWrite={false} />
      </points>

      {/* Rumah panggung yang terendam */}
      <group position={[3.1, 0, -8.2]} rotation-y={0.35} rotation-z={0.07}>
        {[
          [-1.2, -1],
          [1.2, -1],
          [-1.2, 1],
          [1.2, 1],
        ].map(([x, z], index) => (
          <mesh key={index} position={[x, 0.7, z]}>
            <cylinderGeometry args={[0.09, 0.11, 2.2, 6]} />
            <meshStandardMaterial color="#5c3f24" roughness={1} />
          </mesh>
        ))}
        <mesh position={[0, 1.4, 0]}>
          <boxGeometry args={[3, 1.7, 2.4]} />
          <meshStandardMaterial color="#d7b98a" roughness={0.9} map={wood} />
        </mesh>
        <mesh position={[0, 2.45, 0]} rotation-z={0.05}>
          <boxGeometry args={[3.6, 0.28, 3]} />
          <meshStandardMaterial color="#8b5a2b" roughness={0.95} />
        </mesh>
        <mesh position={[0, 2.8, 0]} rotation-z={-0.32}>
          <boxGeometry args={[3.8, 0.2, 3.2]} />
          <meshStandardMaterial color="#7c4a21" roughness={0.95} />
        </mesh>
        <mesh position={[0.3, 1.35, 1.22]}>
          <boxGeometry args={[0.85, 1.15, 0.08]} />
          <meshStandardMaterial color="#4b2f17" roughness={0.9} />
        </mesh>
        <mesh position={[-1.05, 1.55, 1.22]}>
          <boxGeometry args={[0.6, 0.55, 0.08]} />
          <meshStandardMaterial color="#8ecae6" roughness={0.35} metalness={0.15} />
        </mesh>
        <mesh position={[0, 3.02, -0.2]}>
          <boxGeometry args={[0.45, 0.7, 0.45]} />
          <meshStandardMaterial color="#6b4a2e" roughness={1} />
        </mesh>
      </group>

      {/* Pohon setengah terendam */}
      <group position={[-3.3, 0.2, -8.6]} rotation-z={0.22} rotation-y={-0.4}>
        <mesh position={[0, 1.5, 0]}>
          <cylinderGeometry args={[0.18, 0.32, 3.2, 7]} />
          <meshStandardMaterial color="#6b4a2e" roughness={1} />
        </mesh>
        {[
          [0, 3.25, 0, 1.5],
          [1, 2.75, 0.3, 1],
          [-0.9, 2.95, -0.2, 0.95],
          [0.2, 3.7, -0.5, 0.85],
        ].map(([x, y, z, scale], index) => (
          <mesh key={index} position={[x, y, z]} scale={scale}>
            <sphereGeometry args={[1, 8, 6]} />
            <meshStandardMaterial color={index % 2 === 0 ? '#2f7d46' : '#3b9353'} roughness={1} flatShading />
          </mesh>
        ))}
      </group>

      {/* Perahu penyelamat */}
      <group ref={boat} position={[-1.6, 0.48, -4.6]} rotation-y={0.5}>
        <mesh position={[0, 0.25, 0]}>
          <boxGeometry args={[2.7, 0.5, 1.15]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[2.2, 0.12, 0.8]} />
          <meshStandardMaterial color="#f97316" roughness={0.7} />
        </mesh>
        <mesh position={[-0.9, 1.1, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 1.2, 6]} />
          <meshStandardMaterial color="#475569" />
        </mesh>
        <mesh position={[-0.58, 1.42, 0]}>
          <planeGeometry args={[0.62, 0.32]} />
          <meshBasicMaterial color="#ef4444" side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Barang hanyut */}
      <group ref={debris}>
        <mesh position={[-2.6, 0.42, -6.4]} rotation-y={0.4}>
          <boxGeometry args={[0.9, 0.22, 0.4]} />
          <meshStandardMaterial color="#7c4a21" roughness={1} />
        </mesh>
        <mesh position={[1.4, 0.44, -3.8]} rotation-y={-0.6}>
          <boxGeometry args={[0.65, 0.55, 0.65]} />
          <meshStandardMaterial color="#a16207" roughness={0.9} map={wood} />
        </mesh>
        <mesh position={[4.2, 0.4, -5.2]} rotation-y={1.1}>
          <cylinderGeometry args={[0.14, 0.18, 1.6, 6]} />
          <meshStandardMaterial color="#5c3f24" roughness={1} />
        </mesh>
      </group>

      {/* Tiang penanda tinggi air */}
      <group position={[-4.6, 0, -3.4]}>
        <mesh position={[0, 1.4, 0]}>
          <cylinderGeometry args={[0.08, 0.1, 2.8, 8]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.7} />
        </mesh>
        {[1.9, 1.35, 0.8].map((y, index) => (
          <mesh key={y} position={[0, y, 0]}>
            <cylinderGeometry args={[0.105, 0.105, 0.22, 8]} />
            <meshStandardMaterial color={index % 2 === 0 ? '#ef4444' : '#f8fafc'} roughness={0.7} />
          </mesh>
        ))}
      </group>

      {/* Batu tepi air */}
      {[
        [-5.5, 0.3, -1.6, 0.55],
        [5.5, 0.3, -2.2, 0.65],
        [4.9, 0.28, -11.6, 0.7],
        [-4.6, 0.3, -12.1, 0.6],
      ].map(([x, y, z, scale], index) => (
        <Rock key={index} position={[x, y, z]} scale={scale} color="#8f8577" rotation={[0.3, index, 0.2]} />
      ))}

      {!completed && <pointLight position={[-1.6, 3.2, -4.6]} color="#f97316" intensity={4} distance={8} decay={2} />}
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* 3. Gempa Bumi                                                       */
/* ------------------------------------------------------------------ */

const EarthquakeDiorama: React.FC<{ completed: boolean }> = ({ completed }) => {
  const shake = useRef<THREE.Group>(null);
  const dust = useRef<THREE.Group>(null);
  const pebbles = useRef<THREE.Group>(null);
  const wood = useWoodTexture(1, 1);

  const cracks = useMemo(
    () =>
      Array.from({ length: 15 }, (_, index) => {
        const angle = (index / 15) * Math.PI * 2 + (index % 3) * 0.18;
        const length = 1.6 + ((index * 7) % 5) * 0.55;
        return { angle, length, width: 0.06 + (index % 4) * 0.035 };
      }),
    []
  );

  const dustData = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => ({
        x: (index % 3 - 1) * 2.1,
        z: -5.8 - (index % 2) * 1.9,
        phase: index * 0.9,
      })),
    []
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (shake.current) {
      const strength = completed ? 0.008 : 0.035;
      shake.current.position.x = Math.sin(t * 13.7) * strength;
      shake.current.position.z = Math.sin(t * 9.1 + 1.4) * strength;
      shake.current.rotation.z = Math.sin(t * 7.3) * strength * 0.25;
    }
    if (dust.current) {
      dust.current.children.forEach((child, index) => {
        const phase = ((t * 0.22 + dustData[index].phase) % 1 + 1) % 1;
        child.position.y = 0.4 + phase * 1.7;
        child.scale.setScalar(0.35 + phase * 0.75);
        const material = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
        material.opacity = (1 - phase) * 0.3;
      });
    }
    if (pebbles.current) {
      pebbles.current.children.forEach((child, index) => {
        const phase = ((t * 0.45 + index * 0.37) % 1 + 1) % 1;
        child.position.y = 4.6 - phase * 3.8;
        child.rotation.x = phase * 8;
        child.rotation.z = phase * 6;
        child.visible = phase < 0.92;
      });
    }
  });

  return (
    <group>
      {/* Tanah retak */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.028, -6.1]}>
        <circleGeometry args={[7.2, 36]} />
        <meshStandardMaterial color="#8a744f" roughness={1} />
      </mesh>

      {/* Retakan tanah */}
      {cracks.map((crack, index) => (
        <mesh
          key={index}
          rotation-x={-Math.PI / 2}
          rotation-z={crack.angle}
          position={[
            Math.cos(crack.angle) * (crack.length / 2 + 0.4),
            0.042,
            -6.1 + Math.sin(crack.angle) * (crack.length / 2 + 0.4),
          ]}
        >
          <planeGeometry args={[crack.width, crack.length]} />
          <meshBasicMaterial color="#3c2a1e" />
        </mesh>
      ))}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.045, -6.1]}>
        <planeGeometry args={[0.42, 6.4]} />
        <meshBasicMaterial color="#2f2118" />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0.9, 0.046, -5.5]} rotation-z={0.5}>
        <planeGeometry args={[0.24, 3.6]} />
        <meshBasicMaterial color="#2f2118" />
      </mesh>

      {/* Batuan besar yang retak & bergetar */}
      <group ref={shake}>
        <mesh position={[-2.2, 1.8, -6.4]} castShadow>
          <dodecahedronGeometry args={[2.4, 0]} />
          <meshStandardMaterial color="#7d7466" roughness={1} flatShading />
        </mesh>
        <mesh position={[1.5, 1.35, -7.2]} rotation={[0.3, 0.6, 0.2]} castShadow>
          <dodecahedronGeometry args={[1.9, 0]} />
          <meshStandardMaterial color="#948a7c" roughness={1} flatShading />
        </mesh>
        <mesh position={[0.1, 0.6, -4.9]} rotation={[0.5, 0.2, 0.4]}>
          <dodecahedronGeometry args={[1.1, 0]} />
          <meshStandardMaterial color="#6f6659" roughness={1} flatShading />
        </mesh>
        <mesh position={[-3.9, 0.7, -8.8]} rotation={[0.2, 0.9, 0.1]}>
          <dodecahedronGeometry args={[1.5, 0]} />
          <meshStandardMaterial color="#8a8072" roughness={1} flatShading />
        </mesh>
        <mesh position={[3.4, 0.55, -9.6]} rotation={[0.7, 0.1, 0.3]}>
          <dodecahedronGeometry args={[1.2, 0]} />
          <meshStandardMaterial color="#776e61" roughness={1} flatShading />
        </mesh>

        {/* Menara pengawas yang miring */}
        <group position={[0.4, 0, -10.2]} rotation-z={-0.16} rotation-y={0.2}>
          {[
            [-1.2, -0.9],
            [1.2, -0.9],
            [-1.2, 0.9],
            [1.2, 0.9],
          ].map(([x, z], index) => (
            <mesh key={index} position={[x, 1.8, z]} rotation-z={index % 2 === 0 ? 0.04 : -0.05}>
              <boxGeometry args={[0.18, 3.6, 0.18]} />
              <meshStandardMaterial color="#6b4a2e" roughness={1} map={wood} />
            </mesh>
          ))}
          <mesh position={[0, 3.5, 0]} rotation-z={0.12}>
            <boxGeometry args={[3, 0.2, 2.2]} />
            <meshStandardMaterial color="#8b5a2b" roughness={1} map={wood} />
          </mesh>
          <mesh position={[0.8, 3.9, 0.2]} rotation-z={0.5} rotation-y={0.3}>
            <boxGeometry args={[2.3, 0.14, 1.8]} />
            <meshStandardMaterial color="#7c4a21" roughness={1} />
          </mesh>
          <mesh position={[-1.6, 0.5, 1.6]} rotation-z={1.3}>
            <boxGeometry args={[0.14, 2.4, 0.14]} />
            <meshStandardMaterial color="#6b4a2e" roughness={1} />
          </mesh>
        </group>
      </group>

      {/* Debu */}
      <group ref={dust}>
        {dustData.map((item, index) => (
          <mesh key={index} position={[item.x, 0.5, item.z]}>
            <sphereGeometry args={[1, 7, 6]} />
            <meshBasicMaterial color="#d6c6a8" transparent opacity={0.25} depthWrite={false} />
          </mesh>
        ))}
      </group>

      {/* Kerikil jatuh */}
      <group ref={pebbles}>
        {Array.from({ length: 6 }, (_, index) => (
          <mesh key={index} position={[(index % 3 - 1) * 1.5, 2, -7.5 - (index % 2)]}>
            <dodecahedronGeometry args={[0.12 + (index % 3) * 0.05, 0]} />
            <meshStandardMaterial color="#7d7466" roughness={1} flatShading />
          </mesh>
        ))}
      </group>

      <DeadTree position={[-4.9, 0, -3]} rotation={1.15} scale={0.85} />
      <DeadTree position={[4.7, 0, -3.3]} rotation={-0.9} scale={0.9} />

      {!completed && <pointLight position={[0, 1.2, -4.4]} color="#fbbf24" intensity={3} distance={7} decay={2} />}
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* 4. Tanah Longsor                                                    */
/* ------------------------------------------------------------------ */

const LandslideDiorama: React.FC<{ completed: boolean }> = ({ completed }) => {
  const dirt = useDirtTexture(2, 2);
  const boulders = useRef<THREE.Group>(null);
  const dust = useRef<THREE.Group>(null);

  const path = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-1.4, 5.6, -10.6),
        new THREE.Vector3(-0.2, 4.1, -8.4),
        new THREE.Vector3(-1.1, 2.5, -6.2),
        new THREE.Vector3(0.2, 1.15, -4.2),
        new THREE.Vector3(-0.4, 0.35, -2.7),
      ]),
    []
  );

  const boulderData = useMemo(
    () =>
      Array.from({ length: 4 }, (_, index) => ({
        offset: index * 0.26,
        scale: 0.32 + (index % 3) * 0.12,
        speed: 0.09 + (index % 2) * 0.02,
      })),
    []
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    if (boulders.current) {
      boulders.current.children.forEach((child, index) => {
        const data = boulderData[index];
        const phase = ((t * data.speed + data.offset) % 1 + 1) % 1;
        const point = path.getPoint(phase);
        child.position.copy(point);
        child.rotation.x = phase * 9;
        child.rotation.z = phase * 7;
        child.scale.setScalar(data.scale * (0.85 + Math.sin(phase * Math.PI) * 0.35));
      });
    }

    if (dust.current) {
      dust.current.children.forEach((child, index) => {
        const phase = ((t * 0.26 + index * 0.4) % 1 + 1) % 1;
        child.position.y = 0.35 + phase * 1.3;
        child.scale.setScalar(0.5 + phase * 1.1);
        const material = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
        material.opacity = (1 - phase) * 0.28;
      });
    }
  });

  return (
    <group>
      {/* Tanah dasar */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.025, -6.3]}>
        <circleGeometry args={[7.3, 36]} />
        <meshStandardMaterial color="#7c8a4e" roughness={1} />
      </mesh>

      {/* Bukit / tebing */}
      <mesh position={[-1.4, 1.35, -8.2]} scale={[1.45, 0.72, 1.15]} castShadow>
        <sphereGeometry args={[5.1, 16, 12]} />
        <meshStandardMaterial color="#58773d" roughness={1} flatShading />
      </mesh>
      <mesh position={[2.7, 1.2, -10.3]} scale={[0.95, 0.55, 0.8]}>
        <sphereGeometry args={[4.2, 14, 10]} />
        <meshStandardMaterial color="#4f6c37" roughness={1} flatShading />
      </mesh>

      {/* Luka longsor: tanah terbuka di lereng, menghadap titik misi */}
      <mesh position={[-0.6, 1.7, -4]} rotation={[0.22, 0.06, 0.06]} scale={[0.9, 0.95, 0.3]}>
        <sphereGeometry args={[3.1, 14, 10]} />
        <meshStandardMaterial color="#9b7446" roughness={1} map={dirt} flatShading />
      </mesh>
      <mesh position={[0.8, 2.9, -4.8]} rotation={[0.2, 0.05, -0.08]} scale={[0.5, 0.6, 0.25]}>
        <sphereGeometry args={[3.1, 12, 9]} />
        <meshStandardMaterial color="#a17b4b" roughness={1} map={dirt} flatShading />
      </mesh>
      <mesh position={[0.4, 0.75, -3.3]} rotation={[0.15, 0, 0]} scale={[1.25, 0.42, 0.42]}>
        <sphereGeometry args={[2.1, 12, 9]} />
        <meshStandardMaterial color="#8a663d" roughness={1} map={dirt} flatShading />
      </mesh>
      {/* Gerusan tanah yang mengalir ke kaki lereng */}
      <mesh position={[1.7, 1.5, -4.6]} rotation={[0.3, -0.25, -0.15]} scale={[0.4, 0.8, 0.25]}>
        <sphereGeometry args={[2.4, 12, 9]} />
        <meshStandardMaterial color="#8f6a40" roughness={1} map={dirt} flatShading />
      </mesh>

      {/* Batang pohon tumbang di lereng */}
      <group position={[-2.2, 1.1, -6.1]} rotation-z={1.05} rotation-y={0.35}>
        <mesh>
          <cylinderGeometry args={[0.13, 0.28, 3.4, 6]} />
          <meshStandardMaterial color="#5c3f24" roughness={1} />
        </mesh>
      </group>
      <group position={[2.4, 2.2, -7.4]} rotation-z={-0.7} rotation-y={-0.4}>
        <mesh>
          <cylinderGeometry args={[0.12, 0.24, 2.8, 6]} />
          <meshStandardMaterial color="#5c3f24" roughness={1} />
        </mesh>
        <mesh position={[0, 1.6, 0]} scale={0.95}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshStandardMaterial color="#3b6f34" roughness={1} flatShading />
        </mesh>
      </group>

      {/* Pohon miring di atas tebing */}
      {[
        [-4.6, 3.1, -10.6, 0.28],
        [0.6, 4.2, -11.3, -0.22],
        [4.1, 3.2, -9.2, 0.34],
      ].map(([x, y, z, lean], index) => (
        <group key={index} position={[x, y, z]} rotation-z={lean} scale={0.9 - index * 0.08}>
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.1, 0.2, 2.2, 6]} />
            <meshStandardMaterial color="#5c3f24" roughness={1} />
          </mesh>
          <mesh position={[0, 1.2, 0]}>
            <coneGeometry args={[1.05, 2.2, 7]} />
            <meshStandardMaterial color={index % 2 === 0 ? '#2f7d46' : '#3b9353'} roughness={1} flatShading />
          </mesh>
        </group>
      ))}

      {/* Tumpukan puing di kaki lereng */}
      {[
        [-3.8, 0.45, -3.4, 0.9],
        [-2.4, 0.35, -2.9, 0.55],
        [-0.9, 0.5, -3.6, 0.75],
        [1.9, 0.4, -3.1, 0.65],
        [3.5, 0.5, -4.2, 0.85],
        [-4.8, 0.35, -5.3, 0.5],
        [4.6, 0.4, -6.4, 0.7],
      ].map(([x, y, z, scale], index) => (
        <Rock
          key={index}
          position={[x, y, z]}
          scale={scale}
          color={index % 2 === 0 ? '#8a8072' : '#776e61'}
          rotation={[index * 0.5, index * 0.3, index * 0.4]}
        />
      ))}
      {[
        [-2.9, 0.55, -2.2, 0.55],
        [1.2, 0.5, -2.4, 0.7],
      ].map(([x, y, z, scale], index) => (
        <group key={index} position={[x, y, z]} rotation-y={index * 1.4} scale={scale}>
          <mesh rotation-z={1.4}>
            <cylinderGeometry args={[0.11, 0.2, 2.1, 5]} />
            <meshStandardMaterial color="#5c3f24" roughness={1} />
          </mesh>
        </group>
      ))}

      {/* Batu yang runtuh */}
      <group ref={boulders}>
        {boulderData.map((_, index) => (
          <mesh key={index} position={[0, 1, -6]} castShadow>
            <dodecahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={index % 2 === 0 ? '#8a8072' : '#9b9182'} roughness={1} flatShading />
          </mesh>
        ))}
      </group>

      {/* Debu longsor */}
      <group ref={dust}>
        {Array.from({ length: 5 }, (_, index) => (
          <mesh key={index} position={[-2.6 + index * 1.4, 0.4, -3.6 - (index % 2) * 0.8]}>
            <sphereGeometry args={[0.9, 7, 6]} />
            <meshBasicMaterial color="#cbb48f" transparent opacity={0.24} depthWrite={false} />
          </mesh>
        ))}
      </group>

      {/* Papan peringatan sederhana */}
      <group position={[4.9, 0, -2.2]} rotation-y={-0.5}>
        {/* Tiang di belakang papan (Z negatif) supaya permukaan depannya bersih. */}
        <mesh position={[0, 1.2, -0.15]}>
          <cylinderGeometry args={[0.06, 0.08, 2.4, 6]} />
          <meshStandardMaterial color="#5c3f24" roughness={1} />
        </mesh>
        <mesh position={[0, 2.1, 0]} rotation-z={0.05}>
          <boxGeometry args={[1.6, 0.9, 0.1]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.8} />
        </mesh>
        <mesh position={[0, 2.1, 0.06]} rotation-z={0.05}>
          <boxGeometry args={[1.5, 0.18, 0.04]} />
          <meshStandardMaterial color="#dc2626" roughness={0.8} />
        </mesh>
      </group>

      {!completed && <pointLight position={[0, 1.4, -3.2]} color="#d9a15b" intensity={3} distance={7} decay={2} />}
    </group>
  );
};
