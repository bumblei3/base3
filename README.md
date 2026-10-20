# base3 — Chess Platform

> 📌 **Verweis-Repo (Pointer).** base3 ist die aktive Landing Page für zwei
> eigenständige Spiele. Der Code des früheren Merge-Monorepos ist entfernt.
> Tests und CI hier gelten für die Seite. Die Spiele leben in den Standalone-Repos.

🌐 **Live:** [bumblei3.github.io/base3](https://bumblei3.github.io/base3/)

---

## Was ist base3?

base3 ist eine statische Landing Page, die als Eintrittspunkt für zwei eigenständige
Schach-Varianten dient — zwei Experimente an der Grenze dessen, was ein Schachspiel
sein kann, ohne sich in einen Multiplayer-Komplex zu verrenken.

Die eine Seite ist **Schach9x9**: ein 9×9-Brett mit drei zusätzlichen Figuren
(Erzbischof, Kanzler, Engel), die das klassische Schach-Puzzle erweitern, ohne
das Fundament zu zerstören. Fünf KI-Persönlichkeiten, ein Engine-Analyse-Modus und
ein Eröffnungs-Trainer machen es zu einem Standalone-Schach-Erlebnis mit Tiefe.

Die andere ist **Trischach**: 3-Spieler-Hex-Schach mit Stein-Schere-Papier-Kampfmechanik.
Drei Fraktionen (Feuer, Natur, Wasser) stehen in einem zyklischen Kampf — nicht nur
Schach, sondern Schach in einem Ringkampf, in dem die Beziehung zwischen den Fraktionen
genauso wichtig ist wie der Brettaufbau.

Die Plattform existiert, weil beides zwei Seiten derselben Neugier ist: Schach
verändern, ohne es zu verlassen. Code, Build und CI der Spiele leben in den
eigenständigen Repos. base3 ist der Türkeiler: die Landing Page mit eigenen
Tests und vier Workflows.

---

## Feenfiguren im Detail

Schach9x9 ergänzt das klassische 8×8-Schachbrett um drei zusätzliche Figuren.
Die drei "Feenfiguren" sind:

- **Erzbischof** — kombiniert Läufer- und Springerzug in einer Figur.
  Stärker als ein normaler Springer oder Läufer, aber teuer in der Entwicklung.
- **Kanzler** — bewegt sich wie ein Turm, kann aber zusätzlich einen Springer-Zug
  ausführen. Vereint Turm-Kraft mit der Flexibilität eines Springers.
- **Engel** — eine Defensivfigur, die schützende Züge ermöglicht und tief in die
  eigenen Linien zurückkehren kann. Weniger aggressiv, aber sehr pflegend.

Die Feenfiguren verändern das Spiel dadurch, dass die Eröffnung und die Bündnis-Theorie
neue Muster bekommen, ohne dass das klassische Schach-Grundverständnis über Bord geht.
Wer normales Schach kennt, findet sofort rein, aber die Tiefe kommt von den neuen Figuren.

---

## Spiele

Zwei einzigartige Schachvarianten — vom klassischen 9×9 Brett mit Feenfiguren
bis zum strategischen 3-Spieler-Hex-Schach.

### ♟️ Schach9x9

9×9 Brett mit Feenfiguren (Erzbischof, Kanzler, Engel). *(aktuell: v2.0.0)*

- 9×9 Brett mit Feenfiguren (Erzbischof, Kanzler, Engel)
- 5 KI-Persönlichkeiten + adaptives Zeitmanagement
- Engine-Analyse-Modus & Zug-Qualitäts-Indikatoren
- Variantenbaum nach Solo-Partien (Top-Züge + Fortsetzung)
- Eröffnungs-Trainer
- Kampagnen-Modus & Talentbaum (XP)
- 3D-Schlachtmodus (Three.js, Skins)
- PWA & Mobile Ready (Touch, Offline)

➡️ **[Live-Demo](https://bumblei3.github.io/schach9x9/)** ·
**[Repository](https://github.com/bumblei3/schach9x9)**

### ⬡ Trischach

3-Spieler Hexagonales Schach mit Stein-Schere-Papier-Kampfmechanik. *(aktuell: v1.6.0)*

- 3 Fraktionen (Feuer 🔥 / Natur 🌿 / Wasser 🌊)
- RPS Kampfmechanik (Feuer > Natur > Wasser > Feuer)
- Engine: Alpha-Beta, 4 Persönlichkeiten, Pondering
- Auto-Battle Turniere mit Elo-Rating
- Replay-System (TSPN) & Opening Book
- PWA & Mobile (Swipe-to-Rotate, Touch)

➡️ **[Live-Demo](https://bumblei3.github.io/trischach/)** ·
**[Repository](https://github.com/bumblei3/trischach)**

---

## Was ist neu

### Schach9x9 · v2.0.0 (2026-08-23)

- Kapitel 7–12: Erzbischof-Gabel, Kanzler-Spieß, Engel vs Dame, Nachtreiter-Linien, Feenrat, Imperator-Finale
- 8 handgemachte Puzzles, jede Lösung engine-verifiziert Matt in 1
- Perk „Taktik-Genie" wirksam (Tipps in Kampagnen nur mit Perk)
- Ein Talent pro Feenfigur mit echtem Effekt (+Gold/+XP)

### Trischach · v1.6.0 (2026-08-24)

- Deterministisches Tagespuzzle: FNV-1a-Auswahl pro Datum aus dem 155-Puzzle-Pool — jeder Spieler bekommt dasselbe Puzzle.
- Statistik-Dashboard: Partien-/Puzzle-Statistik lokal, plus 💬 Feedback-Button mit GitHub-Issue-Template.
- Test-Suite 800 → 838 Tests: invariant-first Härtung von board/analysis/ai-core/pwa/rps-puzzle/tutorial/opening-book/game-stats.

## CI & Tests

base3 hat vier Workflows (`.github/workflows/`) — GitHub listet zusätzlich
`Dependabot Updates` als fünften, dafür gibt es hier aber keine Datei:

| Workflow | Zweck | Trigger |
|---|---|---|
| `pages.yml` | Deploy der Staged-Liste (`index.html`, `assets/`, `og-image.png` **+** `og-image.webp`, Icons + Favicons, `manifest.webmanifest`, `robots.txt`, `sitemap.xml`); danach Job `Verify live deployment` | push auf `main` |
| `sync-versions.yml` | Heiler: Pills/JSON-LD/FAQ/README + „Was ist neu"-Bullets + `sitemap.xml`-lastmod + FAQPage-Schema | täglich 02:00 UTC + manuell |
| `check-sync.yml` | Wächter: failt, wenn committede Pills, Bullets oder `lastmod` veraltet sind oder das FAQPage-Schema von der FAQ-Sektion abweicht | push, täglich 01:55 UTC + manuell |
| `check-links.yml` | Wächter: alle ausgehenden Links aus den drei Dateien erreichbar? | push, montags 03:00 UTC + manuell |

Die Bullets kommen aus den Release-Notes des jeweils neuesten Releases
(GitHub Releases API) — im `--api-mode`. Zu lange Zeilen werden gekürzt
(erst Klammerdetails, dann der abschließende Satz, erst dann hart am Wortrand).
Ohne `--api-mode` bleibt die „Was ist neu"-Sektion unangetastet
(`--no-whats-new` schaltet sie grundsätzlich ab).

Das `FAQPage`-JSON-LD (`scripts/sync-faq-schema.py`) wird **aus der sichtbaren
FAQ-Sektion abgeleitet**, nicht parallel gepflegt: sonst driftet es bei der
ersten geänderten Antwort auseinander — und die Antwort „Welche Versionen sind
aktuell?" schreibt `sync-versions.py` bei jedem Sub-Release neu. Der Heiler
läuft deshalb in der Reihenfolge Versions-Sync → FAQ-Schema, und
`check-sync.yml` prüft beide fixed points (`--check`, schreibt nichts).

`check-sync.yml` läuft **bevor** `sync-versions.yml`: ein roter Run heißt, dass
`sync-versions.py` das Drift-Problem nicht automatisch heilen konnte
(API-Rate-Limit, fehlende Rechte) und die Seite veraltete Zahlen zeigt.
`check-links.yml` wertet 403/429/503 als „nicht beurteilbar" und ignoriert
`<link rel="preconnect">` (ein 404 dort ist normal).

`pages.yml` prüft sich nach dem Deploy selbst nach: der Job
`Verify live deployment` lädt jede ausgelieferte Datei erneut von der
Pages-URL und vergleicht sie per SHA-256 mit der Repo-Datei
(`scripts/check-deployed.py`, mit Retries für die CDN-Propagation). Nötig,
weil ein grüner Deploy-Run nur beweist, dass *ein* Artefakt hochgeladen wurde,
nicht dass die Seite vollständig ist — genau das passierte, als drei in
`index.html` referenzierte Dateien in der Staged-Liste fehlten und live 404
lieferten, während jeder Job grün war.

Tests (kein Netz nötig, Fixtures unter `tests/fixtures/`):

```bash
python3 -m pip install pytest
python3 -m pytest          # Sync, Sitemap, Validator, Deploy-Liste, FAQ-Schema, Live-Ableitung
python3 scripts/validate_landing_page.py   # Tag-Balance, JSON-LD, Link-Inventar
python3 scripts/check-deployed.py          # Live-Seite == Repo? (braucht Netz)
python3 scripts/sync-faq-schema.py --check # FAQPage-JSON-LD == FAQ-Sektion?
```

Die Patch-Funktionen arbeiten auf Dateikopien in `tmp_path`; nur die
Versions-/Datumsquellen werden monkeypatcht.

## Historie

Dieses Repo war ursprünglich ein Monorepo, das Schach9x9 und Trischach zusammen
hielt (Build, Tests, CI, Docs). Seit **2026-07-11** (Conversion-Commit `405f403c`)
ist es ein reines Verweis-Repo. Der letzte vollständige Monorepo-Stand ist über
die [Git-History](https://github.com/bumblei3/base3/commits/main) dieses Repos
einsehbar (`git log` vor dem Conversion-Commit).
