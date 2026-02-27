import type { HarnessFile, LintResult } from "../../types/index.js";
import { dirname, relative } from "node:path";

/**
 * override-shadow (Warning): Child CLAUDE.md overrides parent rules.
 * MVP: 1-depth check only — direct parent/child directory relationship.
 */
export function overrideShadow(files: HarnessFile[]): LintResult[] {
  const results: LintResult[] = [];

  // Find all CLAUDE.md config files
  const configs = files.filter(
    (f) => f.type === "config" && f.relativePath.toLowerCase().endsWith("claude.md")
  );

  // Group by directory depth and check parent-child relationships
  for (let i = 0; i < configs.length; i++) {
    for (let j = i + 1; j < configs.length; j++) {
      const a = configs[i];
      const b = configs[j];

      const dirA = dirname(a.relativePath);
      const dirB = dirname(b.relativePath);

      // Check if one is a direct child of the other (1-depth)
      const relAtoB = relative(dirA, dirB);
      const relBtoA = relative(dirB, dirA);

      let parent: HarnessFile | undefined;
      let child: HarnessFile | undefined;

      if (relAtoB && !relAtoB.startsWith("..") && !relAtoB.includes("/")) {
        parent = a;
        child = b;
      } else if (relBtoA && !relBtoA.startsWith("..") && !relBtoA.includes("/")) {
        parent = b;
        child = a;
      }

      if (parent && child) {
        // Extract directives/rules from both and check for overlaps
        const parentRules = extractDirectives(parent.content);
        const childRules = extractDirectives(child.content);

        const overlaps = findOverlaps(parentRules, childRules);
        for (const overlap of overlaps) {
          results.push({
            rule: "override-shadow",
            severity: "warning",
            file: child.relativePath,
            relatedFile: parent.relativePath,
            message: `Child CLAUDE.md may override parent rule: "${overlap}"`,
          });
        }
      }
    }
  }

  return results;
}

/** Extract directive-like lines from markdown content */
function extractDirectives(content: string): string[] {
  const directives: string[] = [];
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    // Capture lines that look like rules/directives:
    // - Bullet points with imperative verbs
    // - Lines starting with IMPORTANT, NEVER, ALWAYS, DO NOT, etc.
    if (/^[-*]\s+(?:IMPORTANT|NEVER|ALWAYS|DO NOT|MUST|SHALL|USE|PREFER)/i.test(trimmed)) {
      directives.push(trimmed.replace(/^[-*]\s+/, "").toLowerCase());
    }
    // Headers that define rules
    if (/^#{1,4}\s+(?:rules?|conventions?|requirements?)/i.test(trimmed)) {
      directives.push(trimmed.replace(/^#+\s+/, "").toLowerCase());
    }
  }

  return directives;
}

/** Find directives that overlap between parent and child */
function findOverlaps(parentRules: string[], childRules: string[]): string[] {
  const overlaps: string[] = [];

  for (const childRule of childRules) {
    for (const parentRule of parentRules) {
      // Check for significant keyword overlap (at least 3 shared words)
      const childWords = new Set(childRule.split(/\s+/).filter((w) => w.length > 3));
      const parentWords = new Set(parentRule.split(/\s+/).filter((w) => w.length > 3));
      let shared = 0;
      for (const word of childWords) {
        if (parentWords.has(word)) shared++;
      }
      if (shared >= 3) {
        overlaps.push(childRule.slice(0, 80));
        break;
      }
    }
  }

  return overlaps;
}
