import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { detectHarnessFiles, classifyFile } from "../../src/scanner/detector.js";

describe("classifyFile", () => {
  it("classifies CLAUDE.md as config", () => {
    expect(classifyFile("CLAUDE.md")).toBe("config");
    expect(classifyFile(".claude/CLAUDE.md")).toBe("config");
  });

  it("classifies AGENTS.md as agent", () => {
    expect(classifyFile("AGENTS.md")).toBe("agent");
    expect(classifyFile("src/AGENTS.md")).toBe("agent");
  });

  it("classifies .claude/settings.json as settings", () => {
    expect(classifyFile(".claude/settings.json")).toBe("settings");
  });

  it("classifies skill files", () => {
    expect(classifyFile(".claude/skills/test.md")).toBe("skill");
  });

  it("classifies .cursorrules as rule", () => {
    expect(classifyFile(".cursorrules")).toBe("rule");
  });

  it("classifies .cursor/rules/ files as rule", () => {
    expect(classifyFile(".cursor/rules/my-rule.md")).toBe("rule");
  });

  it("classifies codex.md as config", () => {
    expect(classifyFile("codex.md")).toBe("config");
  });

  it("classifies docs/ files as doc", () => {
    expect(classifyFile("docs/guide.md")).toBe("doc");
  });
});

describe("detectHarnessFiles", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "harnify-test-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("detects CLAUDE.md at root", async () => {
    await fs.writeFile(path.join(tmpDir, "CLAUDE.md"), "# Rules");
    const files = await detectHarnessFiles(tmpDir);
    expect(files.some((f) => f.relativePath === "CLAUDE.md")).toBe(true);
  });

  it("detects AGENTS.md in subdirectories", async () => {
    await fs.mkdir(path.join(tmpDir, "src"), { recursive: true });
    await fs.writeFile(path.join(tmpDir, "src", "AGENTS.md"), "# Agent");
    const files = await detectHarnessFiles(tmpDir);
    expect(files.some((f) => f.relativePath === "src/AGENTS.md")).toBe(true);
  });

  it("detects .claude/settings.json", async () => {
    await fs.mkdir(path.join(tmpDir, ".claude"), { recursive: true });
    await fs.writeFile(path.join(tmpDir, ".claude", "settings.json"), "{}");
    const files = await detectHarnessFiles(tmpDir);
    expect(files.some((f) => f.relativePath === ".claude/settings.json")).toBe(true);
  });

  it("detects skill files", async () => {
    await fs.mkdir(path.join(tmpDir, ".claude", "skills"), { recursive: true });
    await fs.writeFile(path.join(tmpDir, ".claude", "skills", "test.md"), "# Skill");
    const files = await detectHarnessFiles(tmpDir);
    expect(files.some((f) => f.relativePath === ".claude/skills/test.md")).toBe(true);
  });

  it("detects .cursorrules", async () => {
    await fs.writeFile(path.join(tmpDir, ".cursorrules"), "rules here");
    const files = await detectHarnessFiles(tmpDir);
    expect(files.some((f) => f.relativePath === ".cursorrules")).toBe(true);
  });

  it("detects codex.md", async () => {
    await fs.writeFile(path.join(tmpDir, "codex.md"), "# Codex");
    const files = await detectHarnessFiles(tmpDir);
    expect(files.some((f) => f.relativePath === "codex.md")).toBe(true);
  });

  it("detects docs/**/*.md", async () => {
    await fs.mkdir(path.join(tmpDir, "docs"), { recursive: true });
    await fs.writeFile(path.join(tmpDir, "docs", "guide.md"), "# Guide");
    const files = await detectHarnessFiles(tmpDir);
    expect(files.some((f) => f.relativePath === "docs/guide.md")).toBe(true);
  });

  it("excludes node_modules", async () => {
    await fs.mkdir(path.join(tmpDir, "node_modules", "pkg"), { recursive: true });
    await fs.writeFile(path.join(tmpDir, "node_modules", "pkg", "CLAUDE.md"), "# Rules");
    const files = await detectHarnessFiles(tmpDir);
    expect(files.some((f) => f.relativePath.includes("node_modules"))).toBe(false);
  });

  it("returns empty array for empty directory", async () => {
    const files = await detectHarnessFiles(tmpDir);
    // Filter out home-level files
    const projectFiles = files.filter((f) => !f.relativePath.startsWith("~/"));
    expect(projectFiles).toEqual([]);
  });
});
