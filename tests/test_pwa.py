"""PWA-Installierbarkeit: apple-touch-icon, manifest, link-Elemente."""

import json
from pathlib import Path

import pytest
from PIL import Image

BASE3 = Path(__file__).resolve().parent.parent
HTML = (BASE3 / "index.html").read_text(encoding="utf-8")


def test_install_icons_match_the_favicon_pawn():
    """180, 192 und 512: gleicher Bauer, jede Größe neu gezeichnet. Ecken transparent, Platte #0a0f28, Bauer #31c48d."""
    for name, size in (
        ("apple-touch-icon.png", 180),
        ("icon-192.png", 192),
        ("icon-512.png", 512),
    ):
        with Image.open(BASE3 / name) as im:
            assert im.size == (size, size), f"{name} ist {im.size}"
            assert im.mode == "RGBA"
            assert im.getpixel((0, 0))[3] == 0
            assert im.getpixel((size // 2, size // 2))[:3] == (49, 196, 141)
            assert im.getpixel((size // 2, size // 5))[:3] == (10, 15, 40)


def test_manifest_parses():
    payload = json.loads((BASE3 / "manifest.webmanifest").read_text(encoding="utf-8"))
    assert payload["name"]
    assert payload["short_name"] == "Base3"
    # Projektseite: Pfade unter /base3/, sonst zeigt GitHub Pages auf die Domain-Wurzel.
    assert payload["id"] == "/base3/"
    assert payload["start_url"] == "/base3/"
    assert payload["scope"] == "/base3/"
    assert payload["theme_color"] == "#02040a"
    assert 'name="theme-color" content="#02040a"' in HTML
    icons = {icon["sizes"]: icon for icon in payload["icons"]}
    assert icons["192x192"]["src"] == "/base3/icon-192.png"
    assert icons["512x512"]["src"] == "/base3/icon-512.png"
    assert icons["192x192"]["purpose"] == "any"
    assert icons["512x512"]["purpose"] == "any"
    assert all("apple-touch-icon" not in icon["src"] for icon in payload["icons"])


def test_html_links_the_pwa_files():
    assert 'rel="apple-touch-icon"' in HTML
    assert 'rel="manifest"' in HTML
    assert 'href="/base3/apple-touch-icon.png"' in HTML
    assert 'href="/base3/manifest.webmanifest"' in HTML
    assert 'href="/apple-touch-icon.png"' not in HTML
    assert 'href="/manifest.webmanifest"' not in HTML


def test_faq_mentions_project_page_install():
    faq = (BASE3 / "FAQ.md").read_text(encoding="utf-8")
    phrase = "Web-Manifest unter /base3/"
    assert phrase in HTML
    assert phrase in faq


def test_pwa_files_are_small():
    assert (BASE3 / "apple-touch-icon.png").stat().st_size < 20_000
    assert (BASE3 / "icon-192.png").stat().st_size < 20_000
    assert (BASE3 / "icon-512.png").stat().st_size < 20_000
    assert (BASE3 / "manifest.webmanifest").stat().st_size < 2_000
