#!/usr/bin/env python3
"""Rendert `og-image.jpg` aus `scripts/og-image.html`.

Die Social-Karte war ein einmaliges Bild ohne Quelle — inzwischen standen
Versionen drauf, die vier Releases alt waren. Hier wird sie aus einer
HTML-Vorlage erzeugt, die (a) keinerlei Versionsnummern enthält und (b) die
aktuellen Karten-Vorschauen der Spiele einbindet.

Aufruf:  python3 scripts/make-og-image.py
Braucht: playwright (devDependency) + Pillow; einen Chromium-Binary findet das
Script selbst (PLAYWRIGHT-Chache, sonst `CHROMIUM_PATH` oder chromium/google-chrome
im PATH).
"""

from __future__ import annotations

import os
import shutil
import sys
from pathlib import Path

BASE3 = Path(__file__).resolve().parent.parent
TEMPLATE = BASE3 / "scripts" / "og-image.html"
OUT = BASE3 / "og-image.jpg"
WIDTH, HEIGHT = 1200, 630
JPEG_QUALITY = 82

# Die Seite wird bei 2x gerendert und dann herunterskaliert: glattere Kanten,
# exakt die 1200x630, die die Tests und die Social-Plattformen erwarten.
DPR = 2


def find_chromium() -> str:
    """Ein benutzbares Chromium — Playwrights Cache zuerst, dann das System."""
    env = os.environ.get("CHROMIUM_PATH")
    if env and Path(env).is_file():
        return env

    cache = Path.home() / ".cache" / "ms-playwright"
    patterns = (
        "chromium-*/chrome-linux64/chrome",
        "chromium-*/chrome-linux/chrome",
        "chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell",
    )
    candidates: list[Path] = []
    for pattern in patterns:
        candidates.extend(cache.glob(pattern))
    if candidates:
        # Neue Revision zuerst — die ist zumeist die, die der lokale
        # Playwright-Version entspricht.
        return str(sorted(candidates)[-1])

    for name in ("chromium", "google-chrome", "chrome"):
        found = shutil.which(name)
        if found:
            return found

    sys.exit(
        "FEHLER: kein Chromium gefunden. CHROMIUM_PATH setzen oder "
        "`npx playwright install chromium` ausführen."
    )


def main() -> None:
    from PIL import Image
    from playwright.sync_api import sync_playwright

    if not TEMPLATE.is_file():
        sys.exit(f"FEHLER: {TEMPLATE} fehlt")

    executable = find_chromium()
    tmp = OUT.with_name("og-image.tmp.png")
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=executable,
            args=["--no-sandbox", "--force-color-profile=srgb"],
        )
        page = browser.new_page(
            viewport={"width": WIDTH, "height": HEIGHT}, device_scale_factor=DPR
        )
        page.goto(TEMPLATE.as_uri(), wait_until="load")
        # Selbst gehostete Schriften sind lokale dateien — warten, sonst
        # rendert die Karte in einer Fallback-Schrift.
        page.evaluate("document.fonts.ready")
        page.wait_for_timeout(400)
        page.screenshot(
            path=str(tmp), clip={"x": 0, "y": 0, "width": WIDTH, "height": HEIGHT}
        )
        browser.close()

    with Image.open(tmp) as im:
        image = im.convert("RGB")
        if image.size != (WIDTH, HEIGHT):
            image = image.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)
        # JPEG, nicht PNG: die Karte enthält die beiden Spiel-Vorschauen, ein
        # PNG daraus ist ~283 KB, JPEG ~66 KB — und og:image:width/height sowie
        # die Crawler brauchen kein Alphakanal.
        image.save(OUT, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
    tmp.unlink(missing_ok=True)

    print(f"og-image.jpg: {OUT.stat().st_size / 1024:.1f} KB, {WIDTH}x{HEIGHT}")


if __name__ == "__main__":
    main()
