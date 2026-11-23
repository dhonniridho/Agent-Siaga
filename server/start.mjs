import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import { createApiApp } from './api.mjs';

/**
 * Server produksi lokal: menyajikan hasil build Vite (`dist`) + API SQLite.
 * Jalankan `npm run build` lalu `npm start`.
 */

try {
  process.loadEnvFile?.('.env.local');
} catch {
  // .env.local opsional
}

const PORT = Number(process.env.PORT || 3000);
const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error(
    '[Agent SIAGA] Folder dist belum ada. Jalankan `npm run build` terlebih dahulu.'
  );
  process.exit(1);
}

const app = express();
app.use(createApiApp());
app.use(express.static(DIST, { index: false, maxAge: '1h' }));

app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api/')) {
    next();
    return;
  }
  res.sendFile(path.join(DIST, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[Agent SIAGA] Server lokal berjalan di http://localhost:${PORT}`);
  console.log(`[Agent SIAGA] Dashboard guru: http://localhost:${PORT}/guru`);
});
