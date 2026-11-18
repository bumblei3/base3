#!/usr/bin/env python3
"""check-release-drift.py — angezeigte Versionen gegen die neuesten Releases
der Nachbar-Repos prüfen (nur lesend, kein Sync).

Die Seite nennt Schach9x9 und Trischach mit Versions-Pill und Datum. Nach
einem Release eines Sub-Repos bleibt dieser Stand still, bis lokal
`sync-versions.py` läuft. Der Check sagt einmal pro Woche Bescheid, wenn die
Seite älter ist als GitHub — ohne selbst etwas zu schreiben, zu pushen oder
einen PR zu öffnen. Gezogen wird nach wie vor von Hand, siehe RELEASE.md.

API: öffentliche GitHub-Repos, unauthentifiziert (rate-limited ~60/h). Ist
die API nicht erreichbar, endet der Lauf mit „NICHT PRÜFBAR" und Code 0 —
wie validate-html.py ein Lint, kein Korrektheits-Gate.

Aufruf:  python3 scripts/check-release-drift.py \
            --schach-repo-owner bumblei3 --schach-repo-name schach9x9 \
            --trischach-repo-owner bumblei3 --trischach-repo-name trischach
Exit:    0 = aktuell oder nicht prüfbar, 1 = Seite zeigt ältere Versionen
"""

import argparse
import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

BASE3 = Path(__file__).resolve().parent.parent
INDEX_HTML = BASE3 / "index.html"

VER = r"\d+\.\d+\.\d+"
DATE = r"\d{4}-\d{2}-\d{2}"
# Unbekanntes Datum (????-??-??) aus einem fehlgeschlagenen Sync-Lauf.
UNKNOWN_DATE = r"\?{4}-\?{2}-\?{2}"

GAMES = ("Schach9x9", "Trischach")


def shown_versions(html_text: str) -> dict[str, tuple[str, str]]:
    """(Version, Datum) je Spiel aus der Versionsliste in index.html."""
    found: dict[str, tuple[str, str]] = {}
    for label in GAMES:
        m = re.search(
            rf"<b>{label}:</b> v({VER}) \(({DATE}|{UNKNOWN_DATE})\)", html_text
        )
        if m:
            found[label] = (m.group(1), m.group(2))
    return found


def version_key(text: str) -> tuple[int, ...]:
    return tuple(int(part) for part in text.split("."))


def is_stale(shown: str, latest: str) -> bool:
    """True, wenn das neueste Release weiter ist als der angezeigte Stand."""
    return version_key(latest) > version_key(shown)


def fetch_latest(owner: str, name: str) -> tuple[str, str | None]:
    """(Version, Datum) des neuesten Releases; wirft bei jedem Fehler."""
    url = f"https://api.github.com/repos/{owner}/{name}/releases/latest"
    req = urllib.request.Request(url, headers={"Accept": "application/vnd.github+json"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    version = (data.get("tag_name") or "").lstrip("v")
    if not version:
        raise ValueError("tag_name fehlt in der Antwort")
    published = (data.get("published_at") or "")[:10] or None
    return version, published


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Zeigt die Seite ältere Versionen als die Sub-Repos?"
    )
    parser.add_argument("--schach-repo-owner", default="bumblei3")
    parser.add_argument("--schach-repo-name", default="schach9x9")
    parser.add_argument("--trischach-repo-owner", default="bumblei3")
    parser.add_argument("--trischach-repo-name", default="trischach")
    parser.add_argument(
        "--index",
        type=Path,
        default=INDEX_HTML,
        help="Zu prüfende index.html (default: die im Repo).",
    )
    args = parser.parse_args(argv)

    html_text = args.index.read_text(encoding="utf-8")
    shown = shown_versions(html_text)
    fehlend = [label for label in GAMES if label not in shown]
    if fehlend:
        print(
            f"FEHLER: Versionsliste in {args.index.name} ohne "
            f"{', '.join(fehlend)} — Struktur verschoben?",
            file=sys.stderr,
        )
        return 1

    targets = (
        ("Schach9x9", args.schach_repo_owner, args.schach_repo_name),
        ("Trischach", args.trischach_repo_owner, args.trischach_repo_name),
    )

    latest: dict[str, tuple[str, str | None]] = {}
    nicht_prufbar: list[tuple[str, str]] = []
    for label, owner, name in targets:
        try:
            latest[label] = fetch_latest(owner, name)
        except (urllib.error.URLError, TimeoutError, OSError, ValueError) as exc:
            nicht_prufbar.append((label, str(exc)))

    if nicht_prufbar:
        for label, grund in nicht_prufbar:
            print(f"NICHT PRÜFBAR  {label}: {grund}", file=sys.stderr)
        print(
            "NICHT PRÜFBAR: GitHub-API nicht erreichbar — kein Gate, "
            "nächster geplanter Lauf versucht es erneut.",
            file=sys.stderr,
        )
        return 0

    print("Prüfe Versions-Frische gegen GitHub …\n")
    stale: list[str] = []
    for label, _, _ in targets:
        sv, sd = shown[label]
        lv, ld = latest[label]
        if is_stale(sv, lv):
            stale.append(label)
            print(f"  VERALTET  {label:<9} v{sv} ({sd}) — neuestes Release v{lv} ({ld or 'Datum unbekannt'})")
        else:
            print(f"  OK        {label:<9} v{sv} ({sd}) — neuestes Release v{lv} ({ld or 'Datum unbekannt'})")

    if stale:
        print(
            f"\nFEHLER: {', '.join(stale)} — die Seite ist älter als GitHub. "
            "Fix: python3 scripts/sync-versions.py --api-mode --check "
            "prüfen und lokal syncen (siehe RELEASE.md).",
            file=sys.stderr,
        )
        return 1
    print("\nRELEASE-DRIFT OK: die Seite steht auf dem neuesten Release.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
