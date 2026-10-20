"""Tests für scripts/check-deployed.py — Pfad-Ableitung ohne Netz.

Der Live-Vergleich selbst braucht HTTP; hier wird nur geprüft, wie das Script
aus `pages.yml`, `index.html` und dem Manifest die Menge der zu prüfenden
Dateien und ihre Live-URLs ableitet. Falsch abgeleitet heißt: der Deploy-Check
prüft entweder zu wenig (Lücke bleibt) oder etwas, das nie ausgeliefert wird
(Fehlalarm in CI).
"""

import importlib.util
import sys
from pathlib import Path

import pytest

BASE3 = Path(__file__).resolve().parent.parent

# Bindestrich im Dateinamen → kein normaler Import.
_spec = importlib.util.spec_from_file_location(
    "check_deployed", BASE3 / "scripts" / "check-deployed.py"
)
cd = importlib.util.module_from_spec(_spec)
sys.modules["check_deployed"] = cd
_spec.loader.exec_module(cd)


@pytest.mark.parametrize(
    "value,expected",
    [
        ("./assets/preview-schach9x9.webp", "assets/preview-schach9x9.webp"),
        ("/base3/icon-192.png", "icon-192.png"),
        ("https://bumblei3.github.io/base3/og-image.png", "og-image.png"),
        ("image/webp", None),
        ("1200", None),
        ("dark", None),
        ("#main-content", None),
        ("data:image/svg+xml,%3Csvg%3E", None),
        ("https://fonts.googleapis.com/css2?family=Outfit", None),
        ("https://github.com/bumblei3/base3", None),
        ("../secret.png", None),
    ],
)
def test_to_repo_path(value, expected):
    assert cd.to_repo_path(value) == expected


def test_staged_includes_recursive_assets():
    files, assets = cd.staged_files()
    assert assets is True
    assert "index.html" in files
    assert "assets/preview-schach9x9.webp" in files
    assert not any(f.startswith(("tests/", "scripts/")) for f in files)


def test_expected_urls_cover_referenced_and_staged():
    urls = cd.expected_urls(cd.DEFAULT_BASE_URL)
    # von der Seite referenziert — genau die Dateien, die live 404 waren
    assert urls["og-image.png"] == "https://bumblei3.github.io/base3/og-image.png"
    assert urls["favicon.ico"].endswith("/favicon.ico")
    assert urls["favicon-32.png"].endswith("/favicon-32.png")
    # gestaged, aber nicht verlinkt
    assert urls["robots.txt"].endswith("/robots.txt")
    # die Seite selbst liegt unter der Wurzel, nicht unter /index.html
    assert urls["index.html"] == cd.DEFAULT_BASE_URL
    # nichts, was nie ausgeliefert wird
    assert not [p for p in urls if p.startswith(("tests/", "scripts/", ".github/"))]


def test_every_expected_file_exists_locally():
    for path in cd.expected_urls(cd.DEFAULT_BASE_URL):
        assert (BASE3 / path).is_file(), f"{path} würde live geprüft, fehlt aber im Repo"


def test_check_one_reports_mismatch(monkeypatch):
    """Abweichende Live-Bytes müssen als Fehler durchkommen, nicht als OK."""
    monkeypatch.setattr(cd, "fetch", lambda url, timeout: (200, b"andere bytes", None))
    status, _ = cd.check_one("index.html", "https://example.invalid/", 5, 1, 0)
    assert status == "ABWEICHUNG"


def test_check_one_detects_missing_live_file(monkeypatch):
    monkeypatch.setattr(cd, "fetch", lambda url, timeout: (404, None, None))
    status, detail = cd.check_one("favicon.ico", "https://example.invalid/favicon.ico", 5, 1, 0)
    assert status == "NICHT ERREICHBAR"
    assert "404" in detail


def test_check_one_ok_on_identical_bytes(monkeypatch):
    payload = (BASE3 / "robots.txt").read_bytes()
    monkeypatch.setattr(cd, "fetch", lambda url, timeout: (200, payload, None))
    assert cd.check_one("robots.txt", "https://example.invalid/robots.txt", 5, 1, 0)[0] == "OK"
