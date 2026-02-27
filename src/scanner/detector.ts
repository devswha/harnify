import { glob } from "glob";
import path from "node:path";
import type { NodeType } from "../types/index.js";

/** Glob patterns for harness file detection */
const HARNESS_PATTERNS = [
  "CLAUDE.md",
  ".claude/CLAUDE.md",
  "**/AGENTS.md",
  ".claude/settings.json",
  ".claude/skills/**/*.md",
  ".cursorrules",
  ".cursor/rules/**",
  "codex.md",
  "docs/**/*.md",
];

/** Directories excluded from scanning */
const EXCLUDED_DIRS = [
  "node_modules",
  ".git",
  ".omc",
  "dist",
  "build",
  "coverage",
  ".next",
  ".nuxt",
];

export interface DetectOptions {
  /** Include ~/.claude/ user-level harness files (default: false) */
  includeHome?: boolean;
}

export interface DetectedFile {
  absolutePath: string;
  relativePath: string;
  type: NodeType;
}

/** Determine the node type based on file path */
export function classifyFile(relativePath: string): NodeType {
  const basename = path.basename(relativePath);
  const lowerPath = relativePath.toLowerCase();

  if (basename === "CLAUDE.md") return "config";
  if (basename === "AGENTS.md") return "agent";
  if (basename === "settings.json" && lowerPath.includes(".claude/")) return "settings";
  if (lowerPath.includes("/skills/") || lowerPath.includes("\\skills\\")) return "skill";
  if (basename === ".cursorrules" || lowerPath.includes(".cursor/rules")) return "rule";
  if (basename === "codex.md") return "config";
  if (lowerPath.startsWith("docs/") || lowerPath.startsWith("docs\\")) return "doc";

  return "doc";
}

/** Detect all harness files in a project directory */
export async function detectHarnessFiles(rootPath: string, options?: DetectOptions): Promise<DetectedFile[]> {
  const { includeHome = false } = options ?? {};
  const ignore = EXCLUDED_DIRS.map((d) => `**/${d}/**`);

  const matches = await glob(HARNESS_PATTERNS, {
    cwd: rootPath,
    ignore,
    nodir: true,
    dot: true,
    absolute: false,
  });

  // Deduplicate
  const seen = new Set<string>();
  const files: DetectedFile[] = [];

  for (const relativePath of matches) {
    const normalized = relativePath.replace(/\\/g, "/");
    if (seen.has(normalized)) continue;
    seen.add(normalized);

    files.push({
      absolutePath: path.resolve(rootPath, normalized),
      relativePath: normalized,
      type: classifyFile(normalized),
    });
  }

  // Only scan ~/.claude/ when explicitly opted in
  if (includeHome) {
    const homeDir = process.env.HOME || process.env.USERPROFILE || "";
    if (homeDir) {
      const homePatterns = [
        ".claude/CLAUDE.md",
        ".claude/skills/**/*.md",
      ];

      const homeMatches = await glob(homePatterns, {
        cwd: homeDir,
        nodir: true,
        dot: true,
        absolute: false,
      });

      for (const rel of homeMatches) {
        const normalized = `~/${rel.replace(/\\/g, "/")}`;
        if (seen.has(normalized)) continue;
        seen.add(normalized);

        files.push({
          absolutePath: path.resolve(homeDir, rel),
          relativePath: normalized,
          type: classifyFile(rel),
        });
      }
    }
  }

  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}
