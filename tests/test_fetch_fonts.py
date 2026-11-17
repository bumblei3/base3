import importlib.util
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("fetch_fonts", ROOT / "scripts" / "fetch-fonts.py")
ff = importlib.util.module_from_spec(spec)
sys.modules["fetch_fonts"] = ff
spec.loader.exec_module(ff)


def test_slug():
    assert ff.slug("Outfit") == "outfit"
    assert ff.slug("JetBrains Mono") == "jetbrains-mono"


def test_face_re_matches():
    sample = "/* latin */ @font-face { font-family: 'Outfit'; font-weight: 400; src: url(https://x/y.woff2); }"
    m = ff.FACE_RE.search(sample)
    assert m is not None
    assert m.group("subset") == "latin"


def test_nach_dem_laden_wird_gestützt():
    """Ohne den Schritt lädt der Besucher auch nie genutzte Glyphen mit.

    Beide Dateien sind per Preload auf dem kritischen Pfad — 40,8 KB statt
    29,7 KB waren es vor der Stützung.
    """
    quelle = (ROOT / "scripts" / "fetch-fonts.py").read_text(encoding="utf-8")
    assert "subset-fonts.py" in quelle, "fetch-fonts.py stützt die Schriften nicht mehr"
    assert "subset_out" in quelle, "der Stützschritt wird nicht aufgerufen"


def test_gewichtsbereich_kommt_aus_der_achse():
    """Die Regel darf enger sein als die fvar-Achse — sonst klemmt der Browser.

    Der Bereich wird aus dem Font gelesen, nicht aus den angefragten Gewichten.
    """
    quelle = (ROOT / "scripts" / "fetch-fonts.py").read_text(encoding="utf-8")
    assert "_gewichtsbereich" in quelle, "der Gewichtsbereich wird nicht aus der fvar-Achse gelesen"
