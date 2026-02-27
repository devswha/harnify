import { describe, it, expect } from "vitest";
import { overrideShadow } from "../../src/linter/rules/override-shadow.js";
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

describe("override-shadow", () => {
  it("should detect child CLAUDE.md overriding parent rules", () => {
    const parent = makeConfig(
      "CLAUDE.md",
      "# Rules\n- ALWAYS use TypeScript strict mode for compilation\n- NEVER use any type assertions anywhere"
    );
    const child = makeConfig(
      "src/CLAUDE.md",
      "# Rules\n- ALWAYS use TypeScript strict mode for compilation\n- PREFER using eslint for checking"
    );

    const results = overrideShadow([parent, child]);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].rule).toBe("override-shadow");
    expect(results[0].severity).toBe("warning");
    expect(results[0].file).toBe("src/CLAUDE.md");
  });

  it("should not flag configs in unrelated directories", () => {
    const a = makeConfig(
      "frontend/CLAUDE.md",
      "- ALWAYS use React for frontend rendering components"
    );
    const b = makeConfig(
      "backend/CLAUDE.md",
      "- ALWAYS use Express for backend server routing"
    );

    const results = overrideShadow([a, b]);
    expect(results).toHaveLength(0);
  });

  it("should not flag configs more than 1 depth apart", () => {
    const parent = makeConfig(
      "CLAUDE.md",
      "- ALWAYS use TypeScript strict mode for compilation"
    );
    const grandchild = makeConfig(
      "src/lib/CLAUDE.md",
      "- ALWAYS use TypeScript strict mode for compilation"
    );

    const results = overrideShadow([parent, grandchild]);
    // More than 1 depth — should not flag
    expect(results).toHaveLength(0);
  });
});
