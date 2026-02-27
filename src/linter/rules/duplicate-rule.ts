import type { HarnessFile, LintResult } from "../../types/index.js";

/**
 * duplicate-rule (Warning): Same rule/directive defined in multiple harness files.
 */
export function duplicateRule(files: HarnessFile[]): LintResult[] {
  const results: LintResult[] = [];

  // Extract directives from all config/agent files
  const fileDirectives = new Map<string, { file: HarnessFile; directives: string[] }>();

  for (const file of files) {
    if (file.type === "config" || file.type === "agent" || file.type === "rule") {
      const directives = extractNormalizedDirectives(file.content);
      if (directives.length > 0) {
        fileDirectives.set(file.relativePath, { file, directives });
      }
    }
  }

  // Find directives that appear in multiple files
  const directiveToFiles = new Map<string, string[]>();

  for (const [filePath, { directives }] of fileDirectives) {
    for (const directive of directives) {
      const existing = directiveToFiles.get(directive) ?? [];
      existing.push(filePath);
      directiveToFiles.set(directive, existing);
    }
  }

  // Report duplicates
  const reported = new Set<string>();
  for (const [directive, filePaths] of directiveToFiles) {
    if (filePaths.length > 1) {
      // Create a unique key to avoid duplicate reports
      const key = filePaths.sort().join("|") + ":" + directive;
      if (reported.has(key)) continue;
      reported.add(key);

      results.push({
        rule: "duplicate-rule",
        severity: "warning",
        file: filePaths[0],
        relatedFile: filePaths[1],
        message: `Directive "${directive.slice(0, 80)}" is duplicated in: ${filePaths.join(", ")}`,
      });
    }
  }

  return results;
}

/**
 * Extract normalized directive lines from content.
 * Looks for bullet-point rules and imperative statements.
 */
function extractNormalizedDirectives(content: string): string[] {
  const directives: string[] = [];
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    // Match bullet-point directives (-, *) with meaningful content (10+ chars)
    const bulletMatch = trimmed.match(/^[-*]\s+(.{10,})$/);
    if (bulletMatch) {
      const normalized = normalize(bulletMatch[1]);
      if (normalized.length >= 10) {
        directives.push(normalized);
      }
    }
  }

  return directives;
}

/** Normalize a directive string for comparison */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[`"']/g, "")
    .trim();
}
