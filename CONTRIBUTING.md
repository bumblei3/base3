# Contributing zu base3

Danke für dein Interesse! base3 ist ein Merged-Repo (Schach9x9 + Trischach).

## Setup

```bash
npm install --legacy-peer-deps
npm run dev:schach9x9   # bzw. dev:trischach
```

## Qualitäts-Gates (müssen lokal grün sein vor einem PR)

| Gate | Befehl | Erwartung |
|------|--------|-----------|
| Lint | `npm run lint` | 0 errors, 0 warnings |
| Typecheck | `npm run typecheck` | `tsc --noEmit` 0 errors (strict) |
| Unit | `npm run test` | alle grün |
| Format | `npm run format:check` | Prettier sauber |
| E2E | `npx playwright test` | kritische Pfade grün |

## Commit-Konvention

Conventional Commits: `feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`.
Der Changelog wird automatisch aus den Commits generiert.

## Dependabot-Workflow

- **Bundle-PRs** (mit ungewollten Downgrades/Rollbacks): schließen statt rebasen.
- **EinzelfBumps**: direkt auf `main` anwenden, dann `npm install --legacy-peer-deps`,
  sauberen Commit pushen.
- Vor einem Merge: `git rev-parse main` + clean working tree prüfen.

## Tests schreiben

- Neue Logik → Vitest-Unit-Test (happy-dom/jsdom).
- Kritische User-Journeys → Playwright E2E unter `e2e/` (Schach9x9) bzw. `tests-e2e/` (Trischach).
- E2E-Storage ist isoliert (kein Cross-Test-Leak) — nicht auf `origin`/`storageState` verlassen.

## Architectural Decision Records

Entscheidungen mit Tragweite kommen nach `docs/adr/` (siehe `docs/adr/0001-*.md`).
