# PRD: Harnify — AI Agent Harness Engineering Tool

**Status**: Draft
**Date**: 2026-02-27
**Author**: Calvin

---

## 1. Problem Statement

AI 코딩 에이전트(Claude Code, Codex, Cursor, Windsurf 등)를 제어하는 "하네스" 파일들(CLAUDE.md, AGENTS.md, skills, .cursor/rules 등)이 빠르게 늘어나고 있지만:

- **구조를 파악할 방법이 없다** — 어떤 파일이 어떤 파일을 참조하는지, 규칙 간 충돌이 있는지 모른다
- **토큰 비용이 보이지 않는다** — CLAUDE.md 200줄 + skills 10개 + AGENTS.md가 context window의 몇 %를 먹는지 감으로 추정
- **피드백 루프가 없다** — 지시를 바꿔도 에이전트 행동이 실제로 달라졌는지 확인할 방법이 없다
- **에이전트 간 이식이 어렵다** — Claude용 설정을 Codex/Cursor로 옮기려면 수작업

**결과**: 하네스 엔지니어링이 "감과 경험"에 의존하는 블랙박스 상태.

---

## 2. Vision

> **하네스 파일의 구조·비용·효과를 시각화하여, AI 에이전트 설정을 엔지니어링 가능한 영역으로 만든다.**

"프롬프트를 잘 쓰는 것"이 아니라 "구조를 잘 설계하는 것"으로 패러다임을 전환.

---

## 3. Target Users

| Persona | Description | Pain |
|---------|-------------|------|
| **Solo Dev — Beginner** | Claude Code 입문, CLAUDE.md 1개 | 무엇을 설정해야 하는지 모름 |
| **Solo Dev — Active** | CLAUDE.md + skills 3-10개 | 파일이 늘어나면서 관리 불가 |
| **Solo Dev — Power User** | 복잡한 하네스 구조, 커스텀 에이전트 | 토큰 최적화, 충돌 감지 필요 |
| **Team Lead** | 팀 프로젝트에 CLAUDE.md + AGENTS.md 관리 | 팀원마다 다른 설정, 일관성 없음 |
| **Harness Engineer** *(Future, 2027+)* | 전문적으로 에이전트 설정 최적화 | 도구 없이 텍스트 편집기로 작업 |

**MVP Target**: Solo Dev — Active (Claude Code 사용자, skills 3-10개)

---

## 4. Platform Decision

**CLI + Web Dashboard** (localhost)

```
$ npx harnify
  Scanning project...
  Found: CLAUDE.md, 3 AGENTS.md, 5 skills, 12 docs
  Dashboard: http://localhost:3847
```

**Rationale**:
- 그래프 시각화 → 브라우저가 최적 (D3.js / Cytoscape.js)
- CLI 한 줄로 진입 → 설치 마찰 제로
- 에디터 독립 → 사용자 풀 극대화
- 추후 VS Code Extension / Obsidian Plugin으로 래핑 가능

---

## 5. MVP Scope (v0.1)

### 5.1 Core Feature: 구조 시각화 그래프

**스캔 대상**:
```
.
├── CLAUDE.md                    # 프로젝트 루트
├── ~/.claude/CLAUDE.md          # 유저 글로벌
├── .claude/
│   ├── settings.json
│   └── skills/                  # 프로젝트 skills
├── ~/.claude/skills/            # 유저 skills
├── **/AGENTS.md                 # 디렉토리별
├── .cursorrules / .cursor/rules # Cursor
├── codex.md / AGENTS.md         # Codex
└── docs/**/*.md                 # 참조 문서
```

**그래프 노드 타입**:

| Node Type | Icon | Color | Example |
|-----------|------|-------|---------|
| Root Config | 🏠 | Blue | CLAUDE.md |
| Agent Config | 🤖 | Green | AGENTS.md |
| Skill | ⚡ | Yellow | generate-dataset-info |
| Doc Reference | 📄 | Gray | EXPERIMENT_STATUS.md |
| External Tool | 🔧 | Purple | MCP servers |
| Rule File | 📏 | Orange | .cursorrules |

**엣지 타입**:

| Edge Type | Style | Meaning |
|-----------|-------|---------|
| `references` | Solid | 파일 A가 파일 B를 명시적으로 참조 |
| `overrides` | Dashed Red | 하위 CLAUDE.md가 상위 규칙을 오버라이드 |
| `triggers` | Dotted | Skill의 trigger keyword가 다른 파일과 겹침 |
| `includes` | Solid Gray | docs/에서 참조하는 파일 |

**인터랙션**:
- 노드 클릭 → 사이드 패널에 파일 내용 + 메타데이터 표시
- 노드 hover → 토큰 수, 마지막 수정일, 요약
- 엣지 hover → 참조 관계 상세 (어떤 줄에서 참조하는지)
- 줌/팬, 필터 (타입별, 에이전트별)
- 충돌 감지 하이라이트 (같은 규칙이 여러 파일에 다르게 정의된 경우)

**레이아웃 & 정보 밀도**:
- 기본 레이아웃: Hierarchical (top-down, 설정 계층 반영)
- 대체 레이아웃: Force-directed (관계 중심 탐색)
- 노드 상세 정보: 기본 접힌 상태(collapsed), 클릭 시 확장
- 30+ 노드 시 minimap 자동 활성화
- Lint Report 정렬: Error > Warning > Info (severity 내림차순)

### 5.2 Token Budget Panel (사이드바)

```
┌─ Token Budget (Claude 3.5 Sonnet: 200k) ─────────┐
│                                                     │
│  CLAUDE.md (root)          2,340 tokens   1.2%     │
│  CLAUDE.md (user)          4,120 tokens   2.1%  ██ │
│  AGENTS.md (3 files)       1,890 tokens   0.9%     │
│  Skills (5 loaded)         3,200 tokens   1.6%  █  │
│  ─────────────────────────────────────────────      │
│  Total Harness Cost       11,550 tokens   5.8%     │
│                                                     │
│  [Context Budget]  ████████░░░░░░░░  5.8%          │
│  Remaining for conversation: 188,450 tokens        │
└─────────────────────────────────────────────────────┘
```

- 모델별 context window 선택 (Claude Opus 200k, Sonnet 200k, Haiku 200k, GPT-4 128k 등)
- 파일별 토큰 수 breakdown
- "이 skill을 추가하면 토큰이 얼마나 증가하는지" 시뮬레이션 → v0.2로 이동
- 토큰 수는 바이트 근사 (`bytes / 4`) — 예산 파악과 상대 비교에 충분

### 5.3 Lint / 문제 감지

자동 감지하는 문제들:

| Rule | Severity | Example |
|------|----------|---------|
| `dead-reference` | Error | CLAUDE.md에서 참조하는 파일이 존재하지 않음 |
| `trigger-conflict` | Warning | 두 skill이 같은 trigger keyword 사용 |
| `override-shadow` | Warning | 하위 CLAUDE.md가 상위 규칙을 의도치 않게 덮어씀 |
| `token-heavy` | Info | 단일 파일이 context의 3% 이상 차지 |
| `orphan-skill` | Info | 어디서도 참조/트리거되지 않는 skill |
| `duplicate-rule` | Warning | 동일한 규칙이 여러 파일에 중복 정의 |

---

## 6. Future Features (Post-MVP)

### v0.2 — Multi-Agent Format Support
- Claude ↔ Codex ↔ Cursor 설정 자동 변환
- 변환 시 손실되는 기능 diff 표시
- 포맷별 best practice 가이드
- 토큰 시뮬레이션: "이 skill 추가하면 +N tokens" (MVP에서 이동)
- 토큰 정확도 향상: `@anthropic-ai/tokenizer` 또는 Anthropic `countTokens()` API 옵션 추가

### v0.3 — Export & Sharing (Growth 가속)
- Shareable Report (HTML export)
- PNG/SVG 그래프 이미지 Export
- 공유 가능한 lint 리포트 링크

### v0.4 — Advanced Lint (10+ 규칙)
- 커스텀 lint 규칙 플러그인 시스템
- auto-fix 제안 (quick fix)
- CI 통합 (`harnify lint --ci`)

### v1.0 — Effect Measurement
- CLAUDE.md 변경 전/후 에이전트 행동 A/B 비교
- 특정 지시가 실제로 준수되는 비율 추적
- "이 규칙을 제거해도 행동이 바뀌지 않았음" 감지 → 토큰 절약 제안

### v1.1 — Team Collaboration
- 팀 공유 harness 설정 동기화
- PR 시 harness 변경 영향도 자동 리뷰
- 팀원별 개인 override 관리

### v1.2 — Harness Marketplace
- 커뮤니티 harness 템플릿 공유
- "Python FastAPI 프로젝트용" 같은 프리셋
- 별점/다운로드 기반 랭킹

---

## 7. Tech Stack (제안)

| Layer | Technology | Rationale |
|-------|------------|-----------|
| CLI | Node.js (TypeScript) | npx 배포, Claude Code 생태계와 동일 |
| Web Dashboard | React + Vite | 빠른 개발, SPA |
| UI Components | shadcn/ui + Tailwind CSS | 일관된 디자인 시스템, 커스터마이징 용이 |
| Design | Coolors (2-3색 팔레트) + Google Stitch | 색상 일관성, AI 기반 레이아웃 프로토타이핑 |
| Graph Visualization | Cytoscape.js | 대규모 그래프에 강함, 레이아웃 알고리즘 내장 |
| Token Counting | 바이트 근사 (bytes / 4) | 제로 의존성, 상대 비교에 충분. 정확도 향상은 v0.2+ 검토 |
| File Parsing | gray-matter (YAML frontmatter) + unified (markdown AST) | Skill/CLAUDE.md 파싱 |
| File Watching | chokidar | 실시간 파일 변경 감지 → 대시보드 자동 갱신 |

---

## 8. Competitive Landscape

| Tool | What it does | Gap |
|------|-------------|-----|
| ccexp | CLI로 설정 파일 탐색 | 시각화 없음 |
| ClaudeCTX | 설정 프로필 전환 | 분석 기능 없음 |
| Rulesync | 에이전트 간 포맷 변환 | 시각화 없음, 충돌 감지 없음 |
| `/context` (내장) | 토큰 사용량 표시 | 파일별 breakdown 없음, 그래프 없음 |
| Obsidian Graph View | 마크다운 링크 그래프 | 하네스 시맨틱 이해 못함 (토큰, 트리거 등) |

**Harnify 차별점**: 하네스 파일의 **시맨틱을 이해**하고 시각화 (단순 링크 그래프가 아님).

**추가 경쟁/인접 도구**:
- **VS Code Prompt Flow 확장**: 프롬프트 체인 시각화 (하네스 파일 비지원)
- **Cursor 내장 기능 로드맵**: Rules 관리 UI 가능성 (lock-in 리스크)
- **LangSmith / PromptLayer**: API 런타임 관리 → 하네스 정적 분석과 보완 관계

---

## 9. Success Metrics

### 3개월 목표 (Launch)
| Metric | Target |
|--------|:------:|
| GitHub Stars | 100+ |
| NPM weekly downloads | 50+ |
| D7 Retention | 30%+ |

### 6개월 목표 (Growth)
| Metric | Target |
|--------|:------:|
| GitHub Stars | 500+ |
| Weekly Active Users | 200+ |
| NPM weekly downloads | 300+ |
| Lint Fix Rate | 60%+ |
| Avg Session Duration | 3min+ |

### 12개월 목표 (Expansion)
| Metric | Target |
|--------|:------:|
| GitHub Stars | 2,000+ |
| Weekly Active Users | 1,000+ |
| 지원 에이전트 포맷 | 3+ (Claude, Codex, Cursor) |
| Lint 규칙 수 | 10+ |
| 커뮤니티 기여 PR | 20+ |

---

## 9.1 Go-to-Market Strategy

### Launch Channels
- **Discord**: Claude Code 커뮤니티, AI 개발 서버에 데모 공유
- **Reddit**: r/ClaudeAI, r/LocalLLaMA, r/programming 에 소개 포스트
- **Twitter/X**: #ClaudeCode, #AIEngineering 해시태그, GIF 데모
- **Product Hunt**: 베타 이후 정식 런칭

### Growth Loop
- **Shareable Report**: `harnify export` → HTML 리포트 → SNS 공유
- **PNG Export**: 그래프 이미지 내보내기 → 블로그/문서 삽입
- **Badge**: `"Analyzed by Harnify"` README 뱃지

### Content Marketing
- "하네스 엔지니어링이란?" 블로그 시리즈
- "CLAUDE.md 최적화 가이드" 튜토리얼
- 실제 프로젝트 하네스 분석 사례 공유

---

## 10. Open Questions

1. ~~**이름**: `harness-viz`? `agent-harness`? `harnessctl`? 다른 제안?~~ → **harnify**로 확정
2. **스코프 우선순위**: ~~Claude Code only로 시작할지, 처음부터 multi-agent 지원할지?~~ → **Claude Code only**로 시작, 단 pluggable architecture로 설계하여 v0.2에서 multi-agent 확장
3. **오픈소스 전략**: ~~MIT로 완전 오픈? 코어 오픈 + 팀 기능 유료?~~ → **MIT로 시작**, traction 확보 후 Team/Enterprise 기능에 대해 Open Core 전환 검토
4. **Anthropic/에디터 벤더와의 관계**: ~~독립 도구 vs 공식 파트너십?~~ → **독립 도구로 시작**, traction 확보 후 파트너십 추진 (Anthropic Ecosystem 등록 우선)

---

## 11. MVP Milestones

| Phase | Deliverable | Duration | 테스트 |
|-------|-------------|----------|--------|
| **M1** | CLI 스캐너 — 프로젝트의 harness 파일 탐지 + JSON 출력 | 1주 | scanner unit tests |
| **M2** | Web Dashboard — 그래프 시각화 + 노드 클릭 상세 | 2주 | graph rendering + interaction tests |
| **M3** | Token Budget 패널 + Lint 규칙 6개 | 1주 | lint rules unit tests, token panel tests |
| **M4** | 베타 릴리즈 — npx harnify로 설치/실행 | 1주 | CLI E2E tests |

> **Note**: "이 skill 추가하면 +N tokens" 토큰 시뮬레이션 기능은 v0.2로 이동.
