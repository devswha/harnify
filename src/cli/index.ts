import { Command } from "commander";
import fs from "node:fs/promises";
import { resolve, dirname, relative } from "node:path";
import { detectHarnessFiles } from "../scanner/detector.js";
import { parseFile } from "../scanner/parser.js";
import { countTokens } from "../scanner/tokenizer.js";
import { extractReferences } from "../scanner/reference.js";
import type { HarnessFile, HarnessGraph, HarnessEdge } from "../types/index.js";

const program = new Command();

program
  .name("harnify")
  .description("AI agent harness engineering tool — visualize and lint your agent configs")
  .version("0.1.0")
  .option("--json", "Output scan results as JSON")
  .option("--port <number>", "Dashboard server port", "3847")
  .option("--no-open", "Don't auto-open browser")
  .action(async (opts) => {
    const rootPath = process.cwd();

    try {
      const graph = await scan(rootPath);

      if (opts.json) {
        console.log(JSON.stringify(graph, null, 2));
        return;
      }

      // Default: print summary to console
      printSummary(graph);

      // Dashboard stub (will be implemented in M2)
      if (!opts.json) {
        const port = parseInt(opts.port, 10);
        console.log(
          `\nDashboard: http://localhost:${port} (coming in v0.2)`
        );
      }
    } catch (err) {
      console.error("Error scanning harness files:", err);
      process.exit(1);
    }
  });

program
  .command("lint")
  .description("Run lint rules on harness files")
  .action(async () => {
    console.log("Lint command coming in M3.");
  });

/** Scan the project and build the harness graph */
export async function scan(rootPath: string): Promise<HarnessGraph> {
  const detected = await detectHarnessFiles(rootPath);
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

program.parse(process.argv);
