## Highlights

- **Deterministisches Tagespuzzle** (#140): FNV-1a-Auswahl pro Datum aus dem 155-Puzzle-Pool — jeder Spieler bekommt dasselbe Puzzle. Leicht am Wochenende, medium unter der Woche.
- **Statistik-Dashboard** (#141): Partien-/Puzzle-Statistik lokal (Siege pro Fraktion, Lösequote, Daily-Streak), plus 💬 Feedback-Button mit GitHub-Issue-Template.
- **Test-Suite 800 → 838 Tests** (#142–144): invariant-first Härtung von board/analysis/ai-core/pwa/rps-puzzle/tutorial/opening-book/game-stats. Branch-Coverage 82.9% → 84.5%.

Voller Changelog: https://github.com/bumblei3/trischach/blob/main/CHANGELOG.md

**Compare:** v1.5.0...v1.6.0

## What's Changed
* test: letzte schwache null-or-shape-Assertions härten by @bumblei3 in https://github.com/bumblei3/trischach/pull/131
* chore(deps-dev): bump vite from 8.2.1 to 8.2.2 by @dependabot[bot] in https://github.com/bumblei3/trischach/pull/133
* chore(deps): bump rollup from 4.62.3 to 4.62.5 by @dependabot[bot] in https://github.com/bumblei3/trischach/pull/134
* chore(deps-dev): bump prettier from 3.9.5 to 3.9.6 by @dependabot[bot] in https://github.com/bumblei3/trischach/pull/135
* chore(deps-dev): bump terser from 5.49.0 to 5.50.0 by @dependabot[bot] in https://github.com/bumblei3/trischach/pull/136
* chore(deps-dev): bump happy-dom from 20.11.1 to 20.11.6 by @dependabot[bot] in https://github.com/bumblei3/trischach/pull/137
* chore(deps): bump esbuild from 0.28.1 to 0.28.2 by @dependabot[bot] in https://github.com/bumblei3/trischach/pull/138
* chore(deps-dev): bump tsx from 4.23.1 to 4.23.12 by @dependabot[bot] in https://github.com/bumblei3/trischach/pull/139
* feat(puzzles): deterministisches Tagespuzzle + Wochentags-Schwierigkeit by @bumblei3 in https://github.com/bumblei3/trischach/pull/140
* feat(stats): Statistik-Dashboard + Feedback-Kanal by @bumblei3 in https://github.com/bumblei3/trischach/pull/141
* test: Härtung board/analysis/ai-core (+21 Invariant-Tests) by @bumblei3 in https://github.com/bumblei3/trischach/pull/142
* test: Härtung pwa/rps-puzzle/tutorial (+9 Invariant-Tests) by @bumblei3 in https://github.com/bumblei3/trischach/pull/143
* test: Härtung opening-book/game-stats (+8 Tests, happy-dom setItem-Stub-Gotcha) by @bumblei3 in https://github.com/bumblei3/trischach/pull/144
* chore: release v1.6.0 by @bumblei3 in https://github.com/bumblei3/trischach/pull/145


**Full Changelog**: https://github.com/bumblei3/trischach/compare/v1.5.0...v1.6.0