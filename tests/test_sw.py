"""Service Worker: Offline-Fallback, bewusst ohne Staleness.

Der SW wird von der Seite selbst registriert (`serviceWorker.register(...)`),
nicht per href/src. Diese Tests prüfen deshalb die Verdrahtung und die
Strategie strukturell; das eigentliche Offline-Verhalten steht in der
Doku von sw.js und wird lokal im Browser gegen den laufenden Server geprüft
(CI hat keinen Browser).
"""

import importlib.util
import re
import sys
from pathlib import Path

import pytest

BASE3 = Path(__file__).resolve().parent.parent
SW_PATH = BASE3 / "sw.js"
SW = SW_PATH.read_text(encoding="utf-8")
HTML = (BASE3 / "index.html").read_text(encoding="utf-8")
NOT_FOUND = (BASE3 / "404.html").read_text(encoding="utf-8")
FAQ = (BASE3 / "FAQ.md").read_text(encoding="utf-8")


def _deploy_check():
    spec = importlib.util.spec_from_file_location(
        "check_deployed_sw", BASE3 / "scripts" / "check-deployed.py"
    )
    module = importlib.util.module_from_spec(spec)
    sys.modules["check_deployed_sw"] = module
    spec.loader.exec_module(module)
    return module


def _code_only(source: str) -> str:
    """Kommentare entfernen — sonst kann ein Kommentar einen Code-Test
    bestehen lassen, der eigentlich über den Code laufen soll."""
    source = re.sub(r"/\*.*?\*/", "", source, flags=re.S)
    return re.sub(r"//[^\n]*", "", source)


CODE = _code_only(SW)


def _registration(page: str) -> tuple[str, str]:
    match = re.search(
        r"serviceWorker\.register\(\s*[\"']([^\"']+)[\"']\s*,\s*\{([^}]*)\}", page
    )
    assert match, "serviceWorker.register(...) nicht gefunden"
    return match.group(1), match.group(2)


# ----------------------------------------------------------- Verdrahtung


def test_index_registers_the_worker():
    path, _ = _registration(HTML)
    assert path == "/base3/sw.js"


def test_only_the_index_registers_it():
    """404.html bleibt bewusst JS-frei (siehe tests/test_404.py) — eine
    Fehlerseite lädt keine Ressourcen nach, die auf ihr entbehrlich sind."""
    assert "<script" not in NOT_FOUND


def test_scope_stays_inside_the_worker_directory():
    """Ein Service Worker darf nur sein eigenes Verzeichnis kontrollieren —
    GitHub Pages serviert das Repo unter /base3/."""
    path, options = _registration(HTML)
    scope = re.search(r"scope:\s*[\"']([^\"']+)[\"']", options)
    assert scope, "scope fehlt"
    assert scope.group(1) == "/base3/"
    assert path.startswith(scope.group(1))


def test_registration_is_deferred_to_load():
    """Registrierung auf load, damit sie dem Seitenaufbau nicht im Weg steht,
    und nur wenn der Browser Service Worker kann."""
    assert "'serviceWorker' in navigator" in HTML
    assert re.search(r"addEventListener\(['\"]load['\"]", HTML)


def test_worker_is_referenced_and_staged():
    """Die Registrierung ist ein JS-Aufruf, kein href/src — ohne diese Prüfung
    könnte sw.js live 404en, während alle anderen Wächter grün bleiben."""
    check = _deploy_check()
    assert "sw.js" in check.referenced_files()
    staged, _ = check.staged_files()
    assert "sw.js" in staged
    urls = check.expected_urls(check.DEFAULT_BASE_URL)
    assert urls["sw.js"] == "https://bumblei3.github.io/base3/sw.js"


# ----------------------------------------------------------- Strategie


def test_navigation_is_network_first():
    """Online immer die frische Datei: der Cache darf bei Navigationen nie
    gewinnen, sonst sind Pills, FAQ und Seitentext veraltet."""
    handler = re.search(r"self\.addEventListener\('fetch'.*", CODE, re.S).group(0)
    assert "request.mode === 'navigate'" in handler
    assert "fromNetwork(request).catch(() => offlineNavigation(request))" in handler


def test_there_is_no_cache_first_for_navigations():
    """Kein Pfad darf für Navigationen zuerst in den Cache schauen."""
    handler = re.search(r"self\.addEventListener\('fetch'.*", CODE, re.S).group(0)
    navigate = handler.split("request.mode === 'navigate'", 1)[1]
    navigate = navigate.split("return;", 1)[0]
    assert "caches.match(request)" not in navigate


def test_only_same_origin_get_requests_are_handled():
    assert "request.method !== 'GET'" in CODE
    assert "url.origin !== self.location.origin" in CODE


def test_offline_navigation_is_not_a_blank_page():
    """Offline-Navigation: exakte URL → 404-Seite → Startseite → Fehler."""
    assert "offlineNavigation" in CODE
    assert "caches.match('404.html')" in CODE
    assert "caches.match('index.html')" in CODE
    assert "Response.error()" in CODE


def test_old_caches_are_dropped_on_activate():
    """Ohne Aufräumen bliebe ein alter Cache-Name liegen und servierte nach
    einer Strategie-Änderung noch die bisherige Variante."""
    assert "caches.delete" in CODE
    assert "key !== CACHE_NAME" in CODE
    assert "self.clients.claim()" in CODE


def test_install_survives_a_single_missing_file():
    """cache.addAll würde die ganze Installation abbrechen, sobald eine Datei
    fehlt — dann gäbe es gar keinen Offline-Fallback."""
    assert "addAll" not in CODE
    assert "cache.put(url, response)" in CODE


# ----------------------------------------------------------- Precache


def test_precache_entries_exist_in_the_repo():
    """Jeder Eintrag muss existieren, sonst wird er nur vergeblich gesucht —
    und ein Tippfehler im Precache fällt sonst niemandem auf."""
    shell = re.search(r"const SHELL = \[(.*?)\];", SW, re.S)
    assert shell, "SHELL-Liste nicht gefunden"
    entries = re.findall(r"['\"]([^'\"]+)['\"]", shell.group(1))
    assert len(entries) >= 8, f"nur {len(entries)} Precache-Einträge"
    for entry in entries:
        assert (BASE3 / entry).is_file(), f"sw.js precache {entry}: Datei fehlt im Repo"


def test_precache_covers_the_fonts():
    """Ohne Schriften rendert die Offline-Seite in Systemschrift — das fällt
    auf, ist aber kein Ausfall. Bewusst im Kernel."""
    for font in ("assets/fonts/outfit-latin.woff2", "assets/fonts/jetbrains-mono-latin.woff2"):
        assert font in SW


@pytest.mark.parametrize("entry", ["index.html", "404.html", "manifest.webmanifest"])
def test_precache_covers_the_shell(entry):
    assert f"'{entry}'" in SW


# ----------------------------------------------------------- Doku


def test_faq_no_longer_claims_the_page_needs_a_connection():
    """Die FAQ behauptete „braucht eine Internetverbindung“ — mit dem Service
    Worker ist das falsch. Der Test verhindert, dass die alte Behauptung
    wiederkommt, während der SW schon existiert."""
    assert "Service Worker" in FAQ
    offline = FAQ.split("## Ist base3 offline-fähig?", 1)[1].split("## ", 1)[0]
    assert "braucht eine" not in offline
    assert "network-first" in offline
