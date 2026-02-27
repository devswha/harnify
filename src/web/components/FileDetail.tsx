import { useState } from 'react';
import { cn } from '../lib/utils';
import { FileText, Clock, Hash, Link, ChevronDown, ChevronRight } from 'lucide-react';
import type { HarnessFile } from '../App';

interface FileDetailProps {
  file: HarnessFile;
}

// Mask potentially sensitive values in content
function maskSensitive(content: string): string {
  const patterns = [
    // key=value or key: value (env-style, YAML, markdown)
    /(api[_-]?key|token|secret|password|credential|auth[_-]?token|private[_-]?key|access[_-]?key|client[_-]?secret)\s*[:=]\s*["']?([^\s"'\n,}]+)/gi,
    // JSON "KEY": "value"
    /("(?:api[_-]?key|token|secret|password|credential|auth[_-]?token|private[_-]?key|access[_-]?key|client[_-]?secret)")\s*:\s*"([^"]+)"/gi,
    // Bearer tokens
    /(Bearer)\s+([A-Za-z0-9_.~+/=-]{10,})/g,
    // Common secret prefixes (sk-, ghp_, xoxb-, etc.)
    /\b(sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{36,}|xoxb-[A-Za-z0-9-]+|AKIA[A-Z0-9]{16})\b/g,
  ];

  let masked = content;
  for (const pattern of patterns) {
    masked = masked.replace(pattern, (match, key) => {
      // For patterns with a captured key prefix, keep the key
      if (typeof key === 'string' && match.length > key.length) {
        return `${key}: [MASKED]`;
      }
      return '[MASKED]';
    });
  }
  return masked;
}

export function FileDetail({ file }: FileDetailProps) {
  const [showContent, setShowContent] = useState(false);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Unknown';
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  const typeLabel =
    file.type
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase()) || 'Unknown';

  return (
    <div className="flex flex-col overflow-y-auto">
      {/* Metadata section */}
      <div className="p-3 space-y-3">
        {/* Type badge */}
        <div>
          <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            {typeLabel}
          </span>
        </div>

        {/* File path */}
        <div className="flex items-start gap-2">
          <FileText className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Path</p>
            <p className="text-xs font-mono break-all">{file.path}</p>
          </div>
        </div>

        {/* Token count */}
        <div className="flex items-start gap-2">
          <Hash className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Tokens</p>
            <p className="text-xs font-medium">{file.tokenInfo.tokens.toLocaleString()}</p>
          </div>
        </div>

        {/* Last modified */}
        <div className="flex items-start gap-2">
          <Clock className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Last Modified</p>
            <p className="text-xs">{formatDate(file.lastModified)}</p>
          </div>
        </div>

        {/* References */}
        {file.references.length > 0 && (
          <div className="flex items-start gap-2">
            <Link className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">
                References ({file.references.length})
              </p>
              <ul className="mt-1 space-y-0.5">
                {file.references.map((ref, i) => (
                  <li key={i} className="text-xs font-mono text-muted-foreground break-all">
                    {ref}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Content section — collapsed by default */}
      <div className="border-t">
        <button
          onClick={() => setShowContent((v) => !v)}
          className={cn(
            'flex w-full items-center gap-1.5 px-3 py-2 text-xs font-medium',
            'hover:bg-accent transition-colors',
          )}
        >
          {showContent ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          File Content
        </button>
        {showContent && (
          <div className="px-3 pb-3">
            <pre className="rounded-md bg-muted p-2.5 text-[11px] leading-relaxed font-mono overflow-x-auto max-h-96 whitespace-pre-wrap break-all">
              {maskSensitive(file.content || '(empty)')}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
