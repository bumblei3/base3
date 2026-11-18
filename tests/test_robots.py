"""robots.txt: ausgeliefert, aber bisher ohne jeden Test.

Die Datei ist die erste Adresse für Suchmaschinen. Steht dort ein falscher
Sitemap-Pfad oder eine versehentliche Sperre, merkt das niemand — die Seite
indexiert dann still falsch, während alle anderen Wächter grün bleiben.
"""

import re
from pathlib import Path

BASE3 = Path(__file__).resolve().parent.parent
ROBOTS = BASE3 / "robots.txt"
INDEX = BASE3 / "index.html"


def _robots() -> str:
    return ROBOTS.read_text(encoding="utf-8")


def test_robots_ist_ausgelegt_statt_zu_sperren():
    """Ein Verweis-Repo will gefunden werden — keine Sperre."""
    text = _robots()
    assert "User-agent: *" in text
    assert "Allow: /" in text
    assert "Disallow" not in text


def test_sitemap_pfad_zeigt_auf_die_ausgelieferte_datei():
    """Der Eintrag muss zur existierenden Datei unter /base3/ führen und zum
    Stand der Seite passen (canonical + sitemap.xml)."""
    treffer = re.findall(r"(?im)^sitemap:\s*(\S+)\s*$", _robots())
    assert len(treffer) == 1, f"Sitemap-Zeilen: {treffer}"
    url = treffer[0]
    assert url.startswith("https://"), "Sitemap muss absolut sein (https)"
    assert (BASE3 / "sitemap.xml").is_file(), "Sitemap-Datei fehlt im Repo"

    canonical = re.search(r'<link rel="canonical" href="([^"]+)"', INDEX.read_text(encoding="utf-8"))
    assert canonical, "canonical-Link fehlt in index.html"
    assert url == canonical.group(1) + "sitemap.xml", (
        f"robots-Sitemap {url} passt nicht zum canonical {canonical.group(1)}"
    )


def test_kein_indexierungsverbot_fuer_die_startseite():
    """robots.txt darf die Startseite nicht noindexen — anders als 404.html,
    wo noindex richtig ist."""
    assert "noindex" not in _robots().lower()
