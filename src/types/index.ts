/** Type of harness node in the graph */
export type NodeType = "config" | "agent" | "skill" | "doc" | "rule" | "settings";

/** Type of edge relationship between harness files */
export type EdgeType = "references" | "overrides" | "triggers";

/** Token count information for a file */
export interface TokenInfo {
  /** Estimated token count (bytes / 4 approximation) */
  tokens: number;
  /** Raw byte size of file content */
  bytes: number;
}

/** A detected harness file with metadata */
export interface HarnessFile {
  /** Absolute file path */
  path: string;
  /** Path relative to project root */
  relativePath: string;
  /** Node type for graph visualization */
  type: NodeType;
  /** Token count information */
  tokenInfo: TokenInfo;
  /** Parsed YAML frontmatter (if any) */
  frontmatter: Record<string, unknown> | null;
  /** Raw file content */
  content: string;
  /** Last modification timestamp (ISO string) */
  lastModified: string;
  /** File paths referenced from this file */
  references: string[];
}

/** An edge in the harness graph */
export interface HarnessEdge {
  /** Source file relative path */
  source: string;
  /** Target file relative path */
  target: string;
  /** Relationship type */
  type: EdgeType;
}

/** The complete harness graph for a project */
export interface HarnessGraph {
  /** All detected harness files */
  files: HarnessFile[];
  /** All edges (relationships) between files */
  edges: HarnessEdge[];
  /** Project root path */
  rootPath: string;
  /** Scan timestamp (ISO string) */
  scannedAt: string;
}

/** Lint rule severity */
export type LintSeverity = "error" | "warning" | "info";

/** A single lint finding */
export interface LintResult {
  /** Rule identifier */
  rule: string;
  /** Severity level */
  severity: LintSeverity;
  /** Human-readable message */
  message: string;
  /** File path where the issue was found */
  file: string;
  /** Related file path (if applicable) */
  relatedFile?: string;
}
