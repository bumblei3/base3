# base3

**Merged project: Schach9x9 + Trischach**

Two chess variants in one repository:
- **Schach9x9** — 9×9 board with new pieces (Kanzler, Wächter, Nachtmahr, Erzengel)
- **Trischach** — 3-player hexagonal chess with Rock-Paper-Scissors combat mechanics

[![CI](https://github.com/bumblei3/base3/actions/workflows/ci.yml/badge.svg)](https://github.com/bumblei3/base3/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/bumblei3/base3)](https://github.com/bumblei3/base3/releases)
[![License](https://img.shields.io/github/license/bumblei3/base3)](LICENSE)

---

## Live Demos

| Game | URL |
|------|-----|
| **Schach9x9** | https://bumblei3.github.io/base3/schach9x9/ |
| **Trischach** | https://bumblei3.github.io/base3/trischach/ |
| **Landing Page** | https://bumblei3.github.io/base3/ |

---

## Quick Start

```bash
# Install dependencies
npm install

# Build both games (includes WASM compilation for Schach9x9)
npm run build

# Or build individually
npm run build:schach9x9
npm run build:trischach

# Development servers
npm run dev:schach9x9   # http://localhost:5173
npm run dev:trischach   # http://localhost:5173
```

---

## Project Structure

```
base3/
├── js/
│   ├── schach9x9/        # Schach9x9 source (TypeScript)
│   │   ├── ai/           # AI engine, WASM bridge, personalities
│   │   ├── campaign/     # Single-player campaign mode
│   │   ├── pieces/       # Piece skins (classic, modern, pixel, neon, etc.)
│   │   ├── ui/           # BoardRenderer, OverlayManager, TutorUI, etc.
│   │   └── main.ts       # Entry point
│   ├── trischach/        # Trischach source (TypeScript)
│   │   ├── ai-core.ts    # Shared AI logic (main thread + worker)
│   │   ├── main.ts       # Entry point
│   │   └── *.ts          # Game logic, board, pieces, puzzles
│   └── shared/           # Shared utilities
├── engine-wasm/          # Rust WASM engine for Schach9x9
├── dist/
│   ├── landing/          # Landing page build
│   ├── schach9x9/        # Production build
│   └── trischach/        # Production build
├── tests/                # Unit tests (Vitest)
├── e2e/                  # Playwright E2E tests (Schach9x9)
├── tests-e2e/            # Playwright E2E tests (Trischach)
├── tests/mocks/          # Test mocks (WASM, etc.)
└── Config: package.json, tsconfig*.json, vite.config*.ts, etc.
```

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm install` | Install all dependencies |
| `npm run build` | Build WASM + both games + landing |
| `npm run build:schach9x9` | Build only Schach9x9 |
| `npm run build:trischach` | Build only Trischach |
| `npm run build:landing` | Build only landing page |
| `npm run wasm:build` | Compile Rust WASM engine |
| `npm run dev:schach9x9` | Dev server for Schach9x9 |
| `npm run dev:trischach` | Dev server for Trischach |
| `npm run test` | Run all unit tests |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript strict type checking |
| `npm run format` | Prettier formatting |
| `npm run docs:api` | Generate TypeDoc API docs → `docs/api/` |
| `npm run storybook` | Storybook dev server (UI components) on :6006 |
| `npm run build-storybook` | Build static Storybook → `storybook-static/` |
| `npm run train:schach9x9` | Train opening book (500 games) |
| `npm run train:schach9x9:fast` | Quick training (50 games) |
| `npm run tournament:trischach` | Run AI tournament |

---

## Schach9x9 Features

- **Board**: 9×9 with 4 new piece types
  - Kanzler (Rook + Knight)
  - Wächter (Bishop + Knight)
  - Nachtmahr (camel + zebra leaper)
  - Erzengel (Queen + Knight)
- **Modes**: Classic, Standard (with new pieces), Campaign, Setup
- **AI**: WASM-accelerated Rust engine + JS fallback, personalities, opening book (depth 25+)
- **Features**: 3D battle animations (Three.js), PWA/offline, tutorials, puzzles, shop, statistics
- **Accessibility**: Keyboard nav, screen reader support, touch optimized

---

## Trischach Features

- **Board**: Triangular hex grid, 3 factions (Fire 🔥, Water 🌊, Nature 🌿)
- **Combat**: Rock-Paper-Scissors mechanics (Fire beats Nature beats Water beats Fire)
- **AI**: Minimax with RPS-aware evaluation, pondering, adaptive time management (Book depth 25)
- **Features**: Puzzles, replay (TSPN format), auto-battle learning, opening book, 3D pieces

---

## Tech Stack

- **Language**: TypeScript (strict mode, project references)
- **Build**: Vite 8 + Rolldown, `resolve.tsconfigPaths: true`
- **Testing**: Vitest 4 (happy-dom + jsdom) + Playwright
- **Linting**: ESLint 10 + TypeScript ESLint + Prettier
- **WASM**: Rust + wasm-pack (Schach9x9 engine, compiled in CI)
- **3D**: Three.js via jsDelivr CDN (Schach9x9 battle animations)
- **PWA**: Service worker + manifest (offline-capable)
- **API Docs**: TypeDoc → [`docs/api/`](docs/api/index.html)
- **UI Docs**: Storybook (vanilla TS via html-vite) → `npm run storybook`
- **Package Manager**: npm (lockfile committed)

---

## CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
1. setup       → cache + deps + WASM build
2. quality     → lint + typecheck
3. test-trischach → ~347 unit tests
   test-schach9x9  → ~1843 unit tests (4 shards, parallel)
4. build       → WASM + 3 Vite builds (landing, schach9x9, trischach)
5. deploy      → GitHub Pages (on push to main)
```

- **Branch**: `main` (protected), auto-deploy on push
- **Node**: 24 LTS
- **Actions**: checkout@v5, setup-node@v5, cache@v5
- **Cache**: npm + cargo for fast builds

---

## TypeScript Configuration

Uses project references for isolated type checking:

```
tsconfig.json              # Solution file (references only)
tsconfig.schach9x9.json    # Schach9x9 project (composite)
tsconfig.trischach.json    # Trischach project (composite)
```

Run `npm run typecheck` to verify both projects.

---

## Testing

- ~2253 unit tests across both games (Vitest + happy-dom + jsdom)
- 4-way sharded Schach9x9 tests for CI parallelism
- E2E tests via Playwright (Schach9x9 + Trischach)
- WASM mocked in CI test job, real build in setup job
- Coverage thresholds: 75% statements / 65% branches / 70% functions / 75% lines

---

## AAA Quality Roadmap

> **Ziel**: Production-ready, barrierefrei, performant, wartbar — "AAA" Standard für Web-Games

Die vollständige Roadmap mit 8 Phasen liegt in [`ROADMAP_AAA.md`](ROADMAP_AAA.md).

**Aktueller Stand (2026-07):**

| Phase | Status | Hinweis |
|-------|--------|---------|
| 1. Fundament | 🟢 Done | Tests grün, Lint 0 errors, Typecheck ✅ |
| 2. E2E | 🟢 Done | Schach9x9 70 passed/1 skipped/0 failed, Trischach 15/15, CSP-Runtime grün |
| 3. Performance | 🟢 Done | Initial Bundle < 200KB gzip, 3D-Chunk lazy |
| 4. Accessibility | 🟢 Done | axe: 0 critical/serious violations |
| 5. Security | 🟢 Done | CSP-Header + `npm audit` clean (0 vulns) |
| 6. Observability | 🔲 Offen | Sentry, Web Vitals |
| 7. DX/Docs | 🟢 Done | Storybook + TypeDoc-API-Docs + Contributing Guide + CoC + ADR |
| 8. Polish | 🔲 Offen | Plattform-Features (Shortcuts, Share/Clipboard), Puzzles 500+, i18n |

**Quick Wins (erledigt):**
1. ✅ Restliche fehlerhafte Tests fixen (2253 Unit-Tests grün)
2. ✅ `npm audit fix` → 0 vulnerabilities
3. ✅ Coverage Report: 77.83% Statements (Threshold 75%), Lücken geschlossen
4. ✅ Bundle Analyse → 3D-Chunk lazy-loaded (< 200KB gzip initial)
5. ✅ A11y Audit (`@axe-core/playwright`) → 0 critical/serious violations
6. ✅ CSP Header (`_headers` für GitHub Pages) + CSP-Runtime-Test in CI
7. ✅ E2E vollständig grün (Schach9x9 70 passed/1 skipped/0 failed)
8. ✅ Storybook für Schach9x9 UI (vanilla TS via html-vite)

---

## Contributing & Community

- [Contributing Guide](CONTRIBUTING.md) — Setup, Qualitäts-Gates, Dependabot-Workflow
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Architecture Decisions (ADRs)](docs/adr/)

---
