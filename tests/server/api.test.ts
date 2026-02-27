import { describe, it, expect, afterEach } from "vitest";
import type { Server } from "node:http";
import { createServer } from "../../src/server/index.js";
import type { HarnessGraph, HarnessFile } from "../../src/types/index.js";

const TEST_PORT = 3899;

function makeFile(overrides: Partial<HarnessFile> = {}): HarnessFile {
  return {
    path: "/tmp/test/CLAUDE.md",
    relativePath: "CLAUDE.md",
    type: "config",
    tokenInfo: { tokens: 100, bytes: 400 },
    frontmatter: null,
    content: "# Test",
    lastModified: "2025-01-01T00:00:00.000Z",
    references: [],
    ...overrides,
  };
}

function makeGraph(files: HarnessFile[] = [], edges: HarnessGraph["edges"] = []): HarnessGraph {
  return {
    files,
    edges,
    rootPath: "/tmp/test",
    scannedAt: "2025-01-01T00:00:00.000Z",
  };
}

describe("Server /api/scan endpoint", () => {
  let server: Server;

  afterEach(() => {
    return new Promise<void>((resolve) => {
      if (server) {
        server.close(() => resolve());
      } else {
        resolve();
      }
    });
  });

  it("returns ScanResult shape with files, graph, and lintResults", async () => {
    const file = makeFile();
    const graph = makeGraph([file]);
    server = createServer({ port: TEST_PORT, scanResult: graph });

    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/api/scan`);
    expect(res.ok).toBe(true);

    const data = await res.json();
    expect(data.files).toBeDefined();
    expect(data.graph).toBeDefined();
    expect(data.graph.nodes).toBeDefined();
    expect(data.graph.edges).toBeDefined();
    expect(data.lintResults).toBeDefined();
    expect(Array.isArray(data.files)).toBe(true);
    expect(Array.isArray(data.graph.nodes)).toBe(true);
    expect(Array.isArray(data.graph.edges)).toBe(true);
    expect(Array.isArray(data.lintResults)).toBe(true);
  });

  it("transforms files into graph nodes correctly", async () => {
    const file = makeFile({ relativePath: "src/AGENTS.md", type: "agent" });
    const graph = makeGraph([file]);
    server = createServer({ port: TEST_PORT, scanResult: graph });

    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/api/scan`);
    const data = await res.json();

    expect(data.graph.nodes).toHaveLength(1);
    const node = data.graph.nodes[0];
    expect(node.id).toBe("src/AGENTS.md");
    expect(node.label).toBe("AGENTS.md");
    expect(node.type).toBe("agent");
    expect(node.tokenInfo).toEqual({ tokens: 100, bytes: 400 });
  });

  it("transforms edges correctly", async () => {
    const file = makeFile();
    const graph = makeGraph([file], [
      { source: "CLAUDE.md", target: "docs/guide.md", type: "references" },
    ]);
    server = createServer({ port: TEST_PORT, scanResult: graph });

    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/api/scan`);
    const data = await res.json();

    expect(data.graph.edges).toHaveLength(1);
    expect(data.graph.edges[0].source).toBe("CLAUDE.md");
    expect(data.graph.edges[0].target).toBe("docs/guide.md");
    expect(data.graph.edges[0].type).toBe("references");
    expect(data.graph.edges[0].id).toBe("e0");
  });

  it("includes lint results when provided", async () => {
    const graph = makeGraph([makeFile()]);
    const lintResults = [
      { rule: "dead-reference", severity: "error" as const, file: "CLAUDE.md", message: "Missing target" },
    ];
    server = createServer({ port: TEST_PORT, scanResult: graph, lintResults });

    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/api/scan`);
    const data = await res.json();

    expect(data.lintResults).toHaveLength(1);
    expect(data.lintResults[0].rule).toBe("dead-reference");
    expect(data.lintResults[0].severity).toBe("error");
  });

  it("returns empty result when no scan data", async () => {
    server = createServer({ port: TEST_PORT, scanResult: undefined as unknown as HarnessGraph });

    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/api/scan`);
    const data = await res.json();

    expect(data.files).toEqual([]);
    expect(data.graph.nodes).toEqual([]);
    expect(data.graph.edges).toEqual([]);
    expect(data.lintResults).toEqual([]);
  });
});
