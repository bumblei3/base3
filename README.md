# base3 — Chess Platform

> 📌 **Archiviertes Verweis-Repo (Pointer).** base3 ist kein aktives Projekt mehr,
> sondern nur noch ein Index, der auf die beiden eigenständigen Spiele-Repositories
> verlinkt. Code, Build, Tests und CI des früheren Merge-Monorepos wurden entfernt.
> Die aktive Entwicklung findet in den unten stehenden Standalone-Repos statt.

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
verändern, ohne es zu verlassen. Code, Build, Tests und CI leben in den
eigenständigen Repos — base3 ist der Türkeiler.

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

9×9 Brett mit Feenfiguren (Erzbischof, Kanzler, Engel). *(aktuell: v1.7.0)*

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

3-Spieler Hexagonales Schach mit Stein-Schere-Papier-Kampfmechanik. *(aktuell: v1.5.0)*

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

### Schach9x9 · v1.9.0 (2026-08-23)

- Engine-M1.1: Zobrist-Hash + Quiesce-Fix — ~+230 Elo Stärkegewinn
- NNUE-Pipeline (Datagen, Trainer, JS-Inference) als Fundament
- Eval-Knobs: Läuferpaar, Freibauern, LMR/NullMove/Probcut feinjustierbar
- Position teilen per Link

### Trischach · v1.5.0 (2026-08-20)

- RPS-Taktik-Puzzles
- Schlag-Vorschau + Coach-Leiste (RPS Vorteil/Nachteil vor dem Zug)
- Analyse-Modus mit PV-Linie und RPS-Erklärung
- Endspiel-Tablebases (KR vs KP, KQ vs KR)

## Historie

Dieses Repo war ursprünglich ein Monorepo, das Schach9x9 und Trischach zusammen
hielt (Build, Tests, CI, Docs). Seit **2026-07-11** (Conversion-Commit `405f403c`)
ist es ein reines Verweis-Repo. Der letzte vollständige Monorepo-Stand ist über
die [Git-History](https://github.com/bumblei3/base3/commits/main) dieses Repos
einsehbar (`git log` vor dem Conversion-Commit).
