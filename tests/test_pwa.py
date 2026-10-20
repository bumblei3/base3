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
    icons = {(icon["sizes"], icon["purpose"]): icon["src"] for icon in payload["icons"]}
    assert icons[("192x192", "any")] == "/base3/icon-192.png"
    assert icons[("512x512", "any")] == "/base3/icon-512.png"
    assert icons[("512x512", "maskable")] == "/base3/icon-maskable-512.png"
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


# ---------------------------------------------------------------- Manifest


def _manifest() -> dict:
    return json.loads((BASE3 / "manifest.webmanifest").read_text(encoding="utf-8"))


def test_manifest_metadata_for_the_install_prompt():
    payload = _manifest()
    assert payload["lang"] == "de" and payload["dir"] == "ltr"
    assert payload["categories"], "categories fehlen"
    assert payload["display"] == "standalone"


def test_installable_with_and_without_masking():
    """Installierbar braucht ≥1 'any'-Icon ≥144px; 'maskable' verhindert das
    verkleinerte Icon im Kreis (Android/Chrome)."""
    icons = _manifest()["icons"]
    any_icons = [i for i in icons if "any" in i["purpose"].split()]
    maskable = [i for i in icons if "maskable" in i["purpose"].split()]
    assert any_icons and maskable, f"icon purposes: {[i['purpose'] for i in icons]}"
    for icon in any_icons:
        assert int(icon["sizes"].split("x")[0]) >= 144, icon


def test_maskable_icon_is_full_bleed():
    """Maskable heißt: randlos. Transparente Ecken würden beim kreisförmigen
    Zuschnitt als dunkle Kerben sichtbar."""
    with Image.open(BASE3 / "icon-maskable-512.png") as im:
        assert im.size == (512, 512)
        for corner in ((0, 0), (511, 0), (0, 511), (511, 511)):
            assert im.getpixel(corner)[3] == 255, f"Ecke {corner} ist transparent"


@pytest.mark.parametrize("key", ["icons", "screenshots"])
def test_declared_asset_sizes_match_the_files(key):
    for entry in _manifest()[key]:
        path = (BASE3 / entry["src"].removeprefix("/base3/")).resolve()
        assert path.is_file(), f"{entry['src']} fehlt"
        width, height = (int(v) for v in entry["sizes"].split("x"))
        with Image.open(path) as im:
            assert im.size == (width, height), (
                f"{path.name} ist {im.size}, deklariert {entry['sizes']}"
            )


def test_shortcuts_point_into_the_scope_and_hit_real_anchors():
    html = HTML
    for shortcut in _manifest()["shortcuts"]:
        url = shortcut["url"]
        assert url.startswith("/base3/"), f"Shortcut außerhalb des Scopes: {url}"
        fragment = url.split("#", 1)[1]
        assert f'id="{fragment}"' in html, f"Anker #{fragment} gibt es nicht"


def test_every_manifest_asset_is_deployed():
    """Sonst ist Icon oder Screenshot live 404 (dieselbe Falle wie bei den Favicons)."""
    import importlib.util
    import sys

    spec = importlib.util.spec_from_file_location(
        "check_deployed_pwa", BASE3 / "scripts" / "check-deployed.py"
    )
    module = importlib.util.module_from_spec(spec)
    sys.modules["check_deployed_pwa"] = module
    spec.loader.exec_module(module)

    urls = module.expected_urls(module.DEFAULT_BASE_URL)
    for entry in _manifest()["icons"] + _manifest()["screenshots"]:
        assert entry["src"].removeprefix("/base3/") in urls, f"{entry['src']} wird nicht ausgeliefert"
