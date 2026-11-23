// server/gemini.ts
// Server-side Gemini client. The API key never reaches the browser bundle.

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const MAX_PROMPT_LENGTH = 4000;
const MAX_OUTPUT_TOKENS = 300;
const DEFAULT_MAX_OUTPUT_TOKENS = 256;
const RATE_LIMIT_PER_MINUTE = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;

const SAFETY_SETTINGS = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
];

export interface GeminiRequestOptions {
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  /** Client IP used for the simple per-IP rate limit. */
  ip?: string;
}

export interface GeminiResult {
  status: number;
  body: { text?: string; error?: string };
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: number;
}

/**
 * Simple in-memory sliding bucket: max 30 requests per IP per minute.
 * Good enough for a single serverless instance / local dev server.
 */
export function checkRateLimit(ip: string): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || entry.resetAt <= now) {
    // Opportunistically drop expired entries so the map cannot grow forever.
    if (rateLimitStore.size > 10_000) {
      for (const [key, value] of rateLimitStore) {
        if (value.resetAt <= now) rateLimitStore.delete(key);
      }
    }
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_PER_MINUTE - 1 };
  }

  if (entry.count >= RATE_LIMIT_PER_MINUTE) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }

  entry.count += 1;
  return { allowed: true, remaining: RATE_LIMIT_PER_MINUTE - entry.count };
}

function sanitizeTemperature(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0.7;
  return Math.min(Math.max(value, 0), 2);
}

function sanitizeMaxOutputTokens(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_MAX_OUTPUT_TOKENS;
  }
  return Math.min(Math.max(Math.trunc(value), 1), MAX_OUTPUT_TOKENS);
}

export async function callGemini(
  apiKey: string,
  options: GeminiRequestOptions,
): Promise<GeminiResult> {
  const { prompt, ip } = options;

  if (ip) {
    const limit = checkRateLimit(ip);
    if (!limit.allowed) {
      return {
        status: 429,
        body: {
          error: `Terlalu banyak permintaan. Coba lagi dalam ${limit.retryAfter} detik.`,
        },
      };
    }
  }

  if (typeof prompt !== 'string') {
    return { status: 400, body: { error: 'Prompt harus berupa teks.' } };
  }

  const trimmedPrompt = prompt.trim();

  if (!trimmedPrompt) {
    return { status: 400, body: { error: 'Prompt tidak boleh kosong.' } };
  }

  if (trimmedPrompt.length > MAX_PROMPT_LENGTH) {
    return {
      status: 400,
      body: { error: `Prompt maksimal ${MAX_PROMPT_LENGTH} karakter.` },
    };
  }

  if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY' || !apiKey.trim()) {
    return {
      status: 503,
      body: { error: 'GEMINI_API_KEY belum dikonfigurasi di server.' },
    };
  }

  try {
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: trimmedPrompt }] }],
        generationConfig: {
          temperature: sanitizeTemperature(options.temperature),
          topP: 0.9,
          topK: 40,
          maxOutputTokens: sanitizeMaxOutputTokens(options.maxOutputTokens),
        },
        safetySettings: SAFETY_SETTINGS,
      }),
    });

    if (!response.ok) {
      let detail = '';
      try {
        const errorJson = (await response.json()) as {
          error?: { message?: string };
        };
        detail = errorJson?.error?.message ?? '';
      } catch {
        // Ignore non-JSON upstream errors.
      }
      return {
        status: 502,
        body: {
          error: detail || `Gemini API gagal (HTTP ${response.status}).`,
        },
      };
    }

    const json = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!text) {
      return { status: 502, body: { error: 'Gemini mengembalikan respons kosong.' } };
    }

    return { status: 200, body: { text } };
  } catch (error) {
    return {
      status: 502,
      body: {
        error: error instanceof Error ? error.message : 'Gagal menghubungi Gemini.',
      },
    };
  }
}
