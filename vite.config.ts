import path from 'path';
import type { IncomingMessage } from 'node:http';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { callGemini } from './server/gemini';
import { createApiApp } from './server/api.mjs';

function getClientIp(req: IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for'];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return value?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
}

async function readJsonBody(
  req: IncomingMessage,
): Promise<Record<string, unknown> | null> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
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

/**
 * Serves POST /api/gemini during `npm run dev`.
 * The key is read from loadEnv on the server only and is never injected
 * into the client bundle.
 */
function geminiDevApiPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'gemini-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/gemini', async (req, res) => {
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');

        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Allow', 'POST');
          res.end(JSON.stringify({ error: 'Metode tidak diizinkan. Gunakan POST.' }));
          return;
        }

        try {
          const payload = await readJsonBody(req);

          if (!payload) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Body harus berupa JSON yang valid.' }));
            return;
          }

          const result = await callGemini(env.GEMINI_API_KEY ?? '', {
            prompt: typeof payload.prompt === 'string' ? payload.prompt : '',
            temperature:
              typeof payload.temperature === 'number' ? payload.temperature : undefined,
            maxOutputTokens:
              typeof payload.maxOutputTokens === 'number'
                ? payload.maxOutputTokens
                : undefined,
            ip: getClientIp(req),
          });

          res.statusCode = result.status;
          res.end(JSON.stringify(result.body));
        } catch (error) {
          res.statusCode = 500;
          res.end(
            JSON.stringify({
              error:
                error instanceof Error
                  ? error.message
                  : 'Terjadi kesalahan pada server.',
            }),
          );
        }
      });
    },
  };
}

/**
 * API lokal (auth guru, database SQLite, skor tim) untuk `npm run dev`.
 * Server yang sama juga dipakai `server/start.mjs` pada mode produksi.
 */
function siagaApiPlugin(): Plugin {
  return {
    name: 'siaga-local-api',
    configureServer(server) {
      const app = createApiApp();
      server.middlewares.use(app);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react(), siagaApiPlugin(), geminiDevApiPlugin(env)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
