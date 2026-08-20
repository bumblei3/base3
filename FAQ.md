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

Beide Spiele sind als PWA (Progressive Web App) in den Browser integriert.
Die Live-Demos können direkt im Browser gespielt werden — keine Installation nötig.

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

- **Schach9x9:** v1.6.2 (2026-07-20)
- **Trischach:** v1.4.0 (2026-07-16)

Die Versionen sind auf der Landing Page in den Version-Pills sichtbar und werden
manuell bei Bedarf aktualisiert. Einen automatisierten Version-Sync gibt es nicht —
für gelegentliche Releases ist das manuelle Pflegen ausreichend.

## Was gibt es Neues?

Die Landig Page zeigt in der "Was ist neu"-Sektion die wichtigsten Änderungen
der aktuellen Versionen.

**Schach9x9 (v1.6.2):**
- Interaktiver Post-Game-Replay-Overlay — Partie nach dem Ende Schritt für Schritt wiederbespielbar
- Opening Book erweitert auf 2604 eindeutige Positionen (v1.6.1)
- Reproduzierbare Illegal-Move-Tests versionisiert für Debugging
- Security: js-yaml auf 5.3.0 gesperrt (CVE-2026-59870)

**Trischach (v1.4.0):**
- NNUE v2 mit Elo-Pipeline und Parallel Search
- Tutorial-Modus für neue Spieler
- Replay-Analyse: Partie wiederholbar mit Zug-Kommentaren
- WTFPL-Lizenz hinzugefügt

## Ist base3 noch aktiv?

base3 als Landing Page ist **aktiv** — sie wird gepflegt, wenn die Subprojekte
リリースs haben (Version-Pills, "Was ist neu"). Die eigentliche Entwicklung
findet jedoch in den eigenständigen Repos statt (`schach9x9`, `trischach`).

base3 selbst hat keine eigene Funktionalität mehr — sie ist ein Index.

## Gibt es einen Blog, Roadmap oder Newsletter?

Nein — base3 ist eine statische Landing Page ohne Blog oder Newsletter.
Änderungen und Releases werden ausschließlich über die jeweiligen GitHub-Repos
(`schach9x9`, `trischach`) kommuniziert (Changelog, Releases).

## Wie kann ich beitragen?

Beiträge sind über die eigenständigen Repos möglich:

- **Schach9x9:** https://github.com/bumblei3/schach9x9 (Issues, Pull Requests)
- **Trischach:** https://github.com/bumblei3/trischach (Issues, Pull Requests)

base3 selbst (das Verweis-Repo) benötigt keine Beiträge — außer bei Landing-Page-
Aktualisierungen (Version-Pills, neue Releases).

## Ist base3 offline-fähig?

base3 selbst ist eine statische GitHub Pages Seite — sie ist nicht als PWA konzipiert
und erfordert eine Internetverbindung für den Zugriff. Die **Spiel-Demos** (Schach9x9,
Trischach) hingegen sind als PWA offline-fähig (nach erstem Laden).

## Siehe auch

- [Schach9x9 Live-Demo](https://bumblei3.github.io/schach9x9/)
- [Trischach Live-Demo](https://bumblei3.github.io/trischach/)
- [GitHub — base3](https://github.com/bumblei3/base3)
- [GitHub — Schach9x9](https://github.com/bumblei3/schach9x9)
- [GitHub — Trischach](https://github.com/bumblei3/trischach)
