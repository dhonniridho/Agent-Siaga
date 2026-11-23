import React, { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { makeBoardTexture } from './missionTextures';

export type BackdropVariant = 'menu' | 'guide' | 'victory';

interface BackdropProps {
  variant?: BackdropVariant;
  accent?: string;
  className?: string;
}

const ZONE_LABELS = [
  { text: 'GEMPA', emoji: '🏫', color: '#f59e0b', angle: 0.6 },
  { text: 'BANJIR', emoji: '🌊', color: '#3b82f6', angle: 2.1 },
  { text: 'LONGSOR', emoji: '⛰️', color: '#a16207', angle: 3.7 },
  { text: 'ERUPSI', emoji: '🌋', color: '#ef4444', angle: 5.25 },
];

const FloatingIsland: React.FC<{ variant: BackdropVariant; accent: string }> = ({
  variant,
  accent,
}) => {
  const group = useRef<THREE.Group>(null);
  const confetti = useRef<Array<THREE.Mesh | null>>([]);

  const labels = useMemo(
    () =>
      ZONE_LABELS.map((zone) => ({
        ...zone,
        texture: makeBoardTexture({
          title: zone.text,
          text: 'Zona misi',
          emoji: zone.emoji,
          accent: zone.color,
          background: '#ffffff',
          width: 512,
          height: 256,
          titleSize: 42,
          textSize: 28,
        }),
      })),
    []
  );

  const confettiSeeds = useMemo(
    () =>
      Array.from({ length: 26 }, (_, index) => ({
        x: (Math.random() - 0.5) * 18,
        y: Math.random() * 9 + 3,
        z: (Math.random() - 0.5) * 10,
        speed: 0.4 + Math.random() * 0.7,
        offset: index * 1.7,
        size: 0.12 + Math.random() * 0.16,
      })),
    []
  );

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (group.current) {
      group.current.rotation.y += delta * 0.12;
      group.current.position.y = Math.sin(t * 0.6) * 0.28;
    }
    if (variant === 'victory') {
      confetti.current.forEach((mesh, index) => {
        if (!mesh) return;
        const seed = confettiSeeds[index];
        mesh.position.y -= seed.speed * delta;
        if (mesh.position.y < 0.4) {
          mesh.position.y = 9 + Math.random() * 3;
          mesh.position.x = (Math.random() - 0.5) * 18;
        }
        mesh.rotation.x += delta * 2;
        mesh.rotation.z += delta * 1.4;
      });
    }
  });

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[8, 14, 8]} intensity={1.7} color="#fff7e8" />
      <directionalLight position={[-10, 5, -6]} intensity={0.55} color="#bfdbfe" />

      <group ref={group} position={[0, 0, 0]}>
        {/* Batu pulau melayang */}
        <mesh position={[0, -2.2, 0]}>
          <coneGeometry args={[7.2, 5.2, 9]} />
          <meshStandardMaterial color="#4b3b34" roughness={1} />
        </mesh>
        <mesh position={[0, -4.5, 0]}>
          <coneGeometry args={[3.6, 2.8, 8]} />
          <meshStandardMaterial color="#332923" roughness={1} />
        </mesh>

        {/* Rumput */}
        <mesh position={[0, 0.35, 0]}>
          <cylinderGeometry args={[7.1, 7.3, 0.7, 32]} />
          <meshStandardMaterial color="#4ade80" roughness={0.95} />
        </mesh>
        <mesh position={[0, 0.72, 0]}>
          <cylinderGeometry args={[6.9, 7.05, 0.18, 32]} />
          <meshStandardMaterial color="#86efac" roughness={0.85} />
        </mesh>

        {/* Danau kecil */}
        <mesh rotation-x={-Math.PI / 2} position={[2.6, 0.8, 1.8]}>
          <circleGeometry args={[1.9, 24]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#0ea5e9"
            emissiveIntensity={0.28}
            roughness={0.2}
            metalness={0.25}
          />
        </mesh>

        {/* Gunung mini */}
        <group position={[-2.8, 0.7, -1.6]}>
          <mesh position={[0, 1, 0]}>
            <coneGeometry args={[1.6, 2.4, 12]} />
            <meshStandardMaterial color="#57534e" roughness={1} />
          </mesh>
          <mesh position={[0, 2.2, 0]}>
            <sphereGeometry args={[0.28, 10, 10]} />
            <meshStandardMaterial
              color="#f97316"
              emissive="#ef4444"
              emissiveIntensity={1.5}
            />
          </mesh>
        </group>

        {/* Sekolah mini */}
        <group position={[2.2, 0.75, -2.2]}>
          <mesh position={[0, 0.55, 0]}>
            <boxGeometry args={[1.9, 1.1, 1.2]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.8} />
          </mesh>
          <mesh position={[0, 1.28, 0]} rotation-y={0.78}>
            <coneGeometry args={[1.5, 0.65, 4]} />
            <meshStandardMaterial color="#ef4444" roughness={0.75} />
          </mesh>
        </group>

        {/* Pohon-pohon */}
        {[
          [-4.6, 0.8, 1.2],
          [-3.4, 0.8, 3.1],
          [4.5, 0.8, 0.4],
          [3.9, 0.8, -3.4],
          [0.4, 0.8, 4.2],
        ].map(([x, y, z], index) => (
          <group key={index} position={[x, y, z]}>
            <mesh position={[0, 0.55, 0]}>
              <cylinderGeometry args={[0.14, 0.2, 1.1, 6]} />
              <meshStandardMaterial color="#6b4526" roughness={0.95} />
            </mesh>
            <mesh position={[0, 1.45, 0]}>
              <coneGeometry args={[0.75, 1.5, 7]} />
              <meshStandardMaterial color="#2f6b3d" roughness={0.9} />
            </mesh>
          </group>
        ))}

        {/* Tanda zona melayang */}
        {labels.map((zone) => {
          const radius = 8.6;
          return (
            <Billboard
              key={zone.text}
              position={[Math.cos(zone.angle) * radius, 4.2 + Math.sin(zone.angle) * 0.8, Math.sin(zone.angle) * radius]}
            >
              <mesh>
                <planeGeometry args={[2.4, 1.2]} />
                <meshBasicMaterial map={zone.texture} transparent toneMapped={false} />
              </mesh>
            </Billboard>
          );
        })}

        {/* Cincin aksen */}
        <mesh rotation-x={-Math.PI / 2} position={[0, -0.15, 0]}>
          <ringGeometry args={[8.9, 9.35, 64]} />
          <meshBasicMaterial color={accent} transparent opacity={0.35} side={THREE.DoubleSide} />
        </mesh>
        <mesh ref={undefined} rotation-x={-Math.PI / 2} position={[0, -0.2, 0]}>
          <ringGeometry args={[10.2, 10.5, 64]} />
          <meshBasicMaterial color={accent} transparent opacity={0.18} side={THREE.DoubleSide} />
        </mesh>

        {variant === 'victory' &&
          confettiSeeds.map((seed, index) => (
            <mesh
              key={index}
              ref={(mesh) => {
                confetti.current[index] = mesh;
              }}
              position={[seed.x, seed.y, seed.z]}
            >
              <boxGeometry args={[seed.size, seed.size * 0.6, seed.size]} />
              <meshStandardMaterial
                color={['#facc15', '#fb7185', '#38bdf8', '#4ade80', '#a78bfa'][index % 5]}
                emissive={['#facc15', '#fb7185', '#38bdf8', '#4ade80', '#a78bfa'][index % 5]}
                emissiveIntensity={0.35}
              />
            </mesh>
          ))}
      </group>

      {/* Awan lembut di bawah pulau */}
      {Array.from({ length: 5 }, (_, index) => {
        const angle = (index / 5) * Math.PI * 2;
        return (
          <mesh key={index} position={[Math.cos(angle) * 9, -5.6, Math.sin(angle) * 9]}>
            <sphereGeometry args={[1.7 + (index % 3) * 0.4, 12, 12]} />
            <meshStandardMaterial color="#e2e8f0" transparent opacity={0.18} roughness={1} />
          </mesh>
        );
      })}
    </>
  );
};

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

class BackdropBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    // Latar 3D bersifat dekoratif: bila gagal, UI HTML tetap tampil.
    if (this.state.failed) return null;
    return this.props.children;
  }
}

/**
 * Latar belakang 3D ringan untuk menu, panduan, dan layar kemenangan.
 * Tidak menangkap klik supaya konten HTML di atasnya tetap bisa dipakai.
 */
export const SceneBackdrop3D: React.FC<BackdropProps> = ({
  variant = 'menu',
  accent = '#a5b4fc',
  className = '',
}) => {
  const [supported] = useState(webglSupported);
  if (!supported) return null;

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      <BackdropBoundary>
        <Canvas
          dpr={[1, 1.35]}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          camera={{ position: [0, 5.2, 18], fov: 42 }}
        >
          <FloatingIsland variant={variant} accent={accent} />
        </Canvas>
      </BackdropBoundary>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-950/55" />
    </div>
  );
};

export default SceneBackdrop3D;
