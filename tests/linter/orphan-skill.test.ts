import { describe, it, expect } from "vitest";
import { orphanSkill } from "../../src/linter/rules/orphan-skill.js";
import type { HarnessFile } from "../../src/types/index.js";

function makeSkill(relativePath: string): HarnessFile {
  return {
    path: `/project/${relativePath}`,
    relativePath,
    type: "skill",
    tokenInfo: { tokens: 50, bytes: 200 },
    frontmatter: null,
    content: "# Skill\nDo something",
    lastModified: new Date().toISOString(),
    references: [],
  };
}

function makeConfig(
  relativePath: string,
  content: string,
  references: string[] = []
): HarnessFile {
  return {
    path: `/project/${relativePath}`,
    relativePath,
    type: "config",
    tokenInfo: { tokens: 100, bytes: 400 },
    frontmatter: null,
    content,
    lastModified: new Date().toISOString(),
    references,
  };
}

describe("orphan-skill", () => {
  it("should detect skills not referenced anywhere", () => {
    const files = [
      makeSkill(".claude/skills/deploy.md"),
      makeConfig("CLAUDE.md", "# Config\nNo skill references here"),
    ];

    const results = orphanSkill(files);
    expect(results).toHaveLength(1);
    expect(results[0].rule).toBe("orphan-skill");
    expect(results[0].severity).toBe("info");
    expect(results[0].file).toBe(".claude/skills/deploy.md");
  });

  it("should not flag skills referenced in content", () => {
    const files = [
      makeSkill(".claude/skills/deploy.md"),
      makeConfig("CLAUDE.md", "Use the deploy skill for deployment"),
    ];

    const results = orphanSkill(files);
    expect(results).toHaveLength(0);
  });

  it("should not flag skills in references array", () => {
    const files = [
      makeSkill(".claude/skills/deploy.md"),
      makeConfig("CLAUDE.md", "# Config", [".claude/skills/deploy.md"]),
    ];

    const results = orphanSkill(files);
    expect(results).toHaveLength(0);
  });

  it("should return empty when no skills exist", () => {
    const files = [makeConfig("CLAUDE.md", "# Config")];
    const results = orphanSkill(files);
    expect(results).toHaveLength(0);
  });
});
