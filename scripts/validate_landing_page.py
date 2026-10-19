#!/usr/bin/env python3
"""validate_landing_page.py — prüft die generierte Landing Page (ohne Netz).

Drei Prüfungen, die nach jeder inhaltlichen Änderung laufen sollten, weil ein
defektes Tag oder ungültiges JSON-LD still ausgeliefert wird (die Seite
rendert trotzdem):

1. Tag-Balance    — jedes geöffnete Element ist wieder geschlossen
2. JSON-LD        — alle <script type="application/ld+json"> Blöcke sind gültiges JSON
3. Link-Inventar  — alle ausgehenden Links aufgelistet (ohne Status-Prüfung;
                    dafür gibt es scripts/check-links.py)

Aufruf:  python3 scripts/validate_landing_page.py
Exit:    0 = alles in Ordnung, 1 = Fehler gefunden
"""

import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

BASE3 = Path(__file__).resolve().parent.parent
INDEX_HTML = BASE3 / "index.html"

# Elemente ohne Endtag (HTML-Void-Elemente)
VOID_TAGS = {
    "area", "base", "br", "col", "embed", "hr", "img", "input",
    "link", "meta", "param", "source", "track", "wbr",
}


class _BalanceChecker(HTMLParser):
    """Sammelt Tag-Balance-Fehler: ungeschlossene und doppelt geschlossene Tags."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.stack: list[tuple[str, tuple[int, int]]] = []
        self.errors: list[str] = []

    def handle_starttag(self, tag: str, attrs: list) -> None:
        if tag not in VOID_TAGS:
            self.stack.append((tag, self.getpos()))

    def handle_endtag(self, tag: str) -> None:
        if tag in VOID_TAGS:
            return
        if not self.stack:
            self.errors.append(f"orphan </{tag}> at line {self.getpos()[0]}")
            return
        names = [t for t, _ in self.stack]
        if tag not in names:
            # Schließendes Tag ohne passendes öffnendes überhaupt
            self.errors.append(f"orphan </{tag}> at line {self.getpos()[0]}")
            return
        if names[-1] == tag:
            self.stack.pop()
            return
        self.errors.append(
            f"mismatch at line {self.getpos()[0]}: expected </{self.stack[-1][0]}> "
            f"(opened line {self.stack[-1][1][0]}), got </{tag}>"
        )
        self.stack.pop()


def check_tag_balance(html_text: str) -> list[str]:
    checker = _BalanceChecker()
    checker.feed(html_text)
    for tag, pos in checker.stack:
        checker.errors.append(f"unclosed <{tag}> opened at line {pos[0]}")
    return checker.errors


def check_jsonld(html_text: str) -> list[str]:
    errors: list[str] = []
    blocks = re.findall(
        r'<script type="application/ld\+json">(.*?)</script>', html_text, re.S
    )
    if not blocks:
        return ["kein JSON-LD-Block gefunden"]
    for i, block in enumerate(blocks, start=1):
        try:
            json.loads(block)
        except json.JSONDecodeError as exc:
            errors.append(f"JSON-LD Block {i} ungültig: {exc}")
    return errors


def collect_links(html_text: str) -> list[str]:
    """Alle ausgehenden http(s)-Links (href und src), dedupliziert, sortiert."""
    links = set()
    for match in re.finditer(r'(?:href|src)="([^"]+)"', html_text):
        url = match.group(1)
        if url.startswith(("http://", "https://")):
            links.add(url)
    return sorted(links)


def main() -> int:
    if not INDEX_HTML.is_file():
        print(f"FEHLER: {INDEX_HTML} nicht gefunden", file=sys.stderr)
        return 1

    html_text = INDEX_HTML.read_text(encoding="utf-8")
    failures: list[str] = []

    balance_errors = check_tag_balance(html_text)
    failures.extend(balance_errors)
    print(f"Tag-Balance: {'OK' if not balance_errors else str(len(balance_errors)) + ' Fehler'}")

    jsonld_errors = check_jsonld(html_text)
    failures.extend(jsonld_errors)
    print(f"JSON-LD:     {'OK' if not jsonld_errors else str(len(jsonld_errors)) + ' Fehler'}")

    links = collect_links(html_text)
    print(f"Link-Inventar: {len(links)} ausgehende Links")
    for url in links:
        print(f"  - {url}")

    if failures:
        print("\nFEHLER:", file=sys.stderr)
        for failure in failures:
            print(f"  - {failure}", file=sys.stderr)
        return 1
    print("\nVALIDATION OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
