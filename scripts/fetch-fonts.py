#!/usr/bin/env python3
"""fetch-fonts.py — Outfit + JetBrains Mono (latin) selbst hosten.

Hintergrund: die Seite lud ihre Schriften als render-blockende CSS von
fonts.googleapis.com. Das kostet einen Cross-Origin-Request vor dem ersten
Paint (gemessen: FCP 1040 ms bei TTFB 367 ms) und schickt die IP jedes Besuchers
an Google — für eine deutsche Seite der Standardfall, der laut LG München 2022
nur durch Self-Hosting sauber gelöst ist.

Das Script holt die woff2-Dateien des latin-Subsets in `assets/fonts/` und
gibt die passenden `@font-face`-Regeln auf stdout aus. Die Dateien liegen danach
im Repo (kein Build-Schritt, kein CDN zur Laufzeit).

Aufruf:  python3 scripts/fetch-fonts.py [--out assets/fonts] [--weights ...]
Exit:    0 = alle Dateien geladen, 1 = Fehler
"""

import argparse
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

BASE3 = Path(__file__).resolve().parent.parent

CSS_API = "https://fonts.googleapis.com/css2"
USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0 Safari/537.36"  # nur mit modernem UA liefert Google woff2
)

# Familie → Gewichte, die die Seite tatsächlich verwendet
FAMILIES = {
    "Outfit": [300, 400, 600, 700, 800],
    "JetBrains Mono": [400, 600],
}

# Nur das latin-Subset: die Seite ist deutsch, Umlaute liegen in U+0000-00FF.
SUBSET = "latin"

FACE_RE = re.compile(
    r"/\*\s*(?P<subset>[\w-]+)\s*\*/\s*@font-face\s*\{(?P<body>.*?)\}", re.S
)


def slug(name: str) -> str:
    return name.lower().replace(" ", "-")


def fetch_css() -> str:
    query = "&".join(
        f"family={urllib.parse.quote(name)}:wght@{';'.join(map(str, weights))}"
        for name, weights in FAMILIES.items()
    )
    url = f"{CSS_API}?{query}&display=swap"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8")


def download(url: str, target: Path) -> int:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = resp.read()
    if not data.startswith(b"wOF2"):
        raise ValueError(f"{url} ist kein woff2 (magic={data[:4]!r})")
    target.write_bytes(data)
    return len(data)


def main() -> int:
    parser = argparse.ArgumentParser(description="Schriften lokal ablegen und @font-face ausgeben.")
    parser.add_argument("--out", default=str(BASE3 / "assets" / "fonts"))
    args = parser.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    try:
        css = fetch_css()
    except Exception as exc:
        print(f"FEHLER: Google-CSS nicht abrufbar: {exc}", file=sys.stderr)
        return 1

    # Google liefert für eine Variable Font pro Gewicht dieselbe Datei → nach URL
    # gruppieren und ein @font-face mit Gewichtsbereich schreiben (sonst 5×32 KB
    # identische Bytes im Repo).
    by_url: dict[str, dict] = {}
    for block in FACE_RE.finditer(css):
        if block.group("subset") != SUBSET:
            continue
        body = block.group("body")
        family_m = re.search(r"font-family:\s*'([^']+)'", body)
        weight_m = re.search(r"font-weight:\s*(\d+)", body)
        url_m = re.search(r"url\((https://[^)]+\.woff2)\)", body)
        if not (family_m and weight_m and url_m):
            print(f"FEHLER: unerwarteter @font-face-Block: {body[:80]!r}", file=sys.stderr)
            return 1
        entry = by_url.setdefault(url_m.group(1), {"family": family_m.group(1), "weights": []})
        entry["weights"].append(int(weight_m.group(1)))

    rules, total, count = [], 0, 0
    for url, entry in by_url.items():
        weights = sorted(entry["weights"])
        target = out_dir / f"{slug(entry['family'])}-{SUBSET}.woff2"
        size = download(url, target)
        total += size
        count += 1
        span = f"{weights[0]}" if weights[0] == weights[-1] else f"{weights[0]} {weights[-1]}"
        print(f"  {target.name:<32} {size/1024:6.1f} KB  Gewichte {span}", file=sys.stderr)
        rules.append(
            "    @font-face {\n"
            f"      font-family: '{entry['family']}';\n"
            "      font-style: normal;\n"
            f"      font-weight: {span};\n"
            "      font-display: swap;\n"
            f"      src: url('./assets/fonts/{target.name}') format('woff2');\n"
            "    }"
        )

    if not rules:
        print("FEHLER: keine @font-face-Blöcke im latin-Subset gefunden", file=sys.stderr)
        return 1

    print(f"\n{count} Dateien, {total/1024:.1f} KB (latin) → {out_dir}", file=sys.stderr)
    print("\n".join(rules))
    return 0


if __name__ == "__main__":
    sys.exit(main())
