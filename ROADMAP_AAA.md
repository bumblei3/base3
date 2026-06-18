# base3 AAA Quality Roadmap

> Ziel: Production-ready, barrierefrei, performant, wartbar — "AAA" Standard für Web-Games

---

## 🎯 Qualitätskriterien (Definition of Done für AAA)

| Dimension | Ziel |
|-----------|------|
| **Tests** | 100% Unit grün, 100% Integration grün, E2E kritische Pfade grün, 80%+ Coverage |
| **Type Safety** | `strict: true`, 0 `any`, 0 `@ts-ignore` |
| **Lint** | 0 Errors, 0 Warnings (incl. Tests) |
| **Performance** | LCP < 2.5s, FPS 60 auf 5 Jahre altem Mobile, Bundle < 200KB gzip (Initial) |
| **Accessibility** | WCAG 2.1 AA, Tastatur-Navigation, Screenreader, Kontrast |
| **Browser** | Chrome, Firefox, Safari, Edge (latest 2) + Mobile Safari/Chrome |
| **Security** | CSP, keine XSS, Dependencies aktuell, `npm audit` clean |
| **Observability** | Error Tracking, Performance Monitoring, Analytics (opt-in) |
| **Release** | SemVer, Changelog, Rollback-fähig, Feature Flags |
| **DX** | `npm run dev` < 3s, HMR, Storybook, API-Docs, Contributor Guide |

---

## 📋 Phase 1: Fundament stabilisieren (Woche 1-2)

### 1.1 Tests komplett grün
- [ ] **Schach9x9 Rest-Tests fixen** (errorManager, controllers.coverage, pgn_crossMode, fullGame, snapshots, moveController)
  - `errorManager.test.ts`: NotificationUI mock in happy-dom
  - `controllers.coverage.test.ts`: Strategie-Mocks, Phasen-Übergänge
  - `pgn_crossMode.test.ts`: Cross-Board PGN Export
  - `fullGame.test.ts`: Echte Spiel-Flüsse (Setup → Play → End)
  - `snapshots.test.ts`: Visuelle Regression (Pixelmatch)
  - `moveController.test.ts`: Save/Load, Theme, Replay
- [ ] **Trischach Test-Suite vollständig** (alle 16 Files)
- [ ] **Coverage-Thresholds durchsetzen** (lines/branches/functions/statements ≥ 80%)

### 1.2 TypeScript strict Mode
```json
// tsconfig.json
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true,
  "noUncheckedIndexedAccess": true,
  "exactOptionalPropertyTypes": true
}
```
- [ ] Alle `any` eliminieren (Ziel: 0)
- [ ] `@ts-ignore` / `@ts-expect-error` entfernen
- [ ] Generics für Game/Controller/Strategy durchziehen

### 1.3 Lint 0 Warnings
- [ ] `no-unused-vars` in Test-Files sauber (nicht nur `off` schalten)
- [ ] `@typescript-eslint/no-explicit-any` auf `error`
- [ ] `eslint-plugin-testing-library` für Vitest Best Practices

---

## 📋 Phase 2: Test-Pyramide & E2E (Woche 2-3)

### 2.1 Unit → Integration → E2E Balance
| Ebene | Tools | Ziel |
|-------|-------|------|
| Unit | Vitest + happy-dom | 80%+ Coverage, < 50ms/Test |
| Integration | Vitest + happy-dom | Game-Flüsse, Campaign, AI |
| E2E | Playwright | Critical User Journeys |

### 2.2 Playwright E2E Suite (Critical Paths)
```typescript
// tests-e2e/critical-journeys.spec.ts
test.describe('Critical User Journeys', () => {
  test('Landing → Schach9x9 → Play vs AI → Checkmate → Analysis', async () => { /* ... */ });
  test('Landing → Trischach → 3-Player → Victory', async () => { /* ... */ });
  test('Campaign: Level 1 → 2 → 3 → Reward Unlock', async () => { /* ... */ });
  test('PWA: Install → Offline → Sync', async () => { /* ... */ });
  test('Mobile: Touch Drag/Drop → Promotion → Rotate', async () => { /* ... */ });
  test('Accessibility: Tab-Navigation → ARIA → Screenreader', async () => { /* ... */ });
});
```
- [ ] Matrix: Chrome/Firefox/Safari × Desktop/Mobile
- [ ] Visual Regression (Pixelmatch, Threshold 0.1%)
- [ ] Performance Budgets (LCP, TBT, CLS)

### 2.3 Test-Infrastruktur
- [ ] **Separate Vitest Configs**: `vitest.config.ts` (local), `vitest.ci.config.ts` (CI, `exclude: []`)
- [ ] **Test Containers** für CI (Playwright Browsers, happy-dom Polyfills)
- [ ] **Flaky Test Detection**: Retry 2x, Quarantine bei > 10% Flakiness
- [ ] **Mutation Testing**: Stryker.js (Ziel: 70%+ Mutation Score)

---

## 📋 Phase 3: Performance & Bundle (Woche 3-4)

### 3.1 Bundle Analysis
```bash
npm run build && npx vite-bundle-analyzer dist/
```
- [ ] **Code Splitting**: Lazy Load Heavy Chunks
  - `battleChess3D.js` (578KB) → Dynamic Import on "3D" Button
  - `OpeningBook` → Web Worker
  - `Campaign BoardFactory` → On Demand
- [ ] **Initial Bundle** < 200KB gzip (jetzt ~300KB+)
- [ ] **Tree Shaking**: Unused Exports entfernen (SideEffects: false in package.json)

### 3.2 Runtime Performance
| Metrik | Ziel | Messung |
|--------|------|---------|
| LCP | < 2.5s | Web Vitals (LCP Element: Board) |
| FPS (Play) | 60fps | `requestAnimationFrame` Profiler |
| FPS (3D) | 30fps+ | Three.js Stats Panel |
| Memory | < 100MB | Chrome DevTools Heap Snapshot |
| AI Move | < 500ms | Time Management Logs |

- [ ] **Web Worker** für AI (bereits vorbereitet, aber Bugs in `aiWorker.coverage.test.ts`)
- [ ] **WASM Engine** für Trischach/Schach9x9 (bereits `engine-wasm`, aber CI Build fragil)
- [ ] **Service Worker** Caching Strategy (Stale-While-Revalidate für Assets)
- [ ] **Preload Critical CSS/Fonts** (Outfit Font → `font-display: swap` + Preload)

### 3.3 Mobile Optimierung
- [ ] Touch Targets ≥ 44px (bereits teilweise)
- [ ] `touch-action: manipulation` auf Board
- [ ] Safe Area Insets (Notch/Dynamic Island)
- [ ] 100dvh / `env(viewport-height)` für Fullscreen
- [ ] Orientation Change Handling (Board Resize)

---

## 📋 Phase 4: Accessibility (WCAG 2.1 AA) (Woche 4-5)

### 4.1 Audit & Fixes
```bash
npx @axe-core/playwright tests-e2e/  # CI Integration
```
- [ ] **Kontrast**: 4.5:1 (Text), 3:1 (UI Elements) — Design Tokens prüfen
- [ ] **Tastatur**: Alle Aktionen via Tab/Enter/Space/Escape/Pfeiltasten
- [ ] **Focus Visible**: `:focus-visible` Outline (nicht `outline: none`)
- [ ] **ARIA**: `role="grid"` Board, `aria-label` Zellen, `aria-live` Status
- [ ] **Screenreader**: NVDA/VoiceOver Test (Status, Züge, Captures, Check/Mate)
- [ ] **Reduced Motion**: `prefers-reduced-motion` → Animationen deaktivieren
- [ ] **High Contrast Mode**: Windows HC / macOS Increase Contrast

### 4.2 Design Token Audit
```css
/* design-tokens.css - AAA Check */
--color-text: #e2e8f0;        /* auf --bg-dark #0a0e27 = 12.6:1 ✅ */
--color-accent: #31c48d;      /* auf --bg-dark = 4.8:1 ✅ */
--color-error: #f87171;       /* auf --bg-dark = 4.2:1 ⚠️ prüfen */
```

---

## 📋 Phase 5: Security & Dependencies (Woche 5-6)

### 5.1 Supply Chain
- [ ] `npm audit` → 0 High/Critical
- [ ] **Dependabot** konfiguriert (weekly, grouped)
- [ ] **Lockfile** committed (pnpm-lock.yaml)
- [ ] **SBOM** generieren (`@cyclonedx/bom`)

### 5.2 Runtime Security
- [ ] **CSP Header** (via GitHub Pages `_headers` oder Netlify/Cloudflare)
  ```
  Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src fonts.gstatic.com; connect-src 'self' https://cdn.jsdelivr.net; worker-src 'self' blob:
  ```
- [ ] **Trusted Types** für DOM XSS Prevention
- [ ] **Subresource Integrity** für CDN Assets (Three.js, Fonts)
- [ ] **Permissions Policy** (keine Geolocation, Camera, Mic)

### 5.3 Content Security
- [ ] PGN/Save Import: Validierung, Größenlimit, Sanitisierung
- [ ] URL Parameter Parsing: Allowlist (kein `eval`)

---

## 📋 Phase 6: Observability & Release (Woche 6-7)

### 6.1 Error Tracking
- [ ] **Sentry** (Self-hosted oder Cloud Free Tier)
  - Source Maps Upload (Vite Plugin)
  - Release Tracking
  - User Feedback Widget
  - Alerting: > 5 Errors/Min → Pager

### 6.2 Performance Monitoring
- [ ] **Web Vitals** → Custom Endpoint / Sentry / Vercel Analytics
- [ ] **Resource Timing** (Bundle Load, WASM Init, Font Load)
- [ ] **Custom Metrics**: AI Think Time, Move Latency, FPS Drops

### 6.3 Release Pipeline
```yaml
# .github/workflows/release.yml
on:
  push:
    tags: ['v*']
jobs:
  release:
    steps:
      - build & test (all matrices)
      - generate changelog (conventional commits)
      - create github release
      - deploy to gh-pages (with version prefix /v1.2.3/)
      - notify discord/slack
```
- [ ] **SemVer** via `standard-version` / `release-it`
- [ ] **Changelog** auto-generated (Conventional Commits)
- [ ] **Versioned Deploys** (`/v1.2.3/`, `/latest/`)
- [ ] **Rollback**: `gh-pages` vorherige Version behalten
- [ ] **Feature Flags** (LaunchDarkly / Unleash / Custom)

---

## 📋 Phase 7: Developer Experience & Docs (Woche 7-8)

### 7.1 DX Tooling
- [ ] `npm run dev` < 3s (Vite 6 + Rolldown)
- [ ] **Storybook** für UI Komponenten (Board, Panels, Modals)
- [ ] **API Docs** (TypeDoc → GitHub Pages `/docs/`)
- [ ] **Architecture Decision Records** (ADR) im Repo
- [ ] **Contributing Guide** + **Code of Conduct**

### 7.2 Debugging
- [ ] **VS Code Launch Configs** (Debug Vitest, Playwright, Node)
- [ ] **React DevTools** Style Inspector für Custom Elements (falls Lit/Preact)
- [ ] **State Inspector** (Game State, Campaign, AI) in Dev Panel

---

## 📋 Phase 8: Polish & Platform (Laufend)

### 8.1 PWA Excellence
- [ ] **Install Prompt** (Custom, nicht Browser Default)
- [ ] **Offline Fallback** (Spielbar ohne Netz: Local AI, Cached Assets)
- [ ] **Background Sync** (Statistics, Opening Book)
- [ ] **Push Notifications** (Turn Reminders, Campaign Rewards) — Opt-in

### 8.2 Plattform Features
- [ ] **Share API** (PGN, Position, Replay Link)
- [ ] **File Handling** (.pgn Import/Export via OS)
- [ ] **Clipboard API** (FEN, PGN, Move List)
- [ ] **Keyboard Shortcuts** (Global: `?` Help, `u` Undo, `h` Hint)

### 8.3 Content & Meta
- [ ] **Opening Book** erweitert (Human Games, Lichess Elite DB)
- [ ] **Puzzles** (Mate in 1-3, Tactics, Endgame) — 500+
- [ ] **Tutorial** Interaktiv (Schritt-für-Schritt, sprachunabhängig)
- [ ] **Lokalisierung** (i18n: DE, EN, FR, ES, ...)

---

## 📊 Priorisierung & Ressourcen

| Phase | Aufwand | Risiko | Blocker | Owner |
|-------|---------|--------|---------|-------|
| 1. Tests grün | 2W | Niedrig | Keine | Du |
| 2. E2E | 2W | Mittel | Playwright CI Zeit | Du |
| 3. Performance | 1W | Mittel | WASM/Worker Stabilität | Du |
| 4. A11y | 1W | Niedrig | Design Token Audit | Du |
| 5. Security | 1W | Niedrig | CSP Testing | Du |
| 6. Observability | 1W | Niedrig | Sentry Setup | Du |
| 7. DX/Docs | 1W | Niedrig | Storybook Config | Du |
| 8. Polish | Laufend | Niedrig | Zeit | Du |

**Gesamt: ~10-12 Wochen für "AAA Launch"**

---

## 🚀 Quick Wins (Diese Woche)

1. **Tests grün**: Die 6 fehlenden Test-Files fixen (siehe Phase 1.1)
2. **Coverage**: `npm run test:coverage` → Report prüfen, Lücken schließen
3. **Bundle**: `npm run build && npx vite-bundle-visualizer` → 3D Chunk lazy laden
4. **A11y**: `npx @axe-core/playwright` einmal laufen lassen, Top 10 Fixes
5. **Security**: `npm audit fix` + CSP Header in `_headers` (GitHub Pages)

---

## 📝 Nächste Schritte

```bash
# 1. Restliche Tests fixen
cd /home/tobber/base3
npm run test 2>&1 | grep -E "(FAIL|×)" | head -20

# 2. Coverage Report
npm run test:coverage 2>&1 | tail -30

# 3. Bundle Analyse
npm run build && npx vite-bundle-visualizer dist/schach9x9

# 4. A11y Audit
npx playwright test tests-e2e/accessibility.spec.ts --project=chromium

# 5. Security
npm audit
```

---

> **Hinweis**: Dieses Roadmap-Dokument lebt im Repo (`ROADMAP_AAA.md`). Bei Fortschritt Tasks abhaken, neue hinzufügen, Prioritäten anpassen. Vierteljährlich Review.