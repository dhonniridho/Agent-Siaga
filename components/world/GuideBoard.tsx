import React, { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GUIDE_BOARD } from './worldConfig';
import { useFactBoardTexture, useWoodTexture } from './worldTextures';

/** Ringkasan singkat yang tertulis di papan 3D (versi lengkap ada di kartu HTML). */
const GUIDE_HIGHLIGHTS = [
  'WASD / Panah / Joystick untuk berjalan',
  'Klik tiang atau papan zona, lalu baca',
  'Selesaikan misi 2D dan kuisnya',
  'Misi bisa diulang kapan saja',
];

interface GuideBoardProps {
  /** Dipanggil saat papan panduan diklik di dunia 3D. */
  onSelect?: () => void;
}

/**
 * Papan kayu "Panduan Bermain" di area terbuka base camp, menghadap kamera
 * pemain agar mudah dibaca sejak awal (bebas dari pohon dan HUD).
 * Teksnya memakai generator tekstur kertas yang sama dengan papan fakta,
 * jadi tidak butuh aset gambar baru. Klik papan atau dekati untuk membuka
 * kartu petunjuk lengkap di World3D.
 */
export const GuideBoard: React.FC<GuideBoardProps> = ({ onSelect }) => {
  // `clean`: tanpa paku sudut dan bulatan nomor — semua teks rata di dalam bingkai.
  const paper = useFactBoardTexture('Panduan Bermain', GUIDE_HIGHLIGHTS, '🧭', '#0ea5e9', true);
  const wood = useWoodTexture(1, 1);
  const glow = useRef<THREE.Mesh>(null);
  const hovered = useRef(false);

  useEffect(
    () => () => {
      document.body.style.cursor = '';
    },
    []
  );

  const setHover = (value: boolean) => {
    hovered.current = value;
    document.body.style.cursor = value ? 'pointer' : '';
  };

  useFrame((state) => {
    if (!glow.current) return;
    const material = glow.current.material as THREE.MeshBasicMaterial;
    const base = 0.16 + (Math.sin(state.clock.elapsedTime * 1.8) + 1) * 0.05;
    material.opacity = hovered.current ? base + 0.22 : base;
  });

  return (
    <group
      position={GUIDE_BOARD.position}
      rotation-y={GUIDE_BOARD.rotation}
      onClick={(event) => {
        event.stopPropagation();
        onSelect?.();
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHover(true);
      }}
      onPointerOut={() => setHover(false)}
    >
      {/* Tiang kayu — diletakkan di belakang papan (Z negatif) supaya batang
          dan kenopnya tidak menembus / menutupi teks di permukaan depan. */}
      {[-1.02, 1.02].map((x) => (
        <group key={x}>
          <mesh position={[x, 1.05, -0.25]}>
            <cylinderGeometry args={[0.1, 0.13, 2.1, 7]} />
            <meshStandardMaterial color="#7a4f2a" roughness={0.95} map={wood} />
          </mesh>
          <mesh position={[x, 2.12, -0.25]}>
            <sphereGeometry args={[0.14, 8, 6]} />
            <meshStandardMaterial color="#5c3a1b" roughness={1} />
          </mesh>
        </group>
      ))}

      {/* Rangka papan */}
      <mesh position={[0, 2.15, 0]}>
        <boxGeometry args={[3.02, 2.48, 0.16]} />
        <meshStandardMaterial color="#8b5a2b" roughness={0.95} map={wood} />
      </mesh>

      {/* Tepi biru cerah biar mudah dikenali sebagai papan panduan */}
      <mesh position={[0, 3.32, 0.01]}>
        <boxGeometry args={[3.14, 0.14, 0.34]} />
        <meshStandardMaterial color="#0ea5e9" roughness={0.6} />
      </mesh>

      {/* Atap kecil */}
      {[-0.16, 0.16].map((tilt, index) => (
        <mesh
          key={index}
          position={[index === 0 ? -0.78 : 0.78, 3.52, 0.02]}
          rotation-z={tilt}
          rotation-x={-0.1}
        >
          <boxGeometry args={[1.68, 0.08, 0.7]} />
          <meshStandardMaterial color="#0284c7" roughness={0.8} />
        </mesh>
      ))}

      {/* Kertas panduan */}
      <mesh position={[0, 2.15, 0.1]}>
        <planeGeometry args={[2.72, 2.27]} />
        <meshBasicMaterial map={paper} toneMapped={false} />
      </mesh>

      {/* Lingkaran cahaya di tanah */}
      <mesh ref={glow} rotation-x={-Math.PI / 2} position={[0, 0.045, 0]}>
        <ringGeometry args={[1.15, 1.45, 32]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.18}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Alas batu */}
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[2.6, 0.08, 0.9]} />
        <meshStandardMaterial color="#8d8577" roughness={1} flatShading />
      </mesh>
    </group>
  );
};

export default GuideBoard;
