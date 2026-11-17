"""Der axe-Gate muss die /base3/-URL scannen und beide Seiten abdecken.

Gleiche Fehlerklasse wie bei Lighthouse: Der Scan lief auf `/`, die Seite
referenziert aber `/base3/...` — Schriften, Manifest und Service Worker
antworteten mit 404, und `page.goto('/')` hätte bei einem Server ab Wurzel
sogar ein Verzeichnislisting geprüft (ohne Verstöße, also grün).
"""

from __future__ import annotations

from pathlib import Path

BASE3 = Path(__file__).resolve().parent.parent


def test_playwright_serves_the_pages_path():
    text = (BASE3 / "playwright.config.js").read_text(encoding="utf-8")
    assert "baseURL: 'http://localhost:8765'" in text, (
        "playwright.config.js braucht die Origin als baseURL — die /base3/-Pfade "
        "stehen in der Spec"
    )
    assert "--directory .lh" in text, "der Server muss den .lh-Baum ausliefern"
    assert "ln -sfn" in text and ".lh/base3" in text, (
        "das Repo muss unter .lh/base3 ausgelegt werden"
    )


def test_axe_spec_scans_both_delivered_pages():
    spec = (BASE3 / "tests" / "a11y.spec.js").read_text(encoding="utf-8")
    assert "'/base3/'" in spec, "die Startseite wird nicht unter /base3/ gescannt"
    assert "'/base3/404.html'" in spec, "404.html wird nicht gescannt"
    assert "expect(page.url())" in spec, (
        "der Scan prüft nicht, dass er die angeforderte URL geladen hat"
    )
    assert "toHaveText(marker)" in spec, (
        "der Scan prüft nicht, dass er UNSERE Seite geladen hat — eine 404 des "
        "Servers hätte dieselbe URL"
    )
