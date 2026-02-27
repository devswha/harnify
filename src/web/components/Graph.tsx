import { useEffect, useRef, useCallback, useState } from 'react';
import cytoscape, { Core, EventObject } from 'cytoscape';
import type { GraphNode, GraphEdge } from '../../types/index';

interface GraphProps {
  graph: { nodes: GraphNode[]; edges: GraphEdge[] };
  layout: 'hierarchical' | 'force-directed';
  onNodeClick: (nodeId: string) => void;
  nodeTypeColors: Record<string, string>;
}

const EDGE_STYLES: Record<string, { lineStyle: string; lineColor: string }> = {
  references: { lineStyle: 'solid', lineColor: '#6366F1' },
  overrides: { lineStyle: 'dashed', lineColor: '#EF4444' },
  triggers: { lineStyle: 'dotted', lineColor: '#F59E0B' },
};

const NODE_SHAPES: Record<string, string> = {
  config: 'ellipse',
  settings: 'ellipse',
  agent: 'round-rectangle',
  skill: 'round-rectangle',
  rule: 'diamond',
  doc: 'hexagon',
};

// diamond/hexagon shapes appear smaller at the same pixel size; apply area correction
const SHAPE_AREA_MULTIPLIER: Record<string, number> = {
  ellipse: 1.0,
  'round-rectangle': 1.0,
  diamond: 1.3,
  hexagon: 1.05,
};

export function Graph({ graph, layout, onNodeClick, nodeTypeColors }: GraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const edgeCountRef = useRef(0);
  const nodeCountRef = useRef(0);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    label: string;
    tokenInfo: { tokens: number; bytes: number };
    lastModified: string;
  } | null>(null);

  const getLayoutConfig = useCallback(
    (mode: 'hierarchical' | 'force-directed', edgeCount: number, nodeCount: number) => {
      if (edgeCount === 0) {
        const safeNodeCount = Math.max(nodeCount, 1);
        return {
          name: 'cose' as const,
          padding: 60,
          nodeRepulsion: (): number => 20000,
          gravity: Math.min(0.25, 5 / safeNodeCount),
          idealEdgeLength: (): number => 200,
          animate: true,
          animationDuration: 300,
          fit: true,
        };
      }
      if (mode === 'hierarchical') {
        return {
          name: 'breadthfirst' as const,
          directed: true,
          spacingFactor: 1.5,
          padding: 60,
          animate: true,
          animationDuration: 300,
          fit: true,
        };
      }
      return {
        name: 'cose' as const,
        padding: 60,
        nodeRepulsion: (): number => 8000,
        idealEdgeLength: (): number => 120,
        animate: true,
        animationDuration: 300,
        fit: true,
      };
    },
    [],
  );

  // Initialize cytoscape
  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            'text-valign': 'bottom',
            'text-halign': 'center',
            'font-size': '12px',
            color: '#CBD5E1',
            'text-margin-y': 8,
            'background-color': 'data(color)',
            width: ((ele: any) => {
              const tokens = ele.data('tokenCount') || 0;
              const baseSize = 28 + Math.min((tokens / 10000) * 28, 28);
              const shape = NODE_SHAPES[ele.data('type')] || 'ellipse';
              return baseSize * (SHAPE_AREA_MULTIPLIER[shape] || 1.0);
            }) as any,
            height: ((ele: any) => {
              const tokens = ele.data('tokenCount') || 0;
              const baseSize = 28 + Math.min((tokens / 10000) * 28, 28);
              const shape = NODE_SHAPES[ele.data('type')] || 'ellipse';
              return baseSize * (SHAPE_AREA_MULTIPLIER[shape] || 1.0);
            }) as any,
            shape: ((ele: any) => NODE_SHAPES[ele.data('type')] || 'ellipse') as any,
            'border-width': 2,
            'border-color': 'data(color)',
            'border-opacity': 0.3,
            'text-max-width': '140px',
            'text-wrap': 'ellipsis',
            'text-background-color': '#0e1525',
            'text-background-opacity': 0.65,
            'text-background-padding': '2px',
            'text-background-shape': 'roundrectangle',
          } as any,
        },
        {
          selector: 'node:active',
          style: {
            'overlay-opacity': 0.1,
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 3,
            'border-opacity': 1,
            'border-color': '#6366F1',
          },
        },
        {
          selector: 'edge',
          style: {
            width: 1.5,
            'line-color': '#4B5563',
            'target-arrow-color': '#4B5563',
            'target-arrow-shape': 'triangle',
            'arrow-scale': 0.8,
            'curve-style': 'bezier',
            opacity: 0.6,
          },
        },
        {
          selector: 'edge[edgeType="references"]',
          style: {
            'line-style': 'solid',
            'line-color': '#6366F1',
            'target-arrow-color': '#6366F1',
          },
        },
        {
          selector: 'edge[edgeType="overrides"]',
          style: {
            'line-style': 'dashed',
            'line-color': '#EF4444',
            'target-arrow-color': '#EF4444',
          },
        },
        {
          selector: 'edge[edgeType="triggers"]',
          style: {
            'line-style': 'dotted',
            'line-color': '#F59E0B',
            'target-arrow-color': '#F59E0B',
          },
        },
      ],
      minZoom: 0.2,
      maxZoom: 4,
      wheelSensitivity: 0.3,
    });

    cyRef.current = cy;

    // Node click handler
    cy.on('tap', 'node', (evt: EventObject) => {
      const nodeId = evt.target.id();
      onNodeClick(nodeId);
    });

    // Node hover tooltip
    cy.on('mouseover', 'node', (evt: EventObject) => {
      const node = evt.target;
      const pos = node.renderedPosition();
      setTooltip({
        x: pos.x,
        y: pos.y - 40,
        label: node.data('label'),
        tokenInfo: node.data('tokenInfo'),
        lastModified: node.data('lastModified'),
      });
      if (containerRef.current) containerRef.current.style.cursor = 'pointer';
    });

    cy.on('mouseout', 'node', () => {
      setTooltip(null);
      if (containerRef.current) containerRef.current.style.cursor = 'default';
    });

    // Hide tooltip on pan/zoom
    cy.on('viewport', () => {
      setTooltip(null);
    });

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [onNodeClick]);

  // Update graph data
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.elements().remove();

    const elements: cytoscape.ElementDefinition[] = [];

    // Count duplicate labels for disambiguation
    const labelCounts = new Map<string, number>();
    for (const node of graph.nodes) {
      labelCounts.set(node.label, (labelCounts.get(node.label) || 0) + 1);
    }

    for (const node of graph.nodes) {
      const disambiguatedLabel = (labelCounts.get(node.label) || 0) > 1
        ? node.path.split('/').slice(-2).join('/')
        : node.label;
      elements.push({
        data: {
          id: node.id,
          label: disambiguatedLabel,
          type: node.type,
          color: nodeTypeColors[node.type] ?? '#9CA3AF',
          tokenInfo: node.tokenInfo,
          tokenCount: node.tokenInfo.tokens,
          lastModified: node.lastModified,
          path: node.path,
        },
      });
    }

    for (const edge of graph.edges) {
      elements.push({
        data: {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          edgeType: edge.type,
        },
      });
    }

    cy.add(elements);

    // Track counts for relayout effect
    edgeCountRef.current = graph.edges.length;
    nodeCountRef.current = graph.nodes.length;

    // Run layout
    cy.layout(getLayoutConfig(layout, graph.edges.length, graph.nodes.length)).run();
  }, [graph, layout, nodeTypeColors, getLayoutConfig]);

  // Relayout on layout mode change
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || cy.elements().length === 0) return;
    cy.layout(getLayoutConfig(layout, edgeCountRef.current, nodeCountRef.current)).run();
  }, [layout, getLayoutConfig]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Unknown';
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="cytoscape-container" />

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none z-10 rounded-md border bg-popover px-3 py-2 text-xs shadow-md"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
        >
          <p className="font-medium text-popover-foreground">{tooltip.label}</p>
          <p className="text-muted-foreground">
            {tooltip.tokenInfo.tokens.toLocaleString()} tokens
          </p>
          <p className="text-muted-foreground">Modified: {formatDate(tooltip.lastModified)}</p>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 rounded-md border bg-card/80 backdrop-blur-sm px-3 py-2 text-xs space-y-1">
        <p className="font-medium text-card-foreground mb-1.5">Legend</p>
        {Object.entries(nodeTypeColors).map(([type, color]) => (
          <div key={type} className="flex items-center gap-2">
            <svg width="12" height="12" viewBox="0 0 12 12" className="shrink-0">
              {NODE_SHAPES[type] === 'round-rectangle' ? (
                <rect x="1" y="1" width="10" height="10" rx="2" fill={color} />
              ) : NODE_SHAPES[type] === 'diamond' ? (
                <polygon points="6,0 12,6 6,12 0,6" fill={color} />
              ) : NODE_SHAPES[type] === 'hexagon' ? (
                <polygon points="3,0 9,0 12,6 9,12 3,12 0,6" fill={color} />
              ) : (
                <circle cx="6" cy="6" r="5" fill={color} />
              )}
            </svg>
            <span className="text-muted-foreground capitalize">
              {type.replace(/-/g, ' ')}
            </span>
          </div>
        ))}
        <div className="border-t pt-1 mt-1.5 space-y-0.5">
          {Object.entries(EDGE_STYLES).map(([type, style]) => (
            <div key={type} className="flex items-center gap-2">
              <svg width="16" height="6" className="shrink-0">
                <line
                  x1="0"
                  y1="3"
                  x2="16"
                  y2="3"
                  stroke={style.lineColor}
                  strokeWidth="1.5"
                  strokeDasharray={
                    style.lineStyle === 'dashed'
                      ? '4,2'
                      : style.lineStyle === 'dotted'
                        ? '1,2'
                        : undefined
                  }
                />
              </svg>
              <span className="text-muted-foreground capitalize">{type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Node count badge */}
      <div className="absolute top-3 right-3 rounded-md border bg-card/80 backdrop-blur-sm px-2.5 py-1 text-xs text-muted-foreground">
        {graph.nodes.length} nodes &middot; {graph.edges.length} edges
      </div>
    </div>
  );
}
