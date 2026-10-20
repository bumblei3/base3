# Release-Prozess für base3

base3 ist ein Verweis-Repo (Pointer). Es hat keinen eigenen Code-Release-Zyklus.
Die Version-Pills, JSON-LD-Daten und README-Angaben müssen nach jedem Sub-Release
in schach9x9 oder trischach aktualisiert werden.

## Wenn ein Sub-Repo einen Release veröffentlicht

### Manueller Schritt (optional, falls kein Cron-Job gewünscht)

1. Prüfe die neue Version:
   - Schach9x9: https://github.com/bumblei3/schach9x9/releases
   - Trischach: https://github.com/bumblei3/trischach/releases

2. Sync die Version-Pills aus den Nachbar-Repos:

   **Lokal (Sub-Repos vorhanden):**
   ```bash
   python3 scripts/sync-versions.py
   ```
   Das Script liest `package.json` und das Tag-Datum aus den lokalen Repos
   (Standard-Pfade: `/home/tobber/schach9x9`, `/home/tobber/trischach`) und patcht
   `index.html`, `README.md` und `FAQ.md`. Die „Was ist neu"-Bullets bleiben im
   lokalen Modus unangetastet (es gibt hier keine Release-Notes).

   Bei Bedarf alternative Pfade angeben:
   ```bash
   python3 scripts/sync-versions.py \
     --schach-path /path/to/schach9x9 \
     --trischach-path /path/to/trischach
   ```

   **API-Modus (Sub-Repos nicht lokal verfügbar):**
   ```bash
   python3 scripts/sync-versions.py --api-mode \
     --schach-repo-owner bumblei3 \
     --schach-repo-name schach9x9 \
     --trischach-repo-owner bumblei3 \
     --trischach-repo-name trischach
   ```
   Das Script fragt GitHub Contents API (package.json) nach der Version und
   GitHub Releases API (releases/tags/vX.Y.Z) nach dem Release-Datum ab.
   Repository.owner/name kann auch automatisch aus dem lokalen
   `package.json`/`repository.url` extrahiert werden, wenn vorhanden.
   Unauthenticated Requests — öffentliche Repos, rate-limited (~60/h).

   Das Script nutzt als Fallback auch die GitHub Releases API, falls das
   lokale Git-Repo nicht verfügbar ist oder das Tag-Datum nicht gelesen werden kann.

3. Prüfe die Ausgabe:
   - `index.html`, `README.md`, `FAQ.md` sollten jetzt die neuen Versionen zeigen.
   - Die „Was ist neu“-Bullets werden aus den Release-Notes des neuesten
     Releases des jeweiligen Repos gezogen (nur im `--api-mode`; im lokalen
     Modus bleiben sie unangetastet). Mit `--no-whats-new` lässt man sie
     grundsätzlich aus.
   - `sitemap.xml`: `lastmod` der Base3-Seite = Datum des letzten Commits an
     den Inhaltsdateien; die Sub-Repos bekommen ihr Release-Datum. Fehlende
     Daten (`????-??-??`) überschreiben nichts.

4. Verifiziere die Seite:
   ```bash
   python3 -m pytest                                # Unit-Tests
   python3 scripts/validate_landing_page.py        # Tag-Balance, JSON-LD, Links
   python3 scripts/check-links.py                  # ausgehende Links live
   python3 scripts/validate-html.py --strict       # HTML-Standard (W3C Nu)
   python3 scripts/check-deployed.py               # Live-Seite == Repo (nach dem Deploy)
   python3 scripts/sync-faq-schema.py --check      # FAQPage-JSON-LD == FAQ-Sektion?
   python3 scripts/sync-versions.py --check --api-mode \
     --schach-repo-owner bumblei3 --schach-repo-name schach9x9 \
     --trischach-repo-owner bumblei3 --trischach-repo-name trischach
   ```
   `check-deployed.py` läuft in CI automatisch als Job `Verify live deployment`
   in `pages.yml`; lokal ist es der einzige Weg, eine grüne Deploy-Auslieferung
   mit 404-Lücken zu erkennen (Staged-Liste ≠ referenzierte Dateien).
   Der `--check`-Lauf muss exit 0 liefern, sonst ist ein Fixed-Point verletzt
   (ein zweiter Sync-Lauf darf nichts mehr ändern).

5. Committe die Änderungen:
   ```bash
   git add index.html README.md FAQ.md sitemap.xml
   git commit -m "chore(base3): sync versions to Schach9x9 vX.Y.Z + Trischach vA.B.C"
   git push origin main
   ```

   Das `pages.yml`-Workflow deployt automatisch nach dem Push — mit
   `index.html`, `assets/`, `og-image.png`, `sw.js`, den Icons,
   `manifest.webmanifest`, `robots.txt` und `sitemap.xml`.

### Automatisierter Pfad (Standard in base3)

base3 hat einen täglichen Cron-Job (`.github/workflows/sync-versions.yml`),
der jeden Tag um 02:00 UTC `scripts/sync-versions.py --api-mode` ausführt und
nur bei Änderung commit/pusht. Das löst `pages.yml` aus und hält die
Version-Pills / JSON-LD / FAQ / README / „Was ist neu" / `sitemap.xml` /
das `FAQPage`-Schema
automatisch aktuell, ohne Cross-Repo-Trigger oder manuelle Schritte.

Der Cron-Job kann auch manuell getriggert werden:
```bash
gh workflow run sync-versions.yml
```

### Drift prüfen, ohne zu schreiben

```bash
python3 scripts/sync-versions.py --check --api-mode \
  --schach-repo-owner bumblei3 --schach-repo-name schach9x9 \
  --trischach-repo-owner bumblei3 --trischach-repo-name trischach
```

Endet mit Code 1 und schreibt nichts, wenn `index.html`/`README.md`/`FAQ.md`
nicht auf dem Stand der Nachbar-Repos sind. Genau so läuft `check-sync.yml`.
Für das `FAQPage`-Schema ist `python3 scripts/sync-faq-schema.py --check` das
Äquivalent: Exit 1, wenn der ausgelieferte Block nicht zur sichtbaren
FAQ-Sektion passt (fehlend oder veraltet) — ebenfalls ohne zu schreiben.

## Hinweis

base3 hat das `pages.yml`-Workflow (GitHub Pages Deploy) und das
`sync-versions.yml`-Workflow (automatischer Version-Pills-Sync). Es gibt kein
Code-, Build- oder Test-CI hier, weil base3 ein statisches Verweis-Repo ist.
Das CI der Spiele lebt in den eigenständigen Repos:

- https://github.com/bumblei3/schach9x9/actions
- https://github.com/bumblei3/trischach/actions
