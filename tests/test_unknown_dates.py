"""Regressionstests: unbekannte Daten (????-??-??) dürfen nie überschreiben.

Ursprung: ein Sync-Lauf während eines GitHub-API-Rate-Limits hat die
Release-Datumsfelder durch den Platzhalter ersetzt, weil die Patcher das
Datum bedingungslos schrieben. Seitdem: unbekanntes Datum = altes stehen
lassen; ein vorhandener Platzhalter wird durch ein echtes Datum ersetzt.
"""

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

ORIGINAL_INDEX = (BASE3 / "index.html").read_text(encoding="utf-8")
ORIGINAL_README = (BASE3 / "README.md").read_text(encoding="utf-8")
ORIGINAL_FAQ = (BASE3 / "FAQ.md").read_text(encoding="utf-8")
UNKNOWN = "????-??-??"


def test_index_unknown_date_is_not_written():
    out, changed = sv.patch_index(ORIGINAL_INDEX, "9.9.9", UNKNOWN, "8.8.8", UNKNOWN)
    assert "v9.9.9 · 2026-08-23" in out, "bekanntes Datum muss stehen bleiben"
    assert UNKNOWN not in out
    # Version-Pills in den Game-Cards werden ersetzt
    assert '<span class="version-pill">v9.9.9 · 2026-08-23</span>' in out
    assert '<span class="version-pill">v8.8.8 · 2026-08-24</span>' in out
    # Inhalte in FAQ bleiben unverändert (keine Version-Pills)
    assert "Welche Versionen sind aktuell?" in out


def test_index_repairs_existing_placeholder():
    broken = ORIGINAL_INDEX.replace("v2.0.0 · 2026-08-23", f"v2.0.0 · {UNKNOWN}")
    broken = broken.replace('"datePublished": "2026-08-23"', f'"datePublished": "{UNKNOWN}"')
    out, changed = sv.patch_index(broken, "9.9.9", "2099-01-01", "8.8.8", "2099-02-02")
    assert changed
    assert UNKNOWN not in out, "Platzhalter muss ersetzt werden"
    assert "v9.9.9 · 2099-01-01" in out
    assert '"datePublished": "2099-01-01"' in out


def test_index_placeholder_is_idempotent():
    """Ein Platzhalter ohne echtes Datum bleibt Platzhalter (kein Diff-Loop)."""
    broken = ORIGINAL_INDEX.replace("v2.0.0 · 2026-08-23", f"v2.0.0 · {UNKNOWN}")
    once, changed = sv.patch_index(broken, "9.9.9", UNKNOWN, "8.8.8", UNKNOWN)
    assert changed
    assert UNKNOWN in once
    twice, again = sv.patch_index(once, "9.9.9", UNKNOWN, "8.8.8", UNKNOWN)
    assert not again


def test_readme_unknown_date_is_not_written():
    out, _ = sv.patch_readme(ORIGINAL_README, "9.9.9", UNKNOWN, "8.8.8", UNKNOWN)
    assert "### Schach9x9 · v9.9.9 (2026-08-23)" in out
    assert UNKNOWN not in out


def test_readme_repairs_existing_placeholder():
    broken = ORIGINAL_README.replace("### Schach9x9 · v2.0.0 (2026-08-23)", f"### Schach9x9 · v2.0.0 ({UNKNOWN})")
    out, changed = sv.patch_readme(broken, "9.9.9", "2099-01-01", "8.8.8", "2099-02-02")
    assert changed and UNKNOWN not in out
    assert "### Schach9x9 · v9.9.9 (2099-01-01)" in out


def test_faq_unknown_date_is_not_written():
    out, _ = sv.patch_faq(ORIGINAL_FAQ, "9.9.9", UNKNOWN, "8.8.8", UNKNOWN)
    assert "**Schach9x9:** v9.9.9 (2026-08-23)" in out
    assert UNKNOWN not in out


def test_faq_repairs_existing_placeholder():
    broken = ORIGINAL_FAQ.replace("**Schach9x9:** v2.0.0 (2026-08-23)", f"**Schach9x9:** v2.0.0 ({UNKNOWN})")
    out, changed = sv.patch_faq(broken, "9.9.9", "2099-01-01", "8.8.8", "2099-02-02")
    assert changed and UNKNOWN not in out
    assert "**Schach9x9:** v9.9.9 (2099-01-01)" in out


def test_sitemap_skips_unknown_dates():
    xml = (BASE3 / "sitemap.xml").read_text(encoding="utf-8")
    out, changed = sv.patch_sitemap(xml, UNKNOWN, "2.0.0", UNKNOWN, "1.6.0", UNKNOWN)
    assert not changed
    assert out == xml
