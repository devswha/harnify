import { describe, it, expect } from "vitest";
import { lint, formatLintResults } from "../../src/linter/index.js";
import type { HarnessFile } from "../../src/types/index.js";

function makeFile(overrides: Partial<HarnessFile> = {}): HarnessFile {
  return {
    path: "/project/CLAUDE.md",
    relativePath: "CLAUDE.md",
    type: "config",
    tokenInfo: { tokens: 100, bytes: 400 },
    frontmatter: null,
    content: "",
    lastModified: new Date().toISOString(),
    references: [],
    ...overrides,
  };
}

describe("lint engine", () => {
  it("should return empty results for clean files", () => {
    const files = [makeFile()];
    const results = lint(files, { rootPath: "/project" });
    expect(results).toHaveLength(0);
  });

  it("should aggregate results from multiple rules", () => {
    const files = [
      makeFile({
        path: "/project/CLAUDE.md",
        relativePath: "CLAUDE.md",
        references: ["nonexistent.md"],
        tokenInfo: { tokens: 7000, bytes: 28000 },
        content: "x".repeat(28000),
      }),
    ];

    const results = lint(files, { rootPath: "/project" });
    // Should have at least dead-reference (error) and token-heavy (info)
    expect(results.length).toBeGreaterThanOrEqual(2);

    const rules = results.map((r) => r.rule);
    expect(rules).toContain("dead-reference");
    expect(rules).toContain("token-heavy");
  });

  it("should sort results by severity: error > warning > info", () => {
    const files = [
      makeFile({
        path: "/project/CLAUDE.md",
        relativePath: "CLAUDE.md",
        references: ["missing.md"],
        tokenInfo: { tokens: 7000, bytes: 28000 },
        content: "x".repeat(28000),
      }),
    ];

    const results = lint(files, { rootPath: "/project" });
    const severities = results.map((r) => r.severity);

    // Errors should come before warnings, which come before info
    const errorIdx = severities.indexOf("error");
    const infoIdx = severities.indexOf("info");
    if (errorIdx !== -1 && infoIdx !== -1) {
      expect(errorIdx).toBeLessThan(infoIdx);
    }
  });

  it("should respect custom context window in options", () => {
    const files = [
      makeFile({
        tokenInfo: { tokens: 4000, bytes: 16000 },
        content: "x".repeat(16000),
      }),
    ];

    // With 200k window: 4000/200000 = 2% — should not flag
    const results200k = lint(files, { rootPath: "/project", contextWindow: 200_000 });
    const tokenResults200k = results200k.filter((r) => r.rule === "token-heavy");
    expect(tokenResults200k).toHaveLength(0);

    // With 128k window: 4000/128000 = 3.1% — should flag
    const results128k = lint(files, { rootPath: "/project", contextWindow: 128_000 });
    const tokenResults128k = results128k.filter((r) => r.rule === "token-heavy");
    expect(tokenResults128k).toHaveLength(1);
  });
});

describe("formatLintResults", () => {
  it("should return 'no issues' for empty results", () => {
    expect(formatLintResults([])).toBe("No lint issues found.");
  });

  it("should format results with severity indicators", () => {
    const results = [
      {
        rule: "dead-reference",
        severity: "error" as const,
        file: "CLAUDE.md",
        message: 'Referenced file "missing.md" does not exist',
      },
      {
        rule: "token-heavy",
        severity: "info" as const,
        file: "big.md",
        message: "File uses ~7,000 tokens",
      },
    ];

    const output = formatLintResults(results);
    expect(output).toContain("[E]");
    expect(output).toContain("[I]");
    expect(output).toContain("2 issue(s)");
    expect(output).toContain("1 error(s)");
    expect(output).toContain("1 info(s)");
  });
});
