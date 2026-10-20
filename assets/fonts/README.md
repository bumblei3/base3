# Schriften (lokal gehostet)

Diese Dateien liegen absichtlich im Repo: die Seite lädt ihre Schriften nicht
mehr von `fonts.googleapis.com`. Das entfernt einen Cross-Origin-Request vor
dem ersten Paint und verhindert, dass die IP-Adresse jedes Besuchers an Google
geht (LG München 2022; Standardlösung ist Self-Hosting).

| Datei | Familie | Gewichtsbereich | Subset | Größe |
|---|---|---|---|---|
| `outfit-latin.woff2` | Outfit | 300–800 (Variable Font) | latin | 31,5 KB |
| `jetbrains-mono-latin.woff2` | JetBrains Mono | 400–600 (Variable Font) | latin | 30,7 KB |

Beide sind Variable Fonts: eine Datei deckt den ganzen Gewichtsbereich ab.
Deshalb **nicht** pro Gewicht eine Kopie ablegen (Google liefert für jedes
Gewicht dieselben Bytes — fünf identische Dateien wären 160 KB statt 32 KB).

Lizenz: **SIL Open Font License 1.1** (Google-Fonts-Metadaten: `license: ofl`).

- Outfit — Smartsheet Inc & Rodrigo Fuenzalida
- JetBrains Mono — JetBrains, Philipp Nurullin & Konstantin Bulenkov

Regeneration (Netz nötig):

```bash
python3 scripts/fetch-fonts.py          # lädt assets/fonts/*.woff2 (latin)
# @font-face-Regeln stehen in index.html — die Ausgabe des Scripts dorthin übernehmen
```

Das Script prüft die woff2-Magic-Bytes und schlägt fehl, wenn Google für ein
Gewicht keine Datei liefert. `tests/test_fonts.py` wacht darüber, dass keine
Google-Referenz zurückkehrt, dass jede `src:`-Datei existiert und dass die
deklarierten Gewichtsbereiche die tatsächlich genutzten Gewichte abdecken.
