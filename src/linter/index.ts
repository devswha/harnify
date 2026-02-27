import type { HarnessFile, LintResult } from "../types/index.js";
import { deadReference } from "./rules/dead-reference.js";
import { triggerConflict } from "./rules/trigger-conflict.js";
import { overrideShadow } from "./rules/override-shadow.js";
import { tokenHeavy } from "./rules/token-heavy.js";
import { orphanSkill } from "./rules/orphan-skill.js";
import { duplicateRule } from "./rules/duplicate-rule.js";

export interface LintOptions {
  /** Project root path for resolving references */
  rootPath: string;
  /** Context window size in tokens (default: 200,000) */
  contextWindow?: number;
}

/**
 * Run all lint rules against the scanned harness files.
 * Returns results sorted by severity: error > warning > info.
 */
export function lint(files: HarnessFile[], options: LintOptions): LintResult[] {
  const { rootPath, contextWindow } = options;

  const results: LintResult[] = [
    ...deadReference(files, rootPath),
    ...triggerConflict(files),
    ...overrideShadow(files),
    ...tokenHeavy(files, contextWindow),
    ...orphanSkill(files),
    ...duplicateRule(files),
  ];

  return sortBySeverity(results);
}

const SEVERITY_ORDER: Record<string, number> = {
  error: 0,
  warning: 1,
  info: 2,
};

function sortBySeverity(results: LintResult[]): LintResult[] {
  return results.sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3)
  );
}

/** Format lint results for CLI console output */
export function formatLintResults(results: LintResult[]): string {
  if (results.length === 0) {
    return "No lint issues found.";
  }

  const errors = results.filter((r) => r.severity === "error").length;
  const warnings = results.filter((r) => r.severity === "warning").length;
  const infos = results.filter((r) => r.severity === "info").length;

  const lines: string[] = [];

  for (const result of results) {
    const icon = result.severity === "error" ? "E" : result.severity === "warning" ? "W" : "I";
    lines.push(`  [${icon}] ${result.file}: ${result.message} (${result.rule})`);
  }

  lines.push("");
  lines.push(`${results.length} issue(s): ${errors} error(s), ${warnings} warning(s), ${infos} info(s)`);

  return lines.join("\n");
}
