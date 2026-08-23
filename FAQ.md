# FAQ — base3 Chess Platform

> **base3 ist die zentrale Landing Page für zwei Schach-Varianten:**
> Schach9x9 (9×9 Brett mit Feenfiguren) und Trischach (3-Spieler Hex-Schach).
> Die Seite verwaltet keine eigene Software mehr — sie verweist auf die beiden
> eigenständigen Spiele-Repos und deren Live-Demos.

## Was ist base3?

base3 ist eine statische Landing Page (GitHub Pages, `bumblei3.github.io/base3`), die als
Eintrittspunkt für zwei eigenständige Schach-Spiele dient:

- **Schach9x9** — 9×9 Brett mit Feenfiguren (Erzbischof, Kanzler, Engel)
- **Trischach** — 3-Spieler Hex-Schach mit Stein-Schere-Papier-Kampfmechanik

base3 verwaltet **keine** eigene Spiele-Software mehr — sie ist ein Verweis-Repo,
das auf die beiden aktiven Repos zeigt.

## Wo kann ich spielen?

Beide Spiele sind als PWA (Progressive Web App) im Browser spielbar.
Die Live-Demos brauchen keine Installation.

- **Schach9x9 Demo:** https://bumblei3.github.io/schach9x9/
- **Trischach Demo:** https://bumblei3.github.io/trischach/

## Wo ist der Quellcode?

Der Quellcode zu den Spielen ist in den eigenständigen Repos:

- **Schach9x9:** https://github.com/bumblei3/schach9x9
- **Trischach:** https://github.com/bumblei3/trischach

base3 selbst (das Verweis-Repo) ist auf https://github.com/bumblei3/base3 —
der Code hier ist ausschließlich die Landing Page (HTML/CSS).

## Welche Versionen sind aktuell?

Die aktuellen Versionen sind:

- **Schach9x9:** v1.9.0 (2026-08-23)
- **Trischach:** v1.5.0 (2026-08-20)

Die Version-Pills, JSON-LD und README-Angaben lassen sich mit
`python3 scripts/sync-versions.py` aus den Nachbar-Repos ziehen.
Die Texte unter „Was ist neu“ kommen weiterhin per Hand aus den Changelogs.

## Was gibt es Neues?

Die Landing Page zeigt in der „Was ist neu“-Sektion die wichtigsten Änderungen
der aktuellen Versionen.

**Schach9x9 (v1.9.0):**
- Engine-M1.1: Zobrist-Hash + Quiesce-Fix — ~+230 Elo Stärkegewinn
- NNUE-Pipeline (Datagen, Trainer, JS-Inference) als Fundament
- Eval-Knobs: Läuferpaar, Freibauern, LMR/NullMove/Probcut feinjustierbar
- Position teilen per Link

**Trischach (v1.5.0):**
- RPS-Taktik-Puzzles
- Schlag-Vorschau + Coach-Leiste (RPS Vorteil/Nachteil vor dem Zug)
- Analyse-Modus mit PV-Linie und RPS-Erklärung
- Endspiel-Tablebases (KR vs KP, KQ vs KR)

## Ist base3 noch aktiv?

base3 als Landing Page ist **aktiv** — sie wird gepflegt, wenn die Subprojekte
Releases haben (Version-Pills, „Was ist neu“). Die eigentliche Entwicklung
findet jedoch in den eigenständigen Repos statt (`schach9x9`, `trischach`).

base3 selbst hat keine eigene Funktionalität mehr — sie ist ein Index.

## Wie spiele ich Schach9x9?

Schach9x9 läuft im Browser — keine Installation nötig. Live-Demo:
https://bumblei3.github.io/schach9x9/

- **Regeln:** 9×9 Brett mit den drei Feenfiguren (siehe unten). Zusätzlich gibt
  es einen 8×8-Modus mit klassischen Standardregeln.
- **Starten:** Klassisches Spiel, Kampagnen-Modus oder Eröffnungs-Trainer.
- **KI-Gegner:** Fünf Persönlichkeiten, jede mit eigener Stärke und Spielweise.
- **Offline:** Nach dem ersten Laden lässt sich die PWA installieren und offline
  spielen.

## Was sind Feenfiguren?

Schach9x9 ergänzt das klassische 8×8-Schachbrett um drei neue Figuren auf einem
9×9-Brett. Die drei Feenfiguren heißen:

- **Erzbischof** — kombiniert die Bewegungen von Läufer und Springer in einer Figur.
  Stärker als ein normaler Springer oder Läufer allein, aber teurer in der Entwicklung.
- **Kanzler** — bewegt sich wie ein Turm, kann aber zusätzlich einen Springer-Zug
  ausführen. Vereint Turm-Kraft mit der Flexibilität eines Springers.
- **Engel** — eine Defensivfigur, die schützende Züge ermöglicht und tief in die
  eigenen Linien zurückkehren kann. Weniger aggressiv, aber sehr pflegend.

Die Feenfiguren verändern Eröffnung und Taktik, ohne das klassische
Schach-Grundverständnis über Bord zu werfen. Wer normales Schach kennt, findet
sofort rein; die Tiefe kommt von den neuen Figuren.

## Wie verändert sich das Spiel durch 9×9?

Ein 9×9-Brett gibt mehr Raum, mehr Figuren und mehr Bewegungsfreiheit. Das führt zu:

- **Längere Partien** mit mehr Entwicklungsmöglichkeiten.
- **Andere Eröffnungen** — bekannte 8×8-Eröffnungen lassen sich nicht 1:1 übernehmen.
- **Neue Figurenwerte** — der Engel ist wertvoll für das eigene Gefüge, der
  Erzbischof für den Angriff.
- **KI-Persönlichkeiten** — nicht nur stärker/schwächer, sondern unterschiedliche
  Gewichtungen in der Strategie.

## Wie funktioniert Trischach?

Trischach ist 3-Spieler-Schach auf einem sechseckigen Brett. Drei Fraktionen —
Feuer 🔥, Natur 🌿, Wasser 🌊 — stehen in einem zyklischen Kampf:

- **Feuer > Natur** (Feuer verzehrt Natur)
- **Natur > Wasser** (Natur absorbiert Wasser)
- **Wasser > Feuer** (Wasser löscht Feuer)

Jede Fraktion ist stark gegen eine andere und schwach gegen die dritte.
Das Spiel ist eine permanente Neu-Berechnung von Allianzen und Risiken —
nicht nur „wer schlägt wen“, sondern „wer steht wie zueinander“.

### Spielerisches Erlebnis

- **Drei auf dem Brett** gleichzeitig — jeder Spieler kontrolliert eine Fraktion.
- **RPS-Kampf** entscheidet Kampfausgänge zwischen gegnerischen Figuren.
- **Strategie:** Gegner über ihre RPS-Schwäche angreifen, ohne den Dritten zum
  Kingmaker zu machen.
- **KI:** Engine Alpha-Beta mit vier Persönlichkeiten und Pondering.

### Für wen ist Trischach?

- Spieler, die klassisches Schach kennen, aber nach etwas anderem suchen.
- Leute, die 3-Spieler-Mentalität ausprobieren wollen.
- Neue Spieler: Tutorial-Modus führt ein.

## Gibt es einen Blog, Roadmap oder Newsletter?

Nein — base3 ist eine statische Landing Page ohne Blog oder Newsletter.
Änderungen und Releases werden ausschließlich über die jeweiligen GitHub-Repos
(`schach9x9`, `trischach`) kommuniziert (Changelog, Releases).

## Wie kann ich beitragen?

Beiträge sind über die eigenständigen Repos möglich:

- **Schach9x9:** https://github.com/bumblei3/schach9x9 (Issues, Pull Requests)
- **Trischach:** https://github.com/bumblei3/trischach (Issues, Pull Requests)

- base3 selbst (das Verweis-Repo) benötigt keine Beiträge — außer bei
  Landing-Page-Aktualisierungen (Version-Pills, neue Releases).
  Eine Anleitung steht in [RELEASE.md](RELEASE.md).

## Ist base3 offline-fähig?

base3 selbst ist eine statische GitHub-Pages-Seite — sie ist nicht als PWA
konzipiert und braucht eine Internetverbindung. Die **Spiel-Demos** (Schach9x9,
Trischach) sind nach dem ersten Laden als PWA offline-fähig.

## Siehe auch

- [Schach9x9 Live-Demo](https://bumblei3.github.io/schach9x9/)
- [Trischach Live-Demo](https://bumblei3.github.io/trischach/)
- [GitHub — base3](https://github.com/bumblei3/base3)
- [GitHub — Schach9x9](https://github.com/bumblei3/schach9x9)
- [GitHub — Trischach](https://github.com/bumblei3/trischach)
