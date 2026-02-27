import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import type { HarnessGraph } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ServerOptions {
  port: number;
  scanResult: HarnessGraph;
}

export function createServer({ port, scanResult }: ServerOptions) {
  const app = express();

  app.use(cors({ origin: `http://127.0.0.1:${port}` }));
  app.use(express.json());

  // API: return scan results
  app.get('/api/scan', (_req, res) => {
    res.json(scanResult ?? { files: [], edges: [], rootPath: '', scannedAt: new Date().toISOString() });
  });

  // Serve static web files
  const webDir = path.resolve(__dirname, '../web');
  app.use(express.static(webDir));

  // SPA fallback
  app.get('*', (_req, res) => {
    res.sendFile(path.join(webDir, 'index.html'));
  });

  const server = app.listen(port, '127.0.0.1', () => {
    console.log(`  Harnify dashboard: http://127.0.0.1:${port}`);
  });

  return server;
}
