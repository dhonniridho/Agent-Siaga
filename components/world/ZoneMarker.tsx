import React, { useRef } from 'react';
import { Billboard, Float } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { MissionZone } from './worldConfig';
import { useZoneLabelTexture } from './worldTextures';
import { ZoneDiorama } from './ZoneDiorama';

interface ZoneMarkerProps {
  zone: MissionZone;
  completed?: boolean;
}

/**
 * Penanda zona misi: tiang bercahaya + cincin + papan nama.
 * Akan dipakai untuk tombol "Mulai Misi" di Tahap 2.
 */
export const ZoneMarker: React.FC<ZoneMarkerProps> = ({ zone, completed = false }) => {
  const ring = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.Mesh>(null);
  const labelAnchor = useRef<THREE.Group>(null);
  const color = completed ? '#10b981' : zone.color;
  const label = useZoneLabelTexture(zone.icon, zone.name, completed ? 'Misi selesai' : 'Titik misi', zone.color, completed);
  const facing = Math.atan2(-zone.position[0], -zone.position[2]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (ring.current) {
      ring.current.rotation.z = t * 0.35;
      const pulse = 1 + Math.sin(t * 2.4) * 0.06;
      ring.current.scale.set(pulse, pulse, pulse);
    }
    if (glow.current) {
      const material = glow.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.07 + (Math.sin(t * 1.8) + 1) * 0.025;
    }
    if (labelAnchor.current) {
      const distance = Math.hypot(
        state.camera.position.x - zone.position[0],
        state.camera.position.z - zone.position[2]
      );
      const closeness = THREE.MathUtils.clamp((14 - distance) / 10, 0, 1);
      const scale = 1 - closeness * 0.42;
      labelAnchor.current.scale.setScalar(scale);
      labelAnchor.current.position.y = 5.35 - closeness * 1.15;
    }
  });

  return (
    <group position={zone.position} rotation-y={facing}>
      {/* Formasi alam sesuai jenis bencana */}
      <ZoneDiorama zoneId={zone.id} completed={completed} />

      {/* Lingkaran di tanah */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.04, 0]}>
        <circleGeometry args={[1.7, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.18} depthWrite={false} />
      </mesh>

      <mesh ref={ring} rotation-x={-Math.PI / 2} position={[0, 0.06, 0]}>
        <ringGeometry args={[1.25, 1.5, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} side={THREE.DoubleSide} />
      </mesh>

      {/* Tiang */}
      <mesh position={[0, 1.9, 0]}>
        <cylinderGeometry args={[0.11, 0.16, 3.8, 10]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.5} metalness={0.15} />
      </mesh>

      {/* Bola lampu */}
      <mesh position={[0, 3.92, 0]}>
        <sphereGeometry args={[0.34, 14, 14]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={completed ? 0.5 : 1.1}
          toneMapped={false}
        />
      </mesh>

      {/* Berkas cahaya */}
      <mesh ref={glow} position={[0, 5, 0]}>
        <cylinderGeometry args={[0.65, 1.35, 10, 14, 1, true]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.09}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <group ref={labelAnchor} position={[0, 5.35, 0]}>
        <Float speed={2} rotationIntensity={0} floatIntensity={0.35}>
          <Billboard>
            <mesh>
              <planeGeometry args={[4.6, 2.3]} />
              <meshBasicMaterial map={label} transparent depthWrite={false} toneMapped={false} />
            </mesh>
          </Billboard>
        </Float>

        {/* Centang 3D untuk zona yang sudah selesai */}
        {completed && (
          <Float speed={2.4} rotationIntensity={0.1} floatIntensity={0.4}>
            <Billboard position={[0, 1.7, 0]} scale={[0.9, 0.9, 0.9]}>
              <mesh position={[-0.2, -0.12, 0]} rotation-z={-0.68}>
                <boxGeometry args={[0.22, 0.78, 0.22]} />
                <meshStandardMaterial color="#22c55e" emissive="#16a34a" emissiveIntensity={0.7} toneMapped={false} />
              </mesh>
              <mesh position={[0.28, 0.16, 0]} rotation-z={0.66}>
                <boxGeometry args={[0.22, 1.15, 0.22]} />
                <meshStandardMaterial color="#22c55e" emissive="#16a34a" emissiveIntensity={0.7} toneMapped={false} />
              </mesh>
            </Billboard>
          </Float>
        )}
      </group>
    </group>
  );
};
