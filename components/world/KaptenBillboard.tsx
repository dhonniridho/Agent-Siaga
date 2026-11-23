import React, { useEffect } from 'react';
import { Float, useTexture } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Billboard Kapten Siaga di base camp, memakai aset pixel-art
 * kapten-idle.png tanpa aset baru. Pesan panduan tampil sebagai
 * kartu HTML di HUD supaya tidak menutupi minimap.
 */
export const KaptenBillboard: React.FC = () => {
  const texture = useTexture('/assets/kapten-idle.png');

  useEffect(() => {
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
  }, [texture]);

  return (
    <group position={[3.85, 0, 17.3]} rotation-y={-0.35}>
      {/* Alas & panggung */}
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[1.25, 1.35, 0.08, 24]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.28, 0]}>
        <cylinderGeometry args={[1.05, 1.15, 0.42, 24]} />
        <meshStandardMaterial color="#4f46e5" roughness={0.6} />
      </mesh>

      {/* Lingkaran cahaya */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[1.0, 1.0, 0.03, 24]} />
        <meshBasicMaterial color="#fde68a" transparent opacity={0.35} />
      </mesh>

      <Float speed={1.6} rotationIntensity={0} floatIntensity={0.18}>
        {/* Karakter Kapten */}
        <mesh position={[0, 2.05, 0]}>
          <planeGeometry args={[1.9, 2.61]} />
          <meshBasicMaterial
            map={texture}
            transparent
            alphaTest={0.05}
            toneMapped={false}
          />
        </mesh>

      </Float>
    </group>
  );
};
