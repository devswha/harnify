import fs from "node:fs/promises";
import matter from "gray-matter";

export interface ParsedFile {
  content: string;
  frontmatter: Record<string, unknown> | null;
}

/** Read and parse a file, extracting YAML frontmatter if present */
export async function parseFile(filePath: string): Promise<ParsedFile> {
  const raw = await fs.readFile(filePath, "utf-8");

  // Only parse frontmatter for markdown files
  if (filePath.endsWith(".md")) {
    try {
      const { data, content } = matter(raw);
      return {
        content: raw,
        frontmatter: Object.keys(data).length > 0 ? data : null,
      };
    } catch {
      return { content: raw, frontmatter: null };
    }
  }

  return { content: raw, frontmatter: null };
}
