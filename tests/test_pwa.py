"""PWA-Installierbarkeit: apple-touch-icon, manifest, link-Elemente."""

import json
from pathlib import Path

import pytest
from PIL import Image

BASE3 = Path(__file__).resolve().parent.parent
HTML = (BASE3 / "index.html").read_text(encoding="utf-8")


def test_apple_touch_icon_exists_and_is_180x180():
    from PIL import Image

    with Image.open(BASE3 / "apple-touch-icon.png") as im:
        assert im.size == (180, 180), f"nicht 180x180, sondern {im.size}"
        assert im.mode in ("RGB", "RGBA")


def test_manifest_parses():
    payload = json.loads((BASE3 / "manifest.webmanifest").read_text(encoding="utf-8"))
    assert payload["name"]
    assert payload["short_name"] == "Base3"
    assert payload.get("icons")
    assert payload["icons"][0]["sizes"] == "180x180"


def test_html_links_the_pwa_files():
    assert 'rel="apple-touch-icon"' in HTML
    assert 'rel="manifest"' in HTML
    assert "/apple-touch-icon.png" in HTML
    assert "/manifest.webmanifest" in HTML


def test_pwa_files_are_small():
    assert (BASE3 / "apple-touch-icon.png").stat().st_size < 20_000
    assert (BASE3 / "manifest.webmanifest").stat().st_size < 2_000
