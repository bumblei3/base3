"""Tests für die selbst gehosteten Schriften (kein Netz, keine Google-Referenz).

Hintergrund: die Seite lud ihre Schriften als render-blockende CSS von
fonts.googleapis.com — ein Cross-Origin-Request vor dem ersten Paint und eine
IP-Übermittlung an Google. Diese Tests halten den Zustand "alles lokal" fest,
damit die Abhängigkeit nicht unbemerkt zurückkommt.
"""

import re
from pathlib import Path

BASE3 = Path(__file__).resolve().parent.parent
FONT_DIR = BASE3 / "assets" / "fonts"
HTML = (BASE3 / "index.html").read_text(encoding="utf-8")

FACE_RE = re.compile(r"@font-face\s*\{(?P<body>.*?)\}", re.S)
WOFF2_MAGIC = b"wOF2"


def _faces() -> list[dict]:
    out = []
    for match in FACE_RE.finditer(HTML):
        body = match.group("body")
        family = re.search(r"font-family:\s*'([^']+)'", body)
        weight = re.search(r"font-weight:\s*([\d ]+)", body)
        src = re.search(r"url\('([^']+)'\)", body)
        assert family and weight and src, f"unvollständige @font-face-Regel: {body[:80]}"
        out.append(
            {
                "family": family.group(1),
                "weights": [int(w) for w in weight.group(1).split()],
                "path": src.group(1),
            }
        )
    return out


def test_no_third_party_font_references():
    for host in ("fonts.googleapis.com", "fonts.gstatic.com"):
        assert host not in HTML, f"{host} ist wieder im Markup"


def test_no_external_stylesheet_blocks_the_render():
    """Third-Party-CSS blockiert den ersten Paint — der Grund für das Self-Hosting."""
    links = re.findall(r"<link[^>]+>", HTML)
    for link in links:
        if 'rel="stylesheet"' in link or ('rel="preload"' in link and 'as="style"' in link):
            href = re.search(r'href="([^"]+)"', link)
            assert href and not href.group(1).startswith(("http://", "https://")), (
                f"externe, render-blockende Stylesheet-Referenz: {link[:90]}"
            )


def test_every_font_face_file_exists_and_is_woff2():
    faces = _faces()
    assert faces, "keine @font-face-Regeln gefunden"
    for face in faces:
        path = (BASE3 / face["path"].lstrip("./")).resolve()
        assert path.is_file(), f"{face['path']} fehlt"
        assert path.read_bytes()[:4] == WOFF2_MAGIC, f"{path.name} ist kein woff2"


def test_no_orphan_font_files():
    """Jede abgelegte Schrift muss auch benutzt werden — sonst wandert Ballast mit."""
    referenced = {(BASE3 / f["path"].lstrip("./")).resolve() for f in _faces()}
    on_disk = {p.resolve() for p in FONT_DIR.glob("*.woff2")}
    assert on_disk == referenced, f"unbenutzt: {sorted(p.name for p in on_disk - referenced)}"
    assert on_disk, "keine Schriftdateien gefunden"


def test_declared_weight_ranges_cover_the_weights_used():
    """Ein Gewicht ohne passende @font-face-Regel wird synthetisch verfälscht."""
    without_faces = FACE_RE.sub("", HTML)
    used = {int(w) for w in re.findall(r"font-weight:\s*(\d+)", without_faces)}
    assert used, "keine font-weight-Angaben außerhalb der @font-face-Regeln gefunden"
    declared = _faces()
    uncovered = [
        w
        for w in sorted(used)
        if not any(len(f["weights"]) == 2 and f["weights"][0] <= w <= f["weights"][1]
                   or w in f["weights"] for f in declared)
    ]
    assert not uncovered, f"Gewichte ohne Schrift: {uncovered}"


def test_both_families_are_declared_and_used():
    declared = {f["family"] for f in _faces()}
    assert {"Outfit", "JetBrains Mono"} <= declared
    for family in declared:
        assert f"font-family: '{family}'" in FACE_RE.sub("", HTML), (
            f"{family} ist deklariert, wird aber nirgends verwendet"
        )


def test_fonts_are_part_of_the_deploy():
    """Sonst sind sie live 404 — dieselbe Falle wie bei den Favicons."""
    import importlib.util
    import sys

    spec = importlib.util.spec_from_file_location(
        "check_deployed_fonts", BASE3 / "scripts" / "check-deployed.py"
    )
    module = importlib.util.module_from_spec(spec)
    sys.modules["check_deployed_fonts"] = module
    spec.loader.exec_module(module)

    urls = module.expected_urls(module.DEFAULT_BASE_URL)
    for face in _faces():
        rel = face["path"].lstrip("./")
        assert rel in urls, f"{rel} wird nicht ausgeliefert (pages.yml-Staged-Liste)"
