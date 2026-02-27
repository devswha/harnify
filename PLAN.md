# Plan: Harnify — AI Agent Harness Engineering Tool

## Context

AI 코딩 에이전트(Claude Code, Codex, Cursor 등)를 제어하는 "하네스" 파일(CLAUDE.md, AGENTS.md, skills, .cursorrules 등)이 빠르게 늘어나고 있지만, 이 파일들의 구조·관계·토큰 비용·충돌을 시각화할 도구가 전혀 없음. 직접 경쟁 도구 없음 (기존 PromptLayer/LangSmith 등은 API 런타임 관리 도구).

**목표**: MVP(v0.1)를 구현하여 `npx harnify`로 프로젝트의 하네스 구조를 시각화하는 웹 대시보드를 제공.

## Product Identity

- **이름**: harnify (harness + -ify)
- **npm**: `harnify`
- **실행**: `npx harnify`
- **GitHub**: `harnify`

## MVP Scope (v0.1)

### 1. CLI Scanner
프로젝트 루트에서 하네스 파일을 자동 탐지하고 JSON으로 구조화.

**스캔 대상:**
```
CLAUDE.md (root, ~/.claude/, .claude/)
**/AGENTS.md (디렉토리별)
.claude/settings.json
.claude/skills/**/*.md, ~/.claude/skills/**/*.md
.cursorrules, .cursor/rules/
codex.md
docs/**/*.md (참조 문서)
```

**출력**: 파일 메타데이터 (경로, 토큰 수, 참조 관계, 마지막 수정일)

### 2. Web Dashboard (localhost)
`npx harnify` → `http://localhost:3847` 에서 시각화.

**그래프 시각화 (Cytoscape.js):**
- 노드: Config (CLAUDE.md), Agent (AGENTS.md), Skill, Doc, Rule
- 엣지: references, overrides, triggers
- 인터랙션: 클릭→내용 표시, hover→토큰/요약, 충돌 하이라이트

**Token Budget Panel (사이드바):**
- 파일별 토큰 수 breakdown
- 모델별 context window 대비 비율
- "이 skill 추가하면 +N tokens" 시뮬레이션

### 3. Lint Rules (6개)
| Rule | Severity | 설명 |
|------|----------|------|
| dead-reference | Error | 참조하는 파일이 존재하지 않음 |
| trigger-conflict | Warning | 두 skill이 같은 trigger 사용 *(MVP: 정확 일치만)* |
| override-shadow | Warning | 하위 CLAUDE.md가 상위 규칙 덮어씀 *(MVP: 1-depth만)* |
| token-heavy | Info | 단일 파일이 context의 3%+ 차지 |
| orphan-skill | Info | 어디서도 트리거되지 않는 skill |
| duplicate-rule | Warning | 동일한 규칙이 여러 파일에 중복 정의 |

## Tech Stack

| Layer | Technology |
|-------|------------|
| CLI | Node.js (TypeScript) |
| Web | React + Vite |
| UI Components | shadcn/ui + Tailwind CSS |
| Design | Coolors (2-3색 팔레트) + Google Stitch (영문 프롬프트) |
| Graph | Cytoscape.js |
| Token Count | 바이트 근사 (bytes / 4) — 제로 의존성, 상대 비교에 충분 |
| MD Parsing | gray-matter + unified/remark |
| File Watch | chokidar |

## Project Structure

```
harnify/
├── package.json
├── tsconfig.json
├── tsup.config.ts              # CLI 빌드 (tsup)
├── vite.config.ts              # Web 빌드 (Vite)
├── src/
│   ├── cli/
│   │   └── index.ts          # CLI entry (npx harnify)
│   ├── scanner/
│   │   ├── detector.ts       # 하네스 파일 자동 탐지
│   │   ├── parser.ts         # YAML frontmatter + MD 파싱
│   │   ├── tokenizer.ts      # 토큰 수 계산 (바이트 근사)
│   │   └── reference.ts      # 파일 간 참조 관계 추출
│   ├── linter/
│   │   ├── index.ts           # lint 엔진
│   │   └── rules/             # 개별 lint 규칙
│   ├── types/
│   │   └── index.ts           # 공유 타입 (HarnessFile, HarnessGraph, LintResult, TokenInfo)
│   ├── server/
│   │   └── index.ts           # Express/Fastify localhost 서버
│   └── web/                   # React dashboard (Vite)
│       ├── App.tsx
│       ├── components/
│       │   ├── Graph.tsx      # Cytoscape.js 그래프
│       │   ├── TokenPanel.tsx # 토큰 budget 사이드바
│       │   ├── FileDetail.tsx # 파일 상세 패널
│       │   └── LintReport.tsx # lint 결과
│       └── index.html
├── tests/
└── README.md
```

**빌드 파이프라인**: CLI는 `tsup`으로 번들(CJS+ESM), Web은 `vite build`로 SPA 빌드 후 CLI가 정적 파일로 서빙.

## Implementation Milestones

### M1: Project Setup + CLI Scanner (Week 1)
- [ ] `npm init`, TypeScript, ESLint, tsup 설정
- [ ] CLI entry point (`npx harnify`)
- [ ] 하네스 파일 탐지 (glob 패턴)
- [ ] YAML frontmatter 파싱 (skills)
- [ ] 토큰 카운팅 (바이트 근사: bytes / 4)
- [ ] 파일 간 참조 관계 추출 (마크다운 내 파일 경로 파싱)
- [ ] JSON 출력 (`harnify --json`)
- [ ] **테스트**: scanner unit tests (detector, parser, tokenizer)

### M2: Web Dashboard + Graph (Week 2-3)
- [ ] Vite + React 프로젝트 셋업
- [ ] Express 서버 (localhost:3847)
- [ ] Cytoscape.js 그래프 렌더링
- [ ] 노드 타입별 색상/아이콘
- [ ] 엣지 타입별 스타일
- [ ] 클릭/hover 인터랙션
- [ ] 줌/팬/필터
- [ ] **테스트**: graph 렌더링 + 인터랙션 테스트 (Vitest + Testing Library)

### M3: Token Panel + Lint (Week 4)
- [ ] Token Budget 사이드바
- [ ] 모델별 context window 선택
- [ ] 6개 lint 규칙 구현 (duplicate-rule 포함)
- [ ] lint 결과 패널
- [ ] **테스트**: lint rules unit tests, token panel integration tests

### M4: Polish + Release (Week 5)
- [ ] README (AI 검색 키워드 최적화)
- [ ] npm publish
- [ ] GitHub repo 설정 (topics, description)
- [ ] **테스트**: CLI E2E tests (실제 프로젝트에서 npx harnify 실행)

> **Note**: "이 skill 추가하면 +N tokens" 토큰 시뮬레이션 기능은 v0.2로 이동.

## Excluded Paths

스캔 시 기본 제외 경로:
```
node_modules/
.git/
.omc/
dist/
build/
coverage/
.next/
.nuxt/
```

## Security

- localhost 바인딩: `127.0.0.1` only (외부 접근 차단)
- 파일 내용 표시 시 민감 필드 마스킹 (API key, token 등 `[MASKED]` 처리)
- 스캔 범위를 프로젝트 루트 하위로 제한 (심볼릭 링크 traversal 방지)

## CLI Options

```bash
harnify                # 기본: 스캔 + 대시보드 오픈
harnify --json         # JSON 출력만 (대시보드 없음)
harnify lint           # lint 결과만 출력
harnify --port 4000    # 포트 변경 (기본: 3847)
harnify --no-open      # 브라우저 자동 오픈 비활성화
```

## Build Pipeline

| Target | Tool | Output |
|--------|------|--------|
| CLI | tsup | `dist/cli/index.cjs` + `dist/cli/index.mjs` |
| Web | vite build | `dist/web/` (정적 SPA) |

CLI가 빌드된 Web 정적 파일을 내장하여 서빙. `npm publish` 시 `dist/` 포함.

## README SEO Keywords (AI 검색 최적화)

```
harness engineering, CLAUDE.md, AGENTS.md, agent config visualization,
Claude Code tool, prompt management, token budget, AI agent configuration,
.cursorrules, codex.md, agent skills, harness lint, context window
```

## Verification

1. calvin-yolo 프로젝트에서 `npx harnify` 실행
2. CLAUDE.md, AGENTS.md, skills 파일이 그래프에 정상 표시되는지 확인
3. 토큰 카운트가 `/context` 명령 결과와 유사한지 비교
4. dead-reference lint가 존재하지 않는 파일 참조를 감지하는지 확인
5. 브라우저에서 노드 클릭/hover 인터랙션 동작 확인

## PRD 상세

`PRD.md` 참조
