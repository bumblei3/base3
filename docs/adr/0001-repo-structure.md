# ADR 0001: Repo-Struktur als Merged Monorepo (Schach9x9 + Trischach)

- Status: Accepted (2026-07)
- Datum: 2026-07-08

## Kontext

base3 vereint zwei eigenständige Schach-Varianten (Schach9x9, Trischach) in einem
Repository statt in getrennten Repos. Beide teilen Utilities (`js/shared/`) und
Tooling (Vitest, Playwright, ESLint, Vite).

## Entscheidung

- Ein Repo, zwei Game-Verzeichnisse unter `js/`, plus `engine-wasm/` (Rust) für
  Schach9x9. Keine npm-Workspaces zwischen den Spielen — ein geteilter
  `package.json` mit per-Game Vite-Configs (`vite.config.*.ts`).
- TypeScript strict über alle drei tsconfigs; Project References für isolierten
  Typecheck.
- npm als Package Manager (committeter Lockfile), `npm install --legacy-peer-deps`
  wegen Three.js / Storybook-Peer-Range-Konflikten.

## Konsequenzen

- Vorteil: gemeinsame CI, ein Coverage-Report, einfaches Cross-Import von `js/shared`.
- Nachteil: ein Build-Schritt zieht beide Spiele; WASM-Build nur für Schach9x9.
- Dependabot-Bundles betreffen oft beide Spiele → Bundle-PRs werden geschlossen,
  Einzel-Bumps direkt auf main angewendet (siehe CONTRIBUTING.md).

## Update (2026-07, v1.1.0)

- `engine-wasm/` (Rust) wurde entfernt: die WASM-Suche crashte im Browser mit
  einem nicht-reproduzierbaren `memory access out of bounds`-RuntimeError.
  Die JS-Suche ist nun die alleinige Engine (kein WASM mehr im Build/CI).
- Der ursprüngliche `engine-wasm/`-Teil der Entscheidung ist damit gegenstandslos.
