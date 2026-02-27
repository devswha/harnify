import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { parseFile } from "../../src/scanner/parser.js";

describe("parseFile", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "harnify-parser-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("parses markdown file without frontmatter", async () => {
    const filePath = path.join(tmpDir, "test.md");
    await fs.writeFile(filePath, "# Hello\n\nSome content.");
    const result = await parseFile(filePath);
    expect(result.content).toBe("# Hello\n\nSome content.");
    expect(result.frontmatter).toBeNull();
  });

  it("extracts YAML frontmatter from markdown", async () => {
    const filePath = path.join(tmpDir, "skill.md");
    const content = `---
name: my-skill
trigger: build
---
# My Skill

Instructions here.`;
    await fs.writeFile(filePath, content);
    const result = await parseFile(filePath);
    expect(result.frontmatter).toEqual({ name: "my-skill", trigger: "build" });
    expect(result.content).toBe(content);
  });

  it("returns null frontmatter for non-markdown files", async () => {
    const filePath = path.join(tmpDir, "settings.json");
    await fs.writeFile(filePath, '{"key": "value"}');
    const result = await parseFile(filePath);
    expect(result.frontmatter).toBeNull();
    expect(result.content).toBe('{"key": "value"}');
  });

  it("handles empty markdown files", async () => {
    const filePath = path.join(tmpDir, "empty.md");
    await fs.writeFile(filePath, "");
    const result = await parseFile(filePath);
    expect(result.content).toBe("");
    expect(result.frontmatter).toBeNull();
  });

  it("handles frontmatter with complex values", async () => {
    const filePath = path.join(tmpDir, "complex.md");
    const content = `---
name: test
tags:
  - a
  - b
nested:
  key: value
---
# Content`;
    await fs.writeFile(filePath, content);
    const result = await parseFile(filePath);
    expect(result.frontmatter).toEqual({
      name: "test",
      tags: ["a", "b"],
      nested: { key: "value" },
    });
  });
});
