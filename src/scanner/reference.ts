/**
 * Extract file path references from markdown content.
 * Looks for relative paths like ./path/to/file.md, ../file.ts, etc.
 */

/** Pattern matching relative file references in markdown */
const FILE_REF_PATTERNS = [
  // Markdown links: [text](./path/to/file.md)
  /\[(?:[^\]]*)\]\(([^)]+)\)/g,
  // Backtick code references: `./path/to/file.md`
  /`([^`]*(?:\.\/|\.\.\/)[^`]+)`/g,
  // Bare relative paths on their own line or after whitespace
  /(?:^|\s)(\.{1,2}\/[\w/.@-]+\.\w+)/gm,
];

/** File extensions we recognize as valid references */
const VALID_EXTENSIONS = new Set([
  ".md", ".ts", ".tsx", ".js", ".jsx", ".json",
  ".yaml", ".yml", ".toml", ".py", ".go", ".rs",
  ".java", ".c", ".cpp", ".h", ".css", ".scss",
  ".html", ".vue", ".svelte",
]);

/** Extract file references from markdown content */
export function extractReferences(content: string): string[] {
  const refs = new Set<string>();

  for (const pattern of FILE_REF_PATTERNS) {
    // Reset lastIndex for global regex
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(content)) !== null) {
      const ref = match[1].trim();
      if (isValidFileRef(ref)) {
        refs.add(ref);
      }
    }
  }

  return [...refs].sort();
}

/** Check if a string looks like a valid file reference */
function isValidFileRef(ref: string): boolean {
  // Must be a relative path
  if (!ref.startsWith("./") && !ref.startsWith("../")) return false;

  // Skip URLs
  if (ref.includes("://")) return false;

  // Skip anchors-only
  if (ref.startsWith("#")) return false;

  // Strip anchor fragments
  const pathOnly = ref.split("#")[0];

  // Check for known file extension
  const lastDot = pathOnly.lastIndexOf(".");
  if (lastDot === -1) return false;

  const ext = pathOnly.slice(lastDot).toLowerCase();
  return VALID_EXTENSIONS.has(ext);
}
