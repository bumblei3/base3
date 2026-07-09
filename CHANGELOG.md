# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden in dieser Datei dokumentiert.
Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/),
und das Projekt folgt [Semantic Versioning](https://semver.org/).

## [1.1.5] - 2026-07-09

### Hinzugefügt
- **PWA Offline-E2E-Test** (`e2e/schach9x9/pwa.spec.ts`): verifiziert, dass die App
  nach Service-Worker-Precache offline (mit `context.setOffline`) noch lädt
  (Index + Entry-Script cached). "Offline-spielbar" (AAA-PWA) abgedeckt.
- **8x8 critical-journey E2E-Tests** (`e2e/standard8x8.spec.ts`): echter Zug + KI-Antwort
  sowie 8x8-Bauern-Promotion (nur Standard-Pieces, kein 9x9-Engel).

### Behoben
- **Service Worker Bug** (`public/service-worker.js`): tote/fehlerhafte Origin-Check-Zeile
  (`!url.origin === self.location.origin`, String-Negation) entfernt.
- **Eval-Graph-Test** (`e2e/eval-graph.spec.ts`): jsdom-Skip durch echten Browser-Test
  ersetzt (Analysis-Modus → SVG-Punkt-Klick → `jumpToMove`). Realer Code-Pfad statt Skip.

### Dokumentation
- **FUTURE_PLAN.md** auf Stand v1.1.5: Sentry (P0.1) gestrichen (kein sentry.io-Account),
  P0.2/P1.3 als erledigt markiert, P1.1 gemessen (JS-Suche <0.2s, kein Refactor nötig),
  P1.2 als weitgehend erledigt markiert. P2 bewusst zurückgestellt (extern-abhängig /
  risikoreicher Refactor ohne unmittelbaren Solo-User-Value).

## [1.1.4] - 2026-07-08

### Hinzugefügt
- **PGN SAN-Replay** (Schach9x9, `PGNImportReplay.ts`): reines SAN-Replay eines
  importierten PGNs über einen echten `RulesEngine`-Adapter (kein Mock mehr).
  `App.importPGN` spielt eine PGN-Zugliste vollständig auf dem Schachbrett nach,
  inkl. Bauern-Promotion und langen Partien. Vervollständigt das P1.3-PGN-Import-
  Feature (zuvor nur FEN-Header-Setup).

### Behoben
- **MoveGenerator Doppelschritt** (Schach9x9, `ai/MoveGenerator.ts`): `isStart`-
  Prüfung nutzte hardcoded Rows 6/2 (8x8-Layout), aber 9x9-classic platziert weiße
  Bauern auf Row 7, schwarze auf Row 1. Betraf KI-Zuggenerierung, Puzzle-Generator,
  Analyse und Taktik — diese pflegten vorher für **keine** Farbe Bauern-Doppelschritte
  zu erzeugen. Jetzt board-größenabhängig (`white = size-2`, `black = 1`).
- **Pause-Routing** (Schach9x9): `p`-Taste läuft jetzt über `KeyboardManager`
  (Single Source of Truth) statt über einen separaten Listener.

## [1.1.3] - 2026-07-08

### Hinzugefügt
- **P1.3 File Handling / Game Persistence** (Schach9x9):
  - **PGN-Import-Parser** (`parsePGN` in `utils/PGNImportParser.ts`): parst PGN-Header +
    SAN-Zugliste (tolerant gegenüber Kommentaren/Variationen/NAG). Wird für
    Round-Trip + FEN-Setup genutzt.
  - **Game-State-Serialization** (`utils/persistence.ts`): `gameToSaveData` /
    `saveDataToGame` (FEN-Round-Trip über `BoardFactory.fromFEN`) — ergänzt das
    bestehende Save/Load-System (`storage.ts` / `#save-btn` / `#load-btn`).
  - **FEN-Load** (`loadFENIntoGame` + `App.importFEN`): Stellung aus FEN im
    Settings-Panel laden (`#import-fen-btn`).
  - **PGN-Export** (`App.exportPGN`): aktuelles Spiel als `.pgn`-Datei herunterladen
    (`#export-pgn-btn`).
  - **PGN-Import** (`App.importPGN`): PGN mit `[FEN "..."]`-Header lädt die Stellung;
    reiner SAN-Replay (ohne FEN) ist Folge-Feature (kein SAN→Move-Validator in P1.3).
  - i18n-Keys `file.*` (de/en) für Settings-Panel-Labels + Toasts.
  - E2E-Spec `e2e/file-io.spec.ts` (FEN-Load + PGN-Export Smoke).

### Hinweis
- Save/Load (localStorage) war bereits vor P1.3 implementiert (`storage.ts`);
  P1.3 ergänzt FEN/PGN-Import/Export.
- `PGNParser.ts` (original `class PGNParser`) wurde wiederhergestellt; der neue
  `parsePGN`-Helper liegt in `PGNImportParser.ts` (Vermeidung von Barrel-Namensclash).

## [1.1.2] - 2026-07-08

### Hinzugefügt
- **Pause-Feature** (`P`-Taste): öffnet/schließt ein Pause-Overlay (wie das
  Help-Overlay). `Esc` oder "Fortsetzen"-Button schließen es. Ergänzt die
  Keyboard-Shortcuts aus v1.1.0 (Phase 8.2 vollständig).
- `P`-Eintrag in der Help-Overlay-Shortcut-Liste.
- E2E-Test `e2e/pause.spec.ts` (4 Tests: öffnen, togglen, Escape, Resume-Button).

### Hinweis
- Pause blockt nur die Eingabe, während das Overlay offen ist; der Spielzustand
  (inkl. AI-Timer) ist davon unberührt. Ein echtes "Einfrieren" der AI ist ein
  separater, größerer Eingriff (siehe FUTURE_PLAN P1.1).

## [1.1.1] - 2026-07-08

### Entfernt
- **WASM-Engine komplett entfernt (radikal-clean)**: `engine-wasm/`-Verzeichnis
  (Rust, 21 Dateien) und `js/schach9x9/ai/wasmBridge.ts` gelöscht. Die WASM-Suche
  crashte im Browser mit `RuntimeError: memory access out of bounds` (nicht in Node
  reproduzierbar, browser-spezifisches UB). Die JS-Suche ist nun die **alleinige**
  Engine.
- `wasm:build`-Script + `wasm-pack`-DevDependency aus `package.json` (root + schach9x9).
- Alle WASM-Build/Cache-Schritte aus `ci.yml` (rust-toolchain, cargo caches,
  Build-WASM-Step) — CI baut kein WASM mehr.
- `@engine-wasm`-Aliase aus `vite.config.ts` + `vitest.ci.config.ts`.
- `engine-wasm`-Excludes aus allen tsconfigs.
- Obsolete WASM-Mock-Tests (`aiEngine_fallback.test.ts`, `ai/slow/wasmBridge*.test.ts`)
  und WASM-spezifische Test-Cases in `aiEngine.coverage.test.ts`.

### Behoben
- `aiEngine.ts`: toter WASM-Pfad (`getBestMoveWasm`-Aufrufe in `getBestMove` +
  `getTopMoves`) entfernt; JS-Suche läuft direkt ohne Try/Catch-Detour.
- `getNodesEvaluated()` / `resetNodesEvaluated()` wrappen nun keine WASM-Zähler
  mehr (returns 0 / no-op).

## [1.1.0] - 2026-07-08

### Hinzugefügt
- **Keyboard-Shortcuts-Help-Overlay**: `?`-Taste öffnet eine Übersicht aller
  Tastenkürzel (Undo, Redo, Hint, Threats, Opportunities, Best Move, Save/Share,
  Fullscreen, Emergency Recovery). Erreichbar ab dem Hauptmenü – funktioniert auch
  vor Spielstart, da die Listener in `App.initDOM()` global registriert werden.
- **Share / Clipboard-API** (`js/schach9x9/utils/share.ts`):
  - `gameToFEN()` serialisiert die aktuelle Stellung in ein 9x9-kompatibles FEN
    (Round-Trip mit `parseFEN` / `BoardFactory.fromFEN` verifiziert).
  - `shareCurrentGame()` kopiert FEN + PGN in die Zwischenablage
    (`navigator.clipboard.writeText`) mit `navigator.share`-Fallback für Mobile.
  - Neuer **Share-Button** (`#share-btn`) in der Action-Bar.
- Neue Tests: Unit (`tests/schach9x9/share.test.ts`, 9 Cases) und E2E
  (`e2e/help.spec.ts`, `e2e/share.spec.ts`).

### Behoben
- **Tutor zeigte keine Hinweise**: `aiWorker.ts` übergab die Farbe als Zahl
  (16/32) an `getTopMoves`, das einen String (`'white'`/`'black'`) erwartet.
  Engine suchte immer für Schwarz → alle weißen Züge im HintGenerator-Filter
  aussortiert → Overlay kam nie. Fix: Zahl→String-Konvertierung im Worker.
- **`standard8x8.spec.ts` self-skipped**: Test navigierte auf `/` (Landing) statt
  auf die Schach9x9-App → fand die 8x8-Karte nie und übersprang sich selbst,
  wodurch ein echter Feature-Test deaktiviert war. Fix: URL auf `/?disable-sw`.
- **E2E-Stabilität**: `startClassicGame`-Helper mit Force-Click + Warten auf
  `#board` (Retry) behebt das Classic-Karten-Klick-Race im Menü.
- **Help-Overlay Close-Button**: Handler war an die Existenz eines `help-btn`
  gekoppelt (der nie im DOM war) → Close-Button tat nichts. Jetzt unabhängig.
- **WASM-Engine entfernt**: Die WASM-Suche crashte im Browser mit
  `RuntimeError: memory access out of bounds` (nicht in Node reproduzierbar,
  browser-spezifisches UB). App nutzt nun dauerhaft die JS-Fallback-Engine.
  Tote WASM-Copy-Schritte aus den Build-Scripts entfernt.

### Entfernt
- WASM-Engine (`engine-wasm/`-Code bleibt als inaktiver Dead-Code erhalten,
  damit sie später reaktiviert werden kann; `ci.yml` `wasm:build` unangetastet).

## [1.0.0] - 2026-06-29

### Initial Release
- Schach9x9 (9x9-Schach mit Angel/Archbishop/Chancellor/Nightrider) + Trischach
  (3-Spieler hexagonal) in einem Monorepo.
- KI-Suche (JS-Engine + optional WASM), Tutor, Analysis, Campaign, Puzzle, Setup.
- PWA, Service Worker, A11y (AXE), CSP, Security-Hardening.
- Vollständige Test-Pipeline: Vitest Unit (2299), Playwright E2E, Storybook,
  TypeDoc, Lighthouse-Perf-Budget.

[1.1.0]: https://github.com/bumblei3/base3/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/bumblei3/base3/releases/tag/v1.0.0
