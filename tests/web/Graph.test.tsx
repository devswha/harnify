import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { Graph } from '../../src/web/components/Graph';

// Mock cytoscape since it requires a real DOM canvas
vi.mock('cytoscape', () => {
  const mockCy = {
    on: vi.fn(),
    elements: vi.fn(() => ({ remove: vi.fn() })),
    add: vi.fn(),
    layout: vi.fn(() => ({ run: vi.fn() })),
    destroy: vi.fn(),
  };
  return { default: vi.fn(() => mockCy) };
});

const nodeTypeColors: Record<string, string> = {
  'config': '#3B82F6',
  'agent': '#22C55E',
  'skill': '#EAB308',
  'doc': '#9CA3AF',
  'rule': '#F97316',
  'settings': '#A855F7',
};

const sampleGraph = {
  nodes: [
    { id: 'CLAUDE.md', label: 'CLAUDE.md', type: 'config' as const, tokenInfo: { tokens: 2340, bytes: 9360 }, path: 'CLAUDE.md', lastModified: '2026-02-27T00:00:00Z' },
    { id: 'AGENTS.md', label: 'AGENTS.md', type: 'agent' as const, tokenInfo: { tokens: 890, bytes: 3560 }, path: 'AGENTS.md', lastModified: '2026-02-26T00:00:00Z' },
    { id: '.claude/skills/test.md', label: 'test.md', type: 'skill' as const, tokenInfo: { tokens: 450, bytes: 1800 }, path: '.claude/skills/test.md', lastModified: '2026-02-25T00:00:00Z' },
  ],
  edges: [
    { id: 'e1', source: 'CLAUDE.md', target: 'AGENTS.md', type: 'references' as const },
    { id: 'e2', source: 'CLAUDE.md', target: '.claude/skills/test.md', type: 'references' as const },
  ],
};

describe('Graph component', () => {
  it('renders the graph container', () => {
    const { container } = render(
      <Graph
        graph={sampleGraph}
        layout="hierarchical"
        onNodeClick={vi.fn()}
        nodeTypeColors={nodeTypeColors}
      />,
    );

    expect(container.querySelector('.cytoscape-container')).toBeInTheDocument();
  });

  it('displays node and edge counts', () => {
    render(
      <Graph
        graph={sampleGraph}
        layout="hierarchical"
        onNodeClick={vi.fn()}
        nodeTypeColors={nodeTypeColors}
      />,
    );

    expect(screen.getByText(/3 nodes/)).toBeInTheDocument();
    expect(screen.getByText(/2 edges/)).toBeInTheDocument();
  });

  it('renders legend with all node types', () => {
    render(
      <Graph
        graph={sampleGraph}
        layout="hierarchical"
        onNodeClick={vi.fn()}
        nodeTypeColors={nodeTypeColors}
      />,
    );

    expect(screen.getByText('config')).toBeInTheDocument();
    expect(screen.getByText('agent')).toBeInTheDocument();
    expect(screen.getByText('skill')).toBeInTheDocument();
    expect(screen.getByText('doc')).toBeInTheDocument();
    expect(screen.getByText('rule')).toBeInTheDocument();
    expect(screen.getByText('settings')).toBeInTheDocument();
  });

  it('renders edge type legend', () => {
    render(
      <Graph
        graph={sampleGraph}
        layout="hierarchical"
        onNodeClick={vi.fn()}
        nodeTypeColors={nodeTypeColors}
      />,
    );

    expect(screen.getByText('references')).toBeInTheDocument();
    expect(screen.getByText('overrides')).toBeInTheDocument();
    expect(screen.getByText('triggers')).toBeInTheDocument();
  });

  it('renders with empty graph', () => {
    const emptyGraph = { nodes: [], edges: [] };
    render(
      <Graph
        graph={emptyGraph}
        layout="hierarchical"
        onNodeClick={vi.fn()}
        nodeTypeColors={nodeTypeColors}
      />,
    );

    expect(screen.getByText(/0 nodes/)).toBeInTheDocument();
    expect(screen.getByText(/0 edges/)).toBeInTheDocument();
  });
});
