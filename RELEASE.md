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
   `index.html`, `README.md` und `FAQ.md`.

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
   - Die „Was ist neu"-Bullets unterhalb der Version-Pills sind **manuell** und
     müssen separat aktualisiert werden (sie kommen aus den Changelogs).

4. Committe die Änderungen:
   ```bash
   git add index.html README.md FAQ.md
   git commit -m "chore(base3): sync versions to Schach9x9 vX.Y.Z + Trischach vA.B.C"
   git push origin main
   ```

   Das `pages.yml`-Workflow deployt automatisch nach dem Push.

### Automatisierter Pfad (Standard in base3)

base3 hat einen täglichen Cron-Job (`.github/workflows/sync-versions.yml`),
der jeden Tag um 02:00 UTC `scripts/sync-versions.py --api-mode` ausführt und
nur bei Änderung commit/pusht. Das löst `pages.yml` aus und hält die
Version-Pills / JSON-LD / FAQ / README automatisch aktuell, ohne Cross-Repo-Trigger
oder manuelle Schritte.

Der Cron-Job kann auch manuell getriggert werden:
```bash
gh workflow run sync-versions.yml
```

## Hinweis

base3 hat das `pages.yml`-Workflow (GitHub Pages Deploy) und das
`sync-versions.yml`-Workflow (automatischer Version-Pills-Sync). Es gibt kein
Code-, Build- oder Test-CI hier, weil base3 ein statisches Verweis-Repo ist.
Das CI der Spiele lebt in den eigenständigen Repos:

- https://github.com/bumblei3/schach9x9/actions
- https://github.com/bumblei3/trischach/actions
