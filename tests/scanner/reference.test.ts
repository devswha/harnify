import { describe, it, expect } from "vitest";
import { extractReferences } from "../../src/scanner/reference.js";

describe("extractReferences", () => {
  it("returns empty array for content without references", () => {
    expect(extractReferences("Just some text")).toEqual([]);
  });

  it("extracts markdown link references", () => {
    const content = "See [the guide](./docs/guide.md) for details.";
    const refs = extractReferences(content);
    expect(refs).toContain("./docs/guide.md");
  });

  it("extracts backtick code references", () => {
    const content = "Edit `./src/config.ts` to change settings.";
    const refs = extractReferences(content);
    expect(refs).toContain("./src/config.ts");
  });

  it("extracts bare relative paths", () => {
    const content = "Check ./path/to/file.md for more info.";
    const refs = extractReferences(content);
    expect(refs).toContain("./path/to/file.md");
  });

  it("extracts parent directory references", () => {
    const content = "See [parent](../other/file.ts)";
    const refs = extractReferences(content);
    expect(refs).toContain("../other/file.ts");
  });

  it("deduplicates references", () => {
    const content = `
See [a](./file.md) and [b](./file.md)
Also \`./file.md\` is important.
`;
    const refs = extractReferences(content);
    expect(refs.filter((r) => r === "./file.md").length).toBe(1);
  });

  it("ignores absolute URLs", () => {
    const content = "See [docs](https://example.com/guide.md)";
    const refs = extractReferences(content);
    expect(refs).toEqual([]);
  });

  it("ignores paths without valid extensions", () => {
    const content = "See `./some/directory/`";
    const refs = extractReferences(content);
    expect(refs).toEqual([]);
  });

  it("extracts multiple different references", () => {
    const content = `
- [Config](./CLAUDE.md)
- [Agent](./src/AGENTS.md)
- Edit \`./src/scanner/parser.ts\`
`;
    const refs = extractReferences(content);
    expect(refs).toContain("./CLAUDE.md");
    expect(refs).toContain("./src/AGENTS.md");
    expect(refs).toContain("./src/scanner/parser.ts");
    expect(refs.length).toBe(3);
  });

  it("returns sorted references", () => {
    const content = `
[z](./z.md) [a](./a.md) [m](./m.md)
`;
    const refs = extractReferences(content);
    expect(refs).toEqual(["./a.md", "./m.md", "./z.md"]);
  });
});
