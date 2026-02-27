import { describe, it, expect } from "vitest";
import { deadReference } from "../../src/linter/rules/dead-reference.js";
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

describe("dead-reference", () => {
  it("should detect references to non-existent files", () => {
    const files = [
      makeFile({
        path: "/project/CLAUDE.md",
        relativePath: "CLAUDE.md",
        references: ["docs/missing.md", "README.md"],
      }),
    ];

    const results = deadReference(files, "/project");
    // Both references don't exist on disk
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].rule).toBe("dead-reference");
    expect(results[0].severity).toBe("error");
  });

  it("should not flag references to known harness files", () => {
    const files = [
      makeFile({
        path: "/project/CLAUDE.md",
        relativePath: "CLAUDE.md",
        references: ["src/AGENTS.md"],
      }),
      makeFile({
        path: "/project/src/AGENTS.md",
        relativePath: "src/AGENTS.md",
        type: "agent",
      }),
    ];

    const results = deadReference(files, "/project");
    expect(results).toHaveLength(0);
  });

  it("should return empty for files with no references", () => {
    const files = [makeFile({ references: [] })];
    const results = deadReference(files, "/project");
    expect(results).toHaveLength(0);
  });
});
