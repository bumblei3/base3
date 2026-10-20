"""Tests für die gebrandete 404-Seite (404.html).

GitHub Pages liefert diese Datei für unbekannte Pfade unter /base3/. Sie muss
deshalb im Deploy-Artefakt liegen (die Staged-Liste in pages.yml ist explizit —
genau diese Falle hat schon einmal Favicons live zu 404ern gemacht) und darf
selbst keine Ressourcen nachladen, die auf einer Fehlerseite entbehrlich sind.
"""

import importlib.util
import re
import sys
from pathlib import Path

import pytest

BASE3 = Path(__file__).resolve().parent.parent
PAGE = BASE3 / "404.html"
HTML = PAGE.read_text(encoding="utf-8")

_spec = importlib.util.spec_from_file_location(
    "check_deployed_404", BASE3 / "scripts" / "check-deployed.py"
)
cd = importlib.util.module_from_spec(_spec)
sys.modules["check_deployed_404"] = cd
_spec.loader.exec_module(cd)


def test_page_exists_and_is_not_indexable():
    assert PAGE.is_file()
    assert '<meta name="robots" content="noindex' in HTML, "Fehlerseite darf nicht indexiert werden"


def test_is_not_in_the_sitemap():
    sitemap = (BASE3 / "sitemap.xml").read_text(encoding="utf-8")
    assert "404" not in sitemap


def test_is_part_of_the_deploy():
    """Sonst antwortet Pages weiter mit der generischen 404."""
    staged, _ = cd.staged_files()
    assert "404.html" in staged, "404.html fehlt in der Staged-Liste von pages.yml"
    assert "404.html" in cd.expected_urls(cd.DEFAULT_BASE_URL)


def test_has_no_third_party_dependencies():
    extern = [u for u in re.findall(r'(?:href|src)="(https?://[^"]+)"', HTML)]
    assert extern, "die 404-Seite sollte auf die Spiele verlinken"
    for url in extern:
        assert url.startswith("https://bumblei3.github.io/") or url.startswith(
            "https://github.com/bumblei3/"
        ), f"unerwartetes Ziel: {url}"
    assert "fonts.googleapis.com" not in HTML and "fonts.gstatic.com" not in HTML


def test_only_local_stylesheets_and_fonts():
    for link in re.findall(r"<link[^>]+>", HTML):
        assert 'rel="stylesheet"' not in link, "kein externes Stylesheet auf der Fehlerseite"
    for src in re.findall(r"url\('([^']+)'\)", HTML):
        if src.endswith(".woff2"):
            path = (BASE3 / src.lstrip("./")).resolve()
            assert path.is_file(), f"{src} fehlt"


def test_no_javascript_needed():
    """Eine Fehlerseite muss auch mit blockiertem JS funktionieren."""
    assert "<script" not in HTML, "404.html sollte ohne JavaScript auskommen"


def test_links_to_both_games_and_the_start():
    for target in (
        'href="/base3/"',
        "https://bumblei3.github.io/schach9x9/",
        "https://bumblei3.github.io/trischach/",
    ):
        assert target in HTML, f"{target} fehlt auf der 404-Seite"


@pytest.mark.parametrize(
    "check,message",
    [
        (lambda: re.search(r"<title>([^<]+)</title>", HTML), "kein <title>"),
        (lambda: re.search(r'<html lang="([^"]+)"', HTML), "kein lang-Attribut"),
    ],
)
def test_sets_title_and_language(check, message):
    match = check()
    assert match, message