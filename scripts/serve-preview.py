#!/usr/bin/env python3
"""serve-preview.py — Vorschau-Server für die CI-Messungen.

GitHub Pages liefert die Seite gzip-komprimiert und mit
`Cache-Control: max-age=600`. `python3 -m http.server` macht beides nicht —
und Lighthouse wertet genau das: im CI stand `uses-text-compression: 0`
(geschätzte Ersparnis 38 KiB) und eine Gesamtgröße von 93 KiB, während die
Live-Seite `content-encoding: gzip` sendet und 44 KiB hat (beides gemessen).
Der Audit maß also eine Auslieferung, die die Seite nie benutzt.

Aufruf:  python3 scripts/serve-preview.py [--port 8765] [--root .lh]
         (im CI: root = .lh, darin liegt das Repo als base3/)

Text-Typen werden gzippt, Binärdaten gehen unangetastet durch — die sind
schon komprimiert, gzip darüber kostet nur CPU.
"""

from __future__ import annotations

import argparse
import gzip
import mimetypes
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

BASE3 = Path(__file__).resolve().parent.parent

# Text-Typen, die Pages gzippt.
GZIPFÄHIG = (
    "text/",
    "application/javascript",
    "application/json",
    "application/manifest+json",
    "image/svg+xml",
)

MIN_GRÖßE = 512  # darunter lohnt die Kompression nicht


def pfad_im(root: Path, url: str) -> Path | None:
    """URL-Pfad → Datei unter `root`; None bei Pfad außerhalb oder fehlend.

    Ohne resolve(): das Repo liegt im CI als Symlink `.lh/base3`, und resolve()
    würde den Pfad in die wahren Verzeichnisse auflösen — der
    Außenhalt-Check würde dann jedes Dateien der Reproduktion verweigern.
    """
    rel = unquote(urlsplit(url).path).lstrip("/")
    if not rel:
        return None
    kandidat = Path(os.path.normpath(root / rel))
    if os.path.commonpath([str(root), str(kandidat)]) != str(root):
        return None
    if kandidat.is_dir():
        kandidat = kandidat / "index.html"
    return kandidat if kandidat.is_file() else None


class Handler(BaseHTTPRequestHandler):
    """Dateien aus `root` ausliefern, Text gzippen, Verzeichnis auf index."""

    server_version = "base3-vorschau/1.0"
    root: Path = BASE3

    def _antwort(self, datei: Path) -> tuple[str, bytes, bool]:
        roh = datei.read_bytes()
        typ = mimetypes.guess_type(datei.name)[0] or "application/octet-stream"
        nutzt_gzip = (
            roh[:4] != b"wOF2"
            and typ.startswith(GZIPFÄHIG)
            and len(roh) >= MIN_GRÖßE
            and "gzip" in (self.headers.get("accept-encoding") or "")
        )
        return typ, (gzip.compress(roh, 9) if nutzt_gzip else roh), nutzt_gzip

    def _absenden(self, datei: Path, mit_rumpf: bool) -> None:
        typ, körper, nutzt_gzip = self._antwort(datei)
        self.send_response(200)
        self.send_header("content-type", typ)
        self.send_header("content-length", str(len(körper)))
        # Dasselbes TTL wie Pages — der Cache-Audit soll nichts erfinden.
        self.send_header("cache-control", "max-age=600")
        if nutzt_gzip:
            self.send_header("content-encoding", "gzip")
        self.end_headers()
        if mit_rumpf:
            self.wfile.write(körper)

    def do_GET(self) -> None:  # noqa: N802 — http.server-API
        datei = pfad_im(self.root, self.path)
        if datei is None:
            self.send_error(404)
            return
        self._absenden(datei, mit_rumpf=True)

    def do_HEAD(self) -> None:  # noqa: N802 — http.server-API
        datei = pfad_im(self.root, self.path)
        if datei is None:
            self.send_error(404)
            return
        self._absenden(datei, mit_rumpf=False)

    def log_message(self, format: str, *args: object) -> None:
        """Standard-Logging ist im CI nur Rauschen."""
        print(f"[vorschau] {self.address_string()} {format % args}", file=sys.stderr)


def main() -> int:
    parser = argparse.ArgumentParser(description="Vorschau-Server wie GitHub Pages.")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--root", default=str(BASE3 / ".lh"))
    args = parser.parse_args()

    root = Path(args.root)
    if not root.is_dir():
        sys.exit(f"FEHLER: {root} ist kein Verzeichnis")

    Handler.root = root
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"[vorschau] http://127.0.0.1:{args.port}/ aus {root}", file=sys.stderr)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
