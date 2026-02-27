import type { HarnessFile, LintResult } from "../../types/index.js";

/**
 * trigger-conflict (Warning): Two skills share the same trigger keyword.
 * MVP: exact string match only.
 */
export function triggerConflict(files: HarnessFile[]): LintResult[] {
  const results: LintResult[] = [];
  const skills = files.filter((f) => f.type === "skill");

  // Build a map of trigger -> skill files
  const triggerMap = new Map<string, HarnessFile[]>();

  for (const skill of skills) {
    const triggers = extractTriggers(skill);
    for (const trigger of triggers) {
      const normalized = trigger.toLowerCase().trim();
      if (!normalized) continue;
      const existing = triggerMap.get(normalized) ?? [];
      existing.push(skill);
      triggerMap.set(normalized, existing);
    }
  }

  // Report conflicts where 2+ skills share the same trigger
  for (const [trigger, conflicting] of triggerMap) {
    if (conflicting.length > 1) {
      const paths = conflicting.map((f) => f.relativePath);
      results.push({
        rule: "trigger-conflict",
        severity: "warning",
        file: paths[0],
        relatedFile: paths[1],
        message: `Trigger "${trigger}" is shared by: ${paths.join(", ")}`,
      });
    }
  }

  return results;
}

function extractTriggers(skill: HarnessFile): string[] {
  const triggers: string[] = [];

  // Extract from frontmatter
  if (skill.frontmatter) {
    const fm = skill.frontmatter;
    if (typeof fm.trigger === "string") {
      triggers.push(fm.trigger);
    } else if (Array.isArray(fm.triggers)) {
      triggers.push(...fm.triggers.filter((t): t is string => typeof t === "string"));
    } else if (typeof fm.triggers === "string") {
      triggers.push(fm.triggers);
    }
  }

  // Extract trigger patterns from content: lines starting with "Trigger:" or "trigger:"
  const triggerLinePattern = /^(?:trigger|triggers?):\s*(.+)$/gim;
  let match: RegExpExecArray | null;
  while ((match = triggerLinePattern.exec(skill.content)) !== null) {
    const value = match[1].trim();
    // Handle comma-separated triggers
    if (value.includes(",")) {
      triggers.push(...value.split(",").map((t) => t.trim()));
    } else {
      triggers.push(value);
    }
  }

  return triggers;
}
