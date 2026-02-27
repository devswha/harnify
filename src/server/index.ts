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

// Mask potentially sensitive values in content before sending over API
function maskSensitiveContent(content: string): string {
  const patterns = [
    /(api[_-]?key|token|secret|password|credential|auth[_-]?token|private[_-]?key|access[_-]?key|client[_-]?secret)\s*[:=]\s*["']?([^\s"'\n,}]+)/gi,
    /("(?:api[_-]?key|token|secret|password|credential|auth[_-]?token|private[_-]?key|access[_-]?key|client[_-]?secret)")\s*:\s*"([^"]+)"/gi,
    /(Bearer)\s+([A-Za-z0-9_.~+/=-]{10,})/g,
    /\b(sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{36,}|xoxb-[A-Za-z0-9-]+|AKIA[A-Z0-9]{16})\b/g,
  ];
  let masked = content;
  for (const pattern of patterns) {
    masked = masked.replace(pattern, (match, key) => {
      if (typeof key === 'string' && match.length > key.length) return `${key}: [REDACTED]`;
      return '[REDACTED]';
    });
  }
  return masked;
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

  // Redact sensitive content server-side before sending to clients
  const sanitizedFiles = graph.files.map((f) => ({
    ...f,
    content: maskSensitiveContent(f.content),
  }));

  return {
    files: sanitizedFiles,
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
