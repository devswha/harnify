import type { HarnessFile, LintResult } from "../../types/index.js";

/** Default context window sizes by model (in tokens) */
export const MODEL_CONTEXT_WINDOWS: Record<string, number> = {
  "claude-opus": 200_000,
  "claude-sonnet": 200_000,
  "claude-haiku": 200_000,
  "gpt-4": 128_000,
};

const DEFAULT_CONTEXT_WINDOW = 200_000;
const THRESHOLD_PERCENT = 3;

/**
 * token-heavy (Info): Flag files where tokens > 3% of the selected model's context window.
 */
export function tokenHeavy(
  files: HarnessFile[],
  contextWindow: number = DEFAULT_CONTEXT_WINDOW
): LintResult[] {
  const results: LintResult[] = [];
  const threshold = contextWindow * (THRESHOLD_PERCENT / 100);

  for (const file of files) {
    const tokens = file.tokenInfo.tokens;
    if (tokens > threshold) {
      const percent = ((tokens / contextWindow) * 100).toFixed(1);
      results.push({
        rule: "token-heavy",
        severity: "info",
        file: file.relativePath,
        message: `File uses ~${tokens.toLocaleString()} tokens (${percent}% of ${contextWindow.toLocaleString()} context window)`,
      });
    }
  }

  return results;
}
