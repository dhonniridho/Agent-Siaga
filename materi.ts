import type { DisasterType } from './types';

/**
 * Satu kartu materi singkat yang ditampilkan sebelum misi dimulai.
 * Teks sengaja dibuat singkat dan besar agar mudah dibaca anak SD.
 */
export interface MateriSlide {
  title: string;
  icon: string;
  intro?: string;
  points: { icon: string; text: string }[];
  note?: { kind: 'ingat' | 'jangan'; text: string };
}

export const MATERI: Record<DisasterType, MateriSlide[]> = {
  EARTHQUAKE: [
    {
      title: 'Kenali Peringatannya',
      icon: '🏚️',
      intro: 'Gempa tidak bisa diprediksi, jadi kita tidak menunggu peringatan. Jika terasa guncangan kuat, langsung lindungi diri.',
      points: [
        { icon: '⚠️', text: 'Kenali bahaya di sekitar: lemari tinggi, kaca besar, barang yang bisa jatuh.' },
      ],
    },
    {
      title: 'Persiapan (Tas Siaga)',
      icon: '🎒',
      points: [
        { icon: '🏠', text: 'Tahu tempat berlindung dan jalur keluar di rumah dan sekolah' },
        { icon: '🪑', text: 'Cari meja yang kokoh' },
        { icon: '🎒', text: 'Siapkan Tas Siaga (air minum, senter, peluit, P3K)' },
        { icon: '👟', text: 'Siapkan alas kaki di dekat tempat tidur' },
      ],
    },
    {
      title: 'Saat Tanah Berguncang',
      icon: '🪑',
      points: [
        { icon: '⬇️', text: 'Drop (jongkok)' },
        { icon: '🛡️', text: 'Cover (lindungi kepala dan leher di bawah meja kokoh)' },
        { icon: '🤝', text: 'Hold On (pegang kaki meja)' },
        { icon: '🚪', text: 'Jauhi kaca, jendela, lemari' },
      ],
      note: { kind: 'jangan', text: 'Jangan berlari keluar saat tanah masih berguncang.' },
    },
    {
      title: 'Setelah Guncangan',
      icon: '🧍',
      points: [
        { icon: '🏃', text: 'Keluar ke lapangan terbuka' },
        { icon: '⚠️', text: 'Waspada gempa susulan' },
        { icon: '🏚️', text: 'Jauhi bangunan rusak' },
        { icon: '🩹', text: 'Cek diri dan teman, beri pertolongan pertama' },
        { icon: '📻', text: 'Ikuti informasi resmi BMKG' },
      ],
    },
    {
      title: 'Mitos atau Fakta?',
      icon: '❓',
      points: [
        { icon: '❌', text: '"Lari keluar saat tanah bergoyang" = Mitos' },
        { icon: '❌', text: '"Gempa bisa diramal" = Mitos' },
        { icon: '✅', text: '"Drop, Cover, Hold On melindungi dari benda jatuh" = Fakta' },
      ],
    },
  ],

  FLOOD: [
    {
      title: 'Kenali Peringatannya',
      icon: '🌊',
      points: [
        { icon: '🌧️', text: 'Hujan lebat yang lama, terutama di hulu sungai' },
        { icon: '🌊', text: 'Air sungai naik, keruh, atau membawa ranting dan sampah' },
        { icon: '⛰️', text: 'Banjir bandang bisa datang walau di tempatmu tidak hujan' },
      ],
    },
    {
      title: 'Persiapan (Tas Siaga)',
      icon: '🎒',
      points: [
        { icon: '🎒', text: 'Tas Siaga siap di tempat mudah dijangkau' },
        { icon: '📄', text: 'Dokumen penting dalam plastik' },
        { icon: '🗺️', text: 'Tahu jalur ke tempat tinggi dan titik kumpul' },
        { icon: '📞', text: 'Hafal nomor darurat 112' },
      ],
    },
    {
      title: 'Saat Banjir Datang',
      icon: '🏃',
      points: [
        { icon: '🏞️', text: 'Menjauh dari sungai dan menuju tempat tinggi' },
        { icon: '🏠', text: 'Jika air sudah tinggi jangan keluar, naik ke lantai atas atau atap dan tunggu bantuan' },
        { icon: '📣', text: 'Peluit membantu penolong menemukanmu' },
        { icon: '⚡', text: 'Minta orang dewasa mematikan listrik' },
      ],
      note: { kind: 'jangan', text: 'Jangan menyentuh listrik saat basah.' },
    },
    {
      title: 'Setelah Banjir',
      icon: '🚰',
      points: [
        { icon: '🌊', text: 'Sungai bisa bergolak lagi 1-2 jam setelah hujan reda' },
        { icon: '💧', text: 'Jangan minum air banjir, minum air bersih yang dimasak' },
        { icon: '🧼', text: 'Cuci tangan pakai sabun' },
        { icon: '⚡', text: 'Hati-hati kabel listrik putus' },
      ],
    },
    {
      title: 'Mitos atau Fakta?',
      icon: '❓',
      points: [
        { icon: '❌', text: '"Air yang tenang aman diseberangi" = Mitos' },
        { icon: '❌', text: '"Air banjir yang jernih boleh diminum" = Mitos' },
        { icon: '✅', text: '"Dokumen penting disimpan dalam plastik" = Fakta' },
      ],
    },
  ],

  LANDSLIDE: [
    {
      title: 'Kenali Tanda-tandanya',
      icon: '👀',
      points: [
        { icon: '🪨', text: 'Retakan di tanah lereng atau dinding rumah' },
        { icon: '🌳', text: 'Pohon atau tiang listrik miring' },
        { icon: '💧', text: 'Air sumur tiba-tiba keruh atau muncul mata air baru di lereng' },
        { icon: '⬇️', text: 'Tanah tampak turun' },
        { icon: '🔊', text: 'Suara gemuruh dari bukit' },
      ],
    },
    {
      title: 'Persiapan (Tas Siaga)',
      icon: '🎒',
      points: [
        { icon: '🏔️', text: 'Kenali bagian lereng yang rawan di sekitar rumah dan sekolah' },
        { icon: '🗺️', text: 'Tahu jalur evakuasi dan titik kumpul yang jauh dari lereng' },
        { icon: '🎒', text: 'Tas Siaga siap' },
        { icon: '🌧️', text: 'Waspada di awal musim hujan dan pantau informasi cuaca' },
      ],
    },
    {
      title: 'Saat Longsor',
      icon: '🏃',
      points: [
        { icon: '🧘', text: 'Tetap tenang' },
        { icon: '🏃', text: 'Lari ke SAMPING, tegak lurus dari arah luncuran tanah' },
        { icon: '⛰️', text: 'Cari tanah yang stabil dan lebih tinggi' },
      ],
      note: { kind: 'jangan', text: 'Jangan lari searah luncuran tanah.' },
    },
    {
      title: 'Setelah Longsor',
      icon: '📞',
      points: [
        { icon: '🚫', text: 'Jangan masuk area longsor karena longsor susulan bisa terjadi' },
        { icon: '📞', text: 'Hubungi 112 atau BPBD' },
        { icon: '⏳', text: 'Jangan kembali sebelum dinyatakan aman' },
        { icon: '🧑‍🚒', text: 'Evakuasi korban diserahkan ke tim SAR' },
      ],
    },
    {
      title: 'Mitos atau Fakta?',
      icon: '❓',
      points: [
        { icon: '❌', text: '"Lereng yang sudah longsor pasti aman" = Mitos' },
        { icon: '❌', text: '"Ada tanda longsor, tunggu dulu sampai yakin" = Mitos' },
        { icon: '✅', text: '"Akar pohon membantu menahan tanah" = Fakta' },
      ],
    },
  ],

  VOLCANO: [
    {
      title: 'Kenali Status Gunung',
      icon: '🚦',
      intro: 'Ada 4 status: Normal (aktivitas biasa), Waspada (mulai meningkat), Siaga (peningkatan semakin nyata), Awas (letusan besar sedang atau akan terjadi).',
      points: [
        { icon: '📻', text: 'Status bisa naik cepat, pantau informasi resmi' },
      ],
    },
    {
      title: 'Persiapan (Tas Siaga)',
      icon: '🎒',
      points: [
        { icon: '🗺️', text: 'Tahu jalur evakuasi dan titik kumpul' },
        { icon: '😷', text: 'Masker atau kain, kacamata pelindung, dan senter dalam Tas Siaga' },
        { icon: '📻', text: 'Pantau informasi PVMBG dan BPBD' },
        { icon: '🚫', text: 'Jangan masuk zona terlarang di dekat puncak' },
      ],
    },
    {
      title: 'Saat Meletus',
      icon: '🔥',
      points: [
        { icon: '🏃', text: 'Jika ada perintah evakuasi, segera pergi' },
        { icon: '🌋', text: 'Awan panas sangat cepat dan berbahaya, jangan coba melawannya' },
        { icon: '😷', text: 'Saat hujan abu pakai masker atau kain basah, tutup ventilasi, tetap di dalam' },
        { icon: '👀', text: 'Lindungi mata' },
      ],
    },
    {
      title: 'Setelah Hujan Abu',
      icon: '🧹',
      points: [
        { icon: '🧹', text: 'Sapu abu pelan-pelan sambil bermasker dan kumpulkan di karung' },
        { icon: '🏠', text: 'Minta orang dewasa membersihkan atap' },
        { icon: '⛔', text: 'Jangan kembali ke zona bahaya sebelum dinyatakan aman' },
      ],
      note: { kind: 'jangan', text: 'Jangan menyiram abu dengan air dulu, abu bisa mengeras seperti semen.' },
    },
    {
      title: 'Mitos atau Fakta?',
      icon: '❓',
      points: [
        { icon: '❌', text: '"Gunung tenang berarti boleh masuk zona terlarang" = Mitos' },
        { icon: '❌', text: '"Awan panas bisa dilarikan dengan jalan santai" = Mitos' },
        { icon: '✅', text: '"Kain basah di hidung membantu melindungi napas dari abu" = Fakta' },
      ],
    },
  ],
};
