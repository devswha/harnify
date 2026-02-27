import { describe, it, expect } from "vitest";
import { countTokens } from "../../src/scanner/tokenizer.js";

describe("countTokens", () => {
  it("returns zero tokens for empty string", () => {
    const result = countTokens("");
    expect(result.tokens).toBe(0);
    expect(result.bytes).toBe(0);
  });

  it("estimates tokens as bytes / 4 (ASCII)", () => {
    const content = "Hello, world!"; // 13 bytes
    const result = countTokens(content);
    expect(result.bytes).toBe(13);
    expect(result.tokens).toBe(Math.ceil(13 / 4)); // 4
  });

  it("handles multi-byte UTF-8 characters", () => {
    const content = "안녕하세요"; // Korean, 3 bytes per char = 15 bytes
    const result = countTokens(content);
    expect(result.bytes).toBe(15);
    expect(result.tokens).toBe(Math.ceil(15 / 4)); // 4
  });

  it("handles large content", () => {
    const content = "a".repeat(10000);
    const result = countTokens(content);
    expect(result.bytes).toBe(10000);
    expect(result.tokens).toBe(2500);
  });
});
