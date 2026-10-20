"""Tests für die Bild-Assets: Dimensionen, Größenbegrenzung, Lazy-Loading.

Die Preview-Bilder sind als mittiges Quadrat beschnitten (siehe Kommentar in
index.html). Die width/height-Attribute müssen zur intrinsischen Größe passen —
sonst reserviert der Browser den falschen Platz und die Karte springt (CLS).
"""

import os
import re
from pathlib import Path

BASE3 = Path(__file__).resolve().parent.parent
ASSETS = BASE3 / "assets"
HTML = (BASE3 / "index.html").read_text(encoding="utf-8")

# Grenzen in KB — bewusst großzügig, damit ein legitimes Re-Design nicht sofort
# rot schlägt, aber ein versehentlich wieder hochgeladenes Original auffällt.
LIMITS_KB = {"webp": 20, "png": 150}


def _images() -> list[tuple[str, int, int, str]]:
    """(dateiname, width, height, src) für alle <img> in index.html."""
    out = []
    for match in re.finditer(r"<img ([^>]*)/>", HTML):
        attrs = match.group(1)
        src_match = re.search(r'src="([^"]+)"', attrs)
        width_match = re.search(r'width="(\d+)"', attrs)
        height_match = re.search(r'height="(\d+)"', attrs)
        assert src_match and width_match and height_match, f"img ohne src/width/height: {attrs}"
        src = src_match.group(1)
        width = int(width_match.group(1))
        height = int(height_match.group(1))
        out.append((os.path.basename(src), width, height, src))
    return out


def test_every_img_has_width_and_height():
    """Ohne beide Attribute reserviert der Browser keinen Platz (CLS-Risiko)."""
    assert _images(), "keine <img> gefunden"
    for _, width, height, _ in _images():
        assert width > 0 and height > 0


def test_intrinsic_size_matches_attributes():
    from PIL import Image

    for name, width, height, src in _images():
        with Image.open(BASE3 / src) as im:
            assert im.size == (width, height), (
                f"{name}: Datei ist {im.size[0]}x{im.size[1]}, "
                f"Attribute sagen {width}x{height}"
            )


def test_preview_images_are_small():
    for name in ("preview-schach9x9", "preview-trischach"):
        for ext, limit in LIMITS_KB.items():
            size_kb = (ASSETS / f"{name}.{ext}").stat().st_size / 1024
            assert size_kb <= limit, f"{name}.{ext} ist {size_kb:.0f} KB (> {limit} KB)"


def test_previews_are_square_and_lazy():
    for name, width, height, _ in _images():
        if name.startswith("preview-"):
            assert width == height, f"{name} sollte quadratisch sein"
    for match in re.finditer(r"<img ([^>]*preview-[^>]*)/>", HTML):
        assert 'loading="lazy"' in match.group(1), "Preview-Bilder sollten lazy sein"


def test_webp_source_is_referenced():
    assert 'type="image/webp"' in HTML
    assert re.search(r'srcset="\./assets/preview-schach9x9\.webp"', HTML)


def test_og_image_has_social_dimensions():
    from PIL import Image

    with Image.open(BASE3 / "og-image.png") as im:
        assert im.size == (1200, 630), f"og-image ist {im.size}, erwartet 1200x630"


def test_og_image_is_a_format_every_crawler_supports():
    """LinkedIn ignoriert WebP bei og:image und zeigt dann eine Karte ohne Bild;
    Slack/WhatsApp/Telegram akzeptieren es nur unzuverlässig. og:image wird nur
    von Crawlern geladen — nie vom Besucher — darum schlägt hier
    Universalkompatibilität die Dateigröße."""
    urls = re.findall(
        r'(?:property|name)="(?:og:image|og:image:secure_url|twitter:image)"'
        r'\s+content="([^"]+)"',
        HTML,
    )
    assert urls, "keine og:image-Angabe gefunden"
    for url in urls:
        assert re.search(r"\.(png|jpe?g|gif)$", url), (
            f"og:image {url}: LinkedIn unterstützt WebP/SVG nicht"
        )


def test_og_image_type_matches_the_file():
    """og:image:type muss zur Dateiendung passen — ein webp:type auf eine
    PNG-URL verhindert die Anzeige in manchen Crawlern."""
    image = re.search(
        r'property="og:image"\s+content="[^"]*\.(\w+)"', HTML
    )
    assert image, "og:image ohne erkennbare Dateiendung"
    declared = re.search(r'property="og:image:type"\s+content="([^"]+)"', HTML)
    assert declared, "og:image:type fehlt"
    expected = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "gif": "image/gif"}
    assert declared.group(1) == expected[image.group(1)], (
        f"og:image ist .{image.group(1)}, aber og:image:type sagt {declared.group(1)}"
    )


def test_color_scheme_is_announced():
    """Dark-Theme ansagen, damit Browser-UI (Scrollbar, Controls) dunkel bleibt."""
    assert 'name="color-scheme"' in HTML
    assert 'content="dark"' in HTML
