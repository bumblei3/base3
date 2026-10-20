"""Wächter: pages.yml muss jede lokal referenzierte Datei ausliefern.

Der Deploy staged eine explizite Dateiliste (siehe „Stage deploy files“ in
pages.yml). Wird ein Asset in index.html oder im Manifest ergänzt, ohne die
Liste mitzuziehen, antwortet Pages mit 404 — im Browser still, in Social-Cards
und Install-Prompts sichtbar kaputt.

`scripts/check-links.py` fängt das nicht: es prüft nur ausgehende Links.
`scripts/validate_landing_page.py` prüft Tag-Balance und JSON-LD.
"""

import re
from pathlib import Path

BASE3 = Path(__file__).resolve().parent.parent
WORKFLOW = BASE3 / ".github" / "workflows" / "pages.yml"
MANIFEST = BASE3 / "manifest.webmanifest"

SITE_BASE = "https://bumblei3.github.io/base3/"
URL_PREFIX = "/base3/"

# Dateiendungen, die als lokales Asset gelten (verhindert, dass
# content="1200" oder Beschreibungstexte als Pfad durchgehen).
ASSET_SUFFIX = re.compile(r"\.(png|jpe?g|webp|svg|ico|webmanifest|xml|txt|css|js|json)$", re.I)


def _staged() -> tuple[set[str], bool]:
    """Aus pages.yml: (Dateinamen in _site/, assets/ rekursiv gestaged?)."""
    files: set[str] = set()
    assets = False
    for line in WORKFLOW.read_text(encoding="utf-8").splitlines():
        tokens = line.strip().split()
        if not tokens or tokens[0] != "cp":
            continue
        recursive = "-r" in tokens
        tokens = [t for t in tokens if not t.startswith("-")]
        dest = tokens[-1]
        sources = tokens[1:-1]
        if recursive:
            assets = assets or any(src.startswith("assets") for src in sources)
        elif dest.rstrip("/") == "_site":
            files.update(Path(src).name for src in sources)
    assert files, "keine gestagten Dateien in pages.yml gefunden"
    return files, assets


def _referenced() -> set[str]:
    """Alle lokalen Pfade, die index.html oder das Manifest referenzieren."""
    html = (BASE3 / "index.html").read_text(encoding="utf-8")
    manifest = MANIFEST.read_text(encoding="utf-8")

    raw: list[str] = []
    for match in re.finditer(r"<(?:link|img)\s[^>]*?(?:href|src)=\"([^\"]+)\"", html):
        raw.append(match.group(1))
    for match in re.finditer(r"(?:og:image|og:image:secure_url)\"\s+content=\"([^\"]+)\"", html):
        raw.append(match.group(1))
    raw.extend(re.findall(r"\"src\"\s*:\s*\"([^\"]+)\"", manifest))

    out: set[str] = set()
    for value in raw:
        if value.startswith("data:") or value.startswith("#") or "://" in value.replace(SITE_BASE, ""):
            continue
        path = value
        for prefix in (SITE_BASE, URL_PREFIX, "./", "/"):
            if path.startswith(prefix):
                path = path[len(prefix):]
                break
        if path and ASSET_SUFFIX.search(path):
            out.add(path)
    assert out, "keine lokalen Asset-Referenzen gefunden"
    return out


def test_staged_files_exist():
    """Kein Tippfehler in der Deploy-Liste; jede gestagte Datei ist da."""
    files, _ = _staged()
    for name in sorted(files):
        assert (BASE3 / name).is_file(), f"pages.yml staged {name}, die Datei fehlt im Repo"


def test_referenced_assets_exist():
    for path in sorted(_referenced()):
        assert (BASE3 / path).is_file(), f"index.html/Manifest referenziert {path}, Datei fehlt"


def test_referenced_assets_are_deployed():
    """Der eigentliche Drift-Guard: referenziert, aber nicht ausgeliefert = 404."""
    files, assets = _staged()
    missing = []
    for path in sorted(_referenced()):
        if path.startswith("assets/"):
            if not assets:
                missing.append(path + " (assets/ wird nicht rekursiv gestaged)")
        elif Path(path).name not in files:
            missing.append(path)
    assert not missing, (
        "Von index.html/Manifest referenziert, aber nicht in pages.yml gestaged "
        "(Pages würde 404 liefern): " + ", ".join(missing)
    )
