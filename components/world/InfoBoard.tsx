import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { WORLD_FACTS } from '../../constants';
import { MISSION_ZONES, type InfoBoard as InfoBoardData } from './worldConfig';
import { useFactBoardTexture, useWoodTexture } from './worldTextures';

interface InfoBoardProps {
  board: InfoBoardData;
}

/**
 * Papan fakta bergaya kemah alam. Saat pemain mendekat, World3D
 * membuka panel HTML agar teks mudah dibaca anak.
 */
export const InfoBoard: React.FC<InfoBoardProps> = ({ board }) => {
  const zone = MISSION_ZONES.find((item) => item.id === board.zoneId);
  const data = WORLD_FACTS[board.zoneId];
  const color = zone?.color || '#4f46e5';
  const texture = useFactBoardTexture(data.title, data.facts, data.icon, color);
  const wood = useWoodTexture(1, 1);
  const glow = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!glow.current) return;
    const material = glow.current.material as THREE.MeshBasicMaterial;
    material.opacity = 0.12 + (Math.sin(state.clock.elapsedTime * 1.6) + 1) * 0.045;
  });

  return (
    <group position={board.position} rotation-y={board.rotation}>
      {/* Tiang kayu */}
      {[-1.02, 1.02].map((x) => (
        <group key={x}>
          <mesh position={[x, 1.05, 0]}>
            <cylinderGeometry args={[0.1, 0.13, 2.1, 7]} />
            <meshStandardMaterial color="#7a4f2a" roughness={0.95} map={wood} />
          </mesh>
          <mesh position={[x, 2.12, 0]}>
            <sphereGeometry args={[0.14, 8, 6]} />
            <meshStandardMaterial color="#5c3a1b" roughness={1} />
          </mesh>
        </group>
      ))}

      {/* Rangka papan kayu */}
      <mesh position={[0, 2.15, 0]}>
        <boxGeometry args={[3.02, 2.48, 0.16]} />
        <meshStandardMaterial color="#8b5a2b" roughness={0.95} map={wood} />
      </mesh>

      {/* Tepi warna zona */}
      <mesh position={[0, 3.32, 0.01]}>
        <boxGeometry args={[3.14, 0.14, 0.34]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>

      {/* Atap kecil dari papan */}
      {[-0.16, 0.16].map((tilt, index) => (
        <mesh key={index} position={[index === 0 ? -0.78 : 0.78, 3.52, 0.02]} rotation-z={tilt} rotation-x={-0.1}>
          <boxGeometry args={[1.68, 0.08, 0.7]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      ))}

      {/* Kertas fakta */}
      <mesh position={[0, 2.15, 0.1]}>
        <planeGeometry args={[2.72, 2.27]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>

      {/* Tali kecil di sudut papan */}
      {[
        [-1.02, 3.06],
        [1.02, 3.06],
      ].map(([x, y], index) => (
        <mesh key={index} position={[x, y, 0.1]} rotation-z={index === 0 ? 0.4 : -0.4}>
          <torusGeometry args={[0.1, 0.025, 6, 10]} />
          <meshStandardMaterial color="#d6c39a" roughness={0.9} />
        </mesh>
      ))}

      {/* Garis bercahaya di tanah agar papan mudah ditemukan */}
      <mesh ref={glow} rotation-x={-Math.PI / 2} position={[0, 0.045, 0]}>
        <ringGeometry args={[1.15, 1.45, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.16}
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
