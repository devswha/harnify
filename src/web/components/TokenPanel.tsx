import React, { useState } from "react";
import type { HarnessFile } from "../../types/index.js";

interface TokenPanelProps {
  files: HarnessFile[];
}

const MODEL_OPTIONS = [
  { label: "Claude Opus (200k)", value: 200_000 },
  { label: "Claude Sonnet (200k)", value: 200_000 },
  { label: "Claude Haiku (200k)", value: 200_000 },
  { label: "GPT-4 (128k)", value: 128_000 },
] as const;

export function TokenPanel({ files }: TokenPanelProps) {
  const [contextWindow, setContextWindow] = useState(200_000);

  const sortedFiles = [...files].sort(
    (a, b) => b.tokenInfo.tokens - a.tokenInfo.tokens
  );

  const totalTokens = files.reduce((sum, f) => sum + f.tokenInfo.tokens, 0);
  const totalPercent = (totalTokens / contextWindow) * 100;
  const remaining = contextWindow - totalTokens;

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Token Budget
        </h2>
        <select
          value={contextWindow}
          onChange={(e) => setContextWindow(Number(e.target.value))}
          className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
        >
          {MODEL_OPTIONS.map((opt, i) => (
            <option key={i} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* File breakdown */}
      <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
        {sortedFiles.map((file) => {
          const percent = (file.tokenInfo.tokens / contextWindow) * 100;
          return (
            <div key={file.relativePath} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs">
                <span
                  className="max-w-[160px] truncate text-zinc-600 dark:text-zinc-400"
                  title={file.relativePath}
                >
                  {file.relativePath}
                </span>
                <span className="whitespace-nowrap text-zinc-500 dark:text-zinc-500">
                  ~{file.tokenInfo.tokens.toLocaleString()} ({percent.toFixed(1)}%)
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{ width: `${Math.min(percent, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Divider */}
      <div className="border-t border-zinc-200 dark:border-zinc-800" />

      {/* Total summary */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="text-zinc-900 dark:text-zinc-100">Total Harness Cost</span>
          <span className="text-zinc-700 dark:text-zinc-300">
            ~{totalTokens.toLocaleString()} tokens ({totalPercent.toFixed(1)}%)
          </span>
        </div>

        {/* Overall progress bar */}
        <div className="h-2.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div
            className={`h-full rounded-full transition-all ${
              totalPercent > 10
                ? "bg-red-500"
                : totalPercent > 5
                  ? "bg-yellow-500"
                  : "bg-blue-500"
            }`}
            style={{ width: `${Math.min(totalPercent, 100)}%` }}
          />
        </div>

        <div className="text-xs text-zinc-500 dark:text-zinc-500">
          Remaining for conversation: ~{remaining.toLocaleString()} tokens
        </div>
      </div>
    </div>
  );
}
