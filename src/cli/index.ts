import { Command } from "commander";
import fs from "node:fs/promises";
import { resolve, dirname, relative } from "node:path";
import { execFile } from "node:child_process";
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
      const lintResults = lint(graph.files, { rootPath });
      createServer({ port, scanResult: graph, lintResults });

      if (opts.open !== false) {
        const url = `http://127.0.0.1:${port}`;
        const openCmd =
          process.platform === "darwin"
            ? "open"
            : process.platform === "win32"
              ? "cmd"
              : "xdg-open";
        const args =
          process.platform === "win32"
            ? ["/c", "start", url]
            : [url];
        execFile(openCmd, args, () => {});
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

/** Process a single detected file into a HarnessFile + edges */
async function processFile(
  det: { absolutePath: string; relativePath: string; type: string },
  rootPath: string,
): Promise<{ file: HarnessFile; edges: HarnessEdge[] } | null> {
  try {
    const [parsed, stat] = await Promise.all([
      parseFile(det.absolutePath),
      fs.stat(det.absolutePath),
    ]);
    const tokenInfo = countTokens(parsed.content);
    const references = det.absolutePath.endsWith(".md")
      ? extractReferences(parsed.content)
      : [];

    const file: HarnessFile = {
      path: det.absolutePath,
      relativePath: det.relativePath,
      type: det.type as HarnessFile["type"],
      tokenInfo,
      frontmatter: parsed.frontmatter,
      content: parsed.content,
      lastModified: stat.mtime.toISOString(),
      references,
    };

    const edges: HarnessEdge[] = references.map((ref) => {
      const absRef = resolve(dirname(det.absolutePath), ref);
      const relRef = relative(rootPath, absRef);
      return { source: det.relativePath, target: relRef, type: "references" as const };
    });

    return { file, edges };
  } catch (err) {
    console.warn(`Warning: Could not read ${det.relativePath}: ${err}`);
    return null;
  }
}

/** Scan the project and build the harness graph */
export async function scan(rootPath: string, options?: { includeHome?: boolean }): Promise<HarnessGraph> {
  const detected = await detectHarnessFiles(rootPath, { includeHome: options?.includeHome });

  const results = await Promise.all(
    detected.map((det) => processFile(det, rootPath)),
  );

  const files: HarnessFile[] = [];
  const edges: HarnessEdge[] = [];

  for (const result of results) {
    if (result) {
      files.push(result.file);
      edges.push(...result.edges);
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
