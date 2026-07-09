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
| Observability | ✅ | ErrorManager mit lokalem Log-Ring-Buffer + Export (Copy/Download) im Settings-Panel; Sentry-Dep entfernt |
| AI Engine | ⚠️ | JS-only (WASM weg) → Performance-Pfad wichtiger (Main-Thread-Suche) |
| Platform Polish | ⬜ | PWA Excellence (installierbar/offline) offen |

---

## 🎯 Priorisierung (impact-first)

Ranking nach: Impact × Testbarkeit ÷ Risiko.

### P0 — Schnelle Wins (je 0.5–1 Tag, Risiko niedrig)

**P0.1 Observability — ERLEDIGT (v1.1.6)**
- `@sentry/browser` Dependency komplett entfernt (radikal-clean): kein sentry.io-Account, self-contained.
- ErrorManager hält einen lokalen In-Memory-Ring-Buffer (200 Einträge) aller Fehler/Warnungen.
- `getLog()` / `clearLog()` / `exportLog()` (Plain-Text-Dump) als öffentliche API.
- Settings-Panel zeigt "Fehlerprotokoll"-Sektion mit Copy / Download (.txt) / Leeren-Buttons.
- E2E-Test `e2e/error-log.spec.ts` deckt Record + Download + Clear ab.
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

> Stand 2026-07-09: Alle P2-Punkte sind entweder extern-abhängig (Datenquelle)
> oder ein großer, risikoreicher Refactor OHNE unmittelbaren Solo-User-Value.
> Empfehlung: hier sauber stoppen, v1.1.5 taggen, P2 bewusst zurückstellen.

**P2.1 i18n / Lokalisierung (Phase 8.3) — ERLEDIGT (v1.1.8)**
- Korrektur zum alten Plan: i18n war zu ~80% fertig (187 `t()`-Nutzungen,
  funktionierender Sprachumschalter), NICHT "hunderte hardcoded". Es fehlten
  nur ~40 verstreute hardcoded Strings.
- Erledigt: alle ~40 verbliebenen UI-Strings (Remis/Sieg-Overlays in
  MoveValidator/MoveExecutor/GameStateManager/TimeManager/gameController,
  ShopUI, TutorUI, OverlayManager, AchievementUI, TalentTreeUI, OpeningBookUI,
  AnalysisUI, aiController, moveController) durch `t()` ersetzt; neue Keys in
  de.json + en.json ergänzt (game.draw*, game.winner*, game.remisAgreed,
  game.drawOffered, shop.*, tutor.*, ai.*, move.*, talent.*, achievements.*,
  openingBook.*).
- Live-Update: `setLocale()` feuert jetzt ein `localechange`-Event (window);
  der Sprachumschalter in `DOMHandler` re-rendert nach dem Wechsel
  `updateStatus` + `updateMoveHistoryUI` + `updateShopUI`, sodass die Sprache
  sofort sichtbar wechselt (ohne Spiel-Neustart). Offene Panels (Overlay/Tutor)
  aktualisieren sich beim nächsten Render mit übersetzten Texten.
- Tests: `tests/schach9x9/i18n.test.ts` erweitert (localechange-Event-Test);
  betroffene Unit-Tests (move/ui/TimeManager/aiController/gameController) grün.
- `en.json` vollständig vervollständigt (alle Keys parallel zu de.json).

**P2.2 Mutation Testing (Phase 2.3)**
- Stryker.js für JS-Suche/Eval (Ziel: 70%+ Mutation Score).
- Impact: Test-Qualität validieren. Risiko: Setup-Zeit, langsame Runs.
- Nur sinnvoll, wenn P2.1/große Refactors anstehen (sonst kaum Mehrwert).

**P2.3 Opening Book Expansion (Phase 8.3) — ERLEDIGT (v1.1.7)**
- Vorher: `opening-book.json` hatte nur 2 Positionen (aus 6 Self-Play-Spielen).
  Das Buch wuchs nicht, weil die Engine bei gleicher Startstellung +
  Parametern **voll deterministisch identische Züge** spielt → reines
  Self-Play reproduziert immer dasselbe Spiel.
- Fix: `OpeningBookTrainer.ts` erweitert um `--openings` (Seed-Vielfalt): pro
  Spiel wird zufällig ein legaler weißer Eröffnungszug gewählt, danach übernimmt
  die Engine → Self-Play divergiert, das Buch wächst mit echten Eröffnungen.
  Zusätzlich cappt `recordGameResult` die History auf `openingMovesTracked`,
  sodass nur Eröffnungspositionen (nicht Mittel-/Endspiel) im Buch landen.
- Schrott-Trainer `schach9x9/opening-book-trainer-real.cjs` (Random-Startpositionen,
  keine echte Engine) gelöscht; npm-scripts `train:schach9x9` / `:fast` zeigen
  jetzt auf `OpeningBookTrainer.ts` via `tsx`. `tsx` als DevDep nachgerüstet.
- Ergebnis: `opening-book.json` hat jetzt **101 Positionen / 187 Moves** (aus
  40 Self-Play-Spielen, seeded), 93 davon frühe Eröffnungspositionen.
- Keine externe Datenquelle nötig (Self-Play mit echter Engine). Lichess-DB
  bewusst NICHT genutzt (self-contained, kein Account).
- Tests: `tests/schach9x9/utils/OpeningBookTrainer.test.ts` (Seed-Vielfalt +
  gewichtete Moves); `openingBook.test.ts` (Query/Format) weiterhin grün.
- Externe 8x8-DB (Lichess) bleibt optional; `aiController` lädt `opening-book-8x8.json`
  falls vorhanden (derzeit nicht generiert — eigener 8x8-Seed-Lauf nötig).

### P3 — Optional / Nice-to-have

- **Visual Regression** (Pixelmatch, Threshold 0.1%) — war in Phase 2.2.
- **Storybook erweitern** (mehr Components) — Phase 7.
- **ADRs** für AI-Architekturentscheidungen (post-WASM).
- **Replay/Share-Link** via URL-Parameter (statt nur Clipboard) — Phase 8.2.
- **OS-Level .pgn** (`launchQueue`/`FileSystemHandle`, Doppelklick auf .pgn) —
  einziger noch offener P1.3-Rest, klein, aber OS-API (Chromium-only).

---

## 🗺️ Empfohlene Reihenfolge (Stand 2026-07-09 — ABSCHLUSS)

1. ✅ P0.3 Dependabot-Cleanup (erledigt)
2. ✅ Eval-Graph-Test (jsdom-skip → Playwright-E2E, erledigt)
3. ✅ P1.1 AI-Perf (gemessen: nicht nötig, erledigt)
4. ✅ P1.2 PWA (SW-Bug + Offline-Test, erledigt)
5. 🔸 v1.1.5 Release-Tag (fasst AI-Fixes + E2E-Abdeckung + PWA-Cleanup zusammen)
6. P2+ bewusst zurückgestellt (siehe Begründung oben)

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
