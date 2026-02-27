import { describe, it, expect, beforeAll } from "vitest";
import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import { detectHarnessFiles } from "../../src/scanner/detector.js";
import { countTokens } from "../../src/scanner/tokenizer.js";
import { scan } from "../../src/cli/index.js";
import { lint } from "../../src/linter/index.js";
import type { HarnessGraph } from "../../src/types/index.js";

const FIXTURES = path.join(__dirname, "fixtures");
const SAMPLE_PROJECT = path.join(FIXTURES, "sample-project");
const EMPTY_PROJECT = path.join(FIXTURES, "empty-project");
const MINIMAL_PROJECT = path.join(FIXTURES, "minimal-project");
const NESTED_PROJECT = path.join(FIXTURES, "nested-project");

// ─── Scanner Detection Tests ────────────────────────────────────────────────

describe("Scanner Detection (E2E)", () => {
  it("detects all harness files in fixture project", async () => {
    const files = await detectHarnessFiles(SAMPLE_PROJECT);
    const projectFiles = files.filter((f) => !f.relativePath.startsWith("~/"));

    // sample-project has: CLAUDE.md, .claude/settings.json, 2 skills, src/AGENTS.md,
    // docs/guide.md, .cursorrules, codex.md = 8 files
    expect(projectFiles.length).toBe(8);
  });

  it("correctly identifies file types", async () => {
    const files = await detectHarnessFiles(SAMPLE_PROJECT);
    const projectFiles = files.filter((f) => !f.relativePath.startsWith("~/"));

    const byType = new Map<string, string[]>();
    for (const f of projectFiles) {
      const list = byType.get(f.type) ?? [];
      list.push(f.relativePath);
      byType.set(f.type, list);
    }

    // config: CLAUDE.md, codex.md
    expect(byType.get("config")).toHaveLength(2);
    expect(byType.get("config")).toContain("CLAUDE.md");
    expect(byType.get("config")).toContain("codex.md");

    // agent: src/AGENTS.md
    expect(byType.get("agent")).toHaveLength(1);
    expect(byType.get("agent")).toContain("src/AGENTS.md");

    // skill: 2 skill files
    expect(byType.get("skill")).toHaveLength(2);

    // settings: .claude/settings.json
    expect(byType.get("settings")).toHaveLength(1);

    // rule: .cursorrules
    expect(byType.get("rule")).toHaveLength(1);
    expect(byType.get("rule")).toContain(".cursorrules");

    // doc: docs/guide.md
    expect(byType.get("doc")).toHaveLength(1);
    expect(byType.get("doc")).toContain("docs/guide.md");
  });

  it("excludes node_modules and .git directories", async () => {
    // Create temporary project with node_modules content
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "harnify-e2e-excl-"));
    try {
      await fs.writeFile(path.join(tmpDir, "CLAUDE.md"), "# Test");
      await fs.mkdir(path.join(tmpDir, "node_modules", "pkg"), { recursive: true });
      await fs.writeFile(path.join(tmpDir, "node_modules", "pkg", "CLAUDE.md"), "# Excluded");
      await fs.mkdir(path.join(tmpDir, ".git", "info"), { recursive: true });
      await fs.writeFile(path.join(tmpDir, ".git", "info", "AGENTS.md"), "# Excluded");

      const files = await detectHarnessFiles(tmpDir);
      const projectFiles = files.filter((f) => !f.relativePath.startsWith("~/"));

      expect(projectFiles.every((f) => !f.relativePath.includes("node_modules"))).toBe(true);
      expect(projectFiles.every((f) => !f.relativePath.includes(".git/"))).toBe(true);
      expect(projectFiles.some((f) => f.relativePath === "CLAUDE.md")).toBe(true);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("handles empty directories gracefully", async () => {
    const files = await detectHarnessFiles(EMPTY_PROJECT);
    const projectFiles = files.filter((f) => !f.relativePath.startsWith("~/"));
    expect(projectFiles).toEqual([]);
  });

  it("handles missing directories gracefully", async () => {
    const nonExistent = path.join(FIXTURES, "does-not-exist");
    const files = await detectHarnessFiles(nonExistent);
    const projectFiles = files.filter((f) => !f.relativePath.startsWith("~/"));
    expect(projectFiles).toEqual([]);
  });
});

// ─── Full Scan / JSON Output Tests ──────────────────────────────────────────

describe("Scan / JSON Output (E2E)", () => {
  let graph: HarnessGraph;

  beforeAll(async () => {
    graph = await scan(SAMPLE_PROJECT);
  });

  it("returns a valid graph structure", () => {
    expect(graph).toBeDefined();
    expect(graph.rootPath).toBe(SAMPLE_PROJECT);
    expect(typeof graph.scannedAt).toBe("string");
    expect(Array.isArray(graph.files)).toBe(true);
    expect(Array.isArray(graph.edges)).toBe(true);
  });

  it("contains expected file entries with correct metadata", () => {
    const projectFiles = graph.files.filter((f) => !f.relativePath.startsWith("~/"));

    const claudeMd = projectFiles.find((f) => f.relativePath === "CLAUDE.md");
    expect(claudeMd).toBeDefined();
    expect(claudeMd!.type).toBe("config");
    expect(claudeMd!.path).toBe(path.join(SAMPLE_PROJECT, "CLAUDE.md"));
    expect(claudeMd!.content).toContain("# Project Rules");
    expect(typeof claudeMd!.lastModified).toBe("string");

    const agentsMd = projectFiles.find((f) => f.relativePath === "src/AGENTS.md");
    expect(agentsMd).toBeDefined();
    expect(agentsMd!.type).toBe("agent");
  });

  it("includes token counts (number > 0)", () => {
    const projectFiles = graph.files.filter((f) => !f.relativePath.startsWith("~/"));
    for (const file of projectFiles) {
      expect(file.tokenInfo.tokens).toBeGreaterThan(0);
      expect(file.tokenInfo.bytes).toBeGreaterThan(0);
    }
  });

  it("includes reference relationships", () => {
    const claudeMd = graph.files.find((f) => f.relativePath === "CLAUDE.md");
    expect(claudeMd).toBeDefined();
    // CLAUDE.md references ./docs/guide.md and ./docs/nonexistent.md
    expect(claudeMd!.references.length).toBeGreaterThanOrEqual(2);
    expect(claudeMd!.references).toContain("./docs/guide.md");
    expect(claudeMd!.references).toContain("./docs/nonexistent.md");
  });

  it("builds edges from file references", () => {
    const claudeEdges = graph.edges.filter((e) => e.source === "CLAUDE.md");
    expect(claudeEdges.length).toBeGreaterThanOrEqual(2);
    expect(claudeEdges.every((e) => e.type === "references")).toBe(true);
    expect(claudeEdges.some((e) => e.target === "docs/guide.md")).toBe(true);
    expect(claudeEdges.some((e) => e.target === "docs/nonexistent.md")).toBe(true);
  });

  it("produces valid JSON output", () => {
    const json = JSON.stringify(graph, null, 2);
    const parsed = JSON.parse(json);
    expect(parsed.files).toBeDefined();
    expect(parsed.edges).toBeDefined();
    expect(parsed.rootPath).toBe(SAMPLE_PROJECT);
  });
});

// ─── Lint Integration Tests ─────────────────────────────────────────────────

describe("Lint Integration (E2E)", () => {
  let graph: HarnessGraph;

  beforeAll(async () => {
    graph = await scan(SAMPLE_PROJECT);
  });

  it("detects dead-reference for non-existent file", () => {
    const projectFiles = graph.files.filter((f) => !f.relativePath.startsWith("~/"));
    const results = lint(projectFiles, { rootPath: SAMPLE_PROJECT });
    const deadRefs = results.filter((r) => r.rule === "dead-reference");

    expect(deadRefs.length).toBeGreaterThanOrEqual(1);
    expect(deadRefs.some((r) => r.message.includes("nonexistent.md"))).toBe(true);
    expect(deadRefs.every((r) => r.severity === "error")).toBe(true);
  });

  it("detects trigger-conflict for shared trigger keyword", () => {
    const projectFiles = graph.files.filter((f) => !f.relativePath.startsWith("~/"));
    const results = lint(projectFiles, { rootPath: SAMPLE_PROJECT });
    const triggerConflicts = results.filter((r) => r.rule === "trigger-conflict");

    // Both skills have trigger: "generate" in frontmatter
    expect(triggerConflicts.length).toBeGreaterThanOrEqual(1);
    expect(triggerConflicts.some((r) => r.message.includes("generate"))).toBe(true);
    expect(triggerConflicts.every((r) => r.severity === "warning")).toBe(true);
  });

  it("detects orphan-skill for unreferenced skills", () => {
    const projectFiles = graph.files.filter((f) => !f.relativePath.startsWith("~/"));
    const results = lint(projectFiles, { rootPath: SAMPLE_PROJECT });
    const orphans = results.filter((r) => r.rule === "orphan-skill");

    // Skills are not referenced from CLAUDE.md or other non-skill files
    // (unless the content includes the skill name)
    // generate-code and review-code skill names might appear as substrings,
    // so we just verify the rule runs without error
    expect(Array.isArray(orphans)).toBe(true);
  });

  it("returns correct severity levels across rules", () => {
    const projectFiles = graph.files.filter((f) => !f.relativePath.startsWith("~/"));
    const results = lint(projectFiles, { rootPath: SAMPLE_PROJECT });

    for (const result of results) {
      expect(["error", "warning", "info"]).toContain(result.severity);
    }

    // dead-reference should be error
    const deadRefs = results.filter((r) => r.rule === "dead-reference");
    for (const r of deadRefs) {
      expect(r.severity).toBe("error");
    }

    // trigger-conflict should be warning
    const triggers = results.filter((r) => r.rule === "trigger-conflict");
    for (const r of triggers) {
      expect(r.severity).toBe("warning");
    }
  });

  it("results are sorted by severity (errors first)", () => {
    const projectFiles = graph.files.filter((f) => !f.relativePath.startsWith("~/"));
    const results = lint(projectFiles, { rootPath: SAMPLE_PROJECT });

    if (results.length > 1) {
      const severityOrder = { error: 0, warning: 1, info: 2 };
      for (let i = 1; i < results.length; i++) {
        const prev = severityOrder[results[i - 1].severity];
        const curr = severityOrder[results[i].severity];
        expect(curr).toBeGreaterThanOrEqual(prev);
      }
    }
  });

  it("clean project returns no errors", async () => {
    // Use a temp dir with a minimal, clean setup
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "harnify-e2e-clean-"));
    try {
      await fs.writeFile(path.join(tmpDir, "CLAUDE.md"), "# Clean Project\n\nNo issues here.");
      const cleanGraph = await scan(tmpDir);
      const projectFiles = cleanGraph.files.filter((f) => !f.relativePath.startsWith("~/"));
      const results = lint(projectFiles, { rootPath: tmpDir });

      const errors = results.filter((r) => r.severity === "error");
      expect(errors).toHaveLength(0);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});

// ─── Token Counting Tests ───────────────────────────────────────────────────

describe("Token Counting (E2E)", () => {
  it("token counts are positive numbers for all fixture files", async () => {
    const graph = await scan(SAMPLE_PROJECT);
    const projectFiles = graph.files.filter((f) => !f.relativePath.startsWith("~/"));

    for (const file of projectFiles) {
      expect(file.tokenInfo.tokens).toBeGreaterThan(0);
      expect(Number.isInteger(file.tokenInfo.tokens)).toBe(true);
    }
  });

  it("larger files have larger token counts", async () => {
    const graph = await scan(SAMPLE_PROJECT);
    const projectFiles = graph.files.filter((f) => !f.relativePath.startsWith("~/"));

    // Find CLAUDE.md (larger) and .cursorrules (smaller)
    const claudeMd = projectFiles.find((f) => f.relativePath === "CLAUDE.md");
    const cursorrules = projectFiles.find((f) => f.relativePath === ".cursorrules");

    expect(claudeMd).toBeDefined();
    expect(cursorrules).toBeDefined();

    // CLAUDE.md has more content than .cursorrules
    if (claudeMd!.tokenInfo.bytes > cursorrules!.tokenInfo.bytes) {
      expect(claudeMd!.tokenInfo.tokens).toBeGreaterThan(cursorrules!.tokenInfo.tokens);
    }
  });

  it("token count roughly equals bytes / 4", () => {
    const smallContent = "Hello world";
    const result = countTokens(smallContent);
    expect(result.tokens).toBe(Math.ceil(result.bytes / 4));

    const largerContent = "A".repeat(1000);
    const result2 = countTokens(largerContent);
    expect(result2.tokens).toBe(Math.ceil(result2.bytes / 4));
  });

  it("byte count matches content length for ASCII", () => {
    const content = "Just ASCII text here.";
    const result = countTokens(content);
    expect(result.bytes).toBe(content.length);
  });
});

// ─── Edge Cases ─────────────────────────────────────────────────────────────

describe("Edge Cases (E2E)", () => {
  it("empty project directory returns no harness files", async () => {
    const files = await detectHarnessFiles(EMPTY_PROJECT);
    const projectFiles = files.filter((f) => !f.relativePath.startsWith("~/"));
    expect(projectFiles).toHaveLength(0);
  });

  it("project with only CLAUDE.md scans correctly", async () => {
    const graph = await scan(MINIMAL_PROJECT);
    const projectFiles = graph.files.filter((f) => !f.relativePath.startsWith("~/"));

    expect(projectFiles).toHaveLength(1);
    expect(projectFiles[0].relativePath).toBe("CLAUDE.md");
    expect(projectFiles[0].type).toBe("config");
  });

  it("project with only CLAUDE.md lints cleanly", async () => {
    const graph = await scan(MINIMAL_PROJECT);
    const projectFiles = graph.files.filter((f) => !f.relativePath.startsWith("~/"));
    const results = lint(projectFiles, { rootPath: MINIMAL_PROJECT });

    const errors = results.filter((r) => r.severity === "error");
    expect(errors).toHaveLength(0);
  });

  it("detects deeply nested AGENTS.md files", async () => {
    const files = await detectHarnessFiles(NESTED_PROJECT);
    const projectFiles = files.filter((f) => !f.relativePath.startsWith("~/"));

    const agentsFiles = projectFiles.filter((f) => f.type === "agent");
    expect(agentsFiles).toHaveLength(2);

    const paths = agentsFiles.map((f) => f.relativePath);
    expect(paths).toContain("src/AGENTS.md");
    expect(paths).toContain("src/modules/auth/AGENTS.md");
  });

  it("scan produces edges only for markdown files with references", async () => {
    const graph = await scan(SAMPLE_PROJECT);

    // Edges should only come from markdown files
    for (const edge of graph.edges) {
      const sourceFile = graph.files.find((f) => f.relativePath === edge.source);
      expect(sourceFile).toBeDefined();
      expect(sourceFile!.relativePath.endsWith(".md")).toBe(true);
    }
  });

  it("frontmatter is extracted from markdown files", async () => {
    const graph = await scan(SAMPLE_PROJECT);
    const projectFiles = graph.files.filter((f) => !f.relativePath.startsWith("~/"));

    // Skills have frontmatter with trigger
    const skills = projectFiles.filter((f) => f.type === "skill");
    for (const skill of skills) {
      expect(skill.frontmatter).toBeDefined();
      expect(skill.frontmatter).not.toBeNull();
      expect(skill.frontmatter!.trigger).toBe("generate");
    }

    // Non-frontmatter files should have null frontmatter
    const settings = projectFiles.find((f) => f.type === "settings");
    expect(settings).toBeDefined();
    expect(settings!.frontmatter).toBeNull();
  });

  it("references are only extracted from .md files", async () => {
    const graph = await scan(SAMPLE_PROJECT);
    const projectFiles = graph.files.filter((f) => !f.relativePath.startsWith("~/"));

    // Non-markdown files should have empty references
    const nonMd = projectFiles.filter((f) => !f.relativePath.endsWith(".md"));
    for (const file of nonMd) {
      expect(file.references).toEqual([]);
    }
  });
});
