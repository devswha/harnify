import React, { useEffect, useRef, useCallback, useState } from 'react';
import cytoscape, { Core, EventObject } from 'cytoscape';
import type { GraphNode, GraphEdge } from '../App';

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
  includes: { lineStyle: 'solid', lineColor: '#6B7280' },
};

export function Graph({ graph, layout, onNodeClick, nodeTypeColors }: GraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    label: string;
    tokenInfo: { tokens: number; bytes: number };
    lastModified: string;
  } | null>(null);

  const getLayoutConfig = useCallback(
    (mode: 'hierarchical' | 'force-directed') => {
      if (mode === 'hierarchical') {
        return {
          name: 'breadthfirst' as const,
          directed: true,
          spacingFactor: 1.5,
          padding: 40,
          animate: true,
          animationDuration: 300,
        };
      }
      return {
        name: 'cose' as const,
        padding: 40,
        nodeRepulsion: () => 8000,
        idealEdgeLength: () => 120,
        animate: true,
        animationDuration: 300,
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
            'font-size': '11px',
            color: '#CBD5E1',
            'text-margin-y': 6,
            'background-color': 'data(color)',
            width: 32,
            height: 32,
            'border-width': 2,
            'border-color': 'data(color)',
            'border-opacity': 0.3,
            'text-max-width': '100px',
            'text-wrap': 'ellipsis',
          },
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
        {
          selector: 'edge[edgeType="includes"]',
          style: {
            'line-style': 'solid',
            'line-color': '#6B7280',
            'target-arrow-color': '#6B7280',
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

    for (const node of graph.nodes) {
      elements.push({
        data: {
          id: node.id,
          label: node.label,
          type: node.type,
          color: nodeTypeColors[node.type] ?? '#9CA3AF',
          tokenInfo: node.tokenInfo,
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

    // Run layout
    cy.layout(getLayoutConfig(layout)).run();

    // Auto-enable minimap overlay for 30+ nodes
    // (Cytoscape doesn't have a built-in minimap, so we skip the external dependency)
  }, [graph, layout, nodeTypeColors, getLayoutConfig]);

  // Relayout on layout mode change
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || cy.elements().length === 0) return;
    cy.layout(getLayoutConfig(layout)).run();
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
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
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
