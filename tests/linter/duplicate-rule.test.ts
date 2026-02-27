import { describe, it, expect } from "vitest";
import { duplicateRule } from "../../src/linter/rules/duplicate-rule.js";
import type { HarnessFile } from "../../src/types/index.js";

function makeConfig(relativePath: string, content: string): HarnessFile {
  return {
    path: `/project/${relativePath}`,
    relativePath,
    type: "config",
    tokenInfo: { tokens: 100, bytes: 400 },
    frontmatter: null,
    content,
    lastModified: new Date().toISOString(),
    references: [],
  };
}

describe("duplicate-rule", () => {
  it("should detect identical directives in multiple files", () => {
    const files = [
      makeConfig(
        "CLAUDE.md",
        "# Rules\n- Always use TypeScript strict mode when compiling the project"
      ),
      makeConfig(
        ".claude/CLAUDE.md",
        "# Config\n- Always use TypeScript strict mode when compiling the project"
      ),
    ];

    const results = duplicateRule(files);
    expect(results).toHaveLength(1);
    expect(results[0].rule).toBe("duplicate-rule");
    expect(results[0].severity).toBe("warning");
  });

  it("should not flag different directives", () => {
    const files = [
      makeConfig("CLAUDE.md", "- Always use TypeScript strict mode when compiling"),
      makeConfig(".claude/CLAUDE.md", "- Never use console.log in production code files"),
    ];

    const results = duplicateRule(files);
    expect(results).toHaveLength(0);
  });

  it("should ignore short bullet lines", () => {
    const files = [
      makeConfig("CLAUDE.md", "- Use React"),
      makeConfig(".claude/CLAUDE.md", "- Use React"),
    ];

    const results = duplicateRule(files);
    // Too short (< 15 chars after normalization)
    expect(results).toHaveLength(0);
  });

  it("should skip non-config/agent/rule files", () => {
    const skill: HarnessFile = {
      path: "/project/.claude/skills/a.md",
      relativePath: ".claude/skills/a.md",
      type: "skill",
      tokenInfo: { tokens: 50, bytes: 200 },
      frontmatter: null,
      content: "- Always use TypeScript strict mode when compiling the project",
      lastModified: new Date().toISOString(),
      references: [],
    };

    const results = duplicateRule([skill]);
    expect(results).toHaveLength(0);
  });
});
