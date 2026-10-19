#!/usr/bin/env python3
"""check-links.py — prüft alle ausgehenden Links von base3 auf Erreichbarkeit.

Zieht die Links aus index.html, README.md und FAQ.md (Markdown-Links inklusive),
ruft sie parallel per HEAD ab und meldet nicht erreichbare Ziele. So fängt der
Workflow umbenannte Repos, verschobene Demos oder abgeschaltete Seiten — bevor
ein Besucher darauf stößt.

Aufruf:  python3 scripts/check-links.py [--workers 8] [--timeout 20]
Exit:    0 = alle Links erreichbar, 1 = mindestens einer fehlerhaft

Hinweis: 429 (Rate Limit) und 403 (bot-gated, aber existent) gelten als
"nicht beurteilbar" und werden nicht als Fehler gewertet.
"""

import argparse
import re
import sys
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

BASE3 = Path(__file__).resolve().parent.parent

# Dateien, aus denen Links gezogen werden
SOURCES = ("index.html", "README.md", "FAQ.md")

# Statuscodes, die keine harte Aussage erlauben
SOFT_CODES = {403, 405, 429, 503}

# Nicht prüfbar — kein HTTP-Ziel
SKIP_PREFIXES = ("mailto:", "tel:", "javascript:", "data:", "#")


def collect_links() -> dict[str, set[str]]:
    """Links pro Quelldatei (dedupliziert, nur http/https)."""
    found: dict[str, set[str]] = {}
    for name in SOURCES:
        path = BASE3 / name
        if not path.is_file():
            continue
        text = path.read_text(encoding="utf-8")
        links = set()
        # HTML: href="..." / src="..."
        for match in re.finditer(r'(?:href|src)="([^"]+)"', text):
            links.add(match.group(1))
        # <link rel="preconnect"> ist nur ein DNS-/TLS-Hinweis, kein Ziel —
        # ein 404 dort ist normal und würde den Check falsch rot machen.
        preconnect = set(re.findall(r'<link rel="preconnect" href="([^"]+)"', text))
        links -= preconnect
        # Markdown: [Text](url) und <url>
        for match in re.finditer(r"\[[^\]]*\]\(([^)\s]+)\)", text):
            links.add(match.group(1))
        for match in re.finditer(r"<(https?://[^>\s]+)>", text):
            links.add(match.group(1))
        links = {
            url for url in links
            if url.startswith(("http://", "https://")) and not url.startswith(SKIP_PREFIXES)
        }
        found[name] = links
    return found


def check_url(url: str, timeout: int) -> tuple[str, int | None, str | None]:
    """HEAD-Request; Rückgabe (url, status, fehler)."""
    req = urllib.request.Request(
        url, method="HEAD", headers={"User-Agent": "base3-link-check/1.0"}
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return url, resp.status, None
    except urllib.error.HTTPError as exc:
        # 405/501: HEAD nicht erlaubt → GET als zweite Chance
        if exc.code in (405, 501):
            try:
                req = urllib.request.Request(
                    url, headers={"User-Agent": "base3-link-check/1.0"}
                )
                with urllib.request.urlopen(req, timeout=timeout) as resp:
                    return url, resp.status, None
            except urllib.error.HTTPError as exc2:
                return url, exc2.code, None
            except Exception as exc2:
                return url, None, str(exc2)
        return url, exc.code, None
    except Exception as exc:
        return url, None, str(exc)


def main() -> int:
    parser = argparse.ArgumentParser(description="Prüft die ausgehenden Links von base3.")
    parser.add_argument("--workers", type=int, default=8)
    parser.add_argument("--timeout", type=int, default=20)
    args = parser.parse_args()

    found = collect_links()
    all_urls = sorted({url for urls in found.values() for url in urls})
    if not all_urls:
        print("Keine Links gefunden.")
        return 0

    print(f"Prüfe {len(all_urls)} Links aus {', '.join(found)} …\n")
    failures: list[tuple[str, int | None, str | None]] = []
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        for url, status, error in pool.map(lambda u: check_url(u, args.timeout), all_urls):
            if status is None:
                failures.append((url, None, error))
                print(f"  FEHLER  {url}  ({error})")
            elif status >= 400 and status not in SOFT_CODES:
                failures.append((url, status, None))
                print(f"  FEHLER  {url}  (HTTP {status})")
            elif status in SOFT_CODES:
                print(f"  WEICH   {url}  (HTTP {status} — nicht beurteilbar)")
            else:
                print(f"  OK      {url}  (HTTP {status})")

    print(f"\n{len(all_urls) - len(failures)}/{len(all_urls)} erreichbar")
    if failures:
        print("\nFEHLER:", file=sys.stderr)
        for url, status, error in failures:
            detail = f"HTTP {status}" if status else (error or "unbekannt")
            print(f"  - {url} ({detail})", file=sys.stderr)
        return 1
    print("LINK-CHECK OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
