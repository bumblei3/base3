#!/usr/bin/env python3
"""sync-faq-schema.py — generiert das FAQPage-JSON-LD aus der FAQ-Sektion.

Die Seite hat eine FAQ-Sektion mit sichtbaren Fragen und Antworten; das
JSON-LD kannte bisher nur WebSite + die beiden Spiele. Suchmaschinen lesen die
FAQ aber nur, wenn sie als `FAQPage` mit `mainEntity` (Question/acceptedAnswer)
ausgezeichnet ist.

Der Block wird **aus dem sichtbaren Markup abgeleitet**, nicht daneben gepflegt:
sonst driftet er bei der ersten geänderten Antwort auseinander — und die
Versions-Antwort („Welche Versionen sind aktuell?") wird von
`sync-versions.py` bei jedem Sub-Release neu geschrieben.

Modi:
  (ohne)    Block in index.html schreiben (idempotent)
  --check   nichts schreiben; Exit 1, wenn der Block fehlt oder abweicht

Aufruf:  python3 scripts/sync-faq-schema.py [--check] [--index PFAD]
Exit:    0 = aktuell/geschrieben, 1 = Drift (im --check) oder Fehler
"""

import argparse
import html as html_mod
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

BASE3 = Path(__file__).resolve().parent.parent
INDEX_HTML = BASE3 / "index.html"

START_MARKER = "<!-- faq-schema:start — generiert aus der FAQ-Sektion von scripts/sync-faq-schema.py -->"
END_MARKER = "<!-- faq-schema:end -->"

# Eine FAQ-Karte: h3 (Frage) + Rest (Antwort, <p> und/oder <ul>)
CARD_RE = re.compile(
    r'<article class="faq-card">\s*<h3 class="faq-q">(.*?)</h3>(.*?)</article>',
    re.S,
)
QUESTION_RE = re.compile(r'<h3 class="faq-q">')
# Echter HTML-Tag (nicht „a < b") und undekodierte Entität
TAG_RE = re.compile(r"</?[a-zA-Z][^>]*>")
ENTITY_RE = re.compile(r"&(?:amp|lt|gt|quot|#\d+|#x[0-9a-fA-F]+);")


class _Text(HTMLParser):
    """Sammelt den reinen Text eines HTML-Fragments.

    Listeneinträge enden mit '; ' (aus einer <ul> wird so eine lesbare
    Aufzählung im Antworttext), Absätze mit ' '. Entitäten werden dekodiert.
    """

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []

    def handle_data(self, data: str) -> None:
        self.parts.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag == "li":
            self.parts.append("; ")
        elif tag in ("p", "br", "div"):
            self.parts.append(" ")


def to_text(fragment: str) -> str:
    """HTML-Fragment → einzeiliger Klartext ohne Tags und ohne Doppel-Leerzeichen."""
    parser = _Text()
    parser.feed(fragment)
    parser.close()
    text = "".join(parser.parts)
    text = html_mod.unescape(text)
    text = re.sub(r"\s+", " ", text)
    text = text.replace(" ;", ";")
    text = re.sub(r";\s*;+", ";", text)
    text = re.sub(r";\s*$", "", text.strip())
    return text.strip(" ;")


def extract_faq(html_text: str) -> list[tuple[str, str]]:
    """[(Frage, Antwort)] aus der FAQ-Sektion — in Dokumentreihenfolge."""
    pairs = [
        (to_text(question), to_text(answer))
        for question, answer in CARD_RE.findall(html_text)
    ]
    cards_without_question = len(QUESTION_RE.findall(html_text)) - len(pairs)
    if not pairs:
        raise ValueError("keine FAQ-Karten (<article class=\"faq-card\">) gefunden")
    if cards_without_question:
        raise ValueError(
            f"{cards_without_question} faq-q ohne passende Karte — Markup geändert?"
        )
    for question, answer in pairs:
        if not question or not answer:
            raise ValueError(f"leere Frage oder Antwort: {question!r} / {answer!r}")
        if TAG_RE.search(answer) or ENTITY_RE.search(answer):
            raise ValueError(f"Antwort nicht als Klartext extrahiert: {answer[:80]!r}")
    return pairs


def build_block(pairs: list[tuple[str, str]]) -> str:
    """Der markierte Block, wie er in index.html steht (2 Leerzeichen Einrückung)."""
    data = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "inLanguage": "de-DE",
        "mainEntity": [
            {
                "@type": "Question",
                "name": question,
                "acceptedAnswer": {"@type": "Answer", "text": answer},
            }
            for question, answer in pairs
        ],
    }
    payload = json.dumps(data, ensure_ascii=False, indent=2)
    body = "\n".join(f"  {line}" if line.strip() else line for line in payload.splitlines())
    return (
        f"  {START_MARKER}\n"
        f'  <script type="application/ld+json">\n'
        f"{body}\n"
        f"  </script>\n"
        f"  {END_MARKER}"
    )


def current_block(html_text: str) -> str | None:
    """Der aktuell in index.html stehende Block (inkl. Zeileneinrückung) oder None."""
    start = html_text.find(START_MARKER)
    end = html_text.find(END_MARKER)
    if start == -1 or end == -1 or end < start:
        return None
    # ab Zeilenanfang, damit der Vergleich mit build_block() die Einrückung mitnimmt
    line_start = html_text.rfind("\n", 0, start) + 1
    return html_text[line_start:end + len(END_MARKER)]


def _insert_position(html_text: str) -> int:
    """Position direkt nach dem ersten JSON-LD-Block (Ende seiner </script>-Zeile)."""
    ld = html_text.find('type="application/ld+json"')
    if ld == -1:
        raise ValueError("kein JSON-LD-Block in index.html gefunden")
    close = html_text.find("</script>", ld)
    if close == -1:
        raise ValueError("JSON-LD-Block ist nicht geschlossen")
    return close + len("</script>")


def sync(html_text: str, pairs: list[tuple[str, str]]) -> tuple[str, bool]:
    """(neuer Text, geändert?) — Block ersetzen oder hinter dem ersten JSON-LD einfügen."""
    block = build_block(pairs)
    existing = current_block(html_text)
    if existing == block:
        return html_text, False
    if existing is not None:
        start = html_text.rfind("\n", 0, html_text.find(START_MARKER)) + 1
        end = html_text.find(END_MARKER, start) + len(END_MARKER)
        return html_text[:start] + block + html_text[end:], True
    pos = _insert_position(html_text)
    return html_text[:pos] + "\n" + block + html_text[pos:], True


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Generiert das FAQPage-JSON-LD aus der FAQ-Sektion von index.html."
    )
    parser.add_argument("--check", action="store_true", help="nur prüfen, nichts schreiben")
    parser.add_argument("--index", default=str(INDEX_HTML), help="Pfad zu index.html (Tests)")
    args = parser.parse_args()

    index = Path(args.index)
    html_text = index.read_text(encoding="utf-8")
    try:
        pairs = extract_faq(html_text)
    except ValueError as exc:
        print(f"FEHLER: {exc}")
        return 1

    print(f"FAQ-Sektion: {len(pairs)} Frage(n)/Antwort(en) extrahiert")
    new_text, changed = sync(html_text, pairs)

    if args.check:
        if changed:
            existing = current_block(html_text)
            reason = (
                "FAQPage-Block fehlt in index.html"
                if existing is None
                else "FAQPage-Block weicht von der FAQ-Sektion ab"
            )
            print(f"DRIFT: {reason}. Fix: 'python3 scripts/sync-faq-schema.py'")
            return 1
        print(f"CHECK OK: FAQPage-JSON-LD ist aktuell ({len(pairs)} Fragen).")
        return 0

    if changed:
        index.write_text(new_text, encoding="utf-8")
        print(f"{index.name}: FAQPage-JSON-LD geschrieben ({len(pairs)} Fragen)")
    else:
        print(f"{index.name}: keine Änderungen (FAQPage-JSON-LD bereits aktuell)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
