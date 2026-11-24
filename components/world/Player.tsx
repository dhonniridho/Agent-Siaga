import React, { useEffect, useMemo, useRef } from 'react';
import { Billboard, Float } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Avatar } from '../../types';
import {
  INFO_BOARDS,
  INFO_BOARD_READ_RADIUS,
  MISSION_ZONES,
  PLAYER_SPAWN,
  PLAYER_SPEED,
  avatarPalette,
  isBlocked,
  type InfoBoard,
  type MissionZone,
  type MoveVector,
  type PlayerPose,
} from './worldConfig';
import { useNameTagTexture } from './worldTextures';

interface PlayerProps {
  joystickRef: { current: MoveVector };
  poseRef: { current: PlayerPose };
  avatar: Avatar | null;
  teamName: string;
  /** Saat true (mis. kartu info zona terbuka) gerak & kamera dibekukan. */
  paused?: boolean;
  onNearZone?: (zone: MissionZone | null) => void;
  onNearBoard?: (board: InfoBoard | null) => void;
}

const MOVEMENT_KEYS = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
]);

/**
 * Karakter orang ketiga + kamera yang mengikuti pemain.
 * Desktop: WASD/panah, drag mouse untuk memutar kamera.
 * HP: joystick virtual (gerak) + drag layar (kamera).
 */
export const Player: React.FC<PlayerProps> = ({
  joystickRef,
  poseRef,
  avatar,
  teamName,
  paused = false,
  onNearZone,
  onNearBoard,
}) => {
  const { camera, gl } = useThree();
  const group = useRef<THREE.Group>(null);
  const leftLeg = useRef<THREE.Group>(null);
  const rightLeg = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);

  const keys = useRef<Set<string>>(new Set());
  const position = useRef(new THREE.Vector3(...PLAYER_SPAWN));
  const angle = useRef(0);
  const walkPhase = useRef(0);
  const yaw = useRef(0);
  const pitch = useRef(0.27);
  const lastZoneRef = useRef<string | null>(null);
  const lastBoardRef = useRef<string | null>(null);

  const palette = useMemo(() => avatarPalette(avatar?.color), [avatar?.color]);
  const nameTexture = useNameTagTexture(avatar?.icon || '🕵️', teamName || 'Tim Agent', palette.main);

  const cameraTarget = useMemo(() => new THREE.Vector3(), []);
  const lookTarget = useMemo(() => new THREE.Vector3(), []);

  // Saat kartu info terbuka, pastikan tidak ada input yang "tersangkut".
  useEffect(() => {
    if (!paused) return;
    keys.current.clear();
    joystickRef.current = { x: 0, y: 0 };
  }, [paused, joystickRef]);

  // Keyboard (desktop)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (paused) return;
      if (MOVEMENT_KEYS.has(e.code)) {
        keys.current.add(e.code);
        e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (MOVEMENT_KEYS.has(e.code)) {
        keys.current.delete(e.code);
        e.preventDefault();
      }
    };
    const clear = () => keys.current.clear();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clear);
    };
  }, [paused]);

  // Drag untuk memutar kamera (mouse & sentuhan di area canvas)
  useEffect(() => {
    const element = gl.domElement;
    let dragging = false;
    let pointerId: number | null = null;
    let lastX = 0;
    let lastY = 0;

    const onDown = (event: PointerEvent) => {
      if (paused) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      dragging = true;
      pointerId = event.pointerId;
      lastX = event.clientX;
      lastY = event.clientY;
      element.setPointerCapture(event.pointerId);
    };
    const onMove = (event: PointerEvent) => {
      if (paused) return;
      if (!dragging || event.pointerId !== pointerId) return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
      yaw.current -= dx * 0.006;
      pitch.current = THREE.MathUtils.clamp(pitch.current + dy * 0.004, 0.12, 0.82);
    };
    const onUp = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      dragging = false;
      pointerId = null;
      if (element.hasPointerCapture(event.pointerId)) {
        element.releasePointerCapture(event.pointerId);
      }
    };

    element.addEventListener('pointerdown', onDown);
    element.addEventListener('pointermove', onMove);
    element.addEventListener('pointerup', onUp);
    element.addEventListener('pointercancel', onUp);
    return () => {
      element.removeEventListener('pointerdown', onDown);
      element.removeEventListener('pointermove', onMove);
      element.removeEventListener('pointerup', onUp);
      element.removeEventListener('pointercancel', onUp);
    };
  }, [gl, paused]);

  useFrame((_, rawDelta) => {
    // Kartu info zona terbuka: bekukan gerak pemain sekaligus kamera.
    if (paused) return;

    const delta = Math.min(rawDelta, 0.05);

    // --- Input ---
    const pressed = keys.current;
    let forward =
      (pressed.has('KeyW') || pressed.has('ArrowUp') ? 1 : 0) -
      (pressed.has('KeyS') || pressed.has('ArrowDown') ? 1 : 0);
    let right =
      (pressed.has('KeyD') || pressed.has('ArrowRight') ? 1 : 0) -
      (pressed.has('KeyA') || pressed.has('ArrowLeft') ? 1 : 0);

    const joy = joystickRef.current;
    forward += -joy.y;
    right += joy.x;

    const inputLength = Math.hypot(right, forward);
    if (inputLength > 1) {
      right /= inputLength;
      forward /= inputLength;
    }

    // --- Gerakan relatif terhadap arah kamera ---
    const sin = Math.sin(yaw.current);
    const cos = Math.cos(yaw.current);
    const dx = (right * cos - forward * sin) * PLAYER_SPEED * delta;
    const dz = (-right * sin - forward * cos) * PLAYER_SPEED * delta;

    if (Math.abs(dx) > 0.00001 || Math.abs(dz) > 0.00001) {
      const nextX = position.current.x + dx;
      if (!isBlocked(nextX, position.current.z)) position.current.x = nextX;

      const nextZ = position.current.z + dz;
      if (!isBlocked(position.current.x, nextZ)) position.current.z = nextZ;

      const targetAngle = Math.atan2(dx, dz);
      let diff = targetAngle - angle.current;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      angle.current += diff * Math.min(1, 14 * delta);
      walkPhase.current += delta * 11;
    } else {
      walkPhase.current += delta * 2;
    }

    if (group.current) {
      group.current.position.set(position.current.x, 0, position.current.z);
      group.current.rotation.y = angle.current;
    }

    // --- Pose untuk minimap + deteksi zona terdekat ---
    poseRef.current.x = position.current.x;
    poseRef.current.z = position.current.z;
    poseRef.current.yaw = angle.current;

    let nearest: MissionZone | null = null;
    let nearestDistance = 3.6;
    for (const zone of MISSION_ZONES) {
      const distance = Math.hypot(
        position.current.x - zone.position[0],
        position.current.z - zone.position[2]
      );
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = zone;
      }
    }
    const nearestId = nearest?.id ?? null;
    if (nearestId !== lastZoneRef.current) {
      lastZoneRef.current = nearestId;
      onNearZone?.(nearest);
    }

    // Papan informasi fakta terdekat
    let nearestBoard: InfoBoard | null = null;
    let nearestBoardDistance = INFO_BOARD_READ_RADIUS;
    for (const board of INFO_BOARDS) {
      const distance = Math.hypot(
        position.current.x - board.position[0],
        position.current.z - board.position[2]
      );
      if (distance < nearestBoardDistance) {
        nearestBoardDistance = distance;
        nearestBoard = board;
      }
    }
    const nearestBoardId = nearestBoard?.id ?? null;
    if (nearestBoardId !== lastBoardRef.current) {
      lastBoardRef.current = nearestBoardId;
      onNearBoard?.(nearestBoard);
    }

    // --- Animasi langkah ---
    const moving = Math.abs(dx) + Math.abs(dz) > 0.0005;
    const swing = Math.sin(walkPhase.current) * (moving ? 0.7 : 0.035);
    if (leftLeg.current) leftLeg.current.rotation.x = swing;
    if (rightLeg.current) rightLeg.current.rotation.x = -swing;
    if (leftArm.current) leftArm.current.rotation.x = -swing * 0.8;
    if (rightArm.current) rightArm.current.rotation.x = swing * 0.8;

    // --- Kamera orang ketiga ---
    const distance = Math.cos(pitch.current) * 8.6;
    const height = 1.4 + Math.sin(pitch.current) * 8.6;
    cameraTarget.set(
      position.current.x + Math.sin(yaw.current) * distance,
      height,
      position.current.z + Math.cos(yaw.current) * distance
    );
    camera.position.lerp(cameraTarget, 1 - Math.exp(-10 * delta));
    lookTarget.set(position.current.x, 1.7, position.current.z);
    camera.lookAt(lookTarget);
  });

  return (
    <group ref={group} position={PLAYER_SPAWN}>
      {/* Bayangan sederhana (tanpa shadow map) */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.03, 0]}>
        <circleGeometry args={[0.62, 20]} />
        <meshBasicMaterial color="#0f172a" transparent opacity={0.22} depthWrite={false} />
      </mesh>

      {/* Kaki */}
      <group ref={leftLeg} position={[-0.17, 0.7, 0]}>
        <mesh position={[0, -0.35, 0]}>
          <boxGeometry args={[0.26, 0.7, 0.28]} />
          <meshStandardMaterial color={palette.dark} roughness={0.8} />
        </mesh>
      </group>
      <group ref={rightLeg} position={[0.17, 0.7, 0]}>
        <mesh position={[0, -0.35, 0]}>
          <boxGeometry args={[0.26, 0.7, 0.28]} />
          <meshStandardMaterial color={palette.dark} roughness={0.8} />
        </mesh>
      </group>

      {/* Sepatu */}
      <mesh position={[-0.17, 0.08, 0.07]}>
        <boxGeometry args={[0.3, 0.16, 0.42]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh position={[0.17, 0.08, 0.07]}>
        <boxGeometry args={[0.3, 0.16, 0.42]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>

      {/* Badan */}
      <mesh position={[0, 1.13, 0]}>
        <capsuleGeometry args={[0.36, 0.52, 6, 14]} />
        <meshStandardMaterial color={palette.main} roughness={0.65} />
      </mesh>

      {/* Rompi / garis tim */}
      <mesh position={[0, 1.16, 0]}>
        <cylinderGeometry args={[0.372, 0.372, 0.2, 16, 1, true]} />
        <meshStandardMaterial color={palette.light} roughness={0.7} />
      </mesh>

      {/* Ikat pinggang */}
      <mesh position={[0, 0.97, 0]}>
        <cylinderGeometry args={[0.365, 0.365, 0.1, 16, 1, true]} />
        <meshStandardMaterial color="#3f2a12" roughness={0.85} />
      </mesh>
      <mesh position={[0.16, 1.27, 0.33]}>
        <sphereGeometry args={[0.055, 8, 8]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.5} roughness={0.35} emissive="#f59e0b" emissiveIntensity={0.25} />
      </mesh>

      {/* Tali tas punggung */}
      {[-0.26, 0.26].map((x) => (
        <mesh key={x} position={[x, 1.22, 0.31]} rotation-x={-0.08}>
          <boxGeometry args={[0.09, 0.62, 0.06]} />
          <meshStandardMaterial color={palette.dark} roughness={0.8} />
        </mesh>
      ))}

      {/* Kantong air di pinggang */}
      <mesh position={[-0.34, 0.92, -0.14]} rotation-z={0.15}>
        <cylinderGeometry args={[0.09, 0.1, 0.24, 8]} />
        <meshStandardMaterial color="#0ea5e9" roughness={0.5} metalness={0.15} />
      </mesh>

      {/* Tas punggung */}
      <mesh position={[0, 1.12, -0.36]}>
        <boxGeometry args={[0.48, 0.58, 0.24]} />
        <meshStandardMaterial color={palette.dark} roughness={0.8} />
      </mesh>

      {/* Lengan */}
      <group ref={leftArm} position={[-0.45, 1.45, 0]}>
        <mesh position={[0, -0.28, 0]}>
          <boxGeometry args={[0.19, 0.56, 0.22]} />
          <meshStandardMaterial color={palette.main} roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.58, 0]}>
          <sphereGeometry args={[0.105, 10, 10]} />
          <meshStandardMaterial color="#f2c49b" roughness={0.7} />
        </mesh>
      </group>
      <group ref={rightArm} position={[0.45, 1.45, 0]}>
        <mesh position={[0, -0.28, 0]}>
          <boxGeometry args={[0.19, 0.56, 0.22]} />
          <meshStandardMaterial color={palette.main} roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.58, 0]}>
          <sphereGeometry args={[0.105, 10, 10]} />
          <meshStandardMaterial color="#f2c49b" roughness={0.7} />
        </mesh>
      </group>

      {/* Kepala */}
      <mesh position={[0, 1.86, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#f2c49b" roughness={0.75} />
      </mesh>

      {/* Mata */}
      <mesh position={[-0.11, 1.9, 0.27]}>
        <sphereGeometry args={[0.045, 8, 8]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <mesh position={[0.11, 1.9, 0.27]}>
        <sphereGeometry args={[0.045, 8, 8]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>

      {/* Topi tim */}
      <mesh position={[0, 2.11, 0]}>
        <cylinderGeometry args={[0.3, 0.32, 0.16, 16]} />
        <meshStandardMaterial color={palette.main} roughness={0.6} />
      </mesh>
      <mesh position={[0, 2.04, 0.2]}>
        <boxGeometry args={[0.48, 0.05, 0.32]} />
        <meshStandardMaterial color={palette.main} roughness={0.6} />
      </mesh>

      {/* Papan nama tim */}
      <Float speed={1.6} rotationIntensity={0} floatIntensity={0.18}>
        <Billboard position={[0, 2.62, 0]}>
          <mesh>
            <planeGeometry args={[1.95, 0.4875]} />
            <meshBasicMaterial map={nameTexture} transparent depthWrite={false} toneMapped={false} />
          </mesh>
        </Billboard>
      </Float>
    </group>
  );
};
