// api/gemini.ts
// Vercel serverless function: POST /api/gemini
// The Gemini key lives only in the server environment (process.env.GEMINI_API_KEY).

import type { IncomingMessage, ServerResponse } from 'node:http';
import { callGemini } from '../server/gemini.js';

type ApiRequest = IncomingMessage & { body?: unknown };

interface GeminiRequestBody {
  prompt?: unknown;
  temperature?: unknown;
  maxOutputTokens?: unknown;
}

async function readJsonBody(req: ApiRequest): Promise<Record<string, unknown> | null> {
  const preParsed = req.body;

  if (preParsed !== undefined) {
    if (typeof preParsed === 'string') {
      if (!preParsed.trim()) return {};
      try {
        const parsed = JSON.parse(preParsed);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
          ? (parsed as Record<string, unknown>)
          : null;
      } catch {
        return null;
      }
    }
    return preParsed && typeof preParsed === 'object' && !Array.isArray(preParsed)
      ? (preParsed as Record<string, unknown>)
      : null;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw.trim()) return {};

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function getClientIp(req: ApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const forwardedValue = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const first = forwardedValue?.split(',')[0]?.trim();
  return first || req.socket.remoteAddress || 'unknown';
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export default async function handler(req: ApiRequest, res: ServerResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJson(res, 405, { error: 'Metode tidak diizinkan. Gunakan POST.' });
    return;
  }

  const payload = await readJsonBody(req);

  if (!payload) {
    sendJson(res, 400, { error: 'Body harus berupa JSON yang valid.' });
    return;
  }

  const body = payload as GeminiRequestBody;
  const result = await callGemini(process.env.GEMINI_API_KEY ?? '', {
    prompt: typeof body.prompt === 'string' ? body.prompt : '',
    temperature: typeof body.temperature === 'number' ? body.temperature : undefined,
    maxOutputTokens:
      typeof body.maxOutputTokens === 'number' ? body.maxOutputTokens : undefined,
    ip: getClientIp(req),
  });

  sendJson(res, result.status, result.body);
}
