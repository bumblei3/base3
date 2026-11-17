"""Tests für die gestützten Schriften (Zeichenmenge und Gewichtsbereich).

Hintergrund: beide woff2 liegen per `<link rel="preload">` auf dem kritischen
Pfad. Gestützt auf die tatsächlich genutzten Zeichen waren es 29,7 KB statt
40,8 KB — die Differenz lädt sonst jeder Besucher mit.

Zwei Fallen, die diese Tests schließen:

1. Ein neu ins Markup aufgenommener Buchstabe ohne Neu-Stützung fällt
   stillschweigend auf die Systemschrift zurück (anders gestylt, manchmal
   auch eine Leerstelle).
2. Die `@font-face`-Regel darf die fvar-Achse des Fonts nicht schmaler
   deklarieren als sie ist — der Browser klemmt `font-weight`-Werte dann
   still auf den Rand (Outfit war 300–800 deklariert, hat 100–900; JetBrains
   Mono 400–600 bei 400–800).
"""

import importlib.util
import re
import sys
from pathlib import Path

BASE3 = Path(__file__).resolve().parent.parent
FONT_DIR = BASE3 / "assets" / "fonts"
HTML = (BASE3 / "index.html").read_text(encoding="utf-8")

_spec = importlib.util.spec_from_file_location("subset_fonts", BASE3 / "scripts" / "subset-fonts.py")
assert _spec is not None and _spec.loader is not None
sf = importlib.util.module_from_spec(_spec)
sys.modules["subset_fonts"] = sf
_spec.loader.exec_module(sf)

FACE_RE = re.compile(r"@font-face\s*\{(?P<body>.*?)\}", re.S)
WOFF2_MAGIC = b"wOF2"


def _faces() -> list[dict]:
    out = []
    for match in FACE_RE.finditer(HTML):
        body = match.group("body")
        src = re.search(r"url\('([^']+)'\)", body)
        weight = re.search(r"font-weight:\s*([\d ]+);", body)
        assert src and weight, body[:80]
        out.append({"path": src.group(1), "weights": [int(w) for w in weight.group(1).split()]})
    return out


def test_jede_datei_ist_woff2_und_unter_dem_budget():
    """Die Schriften sind der größte Posten auf dem kritischen Pfad."""
    dateien = sorted(FONT_DIR.glob("*.woff2"))
    assert len(dateien) == 2, f"erwartet zwei Schriften, gefunden: {[d.name for d in dateien]}"
    for datei in dateien:
        assert datei.read_bytes()[:4] == WOFF2_MAGIC, f"{datei.name} ist kein woff2"
    gesamt = sum(d.stat().st_size for d in dateien)
    assert gesamt <= 45 * 1024, (
        f"Schriften zusammen {gesamt/1024:.1f} KB — über dem Budget von 45 KB. "
        "scripts/subset-fonts.py läuft noch nicht oder die Zeichenmenge ist gewachsen."
    )


def test_jedes_genutzte_zeichen_ist_im_font():
    """Nur Symbole/Emoji dürfen auf die Systemschrift ausweichen."""
    cmap = {}
    for datei in FONT_DIR.glob("*.woff2"):
        cmap[datei.name] = sf._cmap(datei)
    gemeinsam = set().union(*cmap.values())

    fehlend = [
        z for z in sf.used_characters()
        if ord(z) not in gemeinsam and ord(z) not in sf.AUSNAHMEN
    ]
    assert not fehlend, (
        "Zeichen werden gerendert, haben aber keine Glyphe: "
        f"{''.join(sorted(fehlend))!r} — scripts/subset-fonts.py neu laufen lassen"
    )


def test_die_zeichenmenge_kommt_aus_dem_markup():
    """Ein Listing im Skript würde bei jeder Markup-Änderung ins Leere laufen."""
    zeichen = sf.used_characters()
    assert "ß" in zeichen and "—" in zeichen, "Grundzeichen fehlen"
    assert len(zeichen) < 200, f"{len(zeichen)} Zeichen — die Menge ist nicht aus dem Markup gekommen"


def test_extraction_verschlingest_keinen_css_wortschatz():
    """Im HTML-Kommentar über dem Preload steht „inline-<style>".

    Wird zuerst nach <style>-Blöcken gesucht, nimmt der Ausdruck den Kommentar
    in den Block — und damit CSS-Wortschatz (und Buchstaben wie J/Y) in die
    Zeichenmenge. Genau das ist passiert; die Reihenfolge muss kleben.
    """
    zeichen = sf.used_characters()
    for wort in ("font-weight", "color:", "display", "@media"):
        assert wort not in zeichen, f"CSS-Wortschatz „{wort}“ ist in der Zeichenmenge gelandet"


def test_gewichtsbereich_deckt_die_achse_ab():
    """Eine zu schmale @font-face-Regel klemmt font-weight still."""
    for face in _faces():
        pfad = (BASE3 / face["path"].lstrip("./")).resolve()
        bereich = sf._gewichtsbereich(pfad).split()
        lo, hi = int(bereich[0]), int(bereich[-1])
        assert face["weights"][0] <= lo and face["weights"][-1] >= hi, (
            f"{pfad.name}: Regel {face['weights']} deckt die Achse "
            f"{lo}–{hi} nicht ab — font-weight würde geklemmt"
        )


def test_check_läuft_durch():
    """`--check` prüft die abgelegten Dateien ohne sie zu schreiben."""
    import subprocess

    ergebnis = subprocess.run(
        [sys.executable, str(BASE3 / "scripts" / "subset-fonts.py"), "--check"],
        capture_output=True, text=True,
    )
    assert ergebnis.returncode == 0, ergebnis.stderr
    assert "SUBSET OK" in ergebnis.stderr
