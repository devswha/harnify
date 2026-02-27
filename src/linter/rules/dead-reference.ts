import type { HarnessFile, LintResult } from "../../types/index.js";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";

/**
 * dead-reference (Error): Referenced file doesn't exist on disk.
 * Parses markdown file references and checks if target files exist.
 */
export function deadReference(files: HarnessFile[], rootPath: string): LintResult[] {
  const results: LintResult[] = [];
  const knownPaths = new Set(files.map((f) => f.path));
  const knownRelativePaths = new Set(files.map((f) => f.relativePath));

  for (const file of files) {
    for (const ref of file.references) {
      // Resolve relative to the file's directory first, then project root
      const fromFileDir = resolve(dirname(file.path), ref);
      const fromRoot = resolve(rootPath, ref);

      if (!knownPaths.has(fromFileDir) && !knownPaths.has(fromRoot) &&
          !knownRelativePaths.has(ref) &&
          !existsSync(fromFileDir) && !existsSync(fromRoot)) {
        results.push({
          rule: "dead-reference",
          severity: "error",
          file: file.relativePath,
          relatedFile: ref,
          message: `Referenced file "${ref}" does not exist`,
        });
      }
    }
  }

  return results;
}
