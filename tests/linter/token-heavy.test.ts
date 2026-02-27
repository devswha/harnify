import { describe, it, expect } from "vitest";
import { tokenHeavy } from "../../src/linter/rules/token-heavy.js";
import type { HarnessFile } from "../../src/types/index.js";

function makeFile(tokens: number, relativePath = "CLAUDE.md"): HarnessFile {
  return {
    path: `/project/${relativePath}`,
    relativePath,
    type: "config",
    tokenInfo: { tokens, bytes: tokens * 4 },
    frontmatter: null,
    content: "x".repeat(tokens * 4),
    lastModified: new Date().toISOString(),
    references: [],
  };
}

describe("token-heavy", () => {
  it("should flag files using more than 3% of context window", () => {
    // 3% of 200,000 = 6,000 tokens
    const files = [makeFile(7000, "big-file.md")];

    const results = tokenHeavy(files, 200_000);
    expect(results).toHaveLength(1);
    expect(results[0].rule).toBe("token-heavy");
    expect(results[0].severity).toBe("info");
    expect(results[0].message).toContain("3.5%");
  });

  it("should not flag files under 3%", () => {
    const files = [makeFile(5000, "small-file.md")];

    const results = tokenHeavy(files, 200_000);
    expect(results).toHaveLength(0);
  });

  it("should respect custom context window size", () => {
    // 3% of 128,000 = 3,840 tokens
    const files = [makeFile(4000, "medium-file.md")];

    const results = tokenHeavy(files, 128_000);
    expect(results).toHaveLength(1);
    expect(results[0].message).toContain("128,000");
  });

  it("should use default 200k window when not specified", () => {
    const files = [makeFile(5999)];
    const results = tokenHeavy(files);
    expect(results).toHaveLength(0);

    const files2 = [makeFile(6001)];
    const results2 = tokenHeavy(files2);
    expect(results2).toHaveLength(1);
  });
});
