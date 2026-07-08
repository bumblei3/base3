# Future Improvement Plan — base3 (Schach9x9 + Trischach)

> Stand: 2026-07-08 (nach Release v1.1.1)
> Kontext: v1.1.1 ist released. WASM-Engine komplett entfernt (radikal-clean),
> JS-Suche ist die alleinige Engine. ROADMAP_AAA.md (Phasen 1–5, 7) ist grün.
> Offen: Phase 6 (Observability), Phase 8 (Polish/Platform), AI-Performance
> (post-WASM), Dependabot-Cleanup.

---

## 📊 Aktueller Zustand (verifiziert)

| Dimension | Status | Bemerkung |
|-----------|--------|-----------|
| Tests | ✅ | Unit 2246 passed / 17 skipped; E2E 74/1 |
| Type Safety | ✅ | strict, 0 errors |
| Lint | ✅ | 0 errors |
| Performance | ✅ (Initial) | Bundle < 200KB gzip, 3D lazy |
| Accessibility | ✅ | WCAG 2.1 AA (0 violations) |
| Security | ✅ | CSP + `npm audit` clean |
| Observability | ⚠️ | ErrorManager+Sentry-Wrapper da, aber kein DSN/Source-Maps |
| AI Engine | ⚠️ | JS-only (WASM weg) → Performance-Pfad wichtiger |
| Platform Polish | ⬜ | Pause-Feature, File Handling, Push, i18n offen |

---

## 🎯 Priorisierung (impact-first)

Ranking nach: Impact × Testbarkeit ÷ Risiko.

### P0 — Schnelle Wins (je 0.5–1 Tag, Risiko niedrig)

**P0.1 Sentry Production-Activation (Phase 6)**
- `@sentry/browser` ist bereits Dep (v10.63.0) + `ErrorManager` integriert.
- Fehlt: `VITE_SENTRY_DSN` setzen (GitHub Pages Env / Secret), Source-Maps-Upload
  im `vite build`, Web-Vitals-Endpoint (`Sentry.init` mit `browserTracingIntegration`).
- Test: `errorManager.observability.test.ts` erweitern (DSN-Pfad mocken);
  Playwright-Smoke, der einen gesammelten Error im Test-Mode prüft.
- Impact: Production-Error-Visibility (der einzige fehlende "AAA"-Block).

**P0.2 Pause-Feature (`p`-Taste) (Phase 8.2 Rest)**
- `gameController.togglePause()` existiert? Prüfen. Wenn nicht: `p` triggert
  Pause-Overlay (ähnlich Help-Overlay) + stoppt AI-Timer.
- Test: `e2e/help.spec.ts` Pattern wiederverwenden (Taste öffnet Overlay).
- Impact: Vollständigkeit der Keyboard-Shortcuts (war in 8.2 geplant, weggelassen).

**P0.3 Dependabot-Remote-Branches aufräumen**
- 12 `dependabot/*`-Branches liegen im Remote, keine offenen PRs.
- Einzel-Bumps direkt auf `main` (wie in AGENTS.md/ADR dokumentiert),
  Bundle-PRs schließen.
- Impact: Repo-Hygiene, keine verwaisten Branches.

### P1 — Mittlere Features (1–3 Tage, Risiko mittel)

**P1.1 AI-Performance-Härtung (post-WASM)**
- Da WASM weg ist, läuft die JS-Suche im Main-Thread (Tutor/Analysis).
- Maßnahmen:
  - `requestIdleCallback` für Analysis (nicht blockierender Main-Thread).
  - Iterative Deepening mit Yield (alle N Ply pausieren → UI bleibt responsiv).
  - Optional: Web Worker für `runJsSearch` (war vorbereitet, aber
    `aiWorker.coverage.test.ts` hatte Bugs — diese fixen).
- Test: `search.coverage.test.ts` + neuer `aiWorker.test.ts` (Worker-Path grün).
- Impact: Kein UI-Freeze bei tiefen Suchen (bisher durch WASM kaschiert).

**P1.2 PWA Excellence (Phase 8.1)**
- Custom Install Prompt (`beforeinstallprompt` capture + Button, nicht Browser-Default).
- Background Sync für Statistics/Opening Book.
- Push Notifications (Turn Reminders) — Opt-in.
- Service Worker: aktuell Network-First; auf Stale-While-Revalidate für Assets.
- Test: `playwright.csp.config.mjs` erweitern (Offline-Modus simulieren).
- Impact: "Installierbar" + Offline-Spielbar (AAA-PWA-Kriterium).

**P1.3 File Handling API (.pgn OS-Level) (Phase 8.2)**
- `launchQueue` + `FileSystemHandle` für `.pgn` öffnen/speichern via OS.
- PGN Import existiert bereits (`PGNImportReplay.ts`), nur OS-Integration fehlt.
- Test: E2E mit `.pgn`-File-Upload (Playwright `setInputFiles`).
- Impact: Native UX (Doppelklick auf .pgn öffnet Spiel).

### P2 — Größere Vorhaben (1 Woche+, Risiko mittel–hoch)

**P2.1 i18n / Lokalisierung (Phase 8.3)**
- Aktuell: UI-Strings hardcoded (DE). Kein `i18n`-Framework im Repo.
- Ansatz: `i18next` (lightweight) + `Intl` für Zahlen/Datum.
- Scope: DE (default) + EN als Proof-of-Concept.
- Test: Unit-Tests für Translation-Keys (kein Missing-Key), E2E-Smoke in EN.
- Impact: Internationalisierung (AAA-User-Base), aber großer Refactor.

**P2.2 Mutation Testing (Phase 2.3)**
- Stryker.js für JS-Suche/Eval (Ziel: 70%+ Mutation Score).
- Impact: Test-Qualität (nicht Test-Menge) validieren. Risiko: Setup-Zeit.

**P2.3 Opening Book Expansion (Phase 8.3)**
- Aktuell: `BookGenerator.ts` trainiert aus `data/openings.pgn`.
- Maßnahme: Lichess Elite-DB integrieren (größeres Buch).
- Impact: Stärkere AI-Eröffnungen (spürbar für Spieler).

### P3 — Optional / Nice-to-have

- **Visual Regression** (Pixelmatch, Threshold 0.1%) — war in Phase 2.2.
- **Storybook erweitern** (mehr Components) — Phase 7.
- **ADRs** für AI-Architekturentscheidungen (post-WASM).
- **Replay/Share-Link** via URL-Parameter (statt nur Clipboard) — Phase 8.2.

---

## 🗺️ Empfohlene Reihenfolge

1. **P0.1** (Sentry) → sofort, da einziger fehlender AAA-Block + fast fertig.
2. **P0.2** (Pause) → klein, macht 8.2 komplett.
3. **P1.1** (AI-Perf) → wichtig, seit WASM weg ist JS die alleinige Engine.
4. **P1.2** (PWA) → "Installierbar" ist sichtbarer User-Wert.
5. **P1.3** (File Handling) → native UX.
6. P2+ bei Bedarf.

---

## 📝 Definition of Done (pro Item)

- [ ] Unit-Tests grün (Vitest, happy-dom)
- [ ] E2E-Test für kritischen Pfad (Playwright, workers=1)
- [ ] Lint + Typecheck 0 errors
- [ ] CHANGELOG-Eintrag + (bei Feature) Version-Bump
- [ ] ROADMAP_AAA.md Task abgehakt

---

## 🔗 Verwandte Docs

- `ROADMAP_AAA.md` — Ursprungs-Roadmap (Phasen 1–8)
- `CHANGELOG.md` — Release-Historie
- `docs/adr/0001-repo-structure.md` — Architektur-Entscheidungen
- `AGENTS.md` — Workspace-Konventionen (DE, impact-first, TDD)
