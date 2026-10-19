"""Tests für patch_sitemap und _get_base_lastmod (kein Netz nötig)."""

import importlib.util
import sys
from pathlib import Path

BASE3 = Path(__file__).resolve().parent.parent

_spec = importlib.util.spec_from_file_location(
    "sync_versions", BASE3 / "scripts" / "sync-versions.py"
)
assert _spec is not None and _spec.loader is not None
sv = importlib.util.module_from_spec(_spec)
sys.modules["sync_versions"] = sv
_spec.loader.exec_module(sv)

REAL_SITEMAP = (BASE3 / "sitemap.xml").read_text(encoding="utf-8")
MINIMAL = """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://bumblei3.github.io/base3/</loc>
    <lastmod>2020-01-01</lastmod>
  </url>
  <url>
    <loc>https://bumblei3.github.io/schach9x9/</loc>
  </url>
  <url>
    <loc>https://bumblei3.github.io/trischach/</loc>
    <lastmod>2020-01-01</lastmod>
  </url>
</urlset>
"""


def test_real_sitemap_is_idempotent():
    """Die committeden lastmod-Werte müssen sich erneut setzen lassen (Fixed Point)."""
    import re

    dates = re.findall(r"<lastmod>([^<]+)</lastmod>", REAL_SITEMAP)
    assert len(dates) == 3, "drei Einträge mit lastmod erwartet"
    out, changed = sv.patch_sitemap(
        REAL_SITEMAP, dates[0], "2.0.0", dates[1], "1.6.0", dates[2]
    )
    assert not changed
    assert out == REAL_SITEMAP


def test_replaces_and_adds_lastmod():
    out, changed = sv.patch_sitemap(
        MINIMAL, "2026-08-24", "2.0.0", "2026-08-23", "1.6.0", "2026-08-24"
    )
    assert changed
    assert "<loc>https://bumblei3.github.io/base3/</loc>\n    <lastmod>2026-08-24</lastmod>" in out
    # Eintrag ohne lastmod bekommt eines hinzugefügt
    assert (
        "<loc>https://bumblei3.github.io/schach9x9/</loc>\n    <lastmod>2026-08-23</lastmod>"
        in out
    )
    assert "</loc>" in out  # kein Tag verloren gegangen


def test_unknown_dates_are_skipped():
    out, changed = sv.patch_sitemap(
        MINIMAL, "????-??-??", "2.0.0", "????-??-??", "1.6.0", "????-??-??"
    )
    assert not changed, "Platzhalter dürfen nichts überschreiben"
    assert "????" not in out


def test_is_idempotent():
    once, _ = sv.patch_sitemap(
        MINIMAL, "2026-08-24", "2.0.0", "2026-08-23", "1.6.0", "2026-08-24"
    )
    twice, changed = sv.patch_sitemap(
        once, "2026-08-24", "2.0.0", "2026-08-23", "1.6.0", "2026-08-24"
    )
    assert not changed
    assert twice == once


def test_base_lastmod_falls_back_to_a_date():
    date = sv._get_base_lastmod()
    assert len(date) == 10 and date[4] == "-" and date[7] == "-"
