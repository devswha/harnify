import { useEffect, useState, useCallback } from 'react';
import { Graph } from './components/Graph';
import { FileDetail } from './components/FileDetail';
import { cn } from './lib/utils';
import { Filter, LayoutDashboard, GitFork, X } from 'lucide-react';
import type { HarnessFile, GraphNode, GraphEdge, ScanResult } from '../types/index';

export type { HarnessFile, GraphNode, GraphEdge, ScanResult };

/** Colors keyed by the scanner's canonical NodeType values */
const NODE_TYPE_COLORS: Record<string, string> = {
  'config': '#3B82F6',
  'agent': '#22C55E',
  'skill': '#EAB308',
  'doc': '#9CA3AF',
  'rule': '#F97316',
  'settings': '#A855F7',
};

/** Display labels keyed by the scanner's canonical NodeType values */
const NODE_TYPE_LABELS: Record<string, string> = {
  'config': 'Root Config',
  'agent': 'Agent Config',
  'skill': 'Skill',
  'doc': 'Doc Reference',
  'rule': 'Rule File',
  'settings': 'Settings',
};

type LayoutMode = 'hierarchical' | 'force-directed';

export default function App() {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<HarnessFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [layout, setLayout] = useState<LayoutMode>('hierarchical');
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  useEffect(() => {
    fetch('/api/scan')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: ScanResult) => {
        setScanResult(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      if (!scanResult) return;
      const file = scanResult.files.find((f) => f.path === nodeId);
      if (file) setSelectedFile(file);
    },
    [scanResult],
  );

  const toggleFilter = (type: string) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const filteredGraph = scanResult
    ? {
        nodes: scanResult.graph.nodes.filter(
          (n) => activeFilters.size === 0 || activeFilters.has(n.type),
        ),
        edges: scanResult.graph.edges.filter((e) => {
          if (activeFilters.size === 0) return true;
          const nodeIds = new Set(
            scanResult.graph.nodes
              .filter((n) => activeFilters.has(n.type))
              .map((n) => n.id),
          );
          return nodeIds.has(e.source) && nodeIds.has(e.target);
        }),
      }
    : null;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Scanning harness files...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <p className="text-destructive font-medium">Failed to load scan results</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Header */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold tracking-tight">Harnify</h1>
          <span className="text-xs text-muted-foreground">
            {scanResult?.files.length ?? 0} files scanned
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* Layout toggle */}
          <button
            onClick={() =>
              setLayout((l) => (l === 'hierarchical' ? 'force-directed' : 'hierarchical'))
            }
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
              'border border-border',
            )}
            title={`Switch to ${layout === 'hierarchical' ? 'force-directed' : 'hierarchical'} layout`}
          >
            {layout === 'hierarchical' ? (
              <LayoutDashboard className="h-3.5 w-3.5" />
            ) : (
              <GitFork className="h-3.5 w-3.5" />
            )}
            <span>{layout === 'hierarchical' ? 'Hierarchical' : 'Force-directed'}</span>
          </button>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilterPanel((v) => !v)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
              'border border-border',
              showFilterPanel && 'bg-accent text-accent-foreground',
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            <span>Filter</span>
            {activeFilters.size > 0 && (
              <span className="ml-1 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
                {activeFilters.size}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Filter sidebar */}
        {showFilterPanel && (
          <aside className="w-48 shrink-0 border-r p-3 space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground mb-2">Node Types</p>
            {Object.entries(NODE_TYPE_LABELS).map(([type, label]) => (
              <button
                key={type}
                onClick={() => toggleFilter(type)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors',
                  activeFilters.size === 0 || activeFilters.has(type)
                    ? 'text-foreground'
                    : 'text-muted-foreground opacity-50',
                  'hover:bg-accent',
                )}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: NODE_TYPE_COLORS[type] }}
                />
                {label}
              </button>
            ))}
            {activeFilters.size > 0 && (
              <button
                onClick={() => setActiveFilters(new Set())}
                className="mt-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear filters
              </button>
            )}
          </aside>
        )}

        {/* Graph area */}
        <main className="flex-1 relative">
          {filteredGraph && (
            <Graph
              graph={filteredGraph}
              layout={layout}
              onNodeClick={handleNodeClick}
              nodeTypeColors={NODE_TYPE_COLORS}
            />
          )}
        </main>

        {/* File detail panel */}
        {selectedFile && (
          <aside className="w-80 shrink-0 border-l overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 border-b">
              <h2 className="text-xs font-medium truncate">{selectedFile.path}</h2>
              <button
                onClick={() => setSelectedFile(null)}
                className="rounded p-0.5 hover:bg-accent"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <FileDetail file={selectedFile} />
          </aside>
        )}
      </div>
    </div>
  );
}
