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


def test_hauptpfad_laueft_bis_zum_subset(monkeypatch, tmp_path, capsys):
    """download → @font-face aus der fvar-Achse → subset.

    Der Pfad war nie ganz ausgeführt (er braucht Google). Seit der
    Zusammenführung mit subset-fonts.py lief `main()` noch über einen
    Zweig, den kein Test berührte.
    """
    import shutil

    css = ""
    for familie, gewichte in ff.FAMILIES.items():
        for gewicht in gewichte:
            css += (
                "/* latin */\n"
                "@font-face { font-family: '%s'; font-style: normal; "
                "font-weight: %d; src: url(https://fonts.gstatic.com/%s-%d.woff2) "
                "format('woff2'); }\n" % (familie, gewicht, ff.slug(familie), gewicht)
            )
    monkeypatch.setattr(ff, "fetch_css", lambda: css)

    # Google liefert für jedes Gewicht derselben Variable Font dieselbe
    # Datei — das Script gruppiert nach URL.
    quellen = {
        "outfit": ROOT / "assets" / "fonts" / "outfit-latin.woff2",
        "jetbrains-mono": ROOT / "assets" / "fonts" / "jetbrains-mono-latin.woff2",
    }

    def fake_download(url, target):
        schlüssel = "outfit" if "outfit" in url else "jetbrains-mono"
        shutil.copy(quellen[schlüssel], target)
        return target.stat().st_size

    monkeypatch.setattr(ff, "download", fake_download)
    ausgabe = tmp_path / "fonts"
    monkeypatch.setattr(sys, "argv", ["fetch-fonts.py", "--out", str(ausgabe)])

    assert ff.main() == 0, "fetch-fonts.py endet nicht mit 0"

    regeln = capsys.readouterr().out
    assert "font-weight: 100 900;" in regeln, "Outfit-Regel nutzt nicht die fvar-Achse"
    assert "font-weight: 400 800;" in regeln, "JetBrains-Regel nutzt nicht die fvar-Achse"

    for name, quelle in quellen.items():
        pfad = ausgabe / f"{name}-latin.woff2"
        assert pfad.is_file(), f"{pfad.name} fehlt in der Ausgabe"
        assert pfad.stat().st_size <= quelle.stat().st_size, (
            f"{pfad.name} ist nach dem Subset nicht kleiner"
        )
