import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

/**
 * Tekstur label dibuat langsung di canvas (tanpa file gambar baru),
 * supaya dunia tetap ringan dan tidak perlu memuat font/aset eksternal.
 */

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startSize: number,
  weight = '700'
) {
  let size = startSize;
  do {
    ctx.font = `${weight} ${size}px system-ui, "Segoe UI", sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  } while (size > 18);
  return size;
}

function makeCanvasTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

/** PRNG kecil supaya tekstur alam tetap konsisten tiap kali dibuat. */
function seeded(seed: number) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/* Tekstur alam: rumput, tanah, air, kayu                              */
/* ------------------------------------------------------------------ */

function drawGrassTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const random = seeded(20261116);

  ctx.fillStyle = '#6aa74d';
  ctx.fillRect(0, 0, 512, 512);

  // Bercak terang/gelap agar tanah tidak terlihat datar.
  for (let i = 0; i < 70; i += 1) {
    const x = random() * 512;
    const y = random() * 512;
    const radius = 18 + random() * 52;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    const light = random() > 0.5;
    gradient.addColorStop(0, light ? 'rgba(155, 205, 106, 0.28)' : 'rgba(58, 116, 49, 0.24)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Helai rumput kecil.
  const blades = ['#4e8b37', '#5e9f41', '#7fbf5a', '#92cd68', '#3f7a30'];
  for (let i = 0; i < 4200; i += 1) {
    const x = random() * 512;
    const y = random() * 512;
    const height = 2 + random() * 5;
    ctx.strokeStyle = blades[Math.floor(random() * blades.length)];
    ctx.globalAlpha = 0.25 + random() * 0.45;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (random() - 0.5) * 3, y - height);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  return canvas;
}

function drawDirtTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const random = seeded(77123);

  ctx.fillStyle = '#c6a271';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 900; i += 1) {
    const x = random() * 512;
    const y = random() * 512;
    const size = 1 + random() * 4;
    ctx.fillStyle = random() > 0.5 ? 'rgba(120, 86, 52, 0.28)' : 'rgba(239, 219, 180, 0.3)';
    ctx.beginPath();
    ctx.ellipse(x, y, size, size * 0.65, random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  // Kerikil.
  for (let i = 0; i < 70; i += 1) {
    const x = random() * 512;
    const y = random() * 512;
    const radius = 2 + random() * 4;
    ctx.fillStyle = random() > 0.4 ? '#a58a63' : '#8c7352';
    ctx.beginPath();
    ctx.ellipse(x, y, radius, radius * 0.7, random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas;
}

function drawWaterTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const random = seeded(4419);

  const gradient = ctx.createLinearGradient(0, 0, 512, 512);
  gradient.addColorStop(0, '#2f86c8');
  gradient.addColorStop(0.5, '#3b9fdc');
  gradient.addColorStop(1, '#2472b0');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);

  // Riak air melengkung.
  for (let i = 0; i < 90; i += 1) {
    const y = random() * 512;
    const x = random() * 512;
    const width = 24 + random() * 90;
    ctx.strokeStyle = random() > 0.5 ? 'rgba(191, 232, 255, 0.42)' : 'rgba(20, 82, 132, 0.3)';
    ctx.lineWidth = 1.5 + random() * 2;
    ctx.beginPath();
    ctx.arc(x, y, width, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }

  return canvas;
}

function drawWoodTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const random = seeded(9091);

  ctx.fillStyle = '#9a6a3c';
  ctx.fillRect(0, 0, 512, 512);

  // Papan kayu.
  for (let plank = 0; plank < 5; plank += 1) {
    const y = plank * 102;
    ctx.fillStyle = plank % 2 === 0 ? '#a57343' : '#936335';
    ctx.fillRect(0, y, 512, 102);
    ctx.strokeStyle = 'rgba(72, 44, 20, 0.55)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, y + 101);
    ctx.lineTo(512, y + 101);
    ctx.stroke();
  }

  // Serat kayu.
  for (let i = 0; i < 160; i += 1) {
    const y = random() * 512;
    const x = random() * 512;
    const length = 30 + random() * 140;
    ctx.strokeStyle = random() > 0.5 ? 'rgba(90, 55, 28, 0.35)' : 'rgba(203, 159, 108, 0.28)';
    ctx.lineWidth = 0.8 + random() * 1.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + length * 0.3, y - 3, x + length * 0.6, y + 3, x + length, y);
    ctx.stroke();
  }

  return canvas;
}

export function useGrassTexture() {
  const texture = useMemo(() => makeCanvasTexture(drawGrassTexture()), []);
  useEffect(() => {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(14, 14);
    texture.needsUpdate = true;
    return () => texture.dispose();
  }, [texture]);
  return texture;
}

export function useDirtTexture(repeatX = 1, repeatY = 3) {
  const texture = useMemo(() => makeCanvasTexture(drawDirtTexture()), []);
  useEffect(() => {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
    texture.needsUpdate = true;
    return () => texture.dispose();
  }, [texture, repeatX, repeatY]);
  return texture;
}

export function useWaterTexture() {
  const texture = useMemo(() => makeCanvasTexture(drawWaterTexture()), []);
  useEffect(() => {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 3);
    texture.needsUpdate = true;
    return () => texture.dispose();
  }, [texture]);
  return texture;
}

export function useWoodTexture(repeatX = 2, repeatY = 1) {
  const texture = useMemo(() => makeCanvasTexture(drawWoodTexture()), []);
  useEffect(() => {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
    texture.needsUpdate = true;
    return () => texture.dispose();
  }, [texture, repeatX, repeatY]);
  return texture;
}


function drawLabel(icon: string, title: string, subtitle: string, color: string, completed: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Kartu putih membulat
  ctx.save();
  ctx.shadowColor = 'rgba(15, 23, 42, 0.28)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;
  roundedRect(ctx, 20, 20, 600, 280, 52);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
  ctx.fill();
  ctx.restore();

  // Garis warna zona
  roundedRect(ctx, 20, 20, 600, 280, 52);
  ctx.lineWidth = 12;
  ctx.strokeStyle = completed ? '#10b981' : color;
  ctx.stroke();

  // Ikon
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = '112px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
  ctx.fillText(completed ? '✅' : icon, 52, 152);

  // Judul
  const titleSize = fitText(ctx, title, 390, 52, '800');
  ctx.fillStyle = '#0f172a';
  ctx.font = `800 ${titleSize}px system-ui, "Segoe UI", sans-serif`;
  ctx.fillText(title, 196, 130);

  // Subjudul
  const subSize = fitText(ctx, subtitle, 390, 30, '700');
  ctx.fillStyle = completed ? '#047857' : '#475569';
  ctx.font = `700 ${subSize}px system-ui, "Segoe UI", sans-serif`;
  ctx.fillText(subtitle, 198, 196);

  return canvas;
}

function drawNameTag(icon: string, name: string, color: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.shadowColor = 'rgba(15, 23, 42, 0.25)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  roundedRect(ctx, 8, 8, 496, 112, 42);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
  ctx.fill();
  ctx.restore();

  roundedRect(ctx, 8, 8, 496, 112, 42);
  ctx.lineWidth = 8;
  ctx.strokeStyle = color;
  ctx.stroke();

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.font = '58px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
  ctx.fillText(icon, 28, 66);

  const size = fitText(ctx, name, 360, 46, '800');
  ctx.fillStyle = '#0f172a';
  ctx.font = `800 ${size}px system-ui, "Segoe UI", sans-serif`;
  ctx.fillText(name, 104, 66);

  return canvas;
}

export function useZoneLabelTexture(
  icon: string,
  title: string,
  subtitle: string,
  color: string,
  completed: boolean
) {
  const texture = useMemo(
    () => makeCanvasTexture(drawLabel(icon, title, subtitle, color, completed)),
    [icon, title, subtitle, color, completed]
  );
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

export function useNameTagTexture(icon: string, name: string, color: string) {
  const texture = useMemo(
    () => makeCanvasTexture(drawNameTag(icon, name, color)),
    [icon, name, color]
  );
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function drawNatureSign() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Papan kayu dengan bayangan.
  ctx.save();
  ctx.shadowColor = 'rgba(15, 23, 42, 0.35)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 10;
  roundedRect(ctx, 16, 16, 992, 288, 40);
  ctx.fillStyle = '#8b5a2b';
  ctx.fill();
  ctx.restore();

  roundedRect(ctx, 16, 16, 992, 288, 40);
  ctx.lineWidth = 12;
  ctx.strokeStyle = '#5b3a1b';
  ctx.stroke();

  // Serat papan.
  for (let i = 0; i < 42; i += 1) {
    const y = 34 + i * 6;
    ctx.strokeStyle = i % 3 === 0 ? 'rgba(72, 44, 20, 0.3)' : 'rgba(216, 173, 122, 0.16)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(32, y);
    ctx.bezierCurveTo(260, y - 4, 640, y + 5, 992, y);
    ctx.stroke();
  }

  // Panel krem di tengah.
  roundedRect(ctx, 48, 44, 928, 232, 28);
  ctx.fillStyle = '#fdf3dc';
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#d9b97c';
  ctx.stroke();

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.font = '92px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
  ctx.fillText('🏕️', 86, 150);

  const title = 'JELAJAH ALAM SIAGA';
  const titleSize = fitText(ctx, title, 690, 76, '800');
  ctx.fillStyle = '#3f2a12';
  ctx.font = `800 ${titleSize}px system-ui, "Segoe UI", sans-serif`;
  ctx.fillText(title, 196, 126);

  ctx.fillStyle = '#8a5a2b';
  ctx.font = '700 32px system-ui, "Segoe UI", sans-serif';
  ctx.fillText('4 ZONA BENCANA  •  MISI PENYELAMATAN BUMI', 198, 206);

  return canvas;
}

export function useSignTexture() {
  const texture = useMemo(() => makeCanvasTexture(drawNatureSign()), []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

/* ------------------------------------------------------------------ */
/* Papan informasi fakta                                               */
/* ------------------------------------------------------------------ */

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawFactBoard(title: string, facts: string[], icon: string, color: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 640;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Kartu dasar kertas.
  ctx.save();
  ctx.shadowColor = 'rgba(15, 23, 42, 0.28)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;
  roundedRect(ctx, 16, 16, 736, 608, 40);
  ctx.fillStyle = '#fdf4df';
  ctx.fill();
  ctx.restore();

  // Serat kertas halus.
  const random = seeded(9127);
  for (let i = 0; i < 130; i += 1) {
    const x = 30 + random() * 708;
    const y = 30 + random() * 580;
    ctx.fillStyle = random() > 0.5 ? 'rgba(150, 113, 63, 0.09)' : 'rgba(255, 255, 255, 0.4)';
    ctx.fillRect(x, y, 2 + random() * 7, 1);
  }

  roundedRect(ctx, 16, 16, 736, 608, 40);
  ctx.lineWidth = 12;
  ctx.strokeStyle = color;
  ctx.stroke();

  roundedRect(ctx, 32, 32, 704, 104, 28);
  ctx.fillStyle = color;
  ctx.fill();

  // Sudut paku kecil.
  [
    [44, 44],
    [724, 44],
    [44, 596],
    [724, 596],
  ].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#d6b88a';
    ctx.fill();
  });

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.font = '62px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
  ctx.fillText(icon, 56, 86);

  const titleSize = fitText(ctx, title, 520, 48, '800');
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 ${titleSize}px system-ui, "Segoe UI", sans-serif`;
  ctx.fillText(title, 138, 86);

  // Daftar fakta bernomor
  const bodyWidth = 640;
  const factFont = 29;
  const lineHeight = 38;
  let y = 176;
  const startY = y;
  const bottomLimit = 572;

  // Hitung dulu tinggi total supaya bisa menyesuaikan ukuran font.
  const estimated = facts.reduce((total, fact) => {
    ctx.font = `700 ${factFont}px system-ui, "Segoe UI", sans-serif`;
    return total + wrapLines(ctx, fact, bodyWidth).length * lineHeight + 18;
  }, 0);
  const shrink = estimated > bottomLimit - startY ? 0.82 : 1;
  const size = Math.round(factFont * shrink);
  const lh = Math.round(lineHeight * shrink);

  facts.forEach((fact, index) => {
    // Nomor
    ctx.beginPath();
    ctx.arc(66, y + 2, 20, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 ${Math.round(24 * shrink)}px system-ui, "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(String(index + 1), 66, y + 3);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#1e293b';
    ctx.font = `700 ${size}px system-ui, "Segoe UI", sans-serif`;
    const lines = wrapLines(ctx, fact, bodyWidth);
    lines.forEach((line, lineIndex) => {
      ctx.fillText(line, 104, y + lineIndex * lh);
    });
    y += lines.length * lh + 18;
  });

  ctx.strokeStyle = 'rgba(138, 90, 43, 0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(64, 606);
  ctx.lineTo(704, 606);
  ctx.stroke();

  ctx.fillStyle = '#8a5a2b';
  ctx.font = '700 20px system-ui, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('JELAJAH ALAM SIAGA  •  PAPAN FAKTA', 384, 622);

  return canvas;
}

export function useFactBoardTexture(title: string, facts: string[], icon: string, color: string) {
  const texture = useMemo(
    () => makeCanvasTexture(drawFactBoard(title, facts, icon, color)),
    [title, facts, icon, color]
  );
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

/* ------------------------------------------------------------------ */
/* Balon bicara Kapten Siaga                                           */
/* ------------------------------------------------------------------ */

function drawSpeechBubble(message: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 704;
  canvas.height = 352;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.shadowColor = 'rgba(15, 23, 42, 0.28)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;
  roundedRect(ctx, 16, 16, 672, 268, 42);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.97)';
  ctx.fill();
  ctx.restore();

  roundedRect(ctx, 16, 16, 672, 268, 42);
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#f59e0b';
  ctx.stroke();

  // Ekor balon ke arah Kapten (kiri bawah)
  ctx.beginPath();
  ctx.moveTo(94, 278);
  ctx.lineTo(64, 330);
  ctx.lineTo(148, 282);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.97)';
  ctx.fill();
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 10;
  ctx.stroke();

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  ctx.fillStyle = '#b45309';
  ctx.font = '800 27px system-ui, "Segoe UI", sans-serif';
  ctx.fillText('KAPTEN SIAGA', 48, 56);

  ctx.fillStyle = '#1e293b';
  const messageSize = fitText(ctx, message, 592, 34, '700');
  ctx.font = `700 ${messageSize}px system-ui, "Segoe UI", sans-serif`;

  if (messageSize >= 30) {
    const lines = wrapLines(ctx, message, 592);
    const lh = 42;
    const total = lines.length * lh;
    let y = 72 + Math.max(0, (210 - total) / 2) + lh / 2;
    for (const line of lines.slice(0, 4)) {
      ctx.fillText(line, 48, y);
      y += lh;
    }
  } else {
    ctx.fillText(message, 48, 148);
  }

  return canvas;
}

export function useSpeechBubbleTexture(message: string) {
  const texture = useMemo(() => makeCanvasTexture(drawSpeechBubble(message)), [message]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}
