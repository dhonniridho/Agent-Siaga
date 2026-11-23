import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  PLAYER_SPAWN,
  type MissionZone,
  type PlayerPose,
} from './worldConfig';

interface DirectionArrowProps {
  poseRef: { current: PlayerPose };
  /** Zona tujuan berikutnya. Kosong = semua zona selesai (panah hilang). */
  target?: MissionZone;
}

/** Jarak pemain ke zona saat panah disembunyikan. */
const NEAR_HIDE_RADIUS = 4.4;
/** Tinggi panah di atas kepala karakter (di atas papan nama tim). */
const ARROW_HEIGHT = 3.15;

/**
 * Panah petunjuk arah melayang di atas karakter.
 * Selalu menunjuk ke zona misi berikutnya, warna mengikuti zona,
 * dan memudar otomatis saat pemain sudah dekat zona.
 * Ringan: hanya dua mesh dengan material basic tanpa shadow.
 */
export const DirectionArrow: React.FC<DirectionArrowProps> = ({ poseRef, target }) => {
  const group = useRef<THREE.Group>(null);
  const material = useRef<THREE.MeshBasicMaterial>(null);
  const fade = useRef(1);
  const color = target?.color ?? '#f59e0b';

  useFrame((state, rawDelta) => {
    if (!target || !group.current) return;
    const delta = Math.min(rawDelta, 0.05);
    const pose = poseRef.current;

    const dx = target.position[0] - pose.x;
    const dz = target.position[2] - pose.z;
    const distance = Math.hypot(dx, dz);

    // Ikuti pemain + sedikit melayang naik-turun.
    group.current.position.set(
      pose.x,
      ARROW_HEIGHT + Math.sin(state.clock.elapsedTime * 2.2) * 0.09,
      pose.z
    );
    // Hadapkan sumbu +Z lokal ke arah zona tujuan.
    group.current.rotation.y = Math.atan2(dx, dz);

    const shouldShow = distance > NEAR_HIDE_RADIUS;
    fade.current += ((shouldShow ? 1 : 0) - fade.current) * Math.min(1, 10 * delta);
    group.current.visible = fade.current > 0.02;
    if (material.current) material.current.opacity = fade.current;
  });

  // Semua zona selesai: panah tidak dirender sama sekali.
  if (!target) return null;

  return (
    <group ref={group} position={[PLAYER_SPAWN[0], ARROW_HEIGHT, PLAYER_SPAWN[2]]}>
      {/* Badan panah (kerucut mengarah ke +Z lokal) */}
      <mesh rotation-x={Math.PI / 2} position={[0, 0, 0.16]} renderOrder={10}>
        <coneGeometry args={[0.2, 0.5, 12]} />
        <meshBasicMaterial
          ref={material}
          color={color}
          transparent
          opacity={1}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {/* Ekor panah */}
      <mesh position={[0, 0, -0.2]} renderOrder={10}>
        <boxGeometry args={[0.1, 0.1, 0.32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.85} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
};
