# Harnify

**Visualize, analyze, and lint your AI agent harness files.**

[![npm version](https://img.shields.io/npm/v/harnify.svg)](https://www.npmjs.com/package/harnify)
[![license](https://img.shields.io/npm/l/harnify.svg)](https://github.com/anthropics/harnify/blob/main/LICENSE)
<!-- [![tests](https://img.shields.io/github/actions/workflow/status/anthropics/harnify/ci.yml?label=tests)](https://github.com/anthropics/harnify/actions) -->

<!-- TODO: hero screenshot / GIF -->

---

## What is Harnify?

Harnify is a harness engineering tool that scans your project for AI agent configuration files — `CLAUDE.md`, `AGENTS.md`, skills, `.cursorrules`, `codex.md`, and more — then renders an interactive graph visualization of their structure, references, and token costs. Think of it as a linter and dashboard for your entire agent harness.

## Why Harnify?

AI coding agents like Claude Code, Codex, and Cursor rely on harness files to control behavior. As projects grow, these files multiply — and problems creep in:

- **No visibility into structure** — Which files reference which? Are there circular dependencies or dead references?
- **Hidden token costs** — Your `CLAUDE.md` plus 10 skills plus `AGENTS.md` files silently eat into the context window, but you have no breakdown.
- **No conflict detection** — Two skills sharing the same trigger, or a child `CLAUDE.md` shadowing a parent rule, go unnoticed until the agent misbehaves.
- **No feedback loop** — You change a directive but can't tell whether it actually changed agent behavior.

Harnify turns harness engineering from guesswork into a visible, lintable, measurable discipline.

---

## Quick Start

```bash
npx harnify
```

That's it. Harnify scans your project and opens an interactive dashboard at `http://localhost:3847`.

<!-- TODO: screenshot of dashboard -->

---

## Features

### Harness File Scanner

Automatically detects and parses all harness files in your project:

- `CLAUDE.md` (project root, `~/.claude/`, `.claude/`)
- `**/AGENTS.md` (per-directory agent configs)
- `.claude/settings.json`
- `.claude/skills/**/*.md` and `~/.claude/skills/**/*.md`
- `.cursorrules` and `.cursor/rules/`
- `codex.md`
- `docs/**/*.md` (referenced documentation)

Extracts metadata including file paths, token counts, reference relationships, and last-modified timestamps.

### Interactive Graph Visualization

Powered by Cytoscape.js, the graph renders your harness structure as an interactive node-link diagram.

**Node types:**

| Type | Description |
|------|-------------|
| Root Config | `CLAUDE.md` — primary agent configuration |
| Agent Config | `AGENTS.md` — per-directory agent definitions |
| Skill | Individual skill files with triggers and instructions |
| Doc Reference | Referenced markdown documentation |
| Rule File | `.cursorrules`, `codex.md`, and other rule sources |

**Edge types:**

| Type | Style | Meaning |
|------|-------|---------|
| references | Solid | File A explicitly references File B |
| overrides | Dashed | Child config overrides a parent rule |
| triggers | Dotted | Skill trigger keyword overlaps with another file |

**Interactions:** Click a node to inspect file contents and metadata. Hover for token count and summary. Zoom, pan, and filter by type. Switch between hierarchical and force-directed layouts.

### Token Budget Panel

See exactly how much of your model's context window is consumed by harness files.

```
Token Budget (Claude Sonnet: 200k)
──────────────────────────────────────
CLAUDE.md (root)          2,340 tokens   1.2%
CLAUDE.md (user)          4,120 tokens   2.1%
AGENTS.md (3 files)       1,890 tokens   0.9%
Skills (5 loaded)         3,200 tokens   1.6%
──────────────────────────────────────
Total Harness Cost       11,550 tokens   5.8%

[Context Budget]  ████████░░░░░░░░  5.8%
Remaining: 188,450 tokens
```

- Select from multiple models (Claude Opus, Sonnet, Haiku, GPT-4, and more)
- Per-file token breakdown with visual budget bar
- Token estimation via byte approximation (`bytes / 4`) — zero dependencies, accurate enough for budgeting and relative comparison

### Lint Engine

Six built-in rules catch common harness configuration problems:

| Rule | Severity | Description |
|------|----------|-------------|
| `dead-reference` | Error | A referenced file does not exist |
| `trigger-conflict` | Warning | Two skills use the same trigger keyword |
| `override-shadow` | Warning | A child `CLAUDE.md` unintentionally overrides a parent rule |
| `token-heavy` | Info | A single file consumes more than 3% of the context window |
| `orphan-skill` | Info | A skill is never referenced or triggered |
| `duplicate-rule` | Warning | The same rule is defined in multiple files |

Results are sorted by severity (Error > Warning > Info) for quick triage.

---

## CLI Usage

```bash
harnify                # Scan project and open dashboard
harnify --json         # Output scan results as JSON (no dashboard)
harnify lint           # Run lint rules only
harnify --port 4000    # Use a custom port (default: 3847)
harnify --no-open      # Start server without auto-opening the browser
```

---

## Supported Harness Files

| File | Agent | Description |
|------|-------|-------------|
| `CLAUDE.md` | Claude Code | Primary project and user-level configuration |
| `AGENTS.md` | Claude Code / Codex | Per-directory agent behavior definitions |
| `.claude/settings.json` | Claude Code | IDE and tool settings |
| `.claude/skills/**/*.md` | Claude Code | Reusable skill definitions (project-level) |
| `~/.claude/skills/**/*.md` | Claude Code | Reusable skill definitions (user-level) |
| `.cursorrules` | Cursor | Project-level Cursor rules |
| `.cursor/rules/` | Cursor | Directory-based Cursor rules |
| `codex.md` | Codex | Codex agent configuration |
| `docs/**/*.md` | Any | Referenced documentation files |

---

## Tech Stack

- **Runtime**: Node.js (TypeScript)
- **CLI Build**: tsup
- **Web Build**: Vite + React
- **UI Components**: shadcn/ui + Tailwind CSS
- **Graph Visualization**: Cytoscape.js
- **File Parsing**: gray-matter + unified/remark
- **File Watching**: chokidar
- **Token Estimation**: Byte approximation (zero dependencies)

---

## Roadmap

| Version | Theme | Highlights |
|---------|-------|------------|
| **v0.2** | Multi-Agent Format | Claude-Codex-Cursor config conversion, token simulation, format diff |
| **v0.3** | Export and Sharing | HTML report export, PNG/SVG graph images, shareable lint reports |
| **v0.4** | Advanced Lint | Custom rule plugins, auto-fix suggestions, CI integration (`harnify lint --ci`) |
| **v1.0** | Effect Measurement | Before/after behavior comparison, rule compliance tracking |

---

## Contributing

Contributions are welcome! Here's how to get started:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Install dependencies (`npm install`)
4. Make your changes
5. Run tests (`npm test`)
6. Commit your changes (`git commit -m "Add my feature"`)
7. Push to your branch (`git push origin feature/my-feature`)
8. Open a Pull Request

Please make sure all tests pass before submitting a PR.

---

## License

[MIT](./LICENSE)
