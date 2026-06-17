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
# Install dependencies (uses pnpm)
pnpm install

# Build both games (includes WASM compilation for Schach9x9)
pnpm run build

# Or build individually
pnpm run build:schach9x9
pnpm run build:trischach

# Development servers
pnpm run dev:schach9x9   # http://localhost:5173
pnpm run dev:trischach   # http://localhost:5173
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
| `pnpm install` | Install all dependencies |
| `pnpm run build` | Build WASM + both games + landing |
| `pnpm run build:schach9x9` | Build only Schach9x9 |
| `pnpm run build:trischach` | Build only Trischach |
| `pnpm run build:landing` | Build only landing page |
| `pnpm run wasm:build` | Compile Rust WASM engine |
| `pnpm run dev:schach9x9` | Dev server for Schach9x9 |
| `pnpm run dev:trischach` | Dev server for Trischach |
| `pnpm run test` | Run unit tests (342 Trischach + 143 Schach9x9) |
| `pnpm run test:e2e` | Run Playwright E2E tests (Schach9x9) |
| `pnpm run lint` | ESLint (0 errors, 0 warnings) |
| `pnpm run typecheck` | TypeScript strict type checking |
| `pnpm run format` | Prettier formatting |
| `pnpm run train:schach9x9` | Train opening book (500 games) |
| `pnpm run train:schach9x9:fast` | Quick training (50 games) |
| `pnpm run tournament:trischach` | Run AI tournament |

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
- **Testing**: Vitest 4 (happy-dom) + Playwright
- **Linting**: ESLint 10 + TypeScript ESLint + Prettier
- **WASM**: Rust + wasm-pack (Schach9x9 engine, compiled in CI)
- **3D**: Three.js via jsDelivr CDN (Schach9x9 battle animations)
- **PWA**: Service worker + manifest (offline-capable)
- **Package Manager**: pnpm 11 (lockfile committed)

---

## CI/CD Pipeline

```yaml
# .github/workflows/ci.yml (single workflow)
1. quality     → lint + typecheck (parallel)
2. test-trischach → 342 unit tests
   test-schach9x9  → 143 unit tests + WASM build
3. build       → WASM + 3 Vite builds (landing, schach9x9, trischach)
4. deploy      → GitHub Pages (on push to main)
```

- **Branch**: `main` (protected), auto-deploy on push
- **Node**: 22 LTS
- **Cache**: npm + cargo for fast builds

---

## TypeScript Configuration

Uses project references for isolated type checking:

```
tsconfig.json              # Solution file (references only)
tsconfig.schach9x9.json    # Schach9x9 project (composite)
tsconfig.trischach.json    # Trischach project (composite)
```

Run `pnpm run typecheck` to verify both projects.

---

## Development Notes

### Audio / Sound (local dev)
- Sound BlasterX AE-5 Plus (CA0132, ALSA card 1)
- PipeWire 1.6.2 + EasyEffects 8.1.2
- Default sink: `easyeffects_sink`
- Preset: **Bass-Plus** (~/hermes/config.yaml dokumentiert)

### Testing
- Happy-dom environment (no browser needed)
- Localhost asset fetches mocked in `tests/vitest.setup.ts`
- WASM mocked in CI test job, real build in `test-schach9x9` job
- `pnpm run test` runs Vitest with coverage thresholds (80%)

---

## License

ISC