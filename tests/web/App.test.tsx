import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

// Mock cytoscape
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

import App from '../../src/web/App';

const mockScanResult = {
  files: [
    {
      path: 'CLAUDE.md',
      type: 'root-config',
      tokens: 2340,
      content: '# Rules',
      lastModified: '2026-02-27T00:00:00Z',
      references: [],
    },
  ],
  graph: {
    nodes: [
      {
        id: 'CLAUDE.md',
        label: 'CLAUDE.md',
        type: 'root-config',
        tokens: 2340,
        path: 'CLAUDE.md',
        lastModified: '2026-02-27T00:00:00Z',
      },
    ],
    edges: [],
  },
  lintResults: [],
};

describe('App component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows loading state initially', () => {
    // Don't resolve fetch immediately
    globalThis.fetch = vi.fn(() => new Promise(() => {}));

    render(<App />);
    expect(screen.getByText('Scanning harness files...')).toBeInTheDocument();
  });

  it('renders dashboard after successful fetch', async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockScanResult),
      } as Response),
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Harnify')).toBeInTheDocument();
    });

    expect(screen.getByText('1 files scanned')).toBeInTheDocument();
  });

  it('shows error state on fetch failure', async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
      } as Response),
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load scan results')).toBeInTheDocument();
    });
  });

  it('renders layout toggle button', async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockScanResult),
      } as Response),
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Hierarchical')).toBeInTheDocument();
    });
  });

  it('renders filter button', async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockScanResult),
      } as Response),
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Filter')).toBeInTheDocument();
    });
  });
});
