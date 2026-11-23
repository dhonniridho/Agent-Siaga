import React, { useEffect, useId, useRef } from 'react';
import { LogOut, Play, Trees } from 'lucide-react';

export interface ExitConfirmDialogProps {
  /** Apakah dialog sedang tampil. */
  open: boolean;
  /** Tutup dialog tanpa keluar (tombol "Lanjut Main" / klik di luar). */
  onClose: () => void;
  /** Keluar total ke menu utama (progres direset oleh pemanggil). */
  onConfirm: () => void;
  /** Opsional: keluar dari misi tetapi kembali ke dunia 3D (progres tetap). */
  onExitToWorld?: () => void;
  /** Opsional: dipanggil saat Esc ditekan ketika dialog masih tertutup. */
  onRequestOpen?: () => void;
  playSound?: (type: string) => void;
  title?: string;
  description?: string;
  cancelLabel?: string;
  confirmLabel?: string;
  worldLabel?: string;
}

/**
 * Dialog konfirmasi keluar yang ramah anak.
 * - Klik di luar dialog atau "Lanjut Main" menutup dialog.
 * - Tombol Esc menutup dialog (dan membukanya bila `onRequestOpen` tersedia).
 * - `onExitToWorld` hanya dipakai di layar level supaya pemain bisa kembali
 *   ke dunia 3D tanpa kehilangan progres zona yang sudah selesai.
 */
export const ExitConfirmDialog: React.FC<ExitConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  onExitToWorld,
  onRequestOpen,
  playSound,
  title = 'Mau keluar dari misi?',
  description = 'Skor dan progres timmu akan dihapus kalau kembali ke Menu. Pilih "Lanjut Main" untuk tetap bermain.',
  cancelLabel = 'Lanjut Main',
  confirmLabel = 'Keluar ke Menu',
  worldLabel = 'Kembali ke Dunia 3D',
}) => {
  const titleId = useId();
  const descriptionId = useId();
  const continueRef = useRef<HTMLButtonElement>(null);

  // Fokuskan tombol aman saat dialog terbuka supaya keyboard/touch langsung siap.
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => continueRef.current?.focus(), 40);
    return () => window.clearTimeout(timer);
  }, [open]);

  // Cegah halaman di belakang ikut ter-scroll selama dialog tampil.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Esc: menutup saat terbuka, membuka saat tertutup (desktop).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (open) {
        event.preventDefault();
        onClose();
      } else if (onRequestOpen) {
        event.preventDefault();
        onRequestOpen();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose, onRequestOpen]);

  if (!open) return null;

  const handleClose = () => {
    playSound?.('click');
    onClose();
  };

  const handleConfirm = () => {
    playSound?.('click');
    onConfirm();
  };

  const handleExitToWorld = () => {
    playSound?.('click');
    onExitToWorld?.();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      {/* Klik di luar dialog = batal keluar */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative z-10 w-full max-w-sm overflow-hidden rounded-[2rem] border-4 border-white bg-gradient-to-b from-indigo-50 via-white to-amber-50 p-5 text-center shadow-2xl sm:max-w-md sm:p-7"
      >
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-orange-400 text-4xl shadow-inner">
          🧭
        </div>

        <h2
          id={titleId}
          className="font-display text-2xl font-black leading-tight text-slate-800 sm:text-3xl"
        >
          {title}
        </h2>
        <p
          id={descriptionId}
          className="mt-2 text-sm font-medium leading-relaxed text-slate-600"
        >
          {description}
        </p>

        <div className="mt-5 flex flex-col gap-2.5">
          <button
            ref={continueRef}
            type="button"
            onClick={handleClose}
            className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 text-lg font-black text-white shadow-lg shadow-indigo-300/60 transition-colors hover:bg-indigo-700 active:scale-[0.98]"
          >
            <Play size={22} fill="currentColor" />
            {cancelLabel}
          </button>

          {onExitToWorld && (
            <button
              type="button"
              onClick={handleExitToWorld}
              className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl border-2 border-amber-300 bg-amber-100 px-5 text-base font-black text-amber-900 shadow-sm transition-colors hover:bg-amber-200 active:scale-[0.98]"
            >
              <Trees size={20} />
              {worldLabel}
            </button>
          )}

          <button
            type="button"
            onClick={handleConfirm}
            className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl border-2 border-rose-200 bg-white px-5 text-base font-black text-rose-600 transition-colors hover:border-rose-300 hover:bg-rose-50 active:scale-[0.98]"
          >
            <LogOut size={20} />
            {confirmLabel}
          </button>
        </div>

        <p className="mt-3 hidden text-[11px] font-bold text-slate-400 sm:block">
          Tekan <kbd className="rounded bg-slate-100 px-1.5 py-0.5">Esc</kbd> untuk menutup
        </p>
      </div>
    </div>
  );
};

export default ExitConfirmDialog;
