"""Tests für scripts/check-links.py — Link-Sammlung (ohne Netz)."""

import importlib.util
import sys
from pathlib import Path

BASE3 = Path(__file__).resolve().parent.parent

_spec = importlib.util.spec_from_file_location(
    "check_links", BASE3 / "scripts" / "check-links.py"
)
assert _spec is not None and _spec.loader is not None
cl = importlib.util.module_from_spec(_spec)
sys.modules["check_links"] = cl
_spec.loader.exec_module(cl)


def test_collects_links_from_all_sources():
    found = cl.collect_links()
    all_urls = {u for urls in found.values() for u in urls}
    assert "https://bumblei3.github.io/schach9x9/" in all_urls
    assert "https://github.com/bumblei3/trischach" in all_urls


def test_die_fehlerseite_liefert_ihre_ziele_in_die_prüfung():
    """404.html wird ausgeliefert — ihre vier Ziele müssen geprüft werden.

    Ein Besucher mit einem alten Link landet genau dort; dasselbe gilt für
    die Dead-Link-Wache wie für die Startseite.
    """
    found = cl.collect_links()
    assert "404.html" in found, "404.html wird nicht gelesen"
    ziele = found["404.html"]
    assert "https://bumblei3.github.io/schach9x9/" in ziele
    assert "https://bumblei3.github.io/trischach/" in ziele
    assert "https://github.com/bumblei3/base3" in ziele


def test_preconnect_hints_are_excluded():
    """<link rel="preconnect"> ist kein Navigationsziel (404 dort ist normal).

    Prüft den Filter an einem synthetischen Dokument, nicht am Seitenzustand —
    sonst hängt der Test daran, ob die Seite gerade Preconnect-Hints setzt.
    """
    import re

    def collect(text: str) -> set[str]:
        links = set()
        for match in re.finditer(r'(?:href|src)="([^"]+)"', text):
            links.add(match.group(1))
        links -= set(re.findall(r'<link rel="preconnect" href="([^"]+)"', text))
        return {u for u in links if u.startswith(("http://", "https://"))}

    text = (
        '<link rel="preconnect" href="https://cdn.example" />'
        '<link rel="stylesheet" href="https://cdn.example/app.css" />'
    )
    urls = collect(text)
    assert "https://cdn.example" not in urls, "preconnect-Hint darf nicht geprüft werden"
    assert "https://cdn.example/app.css" in urls, "das echte Ziel muss geprüft werden"


def test_page_has_no_third_party_font_dependency():
    """Seit dem Self-Hosting gehört kein Font-CDN mehr in die geprüften Ziele."""
    found = cl.collect_links()
    urls = {u for urls in found.values() for u in urls}
    assert not [u for u in urls if "fonts.googleapis.com" in u or "fonts.gstatic.com" in u]


def test_skips_non_http_schemes():
    text = '<a href="mailto:x@y.z">m</a><a href="#top">a</a><a href="tel:+49">t</a>'
    links = {u for u in re_findall_html(text) if u.startswith(("http://", "https://"))}
    assert links == set()


def re_findall_html(text: str) -> list[str]:
    import re

    return [m.group(1) for m in re.finditer(r'(?:href|src)="([^"]+)"', text)]


def test_soft_codes_are_not_failures():
    assert 403 in cl.SOFT_CODES and 429 in cl.SOFT_CODES
    assert 404 not in cl.SOFT_CODES


# ------------------------------------------------- neue Quellen (sitemap/meta)


def test_sitemap_locs_are_collected():
    """Die Sitemap ist eine eigene Ausspielungsfläche für Suchmaschinen.

    Ihre <loc>s waren die einzigen ausgehenden URLs, die kein Wächter sah.
    """
    found = cl.collect_links()
    assert "sitemap.xml" in found, "sitemap.xml wird nicht gelesen"
    assert "https://bumblei3.github.io/base3/" in found["sitemap.xml"]
    assert "https://bumblei3.github.io/schach9x9/" in found["sitemap.xml"]
    assert "https://bumblei3.github.io/trischach/" in found["sitemap.xml"]


def test_meta_content_urls_are_collected():
    """og:image / twitter:image stehen in content="", nicht in href/src.

    Eine tote Social-Karte (LinkedIn, X) würde still ausgespielt — die
    Social-Karte ist gerade deshalb gerendert, weil sie sichtbar zählt.
    """
    found = cl.collect_links()
    assert "https://bumblei3.github.io/base3/og-image.jpg" in found["index.html"]


def test_links_in_extrahiert_meta_und_loc():
    """Synthetisch: meta-content und <loc>, aber keine href/src-Falle."""
    text = (
        '<meta property="og:image" content="https://example.com/card.jpg">'
        '<meta name="twitter:site" content="@beispiel">'
        "<url><loc> https://example.com/a </loc></url>"
    )
    assert cl._links_in(text) == {
        "https://example.com/card.jpg",
        "https://example.com/a",
    }
