import type { TokenInfo } from "../types/index.js";

/**
 * Estimate token count using byte-length approximation.
 * Uses bytes / 4 which is sufficient for relative comparisons.
 */
export function countTokens(content: string): TokenInfo {
  const bytes = Buffer.byteLength(content, "utf-8");
  return {
    tokens: Math.ceil(bytes / 4),
    bytes,
  };
}
