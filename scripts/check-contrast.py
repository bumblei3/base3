#!/usr/bin/env python3
"""check-contrast.py — WCAG-Kontrast der Landing-Page-Farbpalette.

Rechnet die relativen Luminanzen nach WCAG 2.x und wertet die Text-/
Hintergrund-Paare aus, die im Design tatsächlich vorkommen. Exit 1, wenn ein
Paar die AA-Schwelle für normalen Text (4.5:1) verfehlt.

Hinweis: rgba-Hintergründe sind über der Verlaufsbasis #05071a kompositiert;
die Paare unten verwenden die daraus resultierenden Effektivfarben.

Aufruf:  python3 scripts/check-contrast.py
Exit:    0 = alle Paare bestehen AA, 1 = mindestens ein Paar fällt durch
"""

import re
import sys
from pathlib import Path

BASE3 = Path(__file__).resolve().parent.parent
INDEX_HTML = BASE3 / "index.html"

# (Name, Vordergrund, Hintergrund, klein=<True für großen Text (AA 3:1)>)
# Textfarben auf dunklem Grund nutzen --color-accent-hover (#818cf8), nicht
# --color-accent-primary (#6366f1) — sonst verfehlen sie die AA-Schwelle.
PAIRS = [
    ("text-primary auf Seitenhintergrund", "#f1f5f9", "#05071a", False),
    ("text-secondary auf Seitenhintergrund", "#cbd5e1", "#05071a", False),
    ("text-muted auf Seitenhintergrund", "#8a98b8", "#05071a", False),
    ("aktive Nav/Footer-Links auf Seitenhintergrund", "#818cf8", "#05071a", False),
    ("Hero-Badge-Text auf translucent", "#818cf8", "#0d1230", False),
    ("Play-Button Schach9x9 (dunkelster Verlaufsstopp)", "#ffffff", "#4f46e5", False),
    ("Play-Button Trischach (dunkelster Verlaufsstopp)", "#ffffff", "#2563eb", False),
    ("Skip-Link: weiß auf Fläche", "#ffffff", "#4f46e5", False),
    ("Ghost-Button-Text auf Glas-Hintergrund", "#f1f5f9", "#141c3a", False),
    ("Stat-Zahlen (großer Text) auf Seitenhintergrund", "#6366f1", "#05071a", True),
    ("Warn-Hinweis: #fbbf24 auf translucent", "#fbbf24", "#141208", False),
]

AA_NORMAL = 4.5
AA_LARGE = 3.0


def _channel(value: float) -> float:
    return value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4


def luminance(hex_color: str) -> float:
    h = hex_color.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    return 0.2126 * _channel(r) + 0.7152 * _channel(g) + 0.0722 * _channel(b)


def contrast_ratio(fg: str, bg: str) -> float:
    la, lb = luminance(fg), luminance(bg)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def check_palette_consistency() -> list[str]:
    """Die Design-Tokens, die die Paar-Tabelle verwendet, müssen im :root stehen."""
    html = INDEX_HTML.read_text(encoding="utf-8")
    root = re.search(r":root\s*\{(.*?)\}", html, re.S)
    if not root:
        return [":root-Block in index.html nicht gefunden"]
    tokens = {
        "--color-accent-primary": "#6366f1",
        "--color-accent-hover": "#818cf8",
        "--color-text-primary": "#f1f5f9",
        "--color-text-secondary": "#cbd5e1",
        "--color-text-muted": "#8a98b8",
    }
    errors = []
    for token, expected in tokens.items():
        if token not in root.group(1):
            errors.append(f"Token {token} fehlt im :root-Block")
        elif expected not in root.group(1):
            errors.append(f"Token {token} weicht von {expected} ab")
    return errors


def main() -> int:
    print(f"{'Paar':<46} {'Ratio':>6}  AA  AA-groß")
    failures: list[str] = []
    for name, fg, bg, large_only in PAIRS:
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

    if failures:
        print("\nFEHLER (unter AA-Schwelle):", file=sys.stderr)
        for failure in failures:
            print(f"  - {failure}", file=sys.stderr)
        return 1
    print("\nCONTRAST OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
