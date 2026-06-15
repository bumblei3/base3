# base3

**Merged project: Schach9x9 + Trischach**

Two chess variants in one repository:
- **Schach9x9** — 9×9 board with new pieces (Kanzler, Wächter, Nachtmahr, Erzengel)
- **Trischach** — 3-player hexagonal chess with Rock-Paper-Scissors combat mechanics

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
│   └── shared/           # Shared utilities (future)
├── engine-wasm/          # Rust WASM engine for Schach9x9
├── dist/
│   ├── schach9x9/        # Production build
│   └── trischach/        # Production build
├── tests/                # Unit tests (Vitest)
├── e2e/                  # Playwright E2E tests (Schach9x9)
├── tests-e2e/            # Playwright E2E tests (Trischach)
└── Config: package.json, tsconfig*.json, vite.config*.ts, etc.
```

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm install` | Install all dependencies |
| `npm run build` | Build WASM + both games |
| `npm run build:schach9x9` | Build only Schach9x9 |
| `npm run build:trischach` | Build only Trischach |
| `npm run wasm:build` | Compile Rust WASM engine |
| `npm run dev:schach9x9` | Dev server for Schach9x9 |
| `npm run dev:trischach` | Dev server for Trischach |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run lint` | ESLint (warnings only) |
| `npm run typecheck` | TypeScript type checking |
| `npm run format` | Prettier formatting |
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
- **AI**: WASM-accelerated engine + JS fallback, personalities, opening book
- **Features**: 3D battle animations, PWA, tutorials, puzzles, shop, statistics

---

## Trischach Features

- **Board**: Triangular hex grid, 3 factions (Fire 🔥, Water 🌊, Nature 🌿)
- **Combat**: Rock-Paper-Scissors mechanics (Fire beats Nature beats Water beats Fire)
- **AI**: Minimax with RPS-aware evaluation, pondering, adaptive time management
- **Features**: Puzzles, replay (TSPN format), auto-battle learning, opening book

---

## Tech Stack

- **Language**: TypeScript (strict mode)
- **Build**: Vite 8 + Rolldown
- **Testing**: Vitest + Playwright
- **Linting**: ESLint 10 + TypeScript ESLint + Prettier
- **WASM**: Rust + wasm-pack (Schach9x9 engine)
- **3D**: Three.js (Schach9x9 battle animations)
- **PWA**: Service worker + manifest

---

## TypeScript Configuration

Uses project references for isolated type checking:

```
tsconfig.json              # Solution file (references only)
tsconfig.schach9x9.json    # Schach9x9 project
tsconfig.trischach.json    # Trischach project
```

Run `npm run typecheck` to verify both projects.

---

## License

ISC