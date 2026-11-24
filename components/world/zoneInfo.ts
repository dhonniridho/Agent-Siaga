import type { DisasterType } from '../../types';

export interface ZoneInfo {
  /** Kode pendek zona, mis. "Z01". */
  code: string;
  title: string;
  intro: string;
  mainSteps: string;
  funFact: string;
}

/**
 * Kartu informasi singkat untuk setiap zona misi dunia 3D.
 * Teks sengaja pendek supaya mudah dibaca di layar HP maupun laptop sekolah.
 */
export const ZONE_INFO: Record<DisasterType, ZoneInfo> = {
  EARTHQUAKE: {
    code: 'Z01',
    title: 'Gempa Bumi',
    intro: 'Saat tanah berguncang, lindungi dirimu dengan cepat dan tepat.',
    mainSteps:
      'Drop, Cover, Hold On: jongkok, berlindung di bawah meja kokoh, dan pegang kaki meja.',
    funFact: 'Gempa tidak bisa diprediksi, jadi kita harus selalu siap.',
  },
  FLOOD: {
    code: 'Z02',
    title: 'Banjir Bandang',
    intro: 'Air sungai bisa naik dengan sangat cepat setelah hujan lebat.',
    mainSteps:
      'Segera menuju tempat tinggi, bawa Tas Siaga, dan jangan menyentuh listrik saat basah.',
    funFact:
      'Banjir bandang bisa datang walau di tempatmu tidak hujan, karena hujan turun di hulu sungai.',
  },
  LANDSLIDE: {
    code: 'Z03',
    title: 'Tanah Longsor',
    intro: 'Lereng bukit bisa meluncur ke bawah setelah hujan deras.',
    mainSteps:
      'Lari ke samping, tegak lurus dari arah luncuran tanah, lalu menuju tanah yang stabil.',
    funFact: 'Retakan tanah, pohon miring, dan air sumur keruh adalah tanda bahaya.',
  },
  VOLCANO: {
    code: 'Z04',
    title: 'Gunung Meletus',
    intro: 'Gunung api bisa mengeluarkan abu, batu, dan awan panas.',
    mainSteps:
      'Ikuti perintah evakuasi, pakai masker atau kain basah, dan jauhi zona terlarang.',
    funFact: 'Status gunung api ada 4: Normal, Waspada, Siaga, Awas.',
  },
};
