#!/usr/bin/env python3
"""validate-html.py — echter HTML-Standardcheck über den W3C-Nu-Validator.

`scripts/validate_landing_page.py` prüft nur, ob Tags geschlossen sind. Es ist
blind für Standard-Verstöße, die der Browser gnädig repariert — genau so blieb
der Inline-Favicon-`data:`-URI mit rohen Leerzeichen im `href` unbemerkt
(Browser rendert, Nu-Validator: „Bad value … Illegal character").

Dieses Script schickt die Seite an den Nu-Validator und wertet die Antwort aus:
  error   → immer Fehler (Exit 1)
  warning → Fehler nur mit --strict
  info    → nur gezählt (z. B. „Trailing slash on void elements“, Stilfrage)

Der Validator ist ein Fremddienst: ist er nicht erreichbar oder rate-limited,
meldet das Script NICHT PRÜFBAR und endet mit 0 (Lint, kein Korrektheits-Gate).
Mit --require-api wird auch das zum Fehler.

Aufruf:
  python3 scripts/validate-html.py                          # lokale index.html
  python3 scripts/validate-html.py --strict                 # Warnungen zählen als Fehler
  python3 scripts/validate-html.py --file 404.html          # zusätzliche Datei (mehrfach)
  python3 scripts/validate-html.py --url https://bumblei3.github.io/base3/
Exit: 0 = sauber, 1 = Fehler gefunden (oder --require-api ohne API)
"""

import argparse
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

BASE3 = Path(__file__).resolve().parent.parent
INDEX_HTML = BASE3 / "index.html"

API = "https://validator.w3.org/nu/?out=json"
USER_AGENT = "base3-html-validator/1.0 (+https://github.com/bumblei3/base3)"

# Meldungen, die als Fehler bzw. Warnung gelten
ERROR_TYPE = "error"
WARNING_SUBTYPE = "warning"


def summarize(messages: list[dict]) -> dict[str, list[dict]]:
    """Meldungen klassifizieren: error / warning / info."""
    buckets: dict[str, list[dict]] = {"error": [], "warning": [], "info": []}
    for msg in messages:
        if msg.get("type") == ERROR_TYPE:
            buckets["error"].append(msg)
        elif msg.get("subType") == WARNING_SUBTYPE:
            buckets["warning"].append(msg)
        else:
            buckets["info"].append(msg)
    return buckets


def _location(msg: dict) -> str:
    line = msg.get("lastLine") or msg.get("firstLine")
    return f"Zeile {line}" if line else "?"


def fetch_messages(html: str | None, url: str | None, timeout: int) -> list[dict] | None:
    """Meldungen vom Nu-Validator; None, wenn der Dienst nicht antwortet."""
    if url:
        target = f"{API}&doc={urllib.parse.quote(url, safe='')}"
        request = urllib.request.Request(target, headers={"User-Agent": USER_AGENT})
    else:
        if html is None:
            return None
        request = urllib.request.Request(
            API,
            data=html.encode("utf-8"),
            headers={"User-Agent": USER_AGENT, "Content-Type": "text/html; charset=utf-8"},
        )
    for attempt in (1, 2):
        try:
            with urllib.request.urlopen(request, timeout=timeout) as resp:
                return json.loads(resp.read().decode("utf-8")).get("messages", [])
        except urllib.error.HTTPError as exc:
            if exc.code in (429, 503) and attempt == 1:
                time.sleep(10)
                continue
            return None
        except Exception:  # Netz, DNS, Timeout, kaputtes JSON
            if attempt == 1:
                time.sleep(5)
                continue
            return None
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description="HTML-Standardcheck via W3C Nu Validator.")
    parser.add_argument(
        "--file",
        action="append",
        dest="files",
        help="lokale Datei (mehrfach angebbar; Standard: index.html)",
    )
    parser.add_argument("--url", help="statt der Datei eine Live-URL prüfen")
    parser.add_argument("--strict", action="store_true", help="Warnungen zählen als Fehler")
    parser.add_argument("--require-api", action="store_true", help="nicht erreichbare API = Fehler")
    parser.add_argument("--timeout", type=int, default=90)
    args = parser.parse_args()

    if args.url:
        targets: list[tuple[str, str | None]] = [(args.url, None)]
    else:
        files = [Path(f) for f in (args.files or [str(INDEX_HTML)])]
        missing = [f for f in files if not f.is_file()]
        if missing:
            for path in missing:
                print(f"FEHLER: {path} nicht gefunden")
            return 1
        targets = [(f.name, f.read_text(encoding="utf-8")) for f in files]

    failures, unreachable = 0, 0
    for target, html in targets:
        messages = fetch_messages(html, target if html is None else None, args.timeout)
        if messages is None:
            # Fremddienst nicht erreichbar: Lint, kein Korrektheits-Gate
            print(f"{target}: NICHT PRÜFBAR — W3C-Nu-Validator nicht erreichbar "
                  "(oder rate-limited), Standardcheck übersprungen")
            unreachable += 1
            continue

        buckets = summarize(messages)
        print(f"{target}: {len(buckets['error'])} Fehler, {len(buckets['warning'])} Warnungen, "
              f"{len(buckets['info'])} Hinweise")
        for kind in ("error", "warning"):
            for msg in buckets[kind]:
                print(f"  {kind.upper():7} {_location(msg)}: {msg.get('message')}")
        if buckets["info"]:
            print(f"  (Hinweise ignoriert: {buckets['info'][0].get('message')} …)")
        failures += len(buckets["error"]) + (len(buckets["warning"]) if args.strict else 0)

    if failures:
        print(f"HTML-CHECK FEHLGESCHLAGEN: {failures} Meldung(en) über der Schwelle"
              f"{' (--strict)' if args.strict else ''}")
        return 1
    if unreachable and args.require_api:
        print(f"HTML-CHECK FEHLGESCHLAGEN: {unreachable} Datei(en) nicht prüfbar (--require-api)")
        return 1
    print(f"HTML-CHECK OK: keine Fehler"
          + (f", keine Warnungen" if args.strict else "")
          + (f" ({unreachable} nicht prüfbar)" if unreachable else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
