"""Tests für scripts/validate_landing_page.py — Tag-Balance, JSON-LD, Link-Inventar."""

import importlib.util
import sys
from pathlib import Path

import pytest

BASE3 = Path(__file__).resolve().parent.parent

_spec = importlib.util.spec_from_file_location(
    "validate_landing_page", BASE3 / "scripts" / "validate_landing_page.py"
)
assert _spec is not None and _spec.loader is not None
vlp = importlib.util.module_from_spec(_spec)
sys.modules["validate_landing_page"] = vlp
_spec.loader.exec_module(vlp)

REAL = (BASE3 / "index.html").read_text(encoding="utf-8")


# ------------------------------------------------------------ Tag-Balance
def test_real_page_is_balanced():
    assert vlp.check_tag_balance(REAL) == []


def test_detects_unclosed_tag():
    errors = vlp.check_tag_balance("<div><span>x</span>")
    assert any("unclosed <div>" in e for e in errors)


def test_detects_orphan_closing_tag():
    errors = vlp.check_tag_balance("<div></p></div>")
    assert any("orphan </p>" in e for e in errors)


def test_detects_mismatched_nesting():
    errors = vlp.check_tag_balance("<div><p></div></p>")
    assert any("mismatch" in e for e in errors)


def test_void_tags_do_not_need_closing():
    assert vlp.check_tag_balance("<br><img src='x.png'><hr>") == []


# --------------------------------------------------------------- JSON-LD
def test_real_page_jsonld_is_valid():
    assert vlp.check_jsonld(REAL) == []


def test_detects_invalid_jsonld():
    errors = vlp.check_jsonld('<script type="application/ld+json">{"a": }</script>')
    assert errors and "ungültig" in errors[0]


def test_detects_missing_jsonld():
    assert vlp.check_jsonld("<html><body>nichts</body></html>")


# ---------------------------------------------------------- Link-Inventar
def test_collects_outbound_links():
    links = set(vlp.collect_links(REAL))
    # Die sechs Ziele, die die Seite nach außen anbietet (drei Demos, drei Repos).
    expected = {
        "https://bumblei3.github.io/schach9x9/",
        "https://bumblei3.github.io/trischach/",
        "https://github.com/bumblei3/base3",
        "https://github.com/bumblei3/schach9x9",
        "https://github.com/bumblei3/trischach",
        "https://bumblei3.github.io/base3/",
    }
    assert expected <= links
    # Kein Third-Party-CDN mehr (Schriften sind lokal, siehe tests/test_fonts.py)
    assert not [u for u in links if "fonts.g" in u]


def test_skips_anchors_and_data_uris():
    links = vlp.collect_links('<a href="#main">x</a><img src="data:image/png;base64,AAA">')
    assert links == []


def test_dedupes_and_sorts():
    links = vlp.collect_links('<a href="https://b.example/">1</a><a href="https://a.example/">2</a><a href="https://b.example/">3</a>')
    assert links == ["https://a.example/", "https://b.example/"]


# ------------------------------------------------------------------- main
def test_main_returns_zero_for_real_page(capsys):
    assert vlp.main() == 0
    out = capsys.readouterr().out
    assert "VALIDATION OK" in out
    assert "Tag-Balance: OK" in out
