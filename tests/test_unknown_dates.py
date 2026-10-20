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


def _current_pills(html: str) -> tuple[tuple[str, str], tuple[str, str]]:
    """(Version, Datum) je Spiel aus der committeden FAQ-Versionsliste.

    Hartkodierte Daten würden diesen Test bei jedem Release der Nachbar-Repos
    rot machen — geprüft wird das Ersetzen eines Platzhalters, nicht der
    konkrete Versionsstand.
    """
    import re

    def find(name: str) -> tuple[str, str]:
        m = re.search(r"<b>" + name + r":</b> (v[\d.]+) \((\d{4}-\d{2}-\d{2})\)", html)
        assert m, f"FAQ-Versionsliste für {name} nicht gefunden"
        return m.group(1), m.group(2)

    return find("Schach9x9"), find("Trischach")


def test_index_unknown_date_is_not_written():
    (s_v, s_d), (_, t_d) = _current_pills(ORIGINAL_INDEX)
    out, changed = sv.patch_index(ORIGINAL_INDEX, "9.9.9", UNKNOWN, "8.8.8", UNKNOWN)
    assert f"v9.9.9 · {s_d}" in out, "bekanntes Datum muss stehen bleiben"
    assert UNKNOWN not in out
    # Version-Pills in den Game-Cards werden ersetzt
    assert f'<span class="version-pill">v9.9.9 · {s_d}</span>' in out
    assert f'<span class="version-pill">v8.8.8 · {t_d}</span>' in out
    # FAQ-Versionsliste: Nummer nachziehen, bekanntes Datum stehen lassen.
    assert f"<b>Schach9x9:</b> v9.9.9 ({s_d})" in out
    assert f"<b>Trischach:</b> v8.8.8 ({t_d})" in out


def test_index_repairs_existing_placeholder():
    (s_v, s_d), _ = _current_pills(ORIGINAL_INDEX)
    broken = ORIGINAL_INDEX.replace(f"{s_v} · {s_d}", f"{s_v} · {UNKNOWN}")
    broken = broken.replace(f'"datePublished": "{s_d}"', f'"datePublished": "{UNKNOWN}"')
    broken = broken.replace(
        f"<b>Schach9x9:</b> {s_v} ({s_d})",
        f"<b>Schach9x9:</b> {s_v} ({UNKNOWN})",
    )
    out, changed = sv.patch_index(broken, "9.9.9", "2099-01-01", "8.8.8", "2099-02-02")
    assert changed
    assert UNKNOWN not in out, "Platzhalter muss ersetzt werden"
    assert "v9.9.9 · 2099-01-01" in out
    assert '"datePublished": "2099-01-01"' in out
    assert "<b>Schach9x9:</b> v9.9.9 (2099-01-01)" in out


def test_index_placeholder_is_idempotent():
    """Ein Platzhalter ohne echtes Datum bleibt Platzhalter (kein Diff-Loop)."""
    (s_v, s_d), _ = _current_pills(ORIGINAL_INDEX)
    broken = ORIGINAL_INDEX.replace(f"{s_v} · {s_d}", f"{s_v} · {UNKNOWN}")
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
    (s_v, s_d), _ = _current_pills(ORIGINAL_INDEX)
    broken = ORIGINAL_README.replace(
        f"### Schach9x9 · {s_v} ({s_d})", f"### Schach9x9 · {s_v} ({UNKNOWN})"
    )
    out, changed = sv.patch_readme(broken, "9.9.9", "2099-01-01", "8.8.8", "2099-02-02")
    assert changed and UNKNOWN not in out
    assert "### Schach9x9 · v9.9.9 (2099-01-01)" in out


def test_faq_unknown_date_is_not_written():
    out, _ = sv.patch_faq(ORIGINAL_FAQ, "9.9.9", UNKNOWN, "8.8.8", UNKNOWN)
    (s_v, s_d), _ = _current_pills(ORIGINAL_INDEX)
    assert f"**Schach9x9:** v9.9.9 ({s_d})" in out
    assert UNKNOWN not in out


def test_faq_repairs_existing_placeholder():
    (s_v, s_d), _ = _current_pills(ORIGINAL_INDEX)
    broken = ORIGINAL_FAQ.replace(
        f"**Schach9x9:** {s_v} ({s_d})", f"**Schach9x9:** {s_v} ({UNKNOWN})"
    )
    out, changed = sv.patch_faq(broken, "9.9.9", "2099-01-01", "8.8.8", "2099-02-02")
    assert changed and UNKNOWN not in out
    assert "**Schach9x9:** v9.9.9 (2099-01-01)" in out


def test_sitemap_skips_unknown_dates():
    xml = (BASE3 / "sitemap.xml").read_text(encoding="utf-8")
    out, changed = sv.patch_sitemap(xml, UNKNOWN, "2.0.0", UNKNOWN, "1.6.0", UNKNOWN)
    assert not changed
    assert out == xml
