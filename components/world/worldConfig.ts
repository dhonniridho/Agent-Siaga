import { LEVELS } from '../../constants';
import type { DisasterType } from '../../types';

/**
 * Layout & data dunia 3D "Jelajah Alam Siaga".
 * Peta berupa lembah alam terbuka dengan empat titik misi bencana.
 * Semua bentuk memakai primitif Three.js supaya tetap ringan.
 */

export interface MoveVector {
  x: number;
  y: number;
}

export interface PlayerPose {
  x: number;
  z: number;
  yaw: number;
}

export interface BoxCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface MissionZone {
  id: DisasterType;
  name: string;
  icon: string;
  color: string;
  position: [number, number, number];
  description: string;
}

export interface InfoBoard {
  id: string;
  zoneId: DisasterType;
  position: [number, number, number];
  rotation: number;
}

export interface Trail {
  x: number;
  z: number;
  width: number;
  length: number;
  rotation: number;
}

export type TreeVariant = 'pine' | 'oak' | 'birch';

export interface TreeSpot {
  x: number;
  z: number;
  scale: number;
  variant: TreeVariant;
}

export interface RockSpot {
  x: number;
  z: number;
  scale: number;
  rotation: number;
}

/** Batas area bermain. Di luar batas ini pemain tidak bisa lewat. */
export const WORLD_BOUNDS = { minX: -29, maxX: 29, minZ: -29, maxZ: 29 };

/** Titik awal di base camp, menghadap ke lembah. */
export const PLAYER_SPAWN: [number, number, number] = [0, 0, 18];
export const PLAYER_RADIUS = 0.55;
export const PLAYER_SPEED = 6.2;

/** Base camp: tenda, api unggun, dan papan petunjuk. */
export const BASE_CAMP = {
  fire: { x: -2.6, z: 16.4 },
  tent: { x: -5.4, z: 17 },
  crate: { x: 7.8, z: 19.4 },
  sign: { x: -8.2, z: 19.4 },
};

/** Jalur tanah yang menghubungkan base camp dengan tiap zona. */
export const TRAILS: Trail[] = [
  { x: 0, z: 19.5, width: 3.2, length: 9, rotation: 0 },
  { x: 0, z: 9.5, width: 3, length: 10, rotation: 0 },
  { x: -7.5, z: -1, width: 2.5, length: 24, rotation: -2.447 },
  { x: 7.5, z: -2.5, width: 2.5, length: 26, rotation: 2.521 },
  { x: 8, z: 9.5, width: 2.3, length: 16.5, rotation: 1.386 },
  { x: -8, z: 10, width: 2.3, length: 16.5, rotation: -1.326 },
];

/** Pepohonan di sekitar lembah (di luar jalur dan zona). */
export const TREES: TreeSpot[] = [
  { x: -24, z: -23, scale: 1.2, variant: 'pine' },
  { x: -22.5, z: -7, scale: 1.05, variant: 'oak' },
  { x: -25, z: 3, scale: 1.15, variant: 'pine' },
  { x: -23.5, z: 21, scale: 1.1, variant: 'oak' },
  { x: -12, z: 24, scale: 0.95, variant: 'pine' },
  { x: 3, z: 25, scale: 1.05, variant: 'oak' },
  { x: 19, z: 24.5, scale: 1.15, variant: 'pine' },
  { x: 26, z: 3, scale: 1.1, variant: 'pine' },
  { x: 23, z: -7.5, scale: 0.95, variant: 'oak' },
  { x: 5, z: -21.5, scale: 1.05, variant: 'pine' },
  { x: -4, z: -21, scale: 0.9, variant: 'oak' },
  { x: 10, z: 19, scale: 0.85, variant: 'birch' },
  { x: -11, z: 16, scale: 0.9, variant: 'birch' },
  { x: 19, z: -2, scale: 0.8, variant: 'birch' },
  { x: -14, z: 3, scale: 0.85, variant: 'pine' },
  { x: 8, z: 3.5, scale: 0.8, variant: 'oak' },
];

/** Batu besar yang menjadi penanda alam. */
export const ROCKS: RockSpot[] = [
  { x: -9.5, z: 21, scale: 1.2, rotation: 0.4 },
  { x: 8.5, z: 22, scale: 0.9, rotation: 1.1 },
  { x: 22, z: 5, scale: 1.5, rotation: 0.2 },
  { x: 2.5, z: -8.5, scale: 0.75, rotation: 0.8 },
  { x: -6.5, z: 1.5, scale: 0.65, rotation: 1.7 },
  { x: 11, z: 2.5, scale: 0.8, rotation: 0.6 },
  { x: 24, z: -4.5, scale: 1.1, rotation: 1.3 },
  { x: -2, z: 11.5, scale: 0.8, rotation: 0.9 },
  { x: -18, z: 24.5, scale: 1.4, rotation: 0.3 },
  { x: 16, z: 22, scale: 0.95, rotation: 1.9 },
];

/** Semak, bunga, dan rumput ditata ringan oleh NatureEnvironment. */
export const FLOWER_SPOTS: Array<{ x: number; z: number; color: string }> = [
  { x: -10.5, z: 13.5, color: '#f472b6' },
  { x: -7.5, z: 14.2, color: '#facc15' },
  { x: -4.2, z: 12.8, color: '#fb7185' },
  { x: 5.5, z: 13.5, color: '#a78bfa' },
  { x: 8.4, z: 12.2, color: '#facc15' },
  { x: 12.5, z: 6.5, color: '#fb7185' },
  { x: -13.5, z: 6.5, color: '#a78bfa' },
  { x: -3.2, z: -4.5, color: '#f472b6' },
  { x: 4.5, z: -6.5, color: '#facc15' },
  { x: 0.5, z: 2.5, color: '#fdba74' },
];

/**
 * Papan informasi fakta di dekat tiap zona, menghadap jalur.
 * Empat papan ini bagian dari empat lokasi misi.
 */
export const INFO_BOARDS: InfoBoard[] = [
  { id: 'board-earthquake', zoneId: 'EARTHQUAKE', position: [-8.5, 0, -16], rotation: 0.5 },
  { id: 'board-flood', zoneId: 'FLOOD', position: [10, 0, 5], rotation: -2.3 },
  { id: 'board-landslide', zoneId: 'LANDSLIDE', position: [-9.5, 0, 18], rotation: 2.5 },
  { id: 'board-volcano', zoneId: 'VOLCANO', position: [19, 0, -7], rotation: -1.2 },
];

/** Jarak maksimal pemain ke papan agar panel fakta terbuka. */
export const INFO_BOARD_READ_RADIUS = 3;

/** Tabrakan sederhana berbentuk kotak (AABB) di sumbu XZ. */
export const COLLIDERS: BoxCollider[] = [
  // Panggung Kapten Siaga
  {
    minX: 2.3,
    maxX: 5.4,
    minZ: 15.9,
    maxZ: 18.9,
  },
  // Tenda base camp
  {
    minX: BASE_CAMP.tent.x - 1.9,
    maxX: BASE_CAMP.tent.x + 1.9,
    minZ: BASE_CAMP.tent.z - 1.8,
    maxZ: BASE_CAMP.tent.z + 1.8,
  },
  // Peti & papan petunjuk base camp
  {
    minX: BASE_CAMP.crate.x - 0.75,
    maxX: BASE_CAMP.crate.x + 0.75,
    minZ: BASE_CAMP.crate.z - 0.75,
    maxZ: BASE_CAMP.crate.z + 0.75,
  },
  {
    minX: BASE_CAMP.sign.x - 1.4,
    maxX: BASE_CAMP.sign.x + 1.4,
    minZ: BASE_CAMP.sign.z - 0.45,
    maxZ: BASE_CAMP.sign.z + 0.45,
  },
  // Api unggun
  {
    minX: BASE_CAMP.fire.x - 0.8,
    maxX: BASE_CAMP.fire.x + 0.8,
    minZ: BASE_CAMP.fire.z - 0.8,
    maxZ: BASE_CAMP.fire.z + 0.8,
  },
  // Inti formasi gunung api
  { minX: 13, maxX: 27.5, minZ: -27.5, maxZ: -14.2 },
  // Cekungan banjir
  { minX: 17.4, maxX: 28.5, minZ: 9.4, maxZ: 22.5 },
  // Batuan gempa
  { minX: -26.5, maxX: -17, minZ: -19.5, maxZ: -9.2 },
  // Tebing longsor
  { minX: -28.5, maxX: -17.5, minZ: 10.5, maxZ: 23.5 },
  // Pohon (batang)
  ...TREES.map((tree) => ({
    minX: tree.x - 0.5,
    maxX: tree.x + 0.5,
    minZ: tree.z - 0.5,
    maxZ: tree.z + 0.5,
  })),
  // Batu besar
  ...ROCKS.filter((rock) => rock.scale >= 0.9).map((rock) => ({
    minX: rock.x - rock.scale * 0.75,
    maxX: rock.x + rock.scale * 0.75,
    minZ: rock.z - rock.scale * 0.75,
    maxZ: rock.z + rock.scale * 0.75,
  })),
  // Papan informasi fakta
  ...INFO_BOARDS.map((board) => ({
    minX: board.position[0] - 0.9,
    maxX: board.position[0] + 0.9,
    minZ: board.position[2] - 0.55,
    maxZ: board.position[2] + 0.55,
  })),
];

/**
 * Empat titik misi di lembah. Penanda berada di depan formasi alam,
 * jadi pemain selalu bisa berdiri tepat di titik misi.
 */
export const MISSION_ZONES: MissionZone[] = [
  {
    id: 'EARTHQUAKE',
    name: LEVELS.EARTHQUAKE.title,
    icon: '🏚️',
    color: '#f59e0b',
    position: [-15, 0, -10],
    description: LEVELS.EARTHQUAKE.description,
  },
  {
    id: 'FLOOD',
    name: LEVELS.FLOOD.title,
    icon: '🌊',
    color: '#3b82f6',
    position: [16, 0, 11],
    description: LEVELS.FLOOD.description,
  },
  {
    id: 'LANDSLIDE',
    name: LEVELS.LANDSLIDE.title,
    icon: '⛰️',
    color: '#a16207',
    position: [-16, 0, 12],
    description: LEVELS.LANDSLIDE.description,
  },
  {
    id: 'VOLCANO',
    name: LEVELS.VOLCANO.title,
    icon: '🌋',
    color: '#ef4444',
    position: [15, 0, -13],
    description: LEVELS.VOLCANO.description,
  },
];

export const AVATAR_PALETTE: Record<string, { main: string; dark: string; light: string }> = {
  red: { main: '#ef4444', dark: '#991b1b', light: '#fca5a5' },
  blue: { main: '#3b82f6', dark: '#1e40af', light: '#93c5fd' },
  green: { main: '#22c55e', dark: '#166534', light: '#86efac' },
  purple: { main: '#8b5cf6', dark: '#5b21b6', light: '#c4b5fd' },
  pink: { main: '#ec4899', dark: '#9d174d', light: '#f9a8d4' },
  amber: { main: '#f59e0b', dark: '#92400e', light: '#fcd34d' },
};

export const avatarPalette = (color?: string) =>
  (color && AVATAR_PALETTE[color]) || { main: '#6366f1', dark: '#3730a3', light: '#a5b4fc' };

/** Cek apakah posisi pemain menabrak formasi alam/batas dunia. */
export function isBlocked(x: number, z: number, radius = PLAYER_RADIUS): boolean {
  if (
    x - radius < WORLD_BOUNDS.minX ||
    x + radius > WORLD_BOUNDS.maxX ||
    z - radius < WORLD_BOUNDS.minZ ||
    z + radius > WORLD_BOUNDS.maxZ
  ) {
    return true;
  }

  return COLLIDERS.some(
    (box) =>
      x + radius > box.minX &&
      x - radius < box.maxX &&
      z + radius > box.minZ &&
      z - radius < box.maxZ
  );
}
