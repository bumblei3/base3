# Future Improvement Plan — base3 (Schach9x9 + Trischach)

> Stand: 2026-07-09 (nach Release v1.1.4 + gepushtem 8x8-AI-Fix)
> Kontext: v1.1.4 ist released. WASM-Engine komplett entfernt (radikal-clean),
> JS-Suche ist die alleinige Engine. ROADMAP_AAA.md (Phasen 1–5, 7) ist grün.
> Offen: Phase 6 (Observability — Sentry gestrichen, siehe unten), Phase 8
> Rest (PWA Excellence), AI-Performance (post-WASM), Dependabot-Cleanup.
>
> WICHTIG: Sentry (P0.1 alt) ist GESTRICHEN. User will keinen sentry.io-Account
> (self-contained bevorzugt). Production-Error-Visibility via leichtgewichtigen
> Eigenbau (ErrorManager + lokales Log-Export) statt DSN/Source-Maps.

---

## 📊 Aktueller Zustand (verifiziert)

| Dimension | Status | Bemerkung |
|-----------|--------|-----------|
| Tests | ✅ | Unit 2246 passed / 16 skipped (1 jsdom-skip entfernt → Eval-Graph jetzt als Playwright-E2E grün); E2E 75/1 |
| Type Safety | ✅ | strict, 0 errors |
| Lint | ✅ | 0 errors |
| Performance | ✅ (Initial) | Bundle < 200KB gzip, 3D lazy |
| Accessibility | ✅ | WCAG 2.1 AA (0 violations) |
| Security | ✅ | CSP + `npm audit` clean |
| Observability | ⚠️ | ErrorManager da; Sentry GESTRICHEN (kein sentry.io-Account) — Eigenbau-Log statt DSN |
| AI Engine | ⚠️ | JS-only (WASM weg) → Performance-Pfad wichtiger (Main-Thread-Suche) |
| Platform Polish | ⬜ | PWA Excellence (installierbar/offline) offen |

---

## 🎯 Priorisierung (impact-first)

Ranking nach: Impact × Testbarkeit ÷ Risiko.

### P0 — Schnelle Wins (je 0.5–1 Tag, Risiko niedrig)

**P0.1 Observability — Sentry GESTRICHEN, Eigenbau-Log statt DSN**
- Status: Sentry-Activation (alter P0.1) gestrichen — User will keinen sentry.io-Account (AGENTS/Präferenz: self-contained).
- `@sentry/browser` ist noch Dep, wird aber nicht als Production-Sink genutzt. Entweder Dep entfernen oder als reiner ErrorManager-Wrapper belassen (kein DSN).
- Eigenbau-Alternative: `ErrorManager` sammelt Errors; Log-Export (Copy/Download) im Settings/Debug-Panel. Kein externer Signup.
- Impact: Production-Error-Visibility ohne Third-Party-Account.

**P0.2 Pause-Feature (`p`-Taste) — ERLEDIGT (v1.1.2)**
- `p` triggert Pause-Overlay über `KeyboardManager` (Single Source of Truth).
- `e2e/pause.spec.ts` (4 Tests) deckt es ab.

**P0.3 Dependabot-Remote-Branches aufräumen**
- 12 `dependabot/*`-Branches liegen im Remote, keine offenen PRs.
- Einzel-Bumps direkt auf `main` (wie in AGENTS.md/ADR dokumentiert),
  Bundle-PRs schließen.
- Impact: Repo-Hygiene, keine verwaisten Branches.

### P1 — Mittlere Features (1–3 Tage, Risiko mittel)

**P1.1 AI-Performance-Härtung (post-WASM) — GEMESSEN, NICHT NÖTIG (2026-07-09)**
- Da WASM weg ist, lief die Sorge: JS-Suche im Main-Thread freezed die UI bei tiefen Suchen.
- Messung (Node, `getBestMoveDetailed`): StartPos D3=0.03s/D4=0.01s, ComplexMidgame D4=0.14s/D5=0.02s.
  Adaptive-Time-Management (2000ms Budget) + JS-Fallback-Suche terminieren in <0.2s. Kein Freeze.
- Entscheidung: Refactor (requestIdleCallback / Worker-Yield) würde Risiko ohne Nutzen einführen.
  First-measure-then-refactor hat hier Verschlimmbesserung verhindert. P1.1 vorerst geschlossen.
- Falls später echte UI-Blockaden (Analysis bei sehr tiefendepth, große Baumsuchen) auftreten: neu bewerten.

**P1.2 PWA Excellence (Phase 8.1) — WEITGEHEND ERLEDIGT (2026-07-09)**
- Custom Install Prompt: bereits implementiert (`main.ts` captured `beforeinstallprompt`,
  Button `#install-app-btn`, `__promptInstall` verdrahtet). `e2e/schach9x9/pwa.spec.ts` deckt es ab.
- Service Worker: precacht Core-Assets, cache-first statics + network-first HTML mit
  Offline-Fallback → "offline-spielbar" erfüllt (besser als plain Network-First).
- SW-Bug gefixt (2026-07-09): tote/fehlerhafte Origin-Check-Zeile in `public/service-worker.js`
  entfernt (`!url.origin === ...` String-Negation).
- Offline-E2E-Test neu (`e2e/schach9x9/pwa.spec.ts`): geht nach SW-Precache offline,
  verifiziert dass Index + Entry-Script cached laden. Grün.
- BEWUSST WEGGELASSEN (Self-contained + Solo-Spiel): Background Sync (Statistics/Opening Book)
  und Push Notifications (Turn Reminders) brauchen ein Backend/externen Service — widerspricht
  der "kein externer Account"-Präferenz und bringt bei Solo-Spiel keinen User-Value.
- Impact: "Installierbar" + Offline-Spielbar (AAA-PWA-Kriterium) erfüllt.

**P1.3 File Handling API (.pgn OS-Level) — ERLEDIGT (v1.1.3 + v1.1.4)**
- PGN-Import/Export, FEN-Load, SAN-Replay über echten `RulesEngine`-Adapter.
- `e2e/file-io.spec.ts` + `schach9x9-critical.spec.ts` decken Round-Trip ab.
- Offen nur noch: OS-Level `launchQueue`/`FileSystemHandle` (Doppelklick auf .pgn).

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

1. **P0.3** (Dependabot-Cleanup) → schnell, Repo-Hygiene, kein Risiko.
2. **Eval-Graph-Test-Korrektur** (erledigt 2026-07-09) → jsdom-skip entfernt,
   echter Playwright-E2E (`e2e/eval-graph.spec.ts`) grün. Kein offener Test-Gap mehr.
3. **P1.1** (AI-Perf) → erst messen (Benchmarks ent-skippt), dann refactoren.
4. **P1.2** (PWA) → "Installierbar" ist sichtbarer User-Wert.
5. P0.1 Observability-Eigenbau (Sentry gestrichen) bei Bedarf.
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
