import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Compass,
  Lightbulb,
  ListChecks,
  Play,
  RotateCcw,
  Target,
  X,
} from 'lucide-react';
import { WORLD_FACTS } from '../../constants';
import type { DisasterType } from '../../types';
import type { MissionZone } from './worldConfig';
import { ZONE_INFO } from './zoneInfo';

// Samakan dengan komponen lain: cast agar tipe framer-motion tidak bentrok.
const MotionDiv = motion.div as any;

interface ZonePhoto {
  /** URL langsung berkas di Wikimedia Commons (sudah diverifikasi). */
  src: string;
  alt: string;
  /** Nama kejadian + lokasi, ditampilkan sebagai penjelasan singkat. */
  caption: string;
  /** Kredit pembuat/lisensi sesuai metadata Wikimedia Commons. */
  credit: string;
}

/**
 * Galeri 3 foto dokumenter kejadian nyata DI INDONESIA untuk tiap zona.
 * Seluruh berkas berasal dari Wikimedia Commons dan dipilih dari kategori
 * bencana Indonesia (BNPB, Badan Geologi, Antara, dan mitra lokal).
 * Siswa bisa bergeser lewat tombol panah atau indikator titik sebelum
 * menekan tombol "Mulai Misi".
 */
const ZONE_PHOTOS: Record<DisasterType, ZonePhoto[]> = {
  EARTHQUAKE: [
    {
      src: 'https://upload.wikimedia.org/wikipedia/commons/3/3b/Cianjur_earthquake_damage_1.jpg',
      alt: 'Bangunan warga roboh akibat gempa Cianjur 2022 di Jawa Barat',
      caption: 'Gempa Cianjur 2022 · Jawa Barat',
      credit: 'Foto: BNPB / Wikimedia Commons (Public Domain)',
    },
    {
      src: 'https://upload.wikimedia.org/wikipedia/commons/7/74/Cianjur_earthquake_damage_3.jpg',
      alt: 'Rumah dan bangunan rusak akibat gempa di Kabupaten Cianjur, Jawa Barat',
      caption: 'Kerusakan bangunan · Cianjur',
      credit: 'Foto: BNPB / Wikimedia Commons (Public Domain)',
    },
    {
      src: 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Cianjur_earthquake_damage_4.jpg',
      alt: 'Tim SAR mengevakuasi korban dari bangunan yang roboh akibat gempa Cianjur',
      caption: 'Evakuasi tim SAR · Cianjur',
      credit: 'Foto: BNPB / Wikimedia Commons (Public Domain)',
    },
  ],
  FLOOD: [
    {
      src: 'https://upload.wikimedia.org/wikipedia/commons/2/22/Banjir_Bandang_Luwu_2020.png',
      alt: 'Dampak banjir bandang yang melanda Kabupaten Luwu, Sulawesi Selatan, tahun 2020',
      caption: 'Banjir Bandang Luwu 2020 · Sulawesi Selatan',
      credit: 'Foto: BNPB / Wikimedia Commons (Public Domain)',
    },
    {
      src: 'https://upload.wikimedia.org/wikipedia/commons/0/0d/Banjir_Bandang_di_Malampah_Setelah_Gempa_Pasaman_Barat_2022.jpg',
      alt: 'Banjir bandang di Malampah, Pasaman Barat, Sumatra Barat, tahun 2022',
      caption: 'Banjir bandang Malampah · Sumatra Barat',
      credit: 'Foto: Badan Geologi ESDM / Wikimedia Commons (Public Domain)',
    },
    {
      src: 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Rumah-rumah_warga_masih_terendam_air_paska_banjir_bandang_Gorontalo_2024.jpg',
      alt: 'Rumah warga masih terendam air setelah banjir bandang Gorontalo 2024',
      caption: 'Banjir bandang Gorontalo 2024',
      credit: 'Foto: Sandy Syafrudin Nina / Wikimedia Commons (CC BY 4.0)',
    },
  ],
  LANDSLIDE: [
    {
      src: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Longsor_Sumedang%2C_Jawa_Barat.jpg',
      alt: 'Permukiman warga tertimpa tanah longsor di Sumedang, Jawa Barat, tahun 2021',
      caption: 'Longsor Sumedang 2021 · Jawa Barat',
      credit: 'Foto: BNPB / Wikimedia Commons (Public Domain)',
    },
    {
      src: 'https://upload.wikimedia.org/wikipedia/commons/4/47/Longsor_Kilometer_171_Tanah_Bumbu.jpg',
      alt: 'Ruas jalan tertutup material tanah longsor di Kilometer 171 Tanah Bumbu',
      caption: 'Longsor Tanah Bumbu · Kalimantan Selatan',
      credit: 'Foto: Radio Rakyat Indonesia Banjarmasin / Wikimedia Commons (Public Domain)',
    },
    {
      src: 'https://upload.wikimedia.org/wikipedia/commons/f/f7/Tebing_longsor_di_Kec_Peunaron_Aceh_Timur_051225_%281%29.jpg',
      alt: 'Tebing longsor menutup jalan di Kecamatan Peunaron, Aceh Timur',
      caption: 'Tebing longsor · Aceh Timur',
      credit: 'Foto: BNPB / Wikimedia Commons (Public Domain)',
    },
  ],
  VOLCANO: [
    {
      src: 'https://upload.wikimedia.org/wikipedia/commons/0/02/2021_Semeru_Eruption_from_Oro_Oro_Ombo.jpg',
      alt: 'Awan abu tebal saat erupsi Gunung Semeru 2021 terlihat dari Oro Oro Ombo',
      caption: 'Erupsi Gunung Semeru 2021 · Jawa Timur',
      credit: 'Foto: BNPB / Wikimedia Commons (Public Domain)',
    },
    {
      src: 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Ratusan_rumah_tertimbun_abu_vulkanik_erupsi_gunung_Semeru.jpg',
      alt: 'Ratusan rumah warga di lereng Gunung Semeru tertimbun abu vulkanik',
      caption: 'Abu vulkanik Semeru · Lumajang',
      credit: 'Foto: Antara TV / Wikimedia Commons (CC BY 3.0)',
    },
    {
      src: 'https://upload.wikimedia.org/wikipedia/commons/b/ba/Aerial_view_of_lahar_damage_from_Mount_Semeru_eruption.jpg',
      alt: 'Pemandangan udara kawasan permukiman yang rusak akibat lahar Gunung Semeru',
      caption: 'Dampak lahar Semeru · Lumajang',
      credit: 'Foto: BNPB / Wikimedia Commons (Public Domain)',
    },
  ],
};

interface ZoneInfoCardProps {
  zone: MissionZone;
  completed: boolean;
  /** True setelah papan/zona ini pernah dibuka pada sesi ini. */
  read: boolean;
  onClose: () => void;
  /** Memulai misi zona ini (dipanggil hanya saat tombol Mulai Misi ditekan). */
  onStartMission: (zoneId: DisasterType) => void;
  playSound?: (type: string) => void;
}

/**
 * Kartu informasi zona ala "Jelajah PTI": visual besar di kiri dan
 * penjelasan singkat di kanan. Di layar sempit kedua kolom bertumpuk.
 *
 * Catatan: kartu ini hanya mengurus tampilan + input Esc/klik luar.
 * Kontrol pemain & kamera dikunci oleh pemanggil selama kartu terbuka.
 */
export const ZoneInfoCard: React.FC<ZoneInfoCardProps> = ({
  zone,
  completed,
  read,
  onClose,
  onStartMission,
  playSound,
}) => {
  const info = ZONE_INFO[zone.id];
  const photos = ZONE_PHOTOS[zone.id];
  const facts = WORLD_FACTS[zone.id];
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  // Galeri foto: mulai dari foto pertama setiap kali zona berbeda dibuka.
  const [photoIndex, setPhotoIndex] = useState(0);
  const [brokenPhotos, setBrokenPhotos] = useState<string[]>([]);
  const photo = photos[photoIndex];

  useEffect(() => {
    setPhotoIndex(0);
    setBrokenPhotos([]);
  }, [zone.id]);

  const showPhoto = (next: number) => {
    setPhotoIndex(((next % photos.length) + photos.length) % photos.length);
  };

  const markBroken = (src: string) => {
    setBrokenPhotos((prev) => (prev.includes(src) ? prev : [...prev, src]));
  };

  const handleClose = () => {
    playSound?.('click');
    onClose();
  };

  const handleStart = () => {
    // Zona selesai tetap bisa dimainkan ulang (replay kapan saja).
    playSound?.('click');
    onStartMission(zone.id);
  };

  // Esc menutup kartu ini saja. Listener capture + stopPropagation mencegah
  // dialog Keluar ikut terbuka (ExitConfirmDialog memakai listener biasa).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      playSound?.('click');
      onClose();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [onClose, playSound]);

  // Fokuskan tombol tutup supaya keyboard/touch langsung siap.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => closeRef.current?.focus(), 50);
    return () => {
      window.clearTimeout(timer);
      previous?.focus?.();
    };
  }, []);

  // Jangan biarkan halaman di belakang ikut ter-scroll.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return createPortal(
    <MotionDiv
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-2 sm:p-5"
      style={{ touchAction: 'pan-y' }}
    >
      {/* Klik di luar kartu = tutup */}
      <div
        className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      <MotionDiv
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ y: 28, scale: 0.96, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 18, scale: 0.98, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26, mass: 0.8 }}
        onClick={(event: React.MouseEvent) => event.stopPropagation()}
        className="relative z-10 max-h-[92vh] w-full max-w-3xl overflow-y-auto overscroll-contain rounded-[1.75rem] border-4 border-white bg-white shadow-2xl sm:rounded-[2rem]"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={handleClose}
          className="absolute right-3 top-3 z-30 flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/80 bg-white/90 text-slate-500 shadow-lg outline-none transition-colors hover:bg-white hover:text-slate-800 focus-visible:ring-4 focus-visible:ring-sky-300/70 active:scale-95 sm:h-11 sm:w-11"
          aria-label="Tutup kartu informasi zona"
          title="Tutup (Esc)"
        >
          <X size={21} />
        </button>

        <div className="grid sm:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
          {/* ---------------- Panel visual kiri ---------------- */}
          <div
            className="relative flex min-h-[10.5rem] items-center justify-center overflow-hidden p-4 sm:min-h-[25rem] sm:flex-col sm:p-6"
            style={{
              background: `linear-gradient(150deg, ${zone.color} 0%, #172033 118%)`,
            }}
          >
            {/* Galeri foto dokumenter kejadian nyata di Indonesia */}
            <AnimatePresence initial={false}>
              {!brokenPhotos.includes(photo.src) ? (
                <motion.img
                  key={photo.src}
                  src={photo.src}
                  alt={photo.alt}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 h-full w-full object-cover"
                  loading={photoIndex === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  onError={() => markBroken(photo.src)}
                />
              ) : (
                <MotionDiv
                  key={`fallback-${photo.src}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/85"
                >
                  <span className="text-6xl" role="img" aria-label={info.title}>
                    {zone.icon}
                  </span>
                  <span className="px-4 text-center text-xs font-bold">
                    Foto belum tersedia · {photo.caption}
                  </span>
                </MotionDiv>
              )}
            </AnimatePresence>
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: `linear-gradient(160deg, ${zone.color}a6 0%, rgba(15,23,42,0.28) 46%, rgba(15,23,42,0.88) 100%)`,
              }}
              aria-hidden="true"
            />

            {/* Nama kejadian + kredit foto, berganti mengikuti foto aktif */}
            <div className="absolute left-3 top-3 z-20 max-w-[74%] rounded-xl bg-slate-950/55 px-2.5 py-1.5 backdrop-blur-sm">
              <p className="text-[10px] font-black leading-tight text-white sm:text-[11px]">
                {photo.caption}{' '}
                <span className="font-bold text-white/60">
                  ({photoIndex + 1}/{photos.length})
                </span>
              </p>
              <p className="mt-0.5 text-[8px] font-bold leading-tight text-white/70 sm:text-[9px]">
                {photo.credit}
              </p>
            </div>

            {/* Tombol geser kiri/kanan + indikator titik */}
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => showPhoto(photoIndex - 1)}
                  className="absolute left-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/50 bg-slate-950/45 text-white shadow-lg backdrop-blur-sm transition hover:bg-slate-950/75 focus-visible:ring-4 focus-visible:ring-white/50 active:scale-90"
                  aria-label="Lihat foto sebelumnya"
                  title="Foto sebelumnya"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  onClick={() => showPhoto(photoIndex + 1)}
                  className="absolute right-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/50 bg-slate-950/45 text-white shadow-lg backdrop-blur-sm transition hover:bg-slate-950/75 focus-visible:ring-4 focus-visible:ring-white/50 active:scale-90"
                  aria-label="Lihat foto berikutnya"
                  title="Foto berikutnya"
                >
                  <ChevronRight size={20} />
                </button>
                <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 sm:bottom-12">
                  {photos.map((item, index) => (
                    <button
                      key={item.src}
                      type="button"
                      onClick={() => showPhoto(index)}
                      aria-label={`Lihat foto ${index + 1} dari ${photos.length}`}
                      aria-current={index === photoIndex ? 'true' : undefined}
                      className={`h-2.5 rounded-full border transition-all ${
                        index === photoIndex
                          ? 'w-7 border-white bg-white'
                          : 'w-2.5 border-white/70 bg-white/30 hover:bg-white/60'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}

            <div className="relative flex items-center gap-4 text-white sm:flex-col sm:gap-5 sm:text-center">
              <div className="relative flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-[1.5rem] border-4 border-white/40 bg-white/20 shadow-2xl backdrop-blur-sm sm:h-40 sm:w-40 sm:rounded-[2rem]">
                <div className="absolute inset-2 rounded-[1.1rem] border border-white/30 sm:inset-3 sm:rounded-[1.5rem]" />
                <span
                  className="text-6xl leading-none drop-shadow-lg sm:text-8xl"
                  role="img"
                  aria-label={info.title}
                >
                  {zone.icon}
                </span>
              </div>

              <div className="min-w-0 text-left drop-shadow-md sm:text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/85 sm:text-xs">
                  Zona {info.code}
                </p>
                <p className="font-display mt-0.5 text-2xl font-black leading-tight sm:mt-1 sm:text-3xl">
                  {info.title}
                </p>
              </div>
            </div>

            <div className="absolute bottom-3 left-1/2 hidden -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border border-white/25 bg-slate-950/40 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white/85 backdrop-blur-sm sm:flex">
              <Target size={12} />
              Jelajah Alam Siaga
            </div>
          </div>

          {/* ---------------- Panel teks kanan ---------------- */}
          <div className="flex min-w-0 flex-col gap-3 p-5 pt-6 sm:gap-3.5 sm:p-6">
            <div>
              <p
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.22em]"
                style={{ backgroundColor: `${zone.color}18`, color: zone.color }}
              >
                <Target size={12} />
                Kode zona {info.code}
              </p>
              <h2
                id={titleId}
                className="font-display mt-2 text-3xl font-black leading-tight text-slate-800 sm:text-4xl"
              >
                {info.title}
              </h2>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600 sm:text-base">
                {info.intro}
              </p>
            </div>

            <div
              className="rounded-2xl border-2 p-3 sm:p-3.5"
              style={{
                borderColor: `${zone.color}55`,
                backgroundColor: `${zone.color}0f`,
              }}
            >
              <p
                className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em]"
                style={{ color: zone.color }}
              >
                <ListChecks size={13} />
                FAKTA PENTING
              </p>
              <ol className="mt-2 space-y-1.5">
                {facts.facts.map((fact, index) => (
                  <li key={index} className="flex gap-2">
                    <span
                      className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-black text-white"
                      style={{ backgroundColor: zone.color }}
                    >
                      {index + 1}
                    </span>
                    <span className="text-[13px] font-bold leading-snug text-slate-700 sm:text-sm">
                      {fact}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-3 sm:p-3.5">
              <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">
                <Lightbulb size={13} />
                TAHUKAH KAMU?
              </p>
              <p className="mt-1.5 text-[13px] font-bold leading-snug text-slate-700 sm:text-sm">
                {info.funFact}
              </p>
            </div>

            <div
              className={`flex items-center gap-2 rounded-2xl border-2 px-3 py-2 text-[13px] font-bold ${
                read
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-slate-50 text-slate-500'
              }`}
            >
              {read ? (
                <CheckCircle2 size={18} className="flex-shrink-0 text-emerald-500" />
              ) : (
                <CheckCircle2 size={18} className="flex-shrink-0 text-slate-300" />
              )}
              <span className="min-w-0 flex-1">
                {read ? 'Papan sudah dibaca' : 'Membuka papan informasi...'}
              </span>
              {completed && (
                <span className="flex flex-shrink-0 items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
                  <CheckCircle2 size={11} />
                  Selesai
                </span>
              )}
            </div>

            <div className="mt-1 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleStart}
                className={`flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl px-4 text-base font-black text-white shadow-lg transition-all active:scale-[0.98] ${
                  completed
                    ? 'bg-slate-600 shadow-slate-200 hover:bg-slate-700'
                    : 'bg-emerald-500 shadow-emerald-200 hover:bg-emerald-600'
                }`}
                title={completed ? `Mainkan ulang misi ${info.title}` : `Mulai misi ${info.title}`}
              >
                {completed ? <RotateCcw size={20} /> : <Play size={20} fill="currentColor" />}
                {completed ? 'Mainkan Lagi' : 'Mulai Misi'}
              </button>
              {completed && (
                <p className="text-center text-[11px] font-bold text-emerald-600">
                  Misi sudah selesai — tetap bisa diulang kapan saja. 🔁
                </p>
              )}

              <button
                type="button"
                onClick={handleClose}
                className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-amber-500 bg-amber-400 px-4 text-base font-black text-amber-950 shadow-lg shadow-amber-200/70 transition-all hover:bg-amber-300 active:translate-y-0.5 active:border-b-2"
              >
                <Compass size={20} />
                Tutup dan lanjut jelajah
              </button>
            </div>

            <p className="text-center text-[10px] font-bold text-slate-400">
              Tekan <kbd className="rounded bg-slate-100 px-1.5 py-0.5">Esc</kbd> atau klik di luar
              kartu untuk menutup
            </p>
          </div>
        </div>
      </MotionDiv>
    </MotionDiv>,
    document.body
  );
};

export default ZoneInfoCard;
