import importlib.util
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("check_contrast", ROOT / "scripts" / "check-contrast.py")
cc = importlib.util.module_from_spec(spec)
sys.modules["check_contrast"] = cc
spec.loader.exec_module(cc)


def test_luminance_black_white():
    assert cc.luminance("#000000") == 0.0
    assert cc.luminance("#ffffff") == 1.0


def test_contrast_ratio_black_white():
    assert abs(cc.contrast_ratio("#000000", "#ffffff") - 21.0) < 0.01


def test_check_palette_consistency_ok():
    errors = cc.check_palette_consistency()
    assert errors == [], errors


def test_main_returns_zero():
    assert cc.main() == 0


# --------------------------------------------------------------- Ableitung
def test_parse_color_reads_hex_and_rgba():
    assert cc._parse_color("#f1f5f9") == ((241, 245, 249), None)
    assert cc._parse_color("#fff") == ((255, 255, 255), None)
    assert cc._parse_color("rgba(20, 28, 58, 0.55)") == ((20, 28, 58), 0.55)
    assert cc._parse_color("rgba(255, 255, 255, 50%)") == ((255, 255, 255), 0.5)


def test_composite_blends_over_the_base():
    assert cc._composite(((20, 28, 58), 0.55), (5, 7, 26)) == "#0d132c"


def test_body_base_is_the_darkest_gradient_stop():
    assert cc.effective_colors()["base"] == "#05071a"


def test_surfaces_follow_the_css(monkeypatch, tmp_path):
    """Eine Palette-Änderung muss sich in der Prüfung auswirken.

    Die alte Tabelle hatte die drei Flächenfarben hartkodiert; sie lag neben
    dem CSS, und eine Änderung wäre stillschweigend falsch geblieben.
    """
    html = cc.INDEX_HTML.read_text(encoding="utf-8")
    alt = tmp_path / "index.html"
    alt.write_text(
        html.replace("--color-bg-glass: rgba(20, 28, 58, 0.55)", "--color-bg-glass: rgba(0, 0, 0, 1)"),
        encoding="utf-8",
    )
    monkeypatch.setattr(cc, "INDEX_HTML", alt)
    assert cc.effective_colors()["glass"] == "#000000"


def test_consistent_palette_has_no_hardcoded_leftovers():
    """Jede nicht abgeleitete Farbe der Tabelle muss im CSS vorkommen."""
    errors = cc.check_palette_consistency()
    assert errors == [], errors
    surfaces = set(cc.effective_colors()[name] for name in cc.DERIVED_SURFACES)
    for name, fg, bg, _ in cc.build_pairs():
        assert fg.lower() in cc.INDEX_HTML.read_text(encoding="utf-8").lower(), name
        assert bg in surfaces or bg.lower() in cc.INDEX_HTML.read_text(encoding="utf-8").lower(), name
