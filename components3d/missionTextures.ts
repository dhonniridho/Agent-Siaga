import * as THREE from 'three';

/**
 * Tekstur teks dibuat langsung di canvas supaya scene 3D bisa menampilkan
 * papan pertanyaan, label pilihan, dan papan nama tanpa aset font eksternal.
 */

function makeCanvas(width = 1024, height = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function toTexture(canvas: HTMLCanvasElement) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

function roundRect(
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

export function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = 4
): string[] {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length >= maxLines - 1) break;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, maxLines);
}

export interface BoardTextureOptions {
  title?: string;
  text: string;
  footer?: string;
  emoji?: string;
  accent?: string;
  background?: string;
  textColor?: string;
  width?: number;
  height?: number;
  titleSize?: number;
  textSize?: number;
}

export function makeBoardTexture(options: BoardTextureOptions): THREE.CanvasTexture {
  const {
    title = '',
    text,
    footer = '',
    emoji = '',
    accent = '#6366f1',
    background = '#ffffff',
    textColor = '#1e293b',
    width = 1024,
    height = 512,
    titleSize = 46,
    textSize = 62,
  } = options;

  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) return toTexture(canvas);

  ctx.fillStyle = background;
  roundRect(ctx, 10, 10, width - 20, height - 20, 34);
  ctx.fill();

  // Garis aksen kiri
  ctx.fillStyle = accent;
  roundRect(ctx, 10, 10, 26, height - 20, 20);
  ctx.fill();

  let cursorY = 58;

  if (emoji) {
    ctx.font = `${Math.round(height * 0.18)}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(emoji, 62, cursorY - 6);
    cursorY += Math.round(height * 0.2);
  }

  if (title) {
    ctx.fillStyle = accent;
    ctx.font = `800 ${titleSize}px system-ui, "Segoe UI", sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(title.toUpperCase(), 62, cursorY);
    cursorY += titleSize + 22;
  }

  ctx.fillStyle = textColor;
  ctx.font = `700 ${textSize}px system-ui, "Segoe UI", sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const lines = wrapLines(ctx, text, width - 118, 4);
  const lineHeight = textSize * 1.22;
  for (const line of lines) {
    ctx.fillText(line, 62, cursorY);
    cursorY += lineHeight;
  }

  if (footer) {
    ctx.fillStyle = '#64748b';
    ctx.font = `600 ${Math.round(titleSize * 0.62)}px system-ui, "Segoe UI", sans-serif`;
    ctx.fillText(footer, 62, height - titleSize - 48);
  }

  return toTexture(canvas);
}

export function makePodiumTexture(
  letter: string,
  text: string,
  state: 'idle' | 'correct' | 'wrong' | 'dim' = 'idle',
  accent = '#6366f1'
): THREE.CanvasTexture {
  const width = 900;
  const height = 420;
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) return toTexture(canvas);

  const bg =
    state === 'correct' ? '#dcfce7' : state === 'wrong' ? '#fee2e2' : state === 'dim' ? '#f1f5f9' : '#ffffff';
  const border =
    state === 'correct' ? '#16a34a' : state === 'wrong' ? '#dc2626' : state === 'dim' ? '#cbd5e1' : accent;

  ctx.fillStyle = bg;
  roundRect(ctx, 12, 12, width - 24, height - 24, 40);
  ctx.fill();
  ctx.lineWidth = 16;
  ctx.strokeStyle = border;
  roundRect(ctx, 12, 12, width - 24, height - 24, 40);
  ctx.stroke();

  ctx.fillStyle = border;
  ctx.font = '800 96px system-ui, "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(letter, 54, 40);

  ctx.fillStyle = state === 'dim' ? '#94a3b8' : '#1e293b';
  ctx.font = '700 46px system-ui, "Segoe UI", sans-serif';
  const lines = wrapLines(ctx, text, width - 190, 4);
  let y = 72;
  for (const line of lines) {
    ctx.fillText(line, 178, y);
    y += 58;
  }

  if (state === 'correct') {
    ctx.font = '800 70px "Segoe UI Emoji", sans-serif';
    ctx.fillText('✓', width - 130, height - 130);
  } else if (state === 'wrong') {
    ctx.font = '800 70px "Segoe UI Emoji", sans-serif';
    ctx.fillText('✕', width - 130, height - 130);
  }

  return toTexture(canvas);
}

export function makeEmojiTexture(
  emoji: string,
  label: string,
  accent = '#f59e0b',
  highlighted = false
): THREE.CanvasTexture {
  const size = 512;
  const canvas = makeCanvas(size, size);
  const ctx = canvas.getContext('2d');
  if (!ctx) return toTexture(canvas);

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = highlighted ? '#ffffff' : 'rgba(255,255,255,0.88)';
  roundRect(ctx, 20, 20, size - 40, size - 40, 80);
  ctx.fill();
  ctx.lineWidth = highlighted ? 22 : 12;
  ctx.strokeStyle = accent;
  roundRect(ctx, 20, 20, size - 40, size - 40, 80);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '220px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
  ctx.fillText(emoji, size / 2, size * 0.43);

  ctx.fillStyle = '#1e293b';
  ctx.font = '800 46px system-ui, "Segoe UI", sans-serif';
  const lines = wrapLines(ctx, label, size - 80, 2);
  let y = size * 0.76;
  for (const line of lines) {
    ctx.fillText(line, size / 2, y);
    y += 48;
  }

  return toTexture(canvas);
}

export function makeNameTagTexture(name: string, accent = '#6366f1'): THREE.CanvasTexture {
  const width = 768;
  const height = 240;
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) return toTexture(canvas);

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = 'rgba(15,23,42,.95)';
  ctx.lineWidth = 9;
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(15,23,42,.8)';
  ctx.shadowBlur = 10;
  ctx.font = '900 74px system-ui, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lines = wrapLines(ctx, name || 'Tim Agent', width - 100, 2);
  if (lines.length > 1) ctx.font = '900 58px system-ui, "Segoe UI", sans-serif';
  lines.forEach((line, index) => {
    const y = 85 + (index - (lines.length - 1) / 2) * 62;
    ctx.strokeText(line, width / 2, y);
    ctx.fillText(line, width / 2, y);
  });
  ctx.beginPath();
  ctx.moveTo(width / 2 - 24, 171);
  ctx.lineTo(width / 2 + 24, 171);
  ctx.lineTo(width / 2, 219);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = 'rgba(15,23,42,.95)';
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.fill();

  return toTexture(canvas);
}
