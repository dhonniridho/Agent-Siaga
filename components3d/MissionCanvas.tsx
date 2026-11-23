import React, { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { AlertTriangle, RefreshCw } from 'lucide-react';

function webglSupported() {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl'))
    );
  } catch {
    return false;
  }
}

class CanvasErrorBoundary extends React.Component<
  { children: React.ReactNode; onRetry: () => void },
  { failed: boolean }
> {
  constructor(props: { children: React.ReactNode; onRetry: () => void }) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-slate-900 p-6 text-center text-white">
          <AlertTriangle className="text-amber-300" size={44} />
          <p className="text-lg font-black">Scene 3D gagal dimuat</p>
          <p className="max-w-sm text-sm text-white/70">
            Perangkat ini mungkin perlu browser terbaru dengan dukungan WebGL.
          </p>
          <button
            onClick={this.props.onRetry}
            className="mt-2 flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-black text-slate-800"
          >
            <RefreshCw size={16} /> Coba Lagi
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export interface MissionCanvasProps {
  children: React.ReactNode;
  camera?: { position?: [number, number, number]; fov?: number; near?: number; far?: number };
  background?: string;
  fog?: { color: string; near: number; far: number };
  className?: string;
  dprMax?: number;
  onCreated?: () => void;
}

/**
 * Pembungkus Canvas R3F untuk semua scene misi/kuis 3D.
 * Menangani deteksi WebGL dan error boundary agar game tidak layar putih.
 */
export const MissionCanvas: React.FC<MissionCanvasProps> = ({
  children,
  camera = { position: [0, 5, 10], fov: 55 },
  background = '#0f172a',
  fog,
  className = '',
  dprMax = 1.5,
  onCreated,
}) => {
  const [supported] = useState(webglSupported);
  const [attempt, setAttempt] = useState(0);

  if (!supported) {
    return (
      <div className={`flex h-full w-full flex-col items-center justify-center gap-3 bg-slate-900 p-6 text-center text-white ${className}`}>
        <AlertTriangle className="text-amber-300" size={44} />
        <p className="text-lg font-black">Browser belum mendukung 3D</p>
        <p className="max-w-sm text-sm text-white/70">
          Aktifkan WebGL atau gunakan Chrome/Firefox terbaru untuk memainkan misi 3D.
        </p>
      </div>
    );
  }

  return (
    <div className={`relative h-full w-full ${className}`}>
      <CanvasErrorBoundary onRetry={() => setAttempt((value) => value + 1)}>
        <Canvas
          key={attempt}
          dpr={[1, dprMax]}
          shadows={false}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          camera={{ ...camera, near: camera.near ?? 0.1, far: camera.far ?? 400 }}
          onCreated={onCreated}
        >
          <color attach="background" args={[background]} />
          {fog && <fog attach="fog" args={[fog.color, fog.near, fog.far]} />}
          <hemisphereLight args={['#dbeafe', '#334155', 1.05]} />
          <directionalLight position={[18, 28, 12]} intensity={1.7} color="#fff7e8" />
          <directionalLight position={[-16, 14, -12]} intensity={0.45} color="#bfdbfe" />
          <ambientLight intensity={0.28} />
          <Suspense fallback={null}>{children}</Suspense>
        </Canvas>
      </CanvasErrorBoundary>
    </div>
  );
};
