"""Tests für die Bild-Assets: Dimensionen, Größenbegrenzung, Lazy-Loading.

Die Preview-Bilder sind als mittiges Quadrat beschnitten (siehe Kommentar in
index.html). Die width/height-Attribute müssen zur intrinsischen Größe passen —
sonst reserviert der Browser den falschen Platz und die Karte springt (CLS).
"""

import importlib.util
import os
import re
import sys
import unicodedata
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

    with Image.open(BASE3 / "og-image.jpg") as im:
        assert im.size == (1200, 630), f"og-image ist {im.size}, erwartet 1200x630"


def test_og_image_template_is_evergreen():
    """Die Karte ist eine Link-Vorschau, kein Changelog.

    Sie trug einmal Versionsnummern, die vier Releases veraltet waren. Sie
    wird aus `scripts/og-image.html` gerendert — darum gilt: keine
    Versionsnummer in der Quelle, und die Quelle muss neben dem Bild liegen.
    """
    template = BASE3 / "scripts" / "og-image.html"
    assert template.is_file(), "og-image.html fehlt — og-image.jpg wäre wieder ein Handbild"
    text = template.read_text(encoding="utf-8")
    assert not re.search(r"\bv\d+\.\d+\.\d+\b", text), (
        "og-image.html enthält eine Versionsnummer — die würde beim nächsten "
        "Sub-Release falsch sein"
    )
    assert "preview-schach9x9" in text and "preview-trischach" in text, (
        "og-image.html bindet die aktuellen Karten-Vorschauen nicht ein"
    )


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
    """Jedes Schrift-Glyph, das die Seite tatsächlich nutzt, muss im Subset
    erhalten bleiben — sonst fällt der Text auf die Fallback-Schrift zurück.

    Geprüft wird der sichtbare Text, nicht der ganzeAlphabet-Satz: Pfeile,
    ☰, ♟, ⬡ und Emoji lagen nie in Outfit/JetBrains und laufen absichtlich
    über die Systemschrift. Früher stand hier `pytest.importorskip`, die
    Prüfung lief deshalb nie — und ein Kernsatz aus dem gesamten Alphabet
    hätte sie zum Schwimmen gebracht (J und Y sind nicht im Subset, werden
    auf der Seite aber auch nicht benutzt).
    """
    from fontTools.ttLib import TTFont

    html = (BASE3 / "index.html").read_text(encoding="utf-8")
    text = re.sub(r"<script.*?</script>", "", html, flags=re.S)
    text = re.sub(r"<style.*?</style>", "", text, flags=re.S)
    text = re.sub(r"<[^>]+>", "", text)

    # Buchstaben, Zahlen und Interpunktion müssen in der Schrift sein.
    required = {
        ch for ch in set(text) if unicodedata.category(ch)[0] in ("L", "N", "P")
    }
    assert required, "keine Textzeichen gefunden — der Test prüft nichts"

    for fontname in ("outfit-latin.woff2", "jetbrains-mono-latin.woff2"):
        font = TTFont(BASE3 / "assets" / "fonts" / fontname)
        cmap = font.getBestCmap() or {}
        missing = sorted(ch for ch in required if ord(ch) not in cmap)
        assert not missing, (
            f"{fontname}: Zeichen mit Systemschrift statt Outfit/JetBrains: "
            f"{''.join(missing)!r}"
        )


def test_color_scheme_is_announced():
    """Dark-Theme ansagen, damit Browser-UI (Scrollbar, Controls) dunkel bleibt."""
    assert 'name="color-scheme"' in HTML
    assert 'content="dark"' in HTML


def _deploy_weight(exclude=()) -> int:
    """Summe der ausgelieferten Dateien (Top-Level + assets/), inkl. WebP."""
    import os
    from pathlib import Path

    BASE = Path(__file__).resolve().parent.parent
    top_level = (
        "index.html", "404.html", "robots.txt", "sitemap.xml", "og-image.jpg",
        "sw.js", "apple-touch-icon.png", "icon-192.png", "icon-512.png",
        "icon-maskable-512.png", "favicon.ico", "favicon-32.png",
        "manifest.webmanifest",
    )
    total = 0
    for name in top_level:
        if name in exclude:
            continue
        p = BASE / name
        if p.is_file():
            total += p.stat().st_size
    assets_dir = BASE / "assets"
    if assets_dir.is_dir():
        for root, _, files in os.walk(assets_dir):
            for f in files:
                total += (Path(root) / f).stat().st_size
    return total


def test_visitor_payload_within_budget():
    """Die Besucher-Payload darf 500 KB nicht ueberschreiten (Mobilfunk).

    og-image.jpg ist bewusst ausgenommen: Crawler laden es, Besucher nie.
    Es wäre falsch, eine reichere Social-Karte an der Performance-Grenze
    vorbeizulassen, nur weil sie keinen Besucher kostet.
    """
    budget = 500 * 1024
    total = _deploy_weight(exclude=("og-image.jpg",))
    assert total <= budget, (
        f"Besucher-Payload {total} Bytes > {budget} Bytes (500 KB)"
    )


def test_og_image_stays_reasonable():
    """Die Social-Karte ist Crawler-only — darf trotzdem nicht wuchern."""
    limit = 100 * 1024
    size = (Path(__file__).resolve().parent.parent / "og-image.jpg").stat().st_size
    assert size <= limit, f"og-image.jpg ist {size} Bytes (> {limit} Bytes)"


def test_socialkarte_ist_nicht_aeltlich_als_die_vorschauen():
    """Die Karte bindet beide Vorschauen ein — sie muss danach gerendert sein.

    RELEASE.md sagt: „ändern sich die Spiele optisch, einfach neu rendern".
    Geprüft wird das nicht, und der Missbrauch hat keine andere Sicht: die
    Karte bleibt monatelang beim alten Bild, während die Seite schon das
    neue zeigt. Verglichen wird über die Commit-Zeiten, nicht über mtime —
    ein Checkout setzt alle mtimes auf denselben Wert.
    """
    import subprocess

    def commit_zeit(*pfade: str) -> int:
        ergebnis = subprocess.run(
            ["git", "log", "-1", "--format=%ct", "--", *pfade],
            capture_output=True, text=True, check=True, cwd=BASE3,
        ).stdout.strip()
        assert ergebnis, f"kein Commit für {pfade}"
        return int(ergebnis)

    karte = commit_zeit("og-image.jpg")
    for vorschau in (
        "assets/preview-schach9x9.png",
        "assets/preview-schach9x9.webp",
        "assets/preview-trischach.png",
        "assets/preview-trischach.webp",
    ):
        assert karte >= commit_zeit(vorschau), (
            f"{vorschau} ist neuer als og-image.jpg — die Social-Karte zeigt "
            "ein veraltetes Bild (python3 scripts/make-og-image.py)"
        )


# --------------------------------------------------- og-image-Generator (main)
def _make_og_image():
    """make-og-image.py laden — der Dateiname mit Bindestrich ist kein Modulname."""
    spec = importlib.util.spec_from_file_location(
        "make_og_image", BASE3 / "scripts" / "make-og-image.py"
    )
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules["make_og_image"] = module
    spec.loader.exec_module(module)
    return module


class _FakePage:
    """Schreibt ein PNG statt zu rendern — der Rest des Pfads bleibt echt."""

    def __init__(self, pixel_size):
        from PIL import Image

        self._image = Image.new("RGB", pixel_size, (10, 10, 20))
        self.goto_url = None
        self.clip = None

    def goto(self, url, wait_until=None):
        self.goto_url = url

    def evaluate(self, expression):
        return None

    def wait_for_timeout(self, ms):
        return None

    def screenshot(self, path, clip=None):
        self.clip = clip
        self._image.save(path)


class _FakeBrowser:
    def __init__(self, page):
        self._page = page
        self.closed = False
        self.kwargs = None

    def new_page(self, **kwargs):
        self.kwargs = kwargs
        return self._page

    def close(self):
        self.closed = True


class _FakeChromium:
    def __init__(self, browser):
        self._browser = browser
        self.launch_kwargs = None

    def launch(self, **kwargs):
        self.launch_kwargs = kwargs
        return self._browser


class _FakePlaywright:
    def __init__(self, browser):
        self.chromium = _FakeChromium(browser)


class _FakeSyncPlaywright:
    def __init__(self, playwright):
        self._playwright = playwright
        self.entered = False

    def __enter__(self):
        self.entered = True
        return self._playwright

    def __exit__(self, *args):
        return False


def _install_fake_chromium(monkeypatch, browser):
    """Ersetzt den Browser durch ein Fake — ohne ihn wäre das ein Online-Test."""
    import playwright.sync_api

    fake = _FakeSyncPlaywright(_FakePlaywright(browser))
    monkeypatch.setattr(playwright.sync_api, "sync_playwright", lambda: fake)
    return fake


def test_og_image_generator_erzeugt_jpeg_in_der_richtigen_groesse(
    tmp_path, monkeypatch, capsys
):
    """Der Generator selbst, nicht nur seine Helfer.

    make-og-image.py lief nur von Hand — ein geänderter Pfad darin bliebe
    unentdeckt, bis jemand die Karte neu rendert. Hier läuft `main()` bis zum
    Schreiben des JPEG durch; gerendert wird nicht, aber Viewport, Clip,
    Skalierung und Speicherung sind echt.
    """
    module = _make_og_image()
    ausgabe = tmp_path / "og-image.jpg"
    monkeypatch.setattr(module, "OUT", ausgabe)
    monkeypatch.setattr(module, "TEMPLATE", BASE3 / "scripts" / "og-image.html")
    monkeypatch.setattr(module, "find_chromium", lambda: "/fake/chromium")

    # DPR 2: der Screenshot ist 2400x1260 und wird auf 1200x630 skaliert.
    seite = _FakePage((module.WIDTH * module.DPR, module.HEIGHT * module.DPR))
    browser = _FakeBrowser(seite)
    fake = _install_fake_chromium(monkeypatch, browser)

    module.main()

    from PIL import Image

    with Image.open(ausgabe) as im:
        assert im.format == "JPEG", f"{im.format} statt JPEG"
        assert im.size == (module.WIDTH, module.HEIGHT), im.size
    assert seite.goto_url == (BASE3 / "scripts" / "og-image.html").as_uri()
    assert seite.clip == {
        "x": 0,
        "y": 0,
        "width": module.WIDTH,
        "height": module.HEIGHT,
    }
    assert browser.kwargs["viewport"] == {
        "width": module.WIDTH,
        "height": module.HEIGHT,
    }
    assert browser.kwargs["device_scale_factor"] == module.DPR
    assert browser.closed, "Browser nicht geschlossen"
    assert fake.entered, "sync_playwright nicht als Context Manager genutzt"
    assert not ausgabe.with_name("og-image.tmp.png").exists(), (
        "Temporärdatei nicht aufgeräumt"
    )
    assert "og-image.jpg:" in capsys.readouterr().out


def test_og_image_generator_bricht_ab_wenn_die_vorlage_feht(tmp_path, monkeypatch):
    """Ohne Vorlage darf nichts geschrieben werden."""
    module = _make_og_image()
    monkeypatch.setattr(module, "OUT", tmp_path / "og-image.jpg")
    monkeypatch.setattr(module, "TEMPLATE", tmp_path / "fehlt.html")
    with pytest.raises(SystemExit):
        module.main()
    assert not (tmp_path / "og-image.jpg").exists()
