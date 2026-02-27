import { Command } from "commander";
import fs from "node:fs/promises";
import { resolve, dirname, relative } from "node:path";
import { exec } from "node:child_process";
import { detectHarnessFiles } from "../scanner/detector.js";
import { parseFile } from "../scanner/parser.js";
import { countTokens } from "../scanner/tokenizer.js";
import { extractReferences } from "../scanner/reference.js";
import { createServer } from "../server/index.js";
import { lint, formatLintResults } from "../linter/index.js";
import type { HarnessFile, HarnessGraph, HarnessEdge } from "../types/index.js";

const program = new Command();

program
  .name("harnify")
  .description("AI agent harness engineering tool — visualize and lint your agent configs")
  .version("0.1.0")
  .option("--json", "Output scan results as JSON")
  .option("--port <number>", "Dashboard server port", "3847")
  .option("--no-open", "Don't auto-open browser")
  .option("--include-home", "Include ~/.claude/ files in scan")
  .action(async (opts) => {
    const rootPath = process.cwd();
    const includeHome = opts.includeHome ?? false;

    try {
      const graph = await scan(rootPath, { includeHome });

      if (opts.json) {
        console.log(JSON.stringify(graph, null, 2));
        return;
      }

      // Default: print summary then start dashboard
      printSummary(graph);

      const port = parseInt(opts.port, 10);
      createServer({ port, scanResult: graph });

      if (opts.open !== false) {
        const openCmd =
          process.platform === "darwin"
            ? "open"
            : process.platform === "win32"
              ? "start"
              : "xdg-open";
        exec(`${openCmd} http://127.0.0.1:${port}`);
      }
    } catch (err) {
      console.error("Error scanning harness files:", err);
      process.exit(1);
    }
  });

program
  .command("lint")
  .description("Run lint rules on harness files")
  .option("--include-home", "Include ~/.claude/ files in scan")
  .action(async (opts) => {
    const rootPath = process.cwd();
    const includeHome = opts.includeHome ?? false;

    try {
      const graph = await scan(rootPath, { includeHome });
      const results = lint(graph.files, { rootPath });

      console.log(`\n  harnify v0.1.0 — Lint Results\n`);
      console.log(formatLintResults(results));

      const errors = results.filter((r) => r.severity === "error");
      if (errors.length > 0) {
        process.exit(1);
      }
    } catch (err) {
      console.error("Error running lint:", err);
      process.exit(1);
    }
  });

/** Scan the project and build the harness graph */
export async function scan(rootPath: string, options?: { includeHome?: boolean }): Promise<HarnessGraph> {
  const detected = await detectHarnessFiles(rootPath, { includeHome: options?.includeHome });
  const files: HarnessFile[] = [];
  const edges: HarnessEdge[] = [];

  for (const det of detected) {
    try {
      const parsed = await parseFile(det.absolutePath);
      const tokenInfo = countTokens(parsed.content);
      const stat = await fs.stat(det.absolutePath);
      const references = det.absolutePath.endsWith(".md")
        ? extractReferences(parsed.content)
        : [];

      files.push({
        path: det.absolutePath,
        relativePath: det.relativePath,
        type: det.type,
        tokenInfo,
        frontmatter: parsed.frontmatter,
        content: parsed.content,
        lastModified: stat.mtime.toISOString(),
        references,
      });

      // Build edges from references
      for (const ref of references) {
        // Resolve reference relative to the source file's directory
        const absRef = resolve(dirname(det.absolutePath), ref);
        const relRef = relative(rootPath, absRef);
        edges.push({
          source: det.relativePath,
          target: relRef,
          type: "references",
        });
      }
    } catch (err) {
      // Skip files that can't be read (permissions, etc.)
      console.warn(`Warning: Could not read ${det.relativePath}: ${err}`);
    }
  }

  return {
    files,
    edges,
    rootPath,
    scannedAt: new Date().toISOString(),
  };
}

/** Print a human-readable summary of the scan */
function printSummary(graph: HarnessGraph): void {
  const totalTokens = graph.files.reduce((sum, f) => sum + f.tokenInfo.tokens, 0);

  console.log(`\n  harnify v0.1.0 — Harness Scan Results\n`);
  console.log(`  Root: ${graph.rootPath}`);
  console.log(`  Files: ${graph.files.length}`);
  console.log(`  Total tokens: ~${totalTokens.toLocaleString()}`);
  console.log(`  References: ${graph.edges.length}`);
  console.log();

  // Group by type
  const byType = new Map<string, HarnessFile[]>();
  for (const f of graph.files) {
    const list = byType.get(f.type) || [];
    list.push(f);
    byType.set(f.type, list);
  }

  const typeOrder = ["config", "agent", "skill", "settings", "rule", "doc"];
  for (const type of typeOrder) {
    const list = byType.get(type);
    if (!list || list.length === 0) continue;

    console.log(`  ${type.toUpperCase()} (${list.length})`);
    for (const f of list) {
      const tokens = f.tokenInfo.tokens.toLocaleString().padStart(8);
      console.log(`    ${tokens} tok  ${f.relativePath}`);
    }
    console.log();
  }
}

// Only parse CLI args when run directly (not when imported by tests)
if (!process.env.VITEST) {
  program.parse(process.argv);
}
