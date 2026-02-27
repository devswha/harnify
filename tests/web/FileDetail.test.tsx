import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { FileDetail } from '../../src/web/components/FileDetail';
import type { HarnessFile } from '../../src/types/index';

const sampleFile: HarnessFile = {
  path: '/tmp/test/CLAUDE.md',
  relativePath: 'CLAUDE.md',
  type: 'config',
  tokenInfo: { tokens: 2340, bytes: 9360 },
  frontmatter: null,
  content: '# Project Rules\n\nSome content here.',
  lastModified: '2026-02-27T10:30:00Z',
  references: ['AGENTS.md', '.claude/skills/test.md'],
};

describe('FileDetail component', () => {
  it('renders file metadata', () => {
    render(<FileDetail file={sampleFile} />);

    expect(screen.getByText('Config')).toBeInTheDocument();
    expect(screen.getByText('/tmp/test/CLAUDE.md')).toBeInTheDocument();
    expect(screen.getByText('2,340')).toBeInTheDocument();
  });

  it('renders references list', () => {
    render(<FileDetail file={sampleFile} />);

    expect(screen.getByText('References (2)')).toBeInTheDocument();
    expect(screen.getByText('AGENTS.md')).toBeInTheDocument();
    expect(screen.getByText('.claude/skills/test.md')).toBeInTheDocument();
  });

  it('content is collapsed by default', () => {
    render(<FileDetail file={sampleFile} />);

    expect(screen.queryByText(/# Project Rules/)).not.toBeInTheDocument();
  });

  it('expands content on click', () => {
    render(<FileDetail file={sampleFile} />);

    fireEvent.click(screen.getByText('File Content'));
    expect(screen.getByText(/# Project Rules/)).toBeInTheDocument();
  });

  it('masks sensitive content', () => {
    const sensitiveFile: HarnessFile = {
      ...sampleFile,
      content: 'api_key: sk-abc123secret\ntoken: my-secret-token\nnormal: value',
    };

    render(<FileDetail file={sensitiveFile} />);
    fireEvent.click(screen.getByText('File Content'));

    expect(screen.getByText(/\[MASKED\]/)).toBeInTheDocument();
    expect(screen.queryByText(/sk-abc123secret/)).not.toBeInTheDocument();
  });

  it('renders with no references', () => {
    const noRefsFile: HarnessFile = { ...sampleFile, references: [] };
    render(<FileDetail file={noRefsFile} />);

    expect(screen.queryByText(/References/)).not.toBeInTheDocument();
  });
});
