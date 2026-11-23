# Agent SIAGA: Misi Penyelamatan Bumi

Game edukasi mitigasi bencana untuk siswa sekolah dasar. Seluruh permainan — misi evakuasi maupun kuis pemulihan — dimainkan dalam **3D**. Tim Penyelamat menjelajahi dunia pulau Siaga, mempelajari empat jenis bencana, lalu menyelesaikan misi dan kuis di setiap zona.

**Empat bencana:**
- 🏫 Gempa Bumi
- 🌊 Banjir Bandang
- ⛰️ Tanah Longsor
- 🌋 Erupsi Gunung Berapi

---

## Alur Permainan

1. **Menu utama** → tekan **DAFTARKAN TIM!** (tombol **MODE GURU · DASHBOARD** tersedia di bawahnya untuk guru).
2. Isi nama tim, pilih maskot, dan masukkan **kode kelas** dari guru (opsional tetapi disarankan).
3. **Panduan onboarding 3D** muncul otomatis: satu slide pembuka, empat slide bencana, dan satu slide kontrol.
4. Masuk ke **Dunia 3D**. Di area spawn ada **papan panduan 3D** bertuliskan ringkasan keempat zona; dekati dan tekan **E** (atau tombol **Baca**) untuk membuka kartu panduan lengkap.
5. Jelajahi pulau Siaga dan dekati tiang zona misi → tekan **Mulai Misi**.
6. Selesaikan **misi evakuasi 3D** sesuai jenis bencana.
7. **Kuis pemulihan 3D langsung terbuka** setelah misi selesai (tanpa layar penghalang).
8. Kembali ke dunia 3D; zona ditandai selesai dan skor tersimpan.
9. Setelah keempat zona selesai, tampil **layar kemenangan** dan **papan peringkat kelas**.

Tidak ada lagi jalur permainan 2D/Mode Klasik. Seluruh misi dan kuis menggunakan scene Three.js.

---

## Misi 3D

| Misi | Scene | Inti Pelajaran |
| --- | --- | --- |
| **Gempa Bumi** | Koridor sekolah 3D dengan meja, guncangan, dan pintu keluar | Drop, Cover, Hold On; waspada gempa susulan |
| **Banjir Bandang** | Pemilihan tas siaga 3D + lari evakuasi melewati rintangan | Tas siaga, hindari listrik, menuju tempat tinggi |
| **Tanah Longsor** | Punggung bukit yang retak dan runtuh | Lari tegak lurus menjauhi jalur longsoran |
| **Erupsi Gunung** | Pengamatan gunung, tanda erupsi, dan evakuasi | Kenali tanda erupsi, lindungi pernapasan, ikuti evakuasi |
| **Kuis Pemulihan** | Arena podium 3D dengan papan soal melayang | Pemahaman konsep mitigasi setiap bencana |

Setiap misi memberi skor aksi (0–100). Kuis memberi skor pemulihan (0–100). Total skor misi adalah jumlah keduanya.

Kartu materi setiap zona (Z01–Z04) memakai **carousel foto kejadian nyata** dengan tombol `‹ ›` dan indikator titik. Foto disimpan lokal di `public/assets` (sumber: Wikimedia Commons) sehingga tetap tampil tanpa internet.

Rintangan 3D sesuai instruksi Kapten Siaga:
- **Banjir:** kayu hanyut dan genangan air beralistrik yang harus dihindari/dilompati, lengkap dengan riak air.
- **Longsor:** batu jatuh, tanah retak, dan pohon tumbang di jalur menuju bukit aman.
- **Gunung api:** kawah menyala, lava, kepulan asap/abu, pin tanda erupsi yang besar, dan mobil evakuasi di titik jemput.

---

## Kontrol

| Aksi | Desktop | Mobile |
| --- | --- | --- |
| Bergerak | `W A S D` atau tombol panah | Joystick virtual kiri bawah |
| Aksi / berlindung / melompat | `Spasi`, `E`, atau tombol aksi | Tombol aksi kanan bawah |
| Menjawab kuis | Klik podium atau tekan `A B C D` | Ketuk podium jawaban |
| Lanjut soal | `Enter` / `Spasi` | Tombol lanjut |
| Keluar misi | Tombol `X` atau `Esc` | Tombol `X` |

---

## Dashboard Guru

Dashboard tersedia di:

```
http://localhost:3000/guru
```

Fitur:
- Login email + password (sesi HttpOnly cookie).
- Registrasi akun guru baru dengan **kode undangan**.
- Ringkasan jumlah kelas, tim, percobaan misi, dan rata-rata skor.
- Grafik rata-rata skor per bencana.
- Daftar hasil misi terbaru.
- Kelola kelas: buat, ubah nama/kode, hapus.
- Filter kelas pada **Rekap Progres Siswa**.
- Daftar tim per kelas beserta skor total, misi selesai, dan progres tiap bencana.
- Detail tim: riwayat hasil misi, skor terbaik per bencana, dan **waktu pengerjaan**.
- Ekspor rekap ke **CSV** (termasuk kolom durasi pengerjaan detik).
- Logout.

### Akun awal

Saat database pertama kali dibuat, akun guru contoh otomatis di-seed:

| Field | Nilai |
| --- | --- |
| Email | `guru@agentsiaga.id` |
| Password | `siaga123` |
| Kode kelas | `SIAGA6A` |
| Kode undangan guru | `AGENT-SIAGA` |

Nilai seed dapat diubah lewat environment variable (lihat bagian Konfigurasi).

---

## Backend Lokal & Database

- **Express 5** sebagai server API.
- **SQLite lokal** melalui modul bawaan Node `node:sqlite` (`DatabaseSync`).
- Lokasi database: `data/agent-siaga.db` (dibuat otomatis).
- Tabel: `teachers`, `classes`, `teams`, `results`, `app_meta`.
- `results` menyimpan `action_score`, `recovery_score`, `total_score`, `duration_seconds` (waktu pengerjaan), `detail`, dan `created_at`. Migrasi otomatis bila database lama dibuka.
- Password guru di-hash dengan **scrypt**.
- Token sesi ditandatangani HMAC-SHA256 dan disimpan di cookie HttpOnly.
- Token tim disimpan di `localStorage` (`siaga.teamToken`) dan dikirim lewat header `x-team-token`.

### Endpoint utama

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| `GET` | `/api/health` | Cek status server |
| `POST` | `/api/auth/login` | Login guru |
| `POST` | `/api/auth/register` | Registrasi guru + kode undangan |
| `POST` | `/api/auth/logout` | Logout guru |
| `GET` | `/api/auth/me` | Sesi guru aktif |
| `GET` | `/api/teacher/overview` | Statistik dashboard |
| `GET/POST` | `/api/teacher/classes` | Daftar / buat kelas |
| `PATCH/DELETE` | `/api/teacher/classes/:id` | Ubah / hapus kelas |
| `GET` | `/api/teacher/classes/:id/teams` | Tim dalam kelas |
| `GET/DELETE` | `/api/teacher/teams/:id` | Detail / hapus tim |
| `GET` | `/api/teacher/export.csv` | Ekspor rekap CSV |
| `POST` | `/api/game/teams` | Registrasi tim siswa |
| `GET` | `/api/game/team` | Sesi tim aktif |
| `POST` | `/api/game/results` | Simpan hasil misi |
| `GET` | `/api/game/leaderboard` | Papan peringkat kelas |

### Mode offline

Jika server lokal tidak aktif, siswa tetap bisa mendaftar dan bermain. Skor ditampilkan di layar kemenangan, tetapi tidak tersimpan ke database dan papan peringkat kelas memakai fallback tim tersebut. Untuk menyimpan hasil, jalankan server lokal.

---

## Menjalankan Proyek

**Prasyarat:** Node.js **24+** (karena memakai `node:sqlite`) dan browser dengan WebGL.

### Pengembangan

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`. Vite menyajikan aplikasi sekaligus memasang API Express lokal.

### Produksi lokal

```bash
npm run build
npm start
```

Server akan menyajikan folder `dist` dan API dari port yang sama (default `3000`).

Cek tipe tanpa build:

```bash
npx tsc --noEmit
```

---

## Konfigurasi

Buat `.env.local` di folder proyek bila perlu:

```env
# Gemini (opsional, untuk umpan balik kuis)
GEMINI_API_KEY=isi-kunci-api

# Seed guru & kelas
SEED_TEACHER_EMAIL=guru@agentsiaga.id
SEED_TEACHER_PASSWORD=siaga123
SEED_TEACHER_NAME=Guru Siaga
SEED_CLASS_CODE=SIAGA6A

# Kode undangan registrasi guru
SIAGA_INVITE_CODE=AGENT-SIAGA

# Lokasi database (opsional)
# SIAGA_DB_PATH=./data/agent-siaga.db

# Port server produksi
# PORT=3000
```

Jangan commit `.env.local`. Folder `data/` dan file database juga diabaikan oleh Git.

---

## Struktur Proyek

```
AgentSIAGA/
├─ App.tsx                       # Alur game, fase, registrasi, integrasi 3D
├─ index.tsx                     # Entry React + routing /guru
├─ constants.ts                  # Level, kuis, avatar, fakta bencana
├─ types.ts                      # Tipe bersama (GamePhase, DisasterType, dll.)
├─ services/
│  ├─ api.ts                     # Klien API lokal (guru, tim, skor)
│  └─ geminiService.ts           # Integrasi Gemini untuk umpan balik kuis
├─ components/
│  ├─ TeacherDashboard.tsx       # Dashboard guru (login, kelas, tim, CSV)
│  ├─ AINarrator.tsx             # Narator Kapten Siaga
│  ├─ SideNarrator.tsx           # Narator samping (tidak overflow di misi)
│  └─ world/                     # Dunia jelajah 3D (pulau, zona, pemain)
│     ├─ GuideBoardCard.tsx      # Kartu panduan 4 bencana dari papan spawn
│     ├─ ZoneInfoCard.tsx        # Kartu materi + carousel foto nyata
│     └─ Player.tsx              # Karakter 3D utama (Agent3D) + kamera
├─ components3d/
│  ├─ GuideCarousel.tsx          # Panduan onboarding 3D
│  ├─ Recovery3D.tsx             # Kuis pemulihan 3D
│  ├─ EarthquakeMission3D.tsx    # Misi gempa bumi
│  ├─ FloodMission3D.tsx         # Misi banjir bandang
│  ├─ LandslideMission3D.tsx     # Misi tanah longsor
│  ├─ VolcanoMission3D.tsx       # Misi erupsi gunung
│  ├─ SceneBackdrop3D.tsx        # Latar pulau melayang (menu/panduan/victory)
│  ├─ MissionCanvas.tsx          # Canvas R3F + deteksi WebGL
│  ├─ MissionUi.tsx              # Panel, HUD, tombol, overlay
│  ├─ Agent3D.tsx                # Karakter agen low-poly
│  └─ missionTextures.ts         # Tekstur canvas (papan, podium, label)
├─ server/
│  ├─ api.mjs                    # Routing Express + autentikasi
│  ├─ db.mjs                     # SQLite, hash password, seed, query
│  ├─ start.mjs                  # Server produksi (dist + API)
│  └─ gemini.ts                  # Proxy Gemini saat dev
├─ data/                         # Database SQLite (dibuat otomatis)
└─ public/assets/                # Sprite & tekstur pendukung
```

---

## Teknologi

- React 19 + TypeScript
- Vite 6
- Tailwind CSS + Framer Motion
- Three.js + `@react-three/fiber` + `@react-three/drei`
- Express 5 + `node:sqlite`
- Lucide React
- Gemini API (opsional)

---

## Lisensi & Kredit

Proyek edukasi **Agent Siaga — Misi Penyelamatan Bumi**. Aset karakter dan lingkungan dibuat untuk pembelajaran kesiapsiagaan bencana. Tim Adhista.
