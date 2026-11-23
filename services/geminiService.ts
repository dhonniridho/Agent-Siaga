// services/geminiService.ts
// Gemini API service for generating adaptive narration from "Kapten Siaga"

export interface PerformanceData {
  teamName: string;
  disasterType: 'EARTHQUAKE' | 'FLOOD' | 'VOLCANO' | 'LANDSLIDE';
  disasterTitle: string;
  phase: 'ACTION' | 'RECOVERY';
  score: number;
  // ACTION phase details
  healthRemaining?: number;      // Earthquake/Volcano: 0-100
  itemsSaved?: number;           // Flood: how many items saved
  totalItems?: number;           // Flood: total items
  survived?: boolean;
  // RECOVERY phase details
  quizCorrect?: number;
  quizTotal?: number;
  // Items brought (briefing/bag)
  selectedItems?: string[];
  missedItems?: string[];
}

interface GeminiApiResponse {
  text?: string;
  error?: string;
}

const GEMINI_ENDPOINT = '/api/gemini';

/**
 * Calls the server-side Gemini proxy. The API key never exists in the browser;
 * the serverless function / Vite dev middleware owns it.
 */
async function requestGemini(
  prompt: string,
  temperature: number,
  maxOutputTokens: number,
): Promise<string | null> {
  const response = await fetch(GEMINI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, temperature, maxOutputTokens }),
  });

  if (!response.ok) {
    console.warn(`Gemini proxy error: ${response.status}. Falling back.`);
    return null;
  }

  const json = (await response.json()) as GeminiApiResponse;
  const text = typeof json.text === 'string' ? json.text.trim() : '';
  return text || null;
}

function buildPrompt(data: PerformanceData): string {
  const phaseLabel = data.phase === 'ACTION' ? 'Aksi Evakuasi' : 'Kuis Pemulihan';
  
  let performanceDetail = '';
  
  if (data.phase === 'ACTION') {
    if (data.disasterType === 'FLOOD') {
      const usefulPicked = data.itemsSaved ?? 0;
      const usefulTotal = data.totalItems ?? 5;
      performanceDetail = `
- Fase 1 (Isi Tas Siaga): ${usefulPicked}/${usefulTotal} barang penting terambil dari kapasitas 5
- Fase 2 (Evakuasi Lari): ${data.survived ? 'Sampai di gedung aman' : 'Terhempas arus / kesetrum sebelum sampai'}`;
    } else {
      performanceDetail = `
- Health/nyawa tersisa: ${data.healthRemaining ?? 0}%
- ${(data.healthRemaining ?? 0) > 70 ? 'Berhasil bertahan dengan sangat baik' : (data.healthRemaining ?? 0) > 30 ? 'Bertahan tapi agak terluka' : 'Banyak terluka saat evakuasi'}`;
    }
  } else {
    performanceDetail = `
- Jawaban benar: ${data.quizCorrect ?? 0} dari ${data.quizTotal ?? 5} pertanyaan
- Akurasi: ${data.quizTotal ? Math.round(((data.quizCorrect ?? 0) / data.quizTotal) * 100) : 0}%`;
  }

  return `Kamu adalah "Kapten Siaga", seorang kapten pemadam kebakaran dan ahli bencana yang berpengalaman. Kamu tegas tapi hangat dan peduli. Kamu sedang memberi briefing kepada tim anak-anak SD yang baru menyelesaikan simulasi tanggap bencana.

KONTEKS:
- Nama tim: "${data.teamName}"
- Jenis bencana: ${data.disasterTitle}
- Fase yang baru diselesaikan: ${phaseLabel}
- Skor: ${data.score}/100
${performanceDetail}

INSTRUKSI:
1. Sapa tim dengan nama mereka secara langsung
2. Berikan feedback SPESIFIK berdasarkan performa mereka:
   - Jika performa bagus (skor >= 80): puji dengan antusias, sebutkan apa yang mereka lakukan dengan benar
   - Jika performa sedang (skor 50-79): apresiasi usaha, berikan tips spesifik untuk perbaikan
   - Jika performa kurang (skor < 50): semangati, jelaskan apa yang bisa diperbaiki dengan contoh nyata
3. Selipkan 1 fakta/tips keselamatan bencana yang relevan dan menarik untuk anak-anak
4. Akhiri dengan semangat untuk fase berikutnya
5. Gunakan bahasa Indonesia yang ramah anak, boleh pakai emoji 1-2 saja
6. PENTING: Respons MAKSIMAL 3-4 kalimat saja. Singkat, padat, dan berenergi!
7. Jangan gunakan format markdown, cukup teks biasa`;
}

// Fallback narrations when API is unavailable
function getFallbackNarration(data: PerformanceData): string {
  const { teamName, disasterType, phase, score } = data;
  
  if (phase === 'ACTION') {
    if (score >= 80) {
      const praise: Record<string, string> = {
        EARTHQUAKE: `Luar biasa, ${teamName}! Kalian berhasil berlindung dengan sempurna saat gempa! 🛡️ Ingat ya, saat gempa: Drop, Cover, Hold On — jongkok, berlindung di bawah meja kuat, dan pegangan erat!`,
        FLOOD: `Luar biasa, ${teamName}! Isi tas siaga kalian tepat sasaran dan kalian sampai gedung aman dengan selamat! 💪 Tips: dokumen, uang tunai, obat, senter, dan P3K adalah prioritas utama saat banjir!`,
        VOLCANO: `Mantap, ${teamName}! Kalian berhasil menghindari batu vulkanik dengan gesit! 🌋 Ingat, saat erupsi yang paling berbahaya itu awan panas — bisa 700 derajat Celsius dan bergerak 100 km/jam!`,
        LANDSLIDE: `Hebat, ${teamName}! Kalian gesit menjauhi jalur longsor dan berhasil capai tanah aman! ⛰️ Ingat, saat longsor lari ke SAMPING menjauhi arah material — jangan pernah lari searah longsoran!`,
      };
      return praise[disasterType];
    } else if (score >= 50) {
      const tips: Record<string, string> = {
        EARTHQUAKE: `Bagus, ${teamName}, kalian selamat dari gempa! Tapi health kalian agak berkurang. Ingat, saat gempa jangan panik dan langsung berlari — berlindung dulu di bawah meja yang kokoh! 🏠`,
        FLOOD: `${teamName}, sudah bagus! Tapi ada barang tidak penting di tas atau ada goresan saat lari. Ingat: prioritaskan dokumen, uang, obat, senter, dan P3K — barang elektronik bisa diganti, nyawa tidak! 📋`,
        VOLCANO: `${teamName}, kalian berhasil bertahan tapi agak terluka. Saat erupsi, selalu lari tegak lurus menjauhi aliran lava, jangan searah! Dan pakai masker untuk lindungi paru-paru dari abu vulkanik! 😷`,
        LANDSLIDE: `${teamName}, kalian selamat tapi sempat tertimpa material. Ingat, longsor bergerak sangat cepat — begitu tanah retak atau terdengar gemuruh, langsung lari ke samping menjauhi lereng, jangan menunggu! ⛰️`,
      };
      return tips[disasterType];
    } else {
      const encourage: Record<string, string> = {
        EARTHQUAKE: `${teamName}, jangan menyerah! Gempa memang menakutkan, tapi kalau kita tahu caranya berlindung, kita bisa selamat. Latihan rutin itu penting — sekolah kalian punya jalur evakuasi kan? Hafalkan ya! 💪`,
        FLOOD: `${teamName}, banjir memang cepat datangnya! Kuncinya persiapan — tas siaga cuma muat sedikit, jadi pilih yang benar-benar penting: dokumen, uang, obat, senter, P3K. Dan awas air yang ada listriknya saat lari — WAJIB dihindari! ⚡`,
        VOLCANO: `${teamName}, menghindar dari batu vulkanik itu sulit! Tapi yang paling penting saat erupsi adalah SEGERA evakuasi begitu ada peringatan dari BPBD. Jangan tunggu sampai terlihat lava ya! ⚠️`,
        LANDSLIDE: `${teamName}, jangan menyerah! Longsor memang cepat, tapi alam selalu memberi tanda: retakan tanah, air keruh, dan pohon miring. Kalau lihat tanda itu saat hujan deras, segera menjauh dari lereng ya! ⚠️`,
      };
      return encourage[disasterType];
    }
  } else {
    // RECOVERY phase
    if (score >= 80) {
      return `Pengetahuan kalian tentang kebencanaan luar biasa, ${teamName}! Kalian menjawab hampir semua pertanyaan dengan benar. Dengan ilmu ini, kalian bisa jadi agen penyelamat sungguhan di lingkungan kalian! 🌟`;
    } else if (score >= 50) {
      return `${teamName}, pengetahuan kalian sudah cukup bagus! Tapi masih ada beberapa hal yang perlu dipelajari lagi. Coba tanya guru atau orang tua tentang prosedur evakuasi di rumah dan sekolah ya! 📚`;
    } else {
      return `${teamName}, jangan khawatir kalau belum hafal semua! Pengetahuan bencana itu penting banget — coba baca poster-poster BNPB atau tanya guru tentang cara berlindung yang benar. Latihan terus ya! 💡`;
    }
  }
}

export async function generateNarration(data: PerformanceData): Promise<string> {
  try {
    const text = await requestGemini(buildPrompt(data), 0.8, 256);

    if (!text) {
      console.warn('Gemini returned no narration. Falling back to static narration.');
      return getFallbackNarration(data);
    }

    return text;
  } catch (error) {
    console.warn('Gemini API call failed:', error);
    return getFallbackNarration(data);
  }
}

export async function generateQuestionFeedback(
  teamName: string,
  questionText: string,
  userAnswer: string,
  correctAnswer: string,
  isCorrect: boolean,
  explanation: string
): Promise<string> {
  const fallback = isCorrect
    ? `Tepat sekali, ${teamName}! ${explanation}`
    : `Sayang sekali, ${teamName}. Jawaban yang benar adalah "${correctAnswer}". ${explanation}`;

  const prompt = `Kamu adalah "Kapten Siaga", ahli kebencanaan yang sedang membimbing tim "${teamName}".
Tim baru saja menjawab soal kuis ini:
Pertanyaan: ${questionText}
Jawaban mereka: ${userAnswer}
Kunci jawaban: ${correctAnswer}
Status: ${isCorrect ? 'BENAR' : 'SALAH'}
Penjelasan teknis: ${explanation}

Berikan feedback SPESIFIK maksimal 3 kalimat:
1. Mulai dengan nama tim.
2. Respons secara natural terhadap jawaban mereka (puji jika benar, semangati jika salah).
3. Berikan intisari dari penjelasan teknis dalam bahasa anak-anak SD yang mudah dimengerti.
Jangan pakai format markdown.`;

  try {
    const text = await requestGemini(prompt, 0.7, 150);
    return text ?? fallback;
  } catch (error) {
    console.warn('Gemini question feedback failed:', error);
    return fallback;
  }
}
