# Agent SIAGA: Misi Penyelamatan Bumi

Game edukasi bencana untuk anak sekolah dasar. Tim Penyelamat menjelajahi **alam terbuka** dalam **dunia 3D**, membaca fakta kesiapsiagaan, lalu menyelesaikan empat misi penyelamatan: **Gempa Bumi, Banjir Bandang, Erupsi Gunung Berapi, dan Tanah Longsor**.

Dunia 3D adalah pintu masuk petualangan. Alur 2D lama tetap tersedia sebagai **Mode Klasik**, sehingga game selalu bisa dimainkan meskipun perangkat tidak mendukung WebGL.

---

## Dua Mode Bermain

| Mode | Cara masuk | Alur |
| --- | --- | --- |
| **Mode Petualangan (3D)** | Menu utama → **DAFTARKAN TIM!** | Daftar tim → jelajahi alam 3D → pilih zona misi → mainkan level → kembali ke base camp |
| **Mode Klasik (2D)** | Menu utama → **Mode Klasik (2D)**, atau tombol **Mode Klasik** di dunia 3D | Daftar tim → Pusat Komando → pilih misi dari daftar |

Kedua mode memakai level, kuis, skor, dan data tim yang sama.

---

## Fitur Dunia 3D

- **Lembah alam terbuka** — padang rumput bertekstur, jalur tanah, pepohonan (pinus, oak, birch), semak, bunga, batu, bukit bergulir, pegunungan bersalju di kejauhan, awan bergerak, burung, dan serbuk sari. Dibangun dari primitif Three.js tanpa model GLTF/FBX.
- **Base camp** — tenda, api unggun beranimasi, peti, bangku kayu, papan petunjuk “Jelajah Alam Siaga”, dan Kapten Siaga sebagai pemandu di dekat titik awal.
- **4 titik misi dengan diorama tema** — tiap zona punya formasi alam 3D sendiri:
  - 🌋 **Gunung meletus** — kerucut gunung berlapis, kawah menyala, aliran lava, asap, percikan bara, dan cahaya oranye.
  - 🌊 **Banjir bandang** — cekungan air beriak, hujan lokal, rumah panggung terendam, perahu penyelamat, barang hanyut, dan tiang ukur tinggi air.
  - 🏚️ **Gempa bumi** — tanah retak, bongkahan batu besar, menara pengawas miring, debu, dan kerikil jatuh.
  - ⛰️ **Tanah longsor** — tebing hijau dengan luka tanah terbuka, pohon tumbang, bongkahan batu meluncur, puing, dan debu.
- **4 zona misi** — tiang penanda bercahaya dengan warna dan ikon tiap bencana. Mendekat akan membuka panel **Mulai Misi** (atau tekan `E` di desktop).
- **Papan informasi fakta** — 4 papan kayu bergaya kemah di dekat tiap zona. Saat pemain mendekat (< 3 m), panel fakta terbuka dengan 3 poin penting yang mudah dibaca anak.
- **Kapten Siaga** — billboard pixel-art di base camp dengan kartu pesan kontekstual (sambutan, papan fakta, zona misi, semua zona selesai).
- **Minimap** — peta alam yang menunjukkan posisi pemain, danau, gunung, zona misi, dan zona berikutnya.
- **Progres misi** — HUD menampilkan skor, `MISI x/4`, dan centang pada zona yang sudah selesai.
- **Kamera orang ketiga** — kamera mengikuti pemain; putar dengan mouse (desktop) atau geser layar (mobile).
- **Pintu keluar aman** — tombol **Mode Klasik** selalu tersedia di HUD. Jika WebGL gagal atau chunk 3D gagal dimuat, muncul layar error dengan tombol **Coba Lagi** dan **Mode Klasik (2D)**.

### Alur Misi di Dunia 3D

1. Daftarkan nama tim dan pilih avatar.
2. Jelajahi alam, baca papan fakta bila mau.
3. Dekati tiang zona → tekan **Mulai Misi**.
4. Selesaikan level dan 5 pertanyaan pemulihan (Recovery).
5. Kembali ke dunia 3D di base camp; zona ditandai selesai dan progres bertambah.
6. Setelah keempat zona selesai, game menuju layar **Kemenangan**. Mode Klasik tetap memakai alur lamanya.

---

## Kontrol

| Aksi | Desktop | Mobile |
| --- | --- | --- |
| Berjalan | `W A S D` atau tombol panah | Joystick virtual di kiri bawah |
| Putar kamera | Tahan & geser mouse | Geser layar |
| Mulai misi | `E` atau tombol **Mulai Misi** | Tombol **Mulai Misi** |
| Buka/tutup panel fakta | Dekati papan / tombol tutup | Dekati papan / tombol tutup |

---

## Performa & Ketahanan

- `World3D` **di-lazy-load** dengan `React.lazy` + `Suspense`, sehingga menu, Mode Klasik, dan level 2D tidak ikut mengunduh Three.js. Build menghasilkan chunk terpisah `World3D-*.js`.
- **Pixel ratio dibatasi** — maksimum `1.25` di perangkat compact/mobile dan `1.5` di desktop, agar GPU hemat daya.
- **Bayangan dimatikan** dan antialias hanya aktif di desktop.
- **Adaptive performance** (`performance={{ min: 0.5 }}`) menurunkan resolusi render saat frame rate turun.
- **Layar loading bertema** menampilkan Kapten Siaga dan fakta bencana bergiliran selagi dunia disiapkan.
- **Fallback berlapis** — error boundary untuk chunk 3D, error boundary untuk canvas, deteksi WebGL, dan tombol menuju Mode Klasik.
- Semua aset 3D memakai tekstur canvas (rumput, tanah, air, kayu, papan) dan primitif; tidak ada model GLTF/FBX besar.
- **Hemat partikel** — rumput memakai `InstancedMesh`, serbuk sari/hujan memakai `Points`, dan animasi dijalankan ringan lewat `useFrame`.

> Catatan: chunk `World3D` memang berukuran besar (Three.js + drei). Peringatan Vite tentang chunk > 500 kB hanya muncul untuk chunk tersebut dan tidak memengaruhi waktu muat menu maupun Mode Klasik.

---

## Teknologi

- **React 19** + **TypeScript**
- **Vite 6**
- **Tailwind CSS** (via konfigurasi proyek) + **Framer Motion**
- **Three.js** + **@react-three/fiber** + **@react-three/drei**
- **Lucide React** untuk ikon
- **Gemini API** untuk umpan balik pertanyaan (`services/geminiService.ts`)

---

## Struktur Proyek

```
AgentSIAGA/
├─ App.tsx                     # Alur game, fase, level 2D, integrasi dunia 3D
├─ constants.ts                # Level, item, avatar, fakta dunia (WORLD_FACTS)
├─ types.ts                    # Tipe bersama (GamePhase, DisasterType, dll.)
├─ useSoundEffects.ts          # Efek suara
├─ services/
│  └─ geminiService.ts         # Integrasi Gemini API
├─ components/
│  ├─ AINarrator.tsx           # Narator AI di level
│  ├─ SideNarrator.tsx         # Narator samping 2D
│  └─ world/
│     ├─ World3D.tsx           # Canvas, HUD, panel misi, minimap, lazy entry
│     ├─ WorldLoadingScreen.tsx# Layar loading, error, dan error boundary
│     ├─ Player.tsx            # Gerak pemain, kamera, deteksi zona/papan
│     ├─ Joystick.tsx          # Joystick virtual mobile
│     ├─ NatureEnvironment.tsx  # Lembah, jalur, pohon, bukit, gunung, base camp
│     ├─ ZoneMarker.tsx        # Tiang zona misi + status selesai
│     ├─ ZoneDiorama.tsx       # Diorama 3D beranimasi untuk 4 bencana
│     ├─ InfoBoard.tsx         # Papan fakta kayu 3D
│     ├─ KaptenBillboard.tsx   # Billboard Kapten Siaga di base camp
│     ├─ worldConfig.ts        # Posisi zona, papan, jalur, batas dunia, collider
│     └─ worldTextures.ts      # Tekstur canvas (rumput, tanah, air, kayu, papan)
└─ public/assets/              # Sprite & tekstur game (PNG/JPG)
```

---

## Menjalankan Proyek

**Prasyarat:** Node.js 18+ dan browser dengan WebGL (untuk mode 3D).

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`.

Untuk build produksi:

```bash
npm run build
npm run preview
```

Cek tipe tanpa build:

```bash
npx tsc --noEmit
```

### Konfigurasi Gemini

Buat `.env.local` di folder proyek:

```env
GEMINI_API_KEY=isi-kunci-api-kamu
```

Jangan commit `.env.local`. Nilai kunci dipakai oleh `services/geminiService.ts` untuk membuat umpan balik kuis.

---

## Daftar Misi

| Misi | Tema | Inti Pelajaran |
| --- | --- | --- |
| Gempa Bumi | Kelas saat gempa | Merunduk, berlindung, bertahan; waspada gempa susulan |
| Banjir Bandang | Sekolah saat banjir | Tas siaga, hindari listrik, evakuasi ke tempat tinggi |
| Erupsi Gunung Berapi | Lereng gunung | Tanda erupsi, masker, awan panas, arahan evakuasi |
| Tanah Longsor | Bukit saat hujan | Tanda longsor, lari menyamping menjauhi jalur longsor |

---

## Lisensi & Kredit

Proyek edukasi Agent Siaga — Misi Penyelamatan Bumi. Aset karakter dan lingkungan dibuat untuk keperluan pembelajaran kesiapsiagaan bencana.
