import type { HarnessFile, LintResult } from "../../types/index.js";

/**
 * orphan-skill (Info): Skill file not referenced or triggered from any other harness file.
 */
export function orphanSkill(files: HarnessFile[]): LintResult[] {
  const results: LintResult[] = [];
  const skills = files.filter((f) => f.type === "skill");
  const nonSkills = files.filter((f) => f.type !== "skill");

  for (const skill of skills) {
    const isReferenced = isSkillReferenced(skill, nonSkills);
    if (!isReferenced) {
      results.push({
        rule: "orphan-skill",
        severity: "info",
        file: skill.relativePath,
        message: `Skill "${skill.relativePath}" is not referenced or triggered by any other harness file`,
      });
    }
  }

  return results;
}

function isSkillReferenced(skill: HarnessFile, otherFiles: HarnessFile[]): boolean {
  const skillPath = skill.relativePath;
  const skillAbsPath = skill.path;
  // Extract the skill name from the path (e.g., "generate-dataset-info" from ".claude/skills/generate-dataset-info.md")
  const skillName = skillPath
    .split("/")
    .pop()
    ?.replace(/\.md$/i, "") ?? "";

  for (const file of otherFiles) {
    // Check if the skill path appears in references (normalize for both relative and absolute)
    if (file.references.some((ref) =>
      ref === skillPath ||
      ref === skillAbsPath ||
      ref.endsWith("/" + skillPath) ||
      ref.endsWith(skillName + ".md")
    )) {
      return true;
    }

    // Check if the skill name or path appears in the file content
    if (file.content.includes(skillPath) || (skillName && file.content.includes(skillName))) {
      return true;
    }
  }

  return false;
}
