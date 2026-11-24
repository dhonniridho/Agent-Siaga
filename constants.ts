import { LevelConfig, Item, Avatar, DisasterType } from './types';

export const AVATARS: Avatar[] = [
  { id: '1', name: 'Agent Blaze', icon: '🧑‍🚒', color: 'red', bgGradient: 'from-orange-400 to-red-600' },
  { id: '2', name: 'Agent Aqua', icon: '🤿', color: 'blue', bgGradient: 'from-cyan-400 to-blue-600' },
  { id: '3', name: 'Agent Terra', icon: '👩‍🌾', color: 'green', bgGradient: 'from-emerald-400 to-green-600' },
  { id: '4', name: 'Agent Tech', icon: '🧑‍🚀', color: 'purple', bgGradient: 'from-violet-400 to-purple-600' },
  { id: '5', name: 'Agent Doc', icon: '👩‍⚕️', color: 'pink', bgGradient: 'from-pink-400 to-rose-600' },
  { id: '6', name: 'Agent Scout', icon: '🕵️', color: 'amber', bgGradient: 'from-yellow-400 to-amber-600' },
];

// Items pool - EXPANDED
const ITEMS: Record<string, Item> = {
  // CORRECT ITEMS (Survival Priority)
  WATER: { id: 'water', name: 'Air Mineral', isCorrect: true, icon: '💧', description: 'Untuk hidrasi minimal 3 hari.' },
  FLASHLIGHT: { id: 'flash', name: 'Senter', isCorrect: true, icon: '🔦', description: 'Penting saat listrik mati.' },
  FIRSTAID: { id: 'p3k', name: 'Kotak P3K', isCorrect: true, icon: '❤️‍🩹', description: 'Untuk luka ringan.' },
  CANNED: { id: 'food', name: 'Makanan Kaleng', isCorrect: true, icon: '🥫', description: 'Awet dan mudah dibawa.' },
  DOCS: { id: 'doc', name: 'Dokumen Penting', isCorrect: true, icon: '📄', description: 'Surat berharga dalam plastik.' },
  WHISTLE: { id: 'whistle', name: 'Peluit', isCorrect: true, icon: '🔔', description: 'Untuk minta tolong saat terjebak.' },
  MASK: { id: 'mask', name: 'Masker', isCorrect: true, icon: '😷', description: 'Melindungi dari debu.' },
  RADIO: { id: 'radio', name: 'Radio Kecil', isCorrect: true, icon: '📻', description: 'Info darurat saat HP mati.' },
  POWERBANK: { id: 'powerbank', name: 'Power Bank', isCorrect: true, icon: '🔋', description: 'Charge HP untuk komunikasi.' },
  BLANKET: { id: 'blanket', name: 'Selimut Darurat', isCorrect: true, icon: '🧣', description: 'Tetap hangat di pengungsian.' },
  MEDICINE: { id: 'medicine', name: 'Obat Pribadi', isCorrect: true, icon: '💊', description: 'Obat rutin yang penting.' },
  ROPE: { id: 'rope', name: 'Tali Tambang', isCorrect: true, icon: '🪢', description: 'Untuk evakuasi darurat.' },
  
  // INCORRECT ITEMS (Bukan Prioritas)
  GAMEBOY: { id: 'game', name: 'Game Konsol', isCorrect: false, icon: '🎮', description: 'Bukan prioritas darurat!' },
  TOY: { id: 'toy', name: 'Robot Mainan', isCorrect: false, icon: '🤖', description: 'Terlalu memakan tempat.' },
  PILLOW: { id: 'pillow', name: 'Bantal Besar', isCorrect: false, icon: '🛌', description: 'Terlalu besar untuk tas darurat.' },
  LAPTOP: { id: 'laptop', name: 'Laptop Gaming', isCorrect: false, icon: '💻', description: 'Berat dan tidak esensial.' },
  SNACK: { id: 'snack', name: 'Snack Keripik', isCorrect: false, icon: '🍟', description: 'Tidak tahan lama.' },
  HEADPHONE: { id: 'headphone', name: 'Headphone', isCorrect: false, icon: '🎧', description: 'Tidak penting untuk survival.' },
  MAKEUP: { id: 'makeup', name: 'Tas Makeup', isCorrect: false, icon: '💄', description: 'Bukan prioritas saat bencana!' },
  TROPHY: { id: 'trophy', name: 'Piala Juara', isCorrect: false, icon: '🏆', description: 'Keselamatan lebih penting!' },
};


// Flood Phase 1 — 10 items to consider, backpack fits only 5.
// 5 useful (must be brought), 5 not useful (distractors).
export interface FloodBagItem {
  id: string;
  name: string;
  icon: string;
  isUseful: boolean;
  reason: string;
}

export const FLOOD_BAG_ITEMS: FloodBagItem[] = [
  // Useful
  { id: 'docs',      name: 'Dokumen Penting', icon: '📄', isUseful: true,  reason: 'KK, akta, ijazah — sulit diurus ulang.' },
  { id: 'money',     name: 'Uang Tunai',      icon: '💵', isUseful: true,  reason: 'ATM & QRIS bisa mati saat banjir.' },
  { id: 'medicine',  name: 'Obat-obatan',     icon: '💊', isUseful: true,  reason: 'Obat rutin tidak boleh terlewat.' },
  { id: 'flash',     name: 'Senter',          icon: '🔦', isUseful: true,  reason: 'Listrik mati, malam jadi gelap.' },
  { id: 'p3k',       name: 'Kotak P3K',       icon: '❤️‍🩹', isUseful: true,  reason: 'Untuk luka & pertolongan pertama.' },
  // Not useful
  { id: 'tv',        name: 'Televisi',        icon: '📺', isUseful: false, reason: 'Berat, bisa diganti nanti.' },
  { id: 'console',   name: 'Konsol Game',     icon: '🎮', isUseful: false, reason: 'Bukan prioritas saat darurat.' },
  { id: 'snack',     name: 'Snack Keripik',   icon: '🍟', isUseful: false, reason: 'Cepat basi, tidak mengenyangkan.' },
  { id: 'pillow',    name: 'Bantal Besar',    icon: '🛌', isUseful: false, reason: 'Memakan tempat di tas.' },
  { id: 'trophy',    name: 'Piala',           icon: '🏆', isUseful: false, reason: 'Kenangan bisa diganti, nyawa tidak.' },
];

export const FLOOD_BAG_CAPACITY = 5;
export const FLOOD_BAG_USEFUL_COUNT = FLOOD_BAG_ITEMS.filter(i => i.isUseful).length;

export const LEVELS: Record<string, LevelConfig> = {
  EARTHQUAKE: {
    id: 'EARTHQUAKE',
    title: 'Gempa Bumi',
    location: 'Padang, Sumatera Barat',
    color: 'amber',
    description: 'Tanah berguncang! Bantu warga evakuasi dan berlindung.',
    bagItems: [ITEMS.FLASHLIGHT, ITEMS.FIRSTAID, ITEMS.GAMEBOY, ITEMS.WATER, ITEMS.WHISTLE, ITEMS.TOY, ITEMS.CANNED, ITEMS.PILLOW, ITEMS.RADIO, ITEMS.POWERBANK, ITEMS.LAPTOP, ITEMS.SNACK],
    quizQuestions: [
      {
        id: 1,
        question: "Gempa sudah berhenti. Apa yang harus kamu lakukan?",
        options: [
          "Langsung lari masuk ke dalam rumah",
          "Tetap waspada gempa susulan & jauhi bangunan rusak",
          "Tidur kembali",
          "Main game di hp"
        ],
        correctIndex: 1,
        explanation: "Gempa susulan sering terjadi. Tetap di area terbuka yang aman dan jauhi bangunan yang rusak."
      },
      {
        id: 2,
        question: "Saat gempa terjadi dan kamu ada di dalam kelas, apa yang PALING AMAN?",
        options: [
          "Lari berdesakan ke pintu keluar",
          "Bersembunyi di bawah meja yang kuat",
          "Berdiri di dekat jendela kaca",
          "Menangis di pojok ruangan"
        ],
        correctIndex: 1,
        explanation: "Ingat prinsip: Drop, Cover, Hold On (Jongkok, Berlindung, Pegangan). Berlindung di bawah meja yang kokoh!"
      },
      {
        id: 3,
        question: "Kamu sedang di dalam rumah saat gempa. Apa yang TIDAK boleh dilakukan?",
        options: [
          "Berlindung di bawah meja yang kokoh",
          "Berlari keluar rumah saat gempa masih berlangsung",
          "Menjauhi jendela kaca dan lemari tinggi",
          "Melindungi kepala dengan bantal"
        ],
        correctIndex: 1,
        explanation: "Jangan berlari keluar saat gempa! Bisa tertimpa reruntuhan. Berlindung dulu di tempat aman, baru keluar setelah gempa berhenti."
      },
      {
        id: 4,
        question: "Guncangan gempa sudah berhenti. Apa yang sebaiknya kamu lakukan?",
        options: [
          "Keluar ke lapangan terbuka dan tetap waspada gempa susulan",
          "Tetap di dalam gedung yang retak",
          "Naik lift agar cepat",
          "Kembali mengambil barang yang tertinggal"
        ],
        correctIndex: 0,
        explanation: "Setelah guncangan berhenti, keluar ke lapangan terbuka dan jauhi bangunan rusak. Gempa susulan bisa datang, jadi tetap waspada."
      },
      {
        id: 5,
        question: "Setelah gempa berhenti, hal pertama yang harus dicek adalah...",
        options: [
          "HP dan charger",
          "Kondisi diri sendiri dan orang sekitar (ada yang terluka?)",
          "Barang berharga",
          "Makanan di kulkas"
        ],
        correctIndex: 1,
        explanation: "Prioritas utama: keselamatan jiwa! Cek diri sendiri dan orang lain dulu. Jika ada yang terluka, berikan pertolongan pertama."
      }
    ]
  },
  FLOOD: {
    id: 'FLOOD',
    title: 'Banjir Bandang',
    location: 'Jakarta Utara',
    color: 'blue',
    description: 'Air sungai meluap! Selamatkan dokumen dan evakuasi ke tempat tinggi.',
    bagItems: [ITEMS.DOCS, ITEMS.CANNED, ITEMS.WATER, ITEMS.TOY, ITEMS.FLASHLIGHT, ITEMS.FIRSTAID, ITEMS.GAMEBOY, ITEMS.MASK, ITEMS.BLANKET, ITEMS.MEDICINE, ITEMS.HEADPHONE, ITEMS.MAKEUP],
    quizQuestions: [
      {
        id: 1,
        question: "Air banjir mulai masuk rumah. Apa bahaya tersembunyi yang harus dihindari?",
        options: [
          "Kabel listrik yang terendam air",
          "Ikan yang berenang",
          "Air yang dingin",
          "Mainan yang hanyut"
        ],
        correctIndex: 0,
        explanation: "Air menghantarkan listrik! Jauhi sumber listrik agar tidak tersengat. Matikan listrik dari MCB jika memungkinkan."
      },
      {
        id: 2,
        question: "Air banjir sudah setinggi lutut. Apa yang harus dilakukan?",
        options: [
          "Tetap di rumah dan naik ke lantai 2/atap",
          "Berenang mencari bantuan",
          "Menunggu di lantai 1 sambil main HP",
          "Keluar rumah berjalan melawan arus"
        ],
        correctIndex: 0,
        explanation: "Jika air sudah tinggi, JANGAN keluar rumah! Naik ke tempat tertinggi (lantai 2/atap) dan tunggu bantuan. Arus banjir sangat kuat!"
      },
      {
        id: 3,
        question: "Kenapa air banjir berbahaya untuk diminum?",
        options: [
          "Karena kotor dan mengandung kuman penyakit",
          "Karena rasanya tidak enak",
          "Karena terlalu dingin",
          "Karena berwarna keruh"
        ],
        correctIndex: 0,
        explanation: "Air banjir tercampur limbah, kotoran, dan bakteri berbahaya. Bisa menyebabkan diare, kolera, dan penyakit lain. Selalu minum air bersih yang sudah dimasak!"
      },
      {
        id: 4,
        question: "Tanda-tanda banjir akan datang adalah...",
        options: [
          "Hujan deras terus-menerus + air sungai naik",
          "Cuaca panas",
          "Angin kencang",
          "Awan putih"
        ],
        correctIndex: 0,
        explanation: "Waspadai hujan lebat yang tidak berhenti dan air sungai yang naik. Ini tanda banjir bisa datang. Segera siapkan tas siaga dan bersiap evakuasi!"
      },
      {
        id: 5,
        question: "Saat evakuasi banjir, kamu harus membawa...",
        options: [
          "Mainan favorit",
          "Dokumen penting dalam plastik kedap air",
          "Semua baju di lemari",
          "TV dan laptop"
        ],
        correctIndex: 1,
        explanation: "Prioritas: dokumen penting (KK, Akta Lahir, Ijazah) dalam plastik waterproof, obat-obatan, dan barang survival. Barang elektronik berat bisa ditinggal."
      }
    ]
  },
  LANDSLIDE: {
    id: 'LANDSLIDE',
    title: 'Tanah Longsor',
    location: 'Banjarnegara, Jawa Tengah',
    color: 'stone',
    description: 'Hujan deras mengguyur lereng bukit! Tanah mulai retak dan bergerak. Bantu warga evakuasi menjauhi jalur longsor.',
    bagItems: [ITEMS.MASK, ITEMS.WHISTLE, ITEMS.FLASHLIGHT, ITEMS.FIRSTAID, ITEMS.WATER, ITEMS.DOCS, ITEMS.ROPE, ITEMS.RADIO, ITEMS.GAMEBOY, ITEMS.TOY, ITEMS.PILLOW, ITEMS.SNACK],
    quizQuestions: [
      {
        id: 1,
        question: "Apa tanda-tanda alam bahwa tanah longsor akan segera terjadi?",
        options: [
          "Muncul retakan di tanah, mata air jadi keruh, dan pohon miring",
          "Langit cerah tanpa awan",
          "Burung-burung berkicau merdu",
          "Udara terasa sejuk dan segar"
        ],
        correctIndex: 0,
        explanation: "Tanda longsor: retakan tanah di lereng, air sumur/mata air tiba-tiba keruh, pohon & tiang listrik miring, dan sering terdengar suara gemuruh. Kalau melihat tanda ini, segera menjauh dari lereng!"
      },
      {
        id: 2,
        question: "Saat longsor mulai terjadi, ke arah mana kamu harus lari?",
        options: [
          "Mengikuti arah material longsor menuruni lereng",
          "Ke samping, menjauhi jalur/arah datangnya longsoran",
          "Diam di tempat sambil merekam video",
          "Naik ke atas tumpukan tanah longsor"
        ],
        correctIndex: 1,
        explanation: "Larilah ke SAMPING, tegak lurus menjauhi arah material yang meluncur — jangan lari searah longsoran karena kecepatannya jauh lebih cepat dari lari kita. Cari tanah yang stabil dan lebih tinggi."
      },
      {
        id: 3,
        question: "Kapan tanah longsor paling sering terjadi?",
        options: [
          "Saat musim kemarau yang panjang",
          "Saat atau setelah hujan deras berkepanjangan",
          "Saat siang hari yang panas",
          "Saat malam berbintang"
        ],
        correctIndex: 1,
        explanation: "Air hujan meresap membuat tanah di lereng jadi berat dan licin, sehingga mudah meluncur. Longsor paling rawan terjadi saat hujan deras berjam-jam atau beberapa hari berturut-turut."
      },
      {
        id: 4,
        question: "Manakah tindakan yang membantu MENCEGAH tanah longsor di lereng?",
        options: [
          "Menebang semua pohon di lereng untuk ladang",
          "Menanam pohon berakar kuat dan membuat sengkedan (terasering)",
          "Membuang sampah menyumbat saluran air",
          "Membangun rumah tepat di bibir tebing"
        ],
        correctIndex: 1,
        explanation: "Akar pohon mengikat tanah, dan terasering memperlambat aliran air. Menebang hutan di lereng justru membuat tanah gampang longsor. Jaga daerah resapan air dan jangan sumbat drainase!"
      },
      {
        id: 5,
        question: "Setelah berhasil menyelamatkan diri dari longsor, apa yang sebaiknya dilakukan?",
        options: [
          "Langsung kembali ke rumah mengambil barang",
          "Menjauh dari area longsor, lapor petugas/BPBD, dan waspada longsor susulan",
          "Menggali tumpukan tanah sendirian tanpa alat",
          "Berdiri di dekat tebing untuk melihat lebih jelas"
        ],
        correctIndex: 1,
        explanation: "Longsor susulan sering terjadi! Tetap di tempat aman, hubungi petugas/BPBD (nomor darurat 112), dan jangan masuk ke zona longsor. Proses evakuasi korban serahkan pada tim SAR yang punya alat."
      }
    ]
  },
  VOLCANO: {
    id: 'VOLCANO',
    title: 'Erupsi Gunung Berapi',
    location: 'Cangkringan, Sleman (Merapi)',
    color: 'orange',
    description: 'Gunung Merapi meletus! Bantu warga evakuasi dari hujan abu dan awan panas.',
    bagItems: [ITEMS.MASK, ITEMS.WATER, ITEMS.FLASHLIGHT, ITEMS.FIRSTAID, ITEMS.DOCS, ITEMS.BLANKET, ITEMS.GAMEBOY, ITEMS.TOY, ITEMS.PILLOW, ITEMS.SNACK, ITEMS.ROPE, ITEMS.TROPHY],
    quizQuestions: [
      {
        id: 1,
        question: "Apa bahaya terbesar saat gunung meletus?",
        options: [
          "Awan panas (wedhus gembel) yang sangat cepat dan panas",
          "Suara ledakan yang keras",
          "Bau belerang",
          "Gelap karena tertutup awan"
        ],
        correctIndex: 0,
        explanation: "Awan panas (pyroclastic flow) bisa mencapai 700°C dan bergerak 100 km/jam! Sangat mematikan. Jika ada peringatan erupsi, SEGERA evakuasi!"
      },
      {
        id: 2,
        question: "Saat hujan abu vulkanik, yang harus dilakukan adalah...",
        options: [
          "Keluar rumah untuk melihat",
          "Tutup semua jendela, pakai masker, dan tetap di dalam",
          "Main hujan abu",
          "Foto-foto untuk Instagram"
        ],
        correctIndex: 1,
        explanation: "Abu vulkanik sangat berbahaya untuk paru-paru! Tutup semua ventilasi, pakai masker N95 atau kain basah, dan jangan keluar rumah kecuali darurat."
      },
      {
        id: 3,
        question: "Zona bahaya Merapi dibagi menjadi beberapa radius. Yang paling berbahaya adalah...",
        options: [
          "Zona I (0-3 km dari puncak)",
          "Zona II (3-6 km)",
          "Zona III (6-10 km)",
          "Semua zona sama bahayanya"
        ],
        correctIndex: 0,
        explanation: "Zona I adalah zona merah/terlarang. Semakin dekat dengan puncak, semakin berbahaya. Ikuti arahan BPBD dan jangan masuk zona terlarang!"
      },
      {
        id: 4,
        question: "Tanda-tanda gunung akan meletus adalah...",
        options: [
          "Gempa vulkanik meningkat + suhu kawah naik + hewan turun gunung",
          "Cuaca mendung",
          "Angin kencang",
          "Hujan lebat"
        ],
        correctIndex: 0,
        explanation: "BMKG dan BPPTKG memantau aktivitas gunung 24/7. Tanda-tanda: gempa vulkanik, deformasi gunung, suhu naik, gas meningkat. Hewan punya insting turun gunung jika bahaya!"
      },
      {
        id: 5,
        question: "Jika terkena hujan abu, cara membersihkan yang benar adalah...",
        options: [
          "Sapu dan buang ke sungai",
          "Siram dengan air langsung",
          "Sapu pelan, masukkan karung, lalu buang ke TPA",
          "Biarkan saja, nanti hilang sendiri"
        ],
        correctIndex: 2,
        explanation: "Abu vulkanik keras dan tajam seperti kaca! Jangan disiram air dulu (bisa mengeras seperti semen). Sapu pelan pakai masker, kumpulkan di karung."
      }
    ]
  }
};

/**
 * Fakta singkat untuk papan informasi 3D "Jelajah Alam Siaga".
 * Isinya diringkas dari penjelasan kuis tiap misi supaya anak mudah mengingat.
 */
export const WORLD_FACTS: Record<DisasterType, { icon: string; title: string; facts: string[] }> = {
  EARTHQUAKE: {
    icon: '🏫',
    title: 'Fakta Gempa Bumi',
    facts: [
      'Saat gempa: JONGKOK, BERLINDUNG di bawah meja kuat, lalu PEGANG kaki meja.',
      'Jangan berlari keluar saat gempa masih berlangsung — bisa tertimpa reruntuhan.',
      'Setelah gempa, waspadai gempa susulan dan jauhi bangunan yang retak.',
    ],
  },
  FLOOD: {
    icon: '🌊',
    title: 'Fakta Banjir Bandang',
    facts: [
      'Air banjir menghantarkan listrik. Jauhi kabel dan stopkontak yang terendam.',
      'Jika air sudah tinggi, naik ke lantai atas atau atap. Jangan berenang melawan arus.',
      'Air banjir kotor dan berbakteri. Selalu minum air bersih yang sudah dimasak.',
    ],
  },
  LANDSLIDE: {
    icon: '⛰️',
    title: 'Fakta Tanah Longsor',
    facts: [
      'Tanda longsor: tanah retak, mata air keruh, pohon dan tiang listrik miring.',
      'Saat longsor, larilah ke SAMPING menjauhi arah longsoran — jangan searah.',
      'Longsor sering terjadi saat hujan deras berkepanjangan. Tanam pohon di lereng.',
    ],
  },
  VOLCANO: {
    icon: '🌋',
    title: 'Fakta Erupsi Gunung',
    facts: [
      'Bahaya terbesar erupsi adalah awan panas: sangat panas dan bergerak sangat cepat.',
      'Saat hujan abu: tutup jendela, pakai masker, dan tetap di dalam ruangan.',
      'Ikuti arahan BPBD dan jangan masuk zona terlarang di dekat puncak gunung.',
    ],
  },
};

export const LEADERBOARD_DATA = [
  { name: "Tim Garuda (5A)", score: 1250, badge: "Master Agent" },
  { name: "Regu Melati (4B)", score: 1100, badge: "Senior Agent" },
  { name: "Kamu", score: 0, badge: "Rookie" },
  { name: "Tim Harimau (6C)", score: 950, badge: "Agent" },
];