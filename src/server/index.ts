import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import type { HarnessGraph, ScanResult } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ServerOptions {
  port: number;
  scanResult: HarnessGraph;
  lintResults?: import('../types/index.js').LintResult[];
}

/** Transform the internal HarnessGraph into the API ScanResult shape */
function toScanResult(graph: HarnessGraph, lintResults: import('../types/index.js').LintResult[] = []): ScanResult {
  const nodes = graph.files.map((f) => ({
    id: f.relativePath,
    label: f.relativePath.split('/').pop() ?? f.relativePath,
    type: f.type,
    tokenInfo: f.tokenInfo,
    path: f.relativePath,
    lastModified: f.lastModified,
  }));

  const edges = graph.edges.map((e, i) => ({
    id: `e${i}`,
    source: e.source,
    target: e.target,
    type: e.type,
  }));

  return {
    files: graph.files,
    graph: { nodes, edges },
    lintResults,
  };
}

export function createServer({ port, scanResult, lintResults }: ServerOptions) {
  const app = express();

  app.use(cors({ origin: `http://127.0.0.1:${port}` }));
  app.use(express.json());

  // API: return scan results in ScanResult shape
  app.get('/api/scan', (_req, res) => {
    if (scanResult) {
      res.json(toScanResult(scanResult, lintResults));
    } else {
      const empty: ScanResult = { files: [], graph: { nodes: [], edges: [] }, lintResults: [] };
      res.json(empty);
    }
  });

  // Serve static web files
  const webDir = path.resolve(__dirname, '../web');
  app.use(express.static(webDir));

  // SPA fallback (Express v5 path-to-regexp syntax)
  app.get('{*path}', (_req, res) => {
    res.sendFile(path.join(webDir, 'index.html'));
  });

  const server = app.listen(port, '127.0.0.1', () => {
    console.log(`  Harnify dashboard: http://127.0.0.1:${port}`);
  });

  return server;
}
