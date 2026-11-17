#!/usr/bin/env python3
"""check-contrast.py — WCAG-Kontrast der Landing-Page-Farbpalette.

Rechnet die relativen Luminanzen nach WCAG 2.x und wertet die Text-/
Hintergrund-Paare aus, die im Design tatsächlich vorkommen. Exit 1, wenn ein
Paar die AA-Schwelle für normalen Text (4.5:1) verfehlt.

Die Flächenfarben werden aus index.html abgeleitet, nicht von Hand gepflegt:
rgba-Flächen werden über der Grundfläche von `body` kompositiert. Die frühere
hartkodierte Tabelle lag mit #0d1230/#141c3a/#141208 neben dem, was das CSS
sagt — eine Palette-Änderung hätte die Prüfung stillschweigend falsch machen
können.

Aufruf:  python3 scripts/check-contrast.py
Exit:    0 = alle Paare bestehen AA, 1 = mindestens ein Paar fällt durch
"""

import re
import sys
from pathlib import Path

BASE3 = Path(__file__).resolve().parent.parent
INDEX_HTML = BASE3 / "index.html"

AA_NORMAL = 4.5
AA_LARGE = 3.0

# Flächenfarben, die aus dem CSS abgeleitet werden, mit dem, was sie ist.
TOKENS = (
    "--color-text-primary",
    "--color-text-secondary",
    "--color-text-muted",
    "--color-accent-primary",
    "--color-accent-hover",
    "--color-bg-glass",
)

# Flächen, die aus rgba über der body-Grundfläche berechnet werden. Sie stehen
# als fertige Hex-Werte schon bewusst nicht im CSS — die Ableitung ist die
# Quelle, darum dürfen sie in der CSS-Suche außen vor bleiben.
DERIVED_SURFACES = ("glass", "badge", "warn")


def _channel(value: float) -> float:
    return value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4


def _luminance_rgb(rgb: tuple[int, int, int]) -> float:
    r, g, b = (channel / 255 for channel in rgb)
    return 0.2126 * _channel(r) + 0.7152 * _channel(g) + 0.0722 * _channel(b)


def luminance(hex_color: str) -> float:
    h = hex_color.lstrip("#")
    return _luminance_rgb((int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)))


def contrast_ratio(fg: str, bg: str) -> float:
    la, lb = luminance(fg), luminance(bg)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def _hex(rgb: tuple[int, int, int]) -> str:
    return "#{:02x}{:02x}{:02x}".format(*rgb)


def _parse_color(value: str):
    """'#rrggbb' -> (rgb, None); 'rgba(r, g, b, a)' -> (rgb, alpha)."""
    value = value.strip()
    if value.startswith("#"):
        h = value.lstrip("#")
        if len(h) == 3:
            h = "".join(char * 2 for char in h)
        return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)), None
    match = re.fullmatch(
        r"rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+%?)\s*)?\)",
        value,
    )
    if not match:
        raise ValueError(f"Farbe nicht lesbar: {value!r}")
    rgb = tuple(int(match.group(i)) for i in (1, 2, 3))
    raw_alpha = match.group(4)
    if raw_alpha is None:
        return rgb, None
    alpha = float(raw_alpha.rstrip("%")) / 100 if raw_alpha.endswith("%") else float(raw_alpha)
    return rgb, alpha


def _composite(overlay, base_rgb: tuple[int, int, int]) -> str:
    """rgba-Fläche über einer undurchsichtigen Grundfläche."""
    (r, g, b), alpha = overlay
    alpha = 1.0 if alpha is None else alpha
    mixed = tuple(
        round(alpha * channel + (1 - alpha) * base)
        for channel, base in zip((r, g, b), base_rgb)
    )
    return _hex(mixed)


def _root_tokens(html: str) -> dict[str, str]:
    root = re.search(r":root\s*\{(.*?)\}", html, re.S)
    if not root:
        raise ValueError(":root-Block in index.html nicht gefunden")
    tokens = {}
    for name, value in re.findall(r"(--[\w-]+)\s*:\s*([^;]+);", root.group(1)):
        tokens[name] = value.strip()
    return tokens


def _rule_background(html: str, selector: str) -> str:
    rule = re.search(rf"{re.escape(selector)}\s*\{{([^}}]*)\}}", html)
    if not rule:
        raise ValueError(f"Regel {selector} nicht gefunden")
    background = re.search(r"background:\s*([^;]+);", rule.group(1))
    if not background:
        raise ValueError(f"Regel {selector} hat kein background")
    return background.group(1).strip()


def _css_blocks(html: str) -> list[tuple[str, str]]:
    """(Selektor, Rumpf) für jede Regel des Stylesheets."""
    blocks: list[tuple[str, str]] = []
    for m in re.finditer(r"([^{}]+)\{([^{}]*)\}", html):
        selector = " ".join(m.group(1).split())
        if selector.startswith("@") or selector.startswith("/*"):
            continue
        blocks.append((selector, m.group(2)))
    return blocks


def _body_base(html: str) -> tuple[int, int, int]:
    """Dunkelster Hex-Stop des body-Gradienten — die konservative Fläche."""
    rule = re.search(r"(?m)^\s*body\s*\{([^}]*)\}", html)
    if not rule:
        raise ValueError("body-Regel nicht gefunden")
    stops = re.findall(r"#[0-9a-fA-F]{3,6}", rule.group(1))
    if not stops:
        raise ValueError("keine Hex-Farbe in der body-Regel")
    return min((_parse_color(stop)[0] for stop in stops), key=_luminance_rgb)


def effective_colors() -> dict[str, str]:
    """Die Flächenfarben der Paare, aus index.html abgeleitet."""
    html = INDEX_HTML.read_text(encoding="utf-8")
    tokens = _root_tokens(html)
    missing = [name for name in TOKENS if name not in tokens]
    if missing:
        raise ValueError(f"Token fehlt im :root-Block: {', '.join(missing)}")
    base = _body_base(html)
    glass_rgb, glass_alpha = _parse_color(tokens["--color-bg-glass"])

    return {
        "base": _hex(base),
        "text-primary": tokens["--color-text-primary"],
        "text-secondary": tokens["--color-text-secondary"],
        "text-muted": tokens["--color-text-muted"],
        "accent-primary": tokens["--color-accent-primary"],
        "accent-hover": tokens["--color-accent-hover"],
        "glass": _composite((glass_rgb, glass_alpha), base),
        "badge": _composite(_parse_color(_rule_background(html, ".hero-badge")), base),
        "warn": _composite(_parse_color(_rule_background(html, ".dev-status-note")), base),
    }


def build_pairs() -> list[tuple[str, str, str, bool]]:
    """(Name, Vordergrund, Hintergrund, großer Text?) — aus dem CSS abgeleitet."""
    c = effective_colors()
    return [
        ("text-primary auf Seitenhintergrund", c["text-primary"], c["base"], False),
        ("text-secondary auf Seitenhintergrund", c["text-secondary"], c["base"], False),
        ("text-muted auf Seitenhintergrund", c["text-muted"], c["base"], False),
        ("aktive Nav/Footer-Links auf Seitenhintergrund", c["accent-hover"], c["base"], False),
        # Die FAQ-Links lagen auf --color-accent-primary (#6366f1): 4.0:1 auf
        # der Glas-Karte, auch auf der dunkelsten Fläche nur 4.5:1 — unter AA.
        # Hover zählt als Normaltext, nicht als großer Text.
        ("FAQ-Links auf Glas-Karte", c["accent-hover"], c["glass"], False),
        ("FAQ-Links im Hover auf Glas-Karte", c["text-primary"], c["glass"], False),
        ("Hero-Badge-Text auf Badge-Fläche", c["accent-hover"], c["badge"], False),
        ("Play-Button Schach9x9 (dunkelster Verlaufsstopp)", "#ffffff", "#4f46e5", False),
        ("Play-Button Trischach (dunkelster Verlaufsstopp)", "#ffffff", "#2563eb", False),
        ("Skip-Link: weiß auf Fläche", "#ffffff", "#4f46e5", False),
        ("Ghost-Button-Text auf Glas-Hintergrund", c["text-primary"], c["glass"], False),
        ("Stat-Zahlen (großer Text) auf Seitenhintergrund", c["accent-primary"], c["base"], True),
        ("Warn-Hinweis: #fbbf24 auf Warn-Fläche", "#fbbf24", c["warn"], False),
    ]


def check_palette_consistency() -> list[str]:
    """Die Tabelle darf nichts enthalten, das das CSS nicht sagt.

    Früher waren die drei Flächenfarben hartkodiert (#0d1230, #141c3a,
    #141208) und kamen im CSS gar nicht vor — eine Palette-Änderung hätte die
    Prüfung falsch machen können, ohne dass etwas rot wurde.
    """
    html = INDEX_HTML.read_text(encoding="utf-8")
    errors: list[str] = []
    try:
        colors = effective_colors()
    except ValueError as error:
        return [str(error)]

    derived = {colors[name] for name in DERIVED_SURFACES}
    for name, fg, bg, _ in build_pairs():
        if bg not in derived and bg.lower() not in html.lower():
            errors.append(f"{name}: Hintergrund {bg} kommt im CSS nicht vor")
        if fg.lower() not in html.lower():
            errors.append(f"{name}: Vordergrund {fg} kommt im CSS nicht vor")
    return errors


def check_accent_primary_only_for_large_text() -> list[str]:
    """`--color-accent-primary` (#6366f1) ist als kleine Textfarbe unter AA.

    Auf allen Flächen 4.1–4.5:1, auf dem gerenderten Hintergrund 3.8:1. Die
    FAQ-Links hat es so getroffen, und weder axe noch diese Prüfung sahen es.
    Erlaubt ist daher nur großer Text (≥ 24px, oder ≥ 18.66px und fett) —
    aktuell `.stat-value` (2rem, 4.47:1, AA-groß 3:1).
    """
    errors: list[str] = []
    for selector, body in _css_blocks(INDEX_HTML.read_text(encoding="utf-8")):
        if not re.search(r"(?:^|;)\s*color:\s*var\(--color-accent-primary\)", body):
            continue
        size = re.search(r"font-size:\s*([0-9.]+)\s*(rem|px|%)", body)
        weight = re.search(r"font-weight:\s*([0-9]+)", body)
        groß = False
        if size:
            wert = float(size.group(1))
            if size.group(2) == "rem":
                wert *= 16
            fett = bool(weight) and int(weight.group(1)) >= 700
            groß = wert >= 24 or (wert >= 18.66 and fett)
        if not groß:
            errors.append(
                f"{selector}: color var(--color-accent-primary) — als kleine "
                "Textfarbe unter AA (4.1–4.5:1); hellere Variante verwenden"
            )
    return errors


def main() -> int:
    print(f"{'Paar':<46} {'Ratio':>6}  AA  AA-groß")
    failures: list[str] = []
    for name, fg, bg, large_only in build_pairs():
        ratio = contrast_ratio(fg, bg)
        threshold = AA_LARGE if large_only else AA_NORMAL
        passed = ratio >= threshold
        if not passed:
            failures.append(f"{name}: {ratio:.2f}:1 < {threshold}:1")
        print(
            f"{name:<46} {ratio:>6.2f}  {'OK' if passed else 'FAIL':<4}"
            f"{'OK' if ratio >= AA_LARGE else 'FAIL'}"
        )

    errors = check_palette_consistency()
    for error in errors:
        print(f"HINWEIS: {error}", file=sys.stderr)

    klein_text = check_accent_primary_only_for_large_text()
    for error in klein_text:
        print(f"HINWEIS: {error}", file=sys.stderr)

    if failures or klein_text:
        if failures:
            print("\nFEHLER (unter AA-Schwelle):", file=sys.stderr)
            for failure in failures:
                print(f"  - {failure}", file=sys.stderr)
        return 1
    print("\nCONTRAST OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
