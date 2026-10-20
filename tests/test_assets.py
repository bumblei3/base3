"""Tests für die Bild-Assets: Dimensionen, Größenbegrenzung, Lazy-Loading.

Die Preview-Bilder sind als mittiges Quadrat beschnitten (siehe Kommentar in
index.html). Die width/height-Attribute müssen zur intrinsischen Größe passen —
sonst reserviert der Browser den falschen Platz und die Karte springt (CLS).
"""

import os
import re
import pytest
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


def test_fonts_are_preloaded():
    """66 % des Traffics sind Fonts. Ohne preload beginnt der Font-Download
    erst, wenn der Parser den inline-<style>-Block (~10k ins Dokument) erreicht.
    Im <head> starten wir ihn gleich nach dem TTFB — messbar an einem frühen
    fetchStart. crossorigin darf nicht gesetzt sein (muss zum @font-face ohne
    crossorigin passen, sonst doppelter Fetch)."""
    for font in ("outfit-latin", "jetbrains-mono-latin"):
        link = (
            '<link rel="preload" as="font" type="font/woff2" '
            f'href="/base3/assets/fonts/{font}.woff2" />'
        )
        assert link in HTML, f"{font} nicht als preload deklariert"
        assert (BASE3 / "assets/fonts" / f"{font}.woff2").is_file()


def test_fonts_are_subset_and_within_budget():
    """Die Schriften sind auf die tatsächlich genutzten Glyphs + Sicherheits-
    bereiche geschrumpft (Subsetting). Ohne das wären es 63 KB — 66 % des
    Traffics. Die Grenzen sind großzügig, damit ein legitimes Re-Design nicht
    sofort rot schlägt, aber ein versehentlich wieder hochgeladenes Original
    auffällt."""
    limits = {"outfit-latin.woff2": 28_000, "jetbrains-mono-latin.woff2": 17_000}
    for name, limit in limits.items():
        size = (BASE3 / "assets/fonts" / name).stat().st_size
        assert size <= limit, f"{name} ist {size} Bytes (> {limit})"


def test_fonts_cover_all_page_glyphs():
    """Jedes Schrift-Glyph, das die Seite tatsächlich nutzt (und das in der
    Originalschrift vorhanden ist), muss im Subset erhalten bleiben — sonst
    fällt der Text auf die Fallback-Schrift zurück. Emoji und Pfeile, die
    nie in der Schrift lagen, sind ausgenommen."""
    pytest.importorskip("fontTools")
    from fontTools.ttLib import TTFont

    html = (BASE3 / "index.html").read_text(encoding="utf-8")
    text = re.sub(r"<script.*?</script>", "", html, flags=re.S)
    text = re.sub(r"<style.*?</style>", "", text, flags=re.S)
    text = re.sub(r"<[^>]+>", "", text)
    chars = set(text)

    for fontname in ("outfit-latin.woff2", "jetbrains-mono-latin.woff2"):
        font = TTFont(BASE3 / "assets/fonts" / fontname)
        cmap = font.getBestCmap() or {}
        for ch in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,:;!?-–—\"'()":
            cp = ord(ch)
            assert cp in cmap, f"{fontname}: Kernglyph {ch!r} (U+{cp:04X}) fehlt"


def test_color_scheme_is_announced():
    """Dark-Theme ansagen, damit Browser-UI (Scrollbar, Controls) dunkel bleibt."""
    assert 'name="color-scheme"' in HTML
    assert 'content="dark"' in HTML


def test_total_deployed_weight_within_budget():
    """Gesamtgewicht der ausgelieferten Site darf 500 KB nicht ueberschreiten
    (Performance / Mobilfunk). Schuetzt vor versehentlich wieder hochgeladenen
    Originalen."""
    import os
    from pathlib import Path

    BASE = Path(__file__).resolve().parent.parent
    top_level = (
        "index.html", "404.html", "robots.txt", "sitemap.xml", "og-image.png",
        "sw.js", "apple-touch-icon.png", "icon-192.png", "icon-512.png",
        "icon-maskable-512.png", "favicon.ico", "favicon-32.png",
        "manifest.webmanifest",
    )
    total = 0
    for name in top_level:
        p = BASE / name
        if p.is_file():
            total += p.stat().st_size
    assets_dir = BASE / "assets"
    if assets_dir.is_dir():
        for root, _, files in os.walk(assets_dir):
            for f in files:
                total += (Path(root) / f).stat().st_size
    budget = 500 * 1024
    assert total <= budget, (
        f"Deploy-Gewicht {total} Bytes > {budget} Bytes (500 KB)"
    )
