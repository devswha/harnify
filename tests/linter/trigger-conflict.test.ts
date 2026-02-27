import { describe, it, expect } from "vitest";
import { triggerConflict } from "../../src/linter/rules/trigger-conflict.js";
import type { HarnessFile } from "../../src/types/index.js";

function makeSkill(
  relativePath: string,
  opts: { frontmatter?: Record<string, unknown>; content?: string } = {}
): HarnessFile {
  return {
    path: `/project/${relativePath}`,
    relativePath,
    type: "skill",
    tokenInfo: { tokens: 50, bytes: 200 },
    frontmatter: opts.frontmatter ?? null,
    content: opts.content ?? "",
    lastModified: new Date().toISOString(),
    references: [],
  };
}

describe("trigger-conflict", () => {
  it("should detect skills with same trigger in frontmatter", () => {
    const files = [
      makeSkill(".claude/skills/a.md", { frontmatter: { trigger: "deploy" } }),
      makeSkill(".claude/skills/b.md", { frontmatter: { trigger: "deploy" } }),
    ];

    const results = triggerConflict(files);
    expect(results).toHaveLength(1);
    expect(results[0].rule).toBe("trigger-conflict");
    expect(results[0].severity).toBe("warning");
    expect(results[0].message).toContain("deploy");
  });

  it("should detect triggers in content lines", () => {
    const files = [
      makeSkill(".claude/skills/a.md", { content: "Trigger: build\n\nSome content" }),
      makeSkill(".claude/skills/b.md", { content: "trigger: build\n\nOther content" }),
    ];

    const results = triggerConflict(files);
    expect(results).toHaveLength(1);
    expect(results[0].message).toContain("build");
  });

  it("should not flag skills with different triggers", () => {
    const files = [
      makeSkill(".claude/skills/a.md", { frontmatter: { trigger: "deploy" } }),
      makeSkill(".claude/skills/b.md", { frontmatter: { trigger: "test" } }),
    ];

    const results = triggerConflict(files);
    expect(results).toHaveLength(0);
  });

  it("should ignore non-skill files", () => {
    const files: HarnessFile[] = [
      {
        path: "/project/CLAUDE.md",
        relativePath: "CLAUDE.md",
        type: "config",
        tokenInfo: { tokens: 100, bytes: 400 },
        frontmatter: { trigger: "deploy" },
        content: "",
        lastModified: new Date().toISOString(),
        references: [],
      },
    ];

    const results = triggerConflict(files);
    expect(results).toHaveLength(0);
  });
});
