# base3 — Chess Platform

> 📌 **Archiviertes Verweis-Repo (Pointer).** base3 ist kein aktives Projekt mehr,
> sondern nur noch ein Index, der auf die beiden eigenständigen Spiele-Repositories
> verlinkt. Code, Build, Tests und CI des früheren Merge-Monorepos wurden entfernt.
> Die aktive Entwicklung findet in den unten stehenden Standalone-Repos statt.

🌐 **Live:** [bumblei3.github.io/base3](https://bumblei3.github.io/base3/)

---

## Spiele

Zwei einzigartige Schachvarianten — vom klassischen 9×9 Brett mit Feenfiguren
bis zum strategischen 3-Spieler-Hex-Schach.

### ♟️ Schach9x9

9×9 Brett mit Feenfiguren (Erzbischof, Kanzler, Engel). *(aktuell: v1.2.0)*

- 9×9 Brett mit Feenfiguren (Erzbischof, Kanzler, Engel)
- 5 KI-Persönlichkeiten + adaptives Zeitmanagement
- Engine-Analyse-Modus & Zug-Qualitäts-Indikatoren
- Eröffnungs-Trainer
- Kampagnen-Modus & Talentbaum (XP)
- 3D-Schlachtmodus (Three.js, Skins)
- PWA & Mobile Ready (Touch, Offline)

➡️ **[Live-Demo](https://bumblei3.github.io/schach9x9/)** ·
**[Repository](https://github.com/bumblei3/schach9x9)**

### ⬡ Trischach

3-Spieler Hexagonales Schach mit Stein-Schere-Papier-Kampfmechanik. *(aktuell: v1.3.1)*

- 3 Fraktionen (Feuer 🔥 / Natur 🌿 / Wasser 🌊)
- RPS Kampfmechanik (Feuer > Natur > Wasser > Feuer)
- Engine: Alpha-Beta, 4 Persönlichkeiten, Pondering
- Auto-Battle Turniere mit Elo-Rating
- Replay-System (TSPN) & Opening Book
- PWA & Mobile (Swipe-to-Rotate, Touch)

➡️ **[Live-Demo](https://bumblei3.github.io/trischach/)** ·
**[Repository](https://github.com/bumblei3/trischach)**

---

## Historie

Dieses Repo war ursprünglich ein Monorepo, das Schach9x9 und Trischach zusammen
hielt (Build, Tests, CI, Docs). Seit **2026-07-11** (Conversion-Commit `405f403c`)
ist es ein reines Verweis-Repo. Der letzte vollständige Monorepo-Stand ist über
die [Git-History](https://github.com/bumblei3/base3/commits/main) dieses Repos
einsehbar (`git log` vor dem Conversion-Commit).
