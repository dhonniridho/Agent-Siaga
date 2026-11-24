import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Avatar } from '../../types';
import { Agent3D } from '../../components3d/Agent3D';
import {
  INFO_BOARDS,
  INFO_BOARD_READ_RADIUS,
  MISSION_ZONES,
  PLAYER_SPAWN,
  PLAYER_SPEED,
  isBlocked,
  type InfoBoard,
  type MissionZone,
  type MoveVector,
  type PlayerPose,
} from './worldConfig';

interface PlayerProps {
  joystickRef: { current: MoveVector };
  poseRef: { current: PlayerPose };
  avatar: Avatar | null;
  teamName: string;
  /** Saat true (mis. kartu info zona terbuka) gerak & kamera dibekukan. */
  paused?: boolean;
  onNearZone?: (zone: MissionZone | null) => void;
  onNearBoard?: (board: InfoBoard | null) => void;
  playSound?: (type: string) => void;
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
  'Space',
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
  playSound,
}) => {
  const { camera, gl } = useThree();
  const group = useRef<THREE.Group>(null);
  const [moving, setMoving] = useState(false);
  const movingRef = useRef(false);
  const [jumping, setJumping] = useState(false);
  const jumpHeight = useRef(0);
  const jumpVelocity = useRef(0);
  const jumpCooldown = useRef(0);
  const jumpActive = useRef(false);
  const jumpWasDown = useRef(false);

  const keys = useRef<Set<string>>(new Set());
  const position = useRef(new THREE.Vector3(...PLAYER_SPAWN));
  const angle = useRef(0);
  const yaw = useRef(0);
  const pitch = useRef(0.27);
  const lastZoneRef = useRef<string | null>(null);
  const lastBoardRef = useRef<string | null>(null);

  const cameraTarget = useMemo(() => new THREE.Vector3(), []);
  const lookTarget = useMemo(() => new THREE.Vector3(), []);

  // Saat kartu info terbuka, pastikan tidak ada input yang "tersangkut".
  useEffect(() => {
    if (!paused) return;
    keys.current.clear();
    joystickRef.current = { x: 0, y: 0 };
    jumpHeight.current = 0;
    jumpVelocity.current = 0;
    jumpActive.current = false;
    jumpWasDown.current = false;
    setJumping(false);
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
    jumpCooldown.current = Math.max(0, jumpCooldown.current - delta);
    const jumpPressed = keys.current.has('Space');
    if (jumpPressed && !jumpWasDown.current && !jumpActive.current && jumpCooldown.current <= 0) {
      jumpVelocity.current = 5.2;
      jumpActive.current = true;
      setJumping(true);
      playSound?.('whoosh');
    }
    jumpWasDown.current = jumpPressed;
    if (jumpActive.current) {
      jumpVelocity.current -= 12.5 * delta;
      jumpHeight.current = Math.max(0, jumpHeight.current + jumpVelocity.current * delta);
      if (jumpHeight.current === 0 && jumpVelocity.current < 0) {
        jumpVelocity.current = 0;
        jumpActive.current = false;
        jumpCooldown.current = 0.28;
        setJumping(false);
      }
    }

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
    }

    if (group.current) {
      group.current.position.set(position.current.x, jumpHeight.current, position.current.z);
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
    // Agent3D kini menangani animasi langkahnya sendiri (mode run/idle).
    const isMoving = Math.abs(dx) + Math.abs(dz) > 0.0005;
    if (isMoving !== movingRef.current) {
      movingRef.current = isMoving;
      setMoving(isMoving);
    }

    // --- Kamera orang ketiga ---
    const distance = Math.cos(pitch.current) * 8.6;
    const height = 1.4 + Math.sin(pitch.current) * 8.6;
    cameraTarget.set(
      position.current.x + Math.sin(yaw.current) * distance,
      height,
      position.current.z + Math.cos(yaw.current) * distance
    );
    camera.position.lerp(cameraTarget, 1 - Math.exp(-10 * delta));
        lookTarget.set(position.current.x, 1.7 + jumpHeight.current, position.current.z);
    camera.lookAt(lookTarget);
  });

  return (
    <group ref={group} position={PLAYER_SPAWN}>
      {/* Bayangan sederhana (tanpa shadow map) */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.03, 0]}>
        <circleGeometry args={[0.62, 20]} />
        <meshBasicMaterial color="#0f172a" transparent opacity={0.22} depthWrite={false} />
      </mesh>

      {/* Model karakter 3D yang sama dengan mode misi — kini benar-benar 3D,
          bukan sprite datar. Agent3D mengurus animasi tubuh & papan nama. */}
      <Agent3D
        avatar={avatar}
        mode={jumping ? 'jump' : moving ? 'run' : 'idle'}
        scale={1}
        label={teamName}
      />
    </group>
  );
};
