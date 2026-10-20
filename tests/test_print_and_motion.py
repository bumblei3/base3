"""Tests für Bewegung-reduziert und Druckausgabe.

Zwei Zustände, die im Browser kaum jemand prüft und die trotzdem echte Nutzer
treffen:

1. `prefers-reduced-motion: reduce` — der Block schaltet `animation: none`.
   Elemente, die ihren Startzustand mit `opacity: 0` definieren und erst durch
   die Animation sichtbar werden, bleiben dann dauerhaft unsichtbar.
2. Drucken — Papier ist weiß, und Browser drucken Hintergründe nicht. Die
   hellen Textfarben (#f1f5f9 …) landen damit auf weißem Papier.
"""

import re
from pathlib import Path

BASE3 = Path(__file__).resolve().parent.parent
HTML = (BASE3 / "index.html").read_text(encoding="utf-8")
STYLE = HTML[HTML.index("<style>") + len("<style>"):HTML.index("</style>")]


def _block(header_regex: str) -> str:
    """Den Inhalt eines @media-Blocks über Klammerzählung holen."""
    match = re.search(header_regex, STYLE)
    if not match:
        return ""
    start = STYLE.index("{", match.start())
    depth, i = 0, start
    while i < len(STYLE):
        if STYLE[i] == "{":
            depth += 1
        elif STYLE[i] == "}":
            depth -= 1
            if depth == 0:
                return STYLE[start + 1:i]
        i += 1
    raise AssertionError(f"Block {header_regex} ist nicht geschlossen")


def _rules(css: str) -> list[tuple[str, str]]:
    """(Selektor, Deklarationen) — Kommentare aus dem Selektor entfernt."""
    rules = []
    for match in re.finditer(r"([^{}]+)\{([^}]*)\}", css):
        selector = re.sub(r"/\*.*?\*/", "", match.group(1), flags=re.S)
        selector = " ".join(selector.split())
        if selector:
            rules.append((selector, match.group(2).strip()))
    return rules


def _animated_but_hidden() -> set[str]:
    """Selektoren, die ohne Animation unsichtbar blieben (opacity: 0 + forwards)."""
    found = set()
    for selector, body in _rules(STYLE):
        if re.search(r"opacity:\s*0\s*;", body) and re.search(r"animation:[^;]*forwards", body):
            found.add(" ".join(selector.split()))
    return found


def test_there_are_animated_intro_rules_to_guard():
    """Selbsttest: ohne diese Regeln prüft der Test unten nichts."""
    assert _animated_but_hidden(), "keine animierten opacity:0-Selektoren gefunden"


def test_reduced_motion_keeps_animated_content_visible():
    reduced = _block(r"@media\s*\(prefers-reduced-motion:\s*reduce\)")
    assert reduced, "kein prefers-reduced-motion-Block"
    assert "animation: none" in reduced
    missing = []
    for selector in sorted(_animated_but_hidden()):
        pattern = re.escape(selector) + r"[^{}]*\{[^}]*opacity:\s*1"
        if not re.search(pattern, reduced):
            missing.append(selector)
    assert not missing, (
        "unter prefers-reduced-motion bleibt unsichtbar (Startzustand opacity: 0, "
        f"Animation aus): {missing}"
    )


def test_print_block_exists_and_inverts_the_palette():
    css = _block(r"@media\s*print")
    assert css, "kein @media print-Block — heller Text landet auf weißem Papier"
    assert re.search(r"background:\s*#fff", css), "Druckhintergrund nicht auf Weiß gesetzt"
    # Text muss auf Papier dunkel sein, nicht hell
    assert re.search(r"--color-text-primary:\s*#1[0-9a-f]{2}", css, re.I), (
        "Textfarben werden für den Druck nicht abgedunkelt"
    )


def test_print_block_suppresses_decorations():
    css = _block(r"@media\s*print")
    for decor in ("body::before", ".top-nav", ".hero-badge"):
        assert decor in css, f"{decor} fehlt in den Print-Regeln (Deko/Interaktion auf Papier)"


def test_print_keeps_cards_whole_and_shows_link_targets():
    css = _block(r"@media\s*print")
    assert "break-inside: avoid" in css, "Karten dürfen nicht über Seiten umbrechen"
    assert re.search(r"a\[href\^=\"http\"\]::after", css), "Link-Ziele werden nicht ausgedruckt"