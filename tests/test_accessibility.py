"""Tests für Kontrast-Check und Accessibility-Markup der Landing Page."""

import importlib.util
import sys
from pathlib import Path

BASE3 = Path(__file__).resolve().parent.parent

_spec = importlib.util.spec_from_file_location(
    "check_contrast", BASE3 / "scripts" / "check-contrast.py"
)
assert _spec is not None and _spec.loader is not None
cc = importlib.util.module_from_spec(_spec)
sys.modules["check_contrast"] = cc
_spec.loader.exec_module(cc)

HTML = (BASE3 / "index.html").read_text(encoding="utf-8")


# ------------------------------------------------------------- Mathe
def test_ratio_extremes():
    assert abs(cc.contrast_ratio("#ffffff", "#000000") - 21.0) < 0.01
    assert abs(cc.contrast_ratio("#000000", "#ffffff") - 21.0) < 0.01
    assert cc.contrast_ratio("#ffffff", "#ffffff") == 1.0


def test_detects_insufficient_contrast():
    assert cc.contrast_ratio("#777777", "#ffffff") < cc.AA_NORMAL
    assert cc.contrast_ratio("#818cf8", "#05071a") >= cc.AA_NORMAL


# ------------------------------------------------------- reale Seite
def test_real_palette_has_no_failures():
    """Die committede Palette muss alle AA-Schwellen bestehen."""
    failures = [
        (name, cc.contrast_ratio(fg, bg), large)
        for name, fg, bg, large in cc.PAIRS
        if cc.contrast_ratio(fg, bg) < (cc.AA_LARGE if large else cc.AA_NORMAL)
    ]
    assert failures == []


def test_palette_tokens_match_root_block():
    assert cc.check_palette_consistency() == []


# -------------------------------------------------- Accessibility-Markup
def test_skip_link_exists_and_targets_main():
    assert 'class="skip-link"' in HTML
    assert 'href="#main-content"' in HTML
    assert 'id="main-content"' in HTML


def test_focus_visible_styles_exist():
    assert ":focus-visible" in HTML
    assert ":focus:not(:focus-visible)" in HTML


def test_how_to_label_uses_the_pill_rule():
    assert ".whats-new-label,\n    .how-to-label {" in HTML


def test_how_to_labels_do_not_shrink():
    assert ".how-to-list li strong { flex: none; white-space: nowrap; }" in HTML


def test_stats_omit_the_slogan():
    assert "Möglichkeiten" not in HTML
    assert ">2</div><div class=\"stat-label\">Spiele</div>" in HTML


def test_platform_cards_stack_below_768px():
    mobile = HTML.split("@media (max-width: 768px)", 1)[1].split("@media", 1)[0]
    assert ".platform-cards { grid-template-columns: 1fr; }" in mobile
    assert ".platform-cards { display: grid; grid-template-columns: 1fr 1fr;" in HTML


def test_platform_intro_is_left_aligned():
    assert "text-align: left;" in HTML.split(".platform-text {", 1)[1].split("}", 1)[0]
    assert "text-align: left;" in HTML.split(".platform-card {", 1)[1].split("}", 1)[0]
    assert "text-align: center;" in HTML.split(".platform-heading {", 1)[1].split("}", 1)[0]


def test_how_to_cards_are_left_aligned():
    assert "text-align: left;" in HTML.split(".how-to-card {", 1)[1].split("}", 1)[0]
    assert "text-align: center;" in HTML.split(".how-to-heading {", 1)[1].split("}", 1)[0]


def test_faq_cards_are_left_aligned():
    assert ".faq-card {" in HTML
    assert "text-align: left;" in HTML.split(".faq-card {", 1)[1].split("}", 1)[0]
    assert "text-align: center;" in HTML.split(".faq-q {", 1)[1].split("}", 1)[0]


def test_faq_grid_is_two_columns_from_700px():
    assert ".faq-grid { display: grid; grid-template-columns: 1fr;" in HTML
    assert "@media (min-width: 700px)" in HTML
    assert ".faq-grid { grid-template-columns: 1fr 1fr; }" in HTML


def test_landing_page_omits_siehe_auch_card():
    assert '<h3 class="faq-q">Siehe auch</h3>' not in HTML
    faq = (BASE3 / "FAQ.md").read_text(encoding="utf-8")
    assert "## Siehe auch" in faq


def test_play_faq_uses_demo_names():
    assert ">Schach9x9 Live-Demo</a>" in HTML
    assert ">Trischach Live-Demo</a>" in HTML
    assert ">https://bumblei3.github.io/schach9x9/</a>" not in HTML
    assert ">https://bumblei3.github.io/trischach/</a>" not in HTML
    faq = (BASE3 / "FAQ.md").read_text(encoding="utf-8")
    assert "[Schach9x9 Live-Demo](https://bumblei3.github.io/schach9x9/)" in faq
    assert "[Trischach Live-Demo](https://bumblei3.github.io/trischach/)" in faq


def test_navigation_has_aria_label():
    assert 'aria-label="Hauptnavigation"' in HTML


def test_images_have_alt_text():
    import re

    imgs = re.findall(r"<img [^>]*>", HTML)
    assert imgs, "keine Bilder gefunden"
    for img in imgs:
        assert "alt=" in img, f"img ohne alt: {img}"


def test_language_attribute_set():
    assert '<html lang="de">' in HTML
