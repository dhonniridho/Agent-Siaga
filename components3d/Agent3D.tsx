import React, { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { Billboard } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Avatar } from '../types';
import { avatarPalette } from '../components/world/worldConfig';
import { makeNameTagTexture } from './missionTextures';

export type AgentMode = 'idle' | 'run' | 'crouch' | 'panic' | 'jump';

export interface Agent3DProps {
  avatar?: Avatar | null;
  mode?: AgentMode;
  scale?: number;
  showShadow?: boolean;
  label?: string;
  labelColor?: string;
  hitFlash?: boolean;
}

/**
 * Karakter agen 3D ringan yang dipakai di seluruh misi.
 * Semua bagian tubuh memakai primitif Three.js supaya tidak perlu model GLTF.
 */
export const Agent3D = forwardRef<THREE.Group, Agent3DProps>(
  (
    {
      avatar,
      mode = 'idle',
      scale = 1,
      showShadow = true,
      label,
      labelColor,
      hitFlash = false,
    },
    ref
  ) => {
    const palette = useMemo(() => avatarPalette(avatar?.color), [avatar?.color]);
    const leftLeg = useRef<THREE.Group>(null);
    const rightLeg = useRef<THREE.Group>(null);
    const leftArm = useRef<THREE.Group>(null);
    const rightArm = useRef<THREE.Group>(null);
    const torso = useRef<THREE.Group>(null);
    const head = useRef<THREE.Group>(null);
    const bodyPose = useRef<THREE.Group>(null);
    const root = useRef<THREE.Group>(null);
    const flashStart = useRef<number | null>(null);
    const flashWasActive = useRef(false);
    const originalMaterials = useRef(new Map<THREE.Material, { color?: THREE.Color; emissive?: THREE.Color; emissiveIntensity?: number }>());
    useImperativeHandle(ref, () => root.current!, []);
    const labelTexture = useMemo(
      () => (label ? makeNameTagTexture(label, labelColor || palette.main) : null),
      [label, labelColor, palette.main]
    );

    useFrame((state, rawDelta) => {
      const t = state.clock.elapsedTime;
      const delta = Math.min(rawDelta, 0.05);
      const lerp = 1 - Math.exp(-14 * delta);
      const swing = Math.sin(t * 10);
      const bob = Math.sin(t * 4) * 0.025;

      const target = {
        legL: 0,
        legR: 0,
        armLx: 0,
        armRx: 0,
        armLz: 0.12,
        armRz: -0.12,
        torsoY: bob,
        torsoX: 0,
        headX: 0,
      };

      if (mode === 'run') {
        target.legL = swing * 0.75;
        target.legR = -swing * 0.75;
        target.armLx = -swing * 0.65;
        target.armRx = swing * 0.65;
        target.torsoY = Math.abs(swing) * 0.05;
        target.torsoX = 0.12;
      } else if (mode === 'crouch') {
        target.legL = 0.98;
        target.legR = 0.98;
        target.armLx = -2.05;
        target.armRx = -2.05;
        target.armLz = 0.3;
        target.armRz = -0.3;
        target.torsoY = -0.34;
        target.torsoX = 0.35;
        target.headX = -0.3;
      } else if (mode === 'panic') {
        target.armLz = 2.35;
        target.armRz = -2.35;
        target.armLx = -0.2;
        target.armRx = -0.2;
        target.torsoX = -0.08;
        target.headX = -0.12;
        target.legL = Math.sin(t * 14) * 0.18;
        target.legR = -Math.sin(t * 14) * 0.18;
      } else if (mode === 'jump') {
        target.legL = -0.7;
        target.legR = 0.85;
        target.armLz = 1.4;
        target.armRz = -1.4;
        target.torsoX = -0.1;
      }

      if (leftLeg.current) leftLeg.current.rotation.x = THREE.MathUtils.lerp(leftLeg.current.rotation.x, target.legL, lerp);
      if (rightLeg.current) rightLeg.current.rotation.x = THREE.MathUtils.lerp(rightLeg.current.rotation.x, target.legR, lerp);
      if (leftArm.current) {
        leftArm.current.rotation.x = THREE.MathUtils.lerp(leftArm.current.rotation.x, target.armLx, lerp);
        leftArm.current.rotation.z = THREE.MathUtils.lerp(leftArm.current.rotation.z, target.armLz, lerp);
      }
      if (rightArm.current) {
        rightArm.current.rotation.x = THREE.MathUtils.lerp(rightArm.current.rotation.x, target.armRx, lerp);
        rightArm.current.rotation.z = THREE.MathUtils.lerp(rightArm.current.rotation.z, target.armRz, lerp);
      }
      if (torso.current) {
        torso.current.position.y = THREE.MathUtils.lerp(torso.current.position.y, target.torsoY, lerp);
        torso.current.rotation.x = THREE.MathUtils.lerp(torso.current.rotation.x, target.torsoX, lerp);
        torso.current.rotation.z = mode === 'panic' ? Math.sin(t * 22) * 0.035 : 0;
      }
      if (head.current) {
        head.current.rotation.x = THREE.MathUtils.lerp(head.current.rotation.x, target.headX, lerp);
      }

      if (bodyPose.current) {
        const crouched = mode === 'crouch';
        const jumping = mode === 'jump';
        bodyPose.current.position.y = THREE.MathUtils.lerp(bodyPose.current.position.y, crouched ? -0.16 : 0, lerp);
        const targetScaleY = crouched ? 0.64 : jumping ? 1.1 : 1;
        bodyPose.current.scale.y = THREE.MathUtils.lerp(bodyPose.current.scale.y, targetScaleY, lerp);
      }

      if (root.current) {
        if (hitFlash && flashStart.current === null) flashStart.current = t;
        if (hitFlash) flashWasActive.current = true;
        if (hitFlash || flashWasActive.current) {
          root.current.traverse((object) => {
            if (!(object instanceof THREE.Mesh)) return;
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach((material) => {
              const colored = material as THREE.Material & { color?: THREE.Color; emissive?: THREE.Color; emissiveIntensity?: number };
              if (!originalMaterials.current.has(material)) {
                originalMaterials.current.set(material, {
                  color: colored.color?.clone(),
                  emissive: colored.emissive?.clone(),
                  emissiveIntensity: colored.emissiveIntensity,
                });
              }
              const original = originalMaterials.current.get(material)!;
              const flashing = hitFlash && flashStart.current !== null && Math.floor((t - flashStart.current) * 14) % 2 === 0;
              if (colored.color && original.color) {
                colored.color.copy(original.color);
                if (flashing) colored.color.lerp(new THREE.Color('#ffffff'), 0.85);
              }
              if (colored.emissive && original.emissive) {
                colored.emissive.copy(original.emissive);
                if (flashing) colored.emissive.lerp(new THREE.Color('#ffffff'), 0.85);
                if (colored.emissiveIntensity !== undefined) colored.emissiveIntensity = flashing ? Math.max(original.emissiveIntensity ?? 0, 0.7) : original.emissiveIntensity ?? 0;
              }
            });
          });
          if (!hitFlash) {
            flashStart.current = null;
            flashWasActive.current = false;
          }
        }
      }
    });

    return (
      <group ref={root} scale={scale}>
        {showShadow && (
          <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
            <circleGeometry args={[0.55, 22]} />
            <meshBasicMaterial color="#0f172a" transparent opacity={0.25} depthWrite={false} />
          </mesh>
        )}

        <group ref={bodyPose}>
        {/* Kaki */}
        <group ref={leftLeg} position={[-0.17, 0.74, 0]}>
          <mesh position={[0, -0.36, 0]}>
            <boxGeometry args={[0.25, 0.72, 0.27]} />
            <meshStandardMaterial color={palette.dark} roughness={0.8} />
          </mesh>
          <mesh position={[0, -0.7, 0.08]}>
            <boxGeometry args={[0.28, 0.16, 0.42]} />
            <meshStandardMaterial color="#1e293b" roughness={0.9} />
          </mesh>
        </group>
        <group ref={rightLeg} position={[0.17, 0.74, 0]}>
          <mesh position={[0, -0.36, 0]}>
            <boxGeometry args={[0.25, 0.72, 0.27]} />
            <meshStandardMaterial color={palette.dark} roughness={0.8} />
          </mesh>
          <mesh position={[0, -0.7, 0.08]}>
            <boxGeometry args={[0.28, 0.16, 0.42]} />
            <meshStandardMaterial color="#1e293b" roughness={0.9} />
          </mesh>
        </group>

        {/* Badan */}
        <group ref={torso} position={[0, 0, 0]}>
          <mesh position={[0, 1.18, 0]}>
            <capsuleGeometry args={[0.35, 0.52, 6, 14]} />
            <meshStandardMaterial color={palette.main} roughness={0.65} />
          </mesh>
          <mesh position={[0, 1.22, 0]}>
            <cylinderGeometry args={[0.365, 0.365, 0.18, 16, 1, true]} />
            <meshStandardMaterial color={palette.light} roughness={0.7} />
          </mesh>
          <mesh position={[0, 1.02, 0]}>
            <cylinderGeometry args={[0.355, 0.355, 0.1, 16, 1, true]} />
            <meshStandardMaterial color="#3f2a12" roughness={0.85} />
          </mesh>
          <mesh position={[0.16, 1.32, 0.32]}>
            <sphereGeometry args={[0.055, 8, 8]} />
            <meshStandardMaterial
              color="#fbbf24"
              metalness={0.5}
              roughness={0.35}
              emissive="#f59e0b"
              emissiveIntensity={0.3}
            />
          </mesh>

          {/* Tas punggung */}
          <mesh position={[0, 1.17, -0.36]}>
            <boxGeometry args={[0.48, 0.58, 0.24]} />
            <meshStandardMaterial color={palette.dark} roughness={0.8} />
          </mesh>
          {[-0.26, 0.26].map((x) => (
            <mesh key={x} position={[x, 1.26, 0.31]} rotation-x={-0.08}>
              <boxGeometry args={[0.09, 0.62, 0.06]} />
              <meshStandardMaterial color={palette.dark} roughness={0.8} />
            </mesh>
          ))}

          {/* Lengan */}
          <group ref={leftArm} position={[-0.44, 1.5, 0]}>
            <mesh position={[0, -0.3, 0]}>
              <boxGeometry args={[0.19, 0.58, 0.22]} />
              <meshStandardMaterial color={palette.main} roughness={0.7} />
            </mesh>
            <mesh position={[0, -0.62, 0]}>
              <sphereGeometry args={[0.105, 10, 10]} />
              <meshStandardMaterial color="#f2c49b" roughness={0.7} />
            </mesh>
          </group>
          <group ref={rightArm} position={[0.44, 1.5, 0]}>
            <mesh position={[0, -0.3, 0]}>
              <boxGeometry args={[0.19, 0.58, 0.22]} />
              <meshStandardMaterial color={palette.main} roughness={0.7} />
            </mesh>
            <mesh position={[0, -0.62, 0]}>
              <sphereGeometry args={[0.105, 10, 10]} />
              <meshStandardMaterial color="#f2c49b" roughness={0.7} />
            </mesh>
          </group>

          {/* Kepala + topi */}
          <group ref={head} position={[0, 1.9, 0]}>
            <mesh>
              <sphereGeometry args={[0.3, 16, 16]} />
              <meshStandardMaterial color="#f2c49b" roughness={0.75} />
            </mesh>
            <mesh position={[-0.105, 0.04, 0.27]}>
              <sphereGeometry args={[0.045, 8, 8]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
            <mesh position={[0.105, 0.04, 0.27]}>
              <sphereGeometry args={[0.045, 8, 8]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
            <mesh position={[0, 0.22, 0]}>
              <cylinderGeometry args={[0.3, 0.32, 0.16, 16]} />
              <meshStandardMaterial color={palette.main} roughness={0.6} />
            </mesh>
            <mesh position={[0, 0.15, 0.2]}>
              <boxGeometry args={[0.48, 0.05, 0.32]} />
              <meshStandardMaterial color={palette.main} roughness={0.6} />
            </mesh>
          </group>
        </group>
        </group>

        {labelTexture && (
          <Billboard position={[0, 2.88, 0]}>
            <mesh>
              <planeGeometry args={[1.95, 0.61]} />
              <meshBasicMaterial map={labelTexture} transparent depthWrite={false} toneMapped={false} />
            </mesh>
          </Billboard>
        )}
      </group>
    );
  }
);

Agent3D.displayName = 'Agent3D';
