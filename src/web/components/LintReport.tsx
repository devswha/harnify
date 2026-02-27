import React from "react";
import type { LintResult } from "../../types/index.js";

interface LintReportProps {
  results: LintResult[];
  onFileClick?: (filePath: string) => void;
}

const SEVERITY_CONFIG = {
  error: {
    label: "Error",
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-400",
    border: "border-red-200 dark:border-red-800",
  },
  warning: {
    label: "Warning",
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    text: "text-yellow-700 dark:text-yellow-400",
    border: "border-yellow-200 dark:border-yellow-800",
  },
  info: {
    label: "Info",
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-800",
  },
} as const;

export function LintReport({ results, onFileClick }: LintReportProps) {
  const errors = results.filter((r) => r.severity === "error").length;
  const warnings = results.filter((r) => r.severity === "warning").length;
  const infos = results.filter((r) => r.severity === "info").length;

  // Already sorted by severity from lint engine
  const sorted = results;

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Lint Report
        </h2>
        <div className="flex gap-2 text-xs">
          {errors > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-700 dark:bg-red-900/30 dark:text-red-400">
              {errors} error{errors !== 1 ? "s" : ""}
            </span>
          )}
          {warnings > 0 && (
            <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
              {warnings} warning{warnings !== 1 ? "s" : ""}
            </span>
          )}
          {infos > 0 && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              {infos} info{infos !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="text-center text-xs text-zinc-500 dark:text-zinc-500">
          No lint issues found.
        </p>
      ) : (
        <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
          {sorted.map((result, i) => {
            const config = SEVERITY_CONFIG[result.severity];
            return (
              <div
                key={`${result.rule}-${result.file}-${i}`}
                className={`flex flex-col gap-1 rounded-md border p-2 ${config.border}`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${config.bg} ${config.text}`}
                  >
                    {config.label}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-500">
                    {result.rule}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onFileClick?.(result.file)}
                  className="text-left text-xs font-mono text-blue-600 hover:underline dark:text-blue-400"
                >
                  {result.file}
                </button>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  {result.message}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
