import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Latar 3D interaktif untuk halaman awal. Sengaja ringan (tanpa shadow,
 * geometri sederhana) dan dimuat terpisah lewat React.lazy oleh LandingPage.
 * Pengunjung bisa menggerakkan pointer untuk sedikit memutar kamera/planet.
 */

const makeEarthTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Laut
  const sea = ctx.createLinearGradient(0, 0, 0, 256);
  sea.addColorStop(0, '#3bb8f5');
  sea.addColorStop(0.5, '#1b8fdb');
  sea.addColorStop(1, '#1267b4');
  ctx.fillStyle = sea;
  ctx.fillRect(0, 0, 512, 256);

  // Benua stilistis (bukan peta akurat, cuma kesan "bumi")
  const land = (points: Array<[number, number]>, color: string) => {
    ctx.beginPath();
    points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };
  land(
    [
      [44, 48], [96, 36], [140, 54], [156, 86], [132, 112], [104, 108],
      [90, 142], [62, 128], [48, 92],
    ],
    '#49c46b'
  );
  land(
    [
      [150, 142], [186, 128], [206, 156], [198, 206], [170, 228], [148, 190],
    ],
    '#3aa85a'
  );
  land(
    [
      [244, 58], [306, 40], [366, 54], [410, 78], [432, 112], [400, 138],
      [350, 126], [318, 152], [270, 132], [248, 96],
    ],
    '#57c96f'
  );
  land(
    [
      [374, 156], [424, 148], [452, 176], [438, 212], [396, 214], [372, 186],
    ],
    '#46b761'
  );

  // Puncak gunung & awan kecil
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  [[120, 70], [300, 86], [404, 178]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.moveTo(x, y - 12);
    ctx.lineTo(x + 13, y + 9);
    ctx.lineTo(x - 13, y + 9);
    ctx.closePath();
    ctx.fill();
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const makeEmojiTexture = (emoji: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  ctx.beginPath();
  ctx.arc(64, 64, 58, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = '72px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, 64, 70);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const OrbitingBadge = ({
  radius,
  speed,
  phase,
  emoji,
}: {
  radius: number;
  speed: number;
  phase: number;
  emoji: string;
}) => {
  const ref = useRef<THREE.Group>(null);
  const texture = useMemo(() => makeEmojiTexture(emoji), [emoji]);

  useFrame((state) => {
    const t = state.clock.elapsedTime * speed + phase;
    if (!ref.current) return;
    ref.current.position.set(Math.cos(t) * radius, Math.sin(t * 1.7) * 0.9, Math.sin(t) * radius);
    ref.current.rotation.y = -t;
  });

  return (
    <group ref={ref}>
      <mesh>
        <planeGeometry args={[1.5, 1.5]} />
        <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
};

const Planet = () => {
  const planet = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Mesh>(null);
  const earth = useMemo(() => makeEarthTexture(), []);

  useFrame((state, delta) => {
    if (planet.current) {
      planet.current.rotation.y += delta * 0.13;
      // Parallax mengikuti pointer (gerakan kecil, tidak mengganggu teks).
      planet.current.rotation.x = THREE.MathUtils.lerp(
        planet.current.rotation.x,
        -state.pointer.y * 0.18,
        0.04
      );
      planet.current.position.x = THREE.MathUtils.lerp(
        planet.current.position.x,
        state.pointer.x * 0.35,
        0.04
      );
    }
    if (halo.current) {
      halo.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 1.2) * 0.02);
    }
  });

  return (
    <group>
      {/* Cahaya reddish/biru di belakang planet */}
      <mesh ref={halo}>
        <sphereGeometry args={[3.25, 32, 32]} />
        <meshBasicMaterial
          color="#7dd3fc"
          transparent
          opacity={0.16}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <group ref={planet} rotation-z={0.32}>
        <mesh>
          <sphereGeometry args={[2.7, 48, 32]} />
          <meshStandardMaterial map={earth} roughness={0.78} metalness={0.04} />
        </mesh>
        {/* Awan tipis */}
        <mesh scale={1.015}>
          <sphereGeometry args={[2.7, 32, 24]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.07} depthWrite={false} />
        </mesh>
        {/* Cincin orbit */}
        <mesh rotation={[Math.PI / 2.35, 0, 0]}>
          <torusGeometry args={[3.5, 0.018, 8, 100]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.55} />
        </mesh>
      </group>

      <OrbitingBadge radius={4.3} speed={0.45} phase={0} emoji="🌋" />
      <OrbitingBadge radius={4.6} speed={-0.32} phase={2} emoji="🌊" />
      <OrbitingBadge radius={4.1} speed={0.28} phase={4} emoji="⛰️" />
      <OrbitingBadge radius={4.8} speed={-0.24} phase={5.2} emoji="🏚️" />
    </group>
  );
};

const Stars = () => {
  const points = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const array = new Float32Array(240 * 3);
    for (let i = 0; i < 240; i += 1) {
      array[i * 3] = (Math.random() - 0.5) * 34;
      array[i * 3 + 1] = (Math.random() - 0.5) * 22;
      array[i * 3 + 2] = -6 - Math.random() * 16;
    }
    return array;
  }, []);

  useFrame((state) => {
    if (points.current) points.current.rotation.z = state.clock.elapsedTime * 0.012;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#ffffff" size={0.09} transparent opacity={0.8} sizeAttenuation />
    </points>
  );
};

const Scene: React.FC = () => (
  <>
    <ambientLight intensity={1.15} />
    <directionalLight position={[6, 8, 8]} intensity={2.4} color="#fff6e0" />
    <directionalLight position={[-8, -2, -6]} intensity={0.7} color="#93c5fd" />
    <Stars />
    <Planet />
  </>
);

const HeroScene: React.FC = () => (
  <Canvas
    className="!absolute inset-0"
    dpr={[1, 1.5]}
    gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
    camera={{ position: [0, 0, 14], fov: 48, near: 0.1, far: 100 }}
  >
    <Scene />
  </Canvas>
);

export default HeroScene;
