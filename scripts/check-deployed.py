#!/usr/bin/env python3
"""check-deployed.py — vergleicht die live ausgelieferte Seite mit dem Repo.

Ein grüner Deploy-Run beweist nur, dass *ein* Artefakt hochgeladen wurde, nicht
dass die Seite vollständig ist. Genau diese Lücke gab es schon: `pages.yml`
staged eine explizite Dateiliste, drei referenzierte Dateien fehlten darauf,
die Live-URL antwortete 404 — und alle Jobs waren grün.

Dieses Script holt die Live-Seite und vergleicht jede Datei, die ausgeliefert
werden soll (Staged-Liste aus `pages.yml` ∪ von `index.html`/Manifest
referenzierte Dateien), per SHA-256 mit der Repo-Datei. Es fängt damit drei
Fälle, die lokal unsichtbar sind:

  1. referenziert, aber nicht gestaged      → 404 live
  2. gestaged, aber Deploy nicht durch      → alte Bytes live
  3. Content gepusht, Pages-Cache noch alt  → Digest weicht ab

Aufruf:  python3 scripts/check-deployed.py [--base-url URL] [--attempts 6] [--delay 10]
Exit:    0 = Live-Stand == Repo, 1 = Abweichung
"""

import argparse
import hashlib
import html
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

BASE3 = Path(__file__).resolve().parent.parent
INDEX_HTML = BASE3 / "index.html"
MANIFEST = BASE3 / "manifest.webmanifest"
WORKFLOW = BASE3 / ".github" / "workflows" / "pages.yml"

DEFAULT_BASE_URL = "https://bumblei3.github.io/base3/"
SITE_HOST_PATH = "/base3/"

# Dateiendungen, die als auslieferbares Asset gelten — verhindert, dass
# content="1200" oder Beschreibungstexte als Pfad durchgehen.
ASSET_SUFFIX = re.compile(r"\.(png|jpe?g|webp|svg|ico|webmanifest|xml|txt|html?|css|js|json)$", re.I)

USER_AGENT = "base3-deploy-check/1.0"


def staged_files() -> tuple[set[str], bool]:
    """Aus `pages.yml`: (Dateinamen in `_site/`, `assets/` rekursiv gestaged?)."""
    files: set[str] = set()
    assets = False
    for line in WORKFLOW.read_text(encoding="utf-8").splitlines():
        tokens = line.strip().split()
        if not tokens or tokens[0] != "cp":
            continue
        recursive = "-r" in tokens
        tokens = [t for t in tokens if not t.startswith("-")]
        dest = tokens[-1]
        sources = tokens[1:-1]
        if recursive:
            assets = assets or any(src.startswith("assets") for src in sources)
        elif dest.rstrip("/") == "_site":
            files.update(Path(src).name for src in sources)
    if assets:
        files.update(
            str(p.relative_to(BASE3)) for p in (BASE3 / "assets").rglob("*") if p.is_file()
        )
    return files, assets


def referenced_files() -> set[str]:
    """Repo-relative Pfade, die `index.html` oder das Manifest ansprechen."""
    raw: list[str] = []
    src = INDEX_HTML.read_text(encoding="utf-8")
    for match in re.finditer(r"<(?:link|img)\s[^>]*?(?:href|src)=\"([^\"]+)\"", src):
        raw.append(match.group(1))
    for match in re.finditer(r"\"(?:og|twitter):image(?::secure_url)?\"\s+content=\"([^\"]+)\"", src):
        raw.append(match.group(1))
    mani = MANIFEST.read_text(encoding="utf-8")
    raw.extend(re.findall(r"\"src\"\s*:\s*\"([^\"]+)\"", mani))
    # Service Worker: die Registrierung ist ein JS-Aufruf, kein href/src —
    # ohne diese Zeile würde sw.js nicht geprüft und könnte live 404en.
    raw.extend(re.findall(r"serviceWorker\.register\(\s*[\"']([^\"']+)[\"']", src))

    out: set[str] = set()
    for value in raw:
        path = to_repo_path(value)
        if path:
            out.add(path)
    return out


def to_repo_path(value: str) -> str | None:
    """Live-Referenz → repo-relativer Pfad (oder None, wenn extern/nicht prüfbar)."""
    value = html.unescape(value).strip()
    if not value or value.startswith(("#", "data:", "mailto:", "tel:", "javascript:")):
        return None
    if value.startswith(DEFAULT_BASE_URL):
        value = value[len(DEFAULT_BASE_URL):]
    elif re.match(r"^[a-z][a-z0-9+.-]*://", value, re.I):
        return None  # fremde Seite — dafür gibt es check-links.py
    for prefix in (SITE_HOST_PATH, "./", "/"):
        if value.startswith(prefix):
            value = value[len(prefix):]
            break
    if not value or value.startswith("..") or not ASSET_SUFFIX.search(value):
        return None
    return value


def expected_urls(base_url: str) -> dict[str, str]:
    """repo-relativer Pfad → Live-URL (inkl. der Seite selbst)."""
    staged, _ = staged_files()
    targets = staged | referenced_files()
    targets.add("index.html")
    urls = {}
    for path in sorted(targets):
        rel = "index.html" if path in ("", "./") else path
        urls[rel] = base_url if rel == "index.html" else base_url + rel
    return urls


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def fetch(url: str, timeout: int) -> tuple[int | None, bytes | None, str | None]:
    """GET; Rückgabe (status, body, fehler)."""
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read(), None
    except urllib.error.HTTPError as exc:
        return exc.code, None, None
    except Exception as exc:  # Netz, DNS, Timeout
        return None, None, str(exc)


def check_one(path: str, url: str, timeout: int, attempts: int, delay: int) -> tuple[str, str]:
    """(status-text, detail) für eine Datei — mit Retries für CDN-Propagation."""
    local = BASE3 / path
    if not local.is_file():
        return "FEHLT LOKAL", f"{path} ist nicht im Repo"
    want = _sha256(local.read_bytes())
    last = "keine Antwort"
    for attempt in range(1, attempts + 1):
        status, body, error = fetch(url, timeout)
        if status == 200 and body is not None:
            got = _sha256(body)
            if got == want:
                return "OK", f"{len(body)} B"
            return "ABWEICHUNG", f"live {len(body)} B/{got[:12]} ≠ repo {local.stat().st_size} B/{want[:12]}"
        last = f"HTTP {status}" if status is not None else f"Fehler: {error}"
        if attempt < attempts:
            time.sleep(delay)
    return "NICHT ERREICHBAR", last


def main() -> int:
    parser = argparse.ArgumentParser(description="Prüft die live ausgelieferte base3-Seite.")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--attempts", type=int, default=6, help="Versuche pro Datei (CDN-Propagation)")
    parser.add_argument("--delay", type=int, default=10, help="Sekunden zwischen den Versuchen")
    parser.add_argument("--timeout", type=int, default=20)
    args = parser.parse_args()

    base_url = args.base_url if args.base_url.endswith("/") else args.base_url + "/"
    urls = expected_urls(base_url)
    print(f"Prüfe {len(urls)} Dateien gegen {base_url} …\n")

    failures = []
    for path, url in urls.items():
        status, detail = check_one(path, url, args.timeout, args.attempts, args.delay)
        print(f"  {status:<16} {path:<38} {detail}")
        if status != "OK":
            failures.append(f"{path}: {status} ({detail})")

    print()
    if failures:
        print(f"DEPLOY-CHECK FEHLGESCHLAGEN — {len(failures)} Abweichung(en):")
        for line in failures:
            print(f"  - {line}")
        return 1
    print(f"DEPLOY-CHECK OK: alle {len(urls)} Dateien live identisch mit dem Repo.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
