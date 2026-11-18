"""Der Vorschau-Server muss ausliefern wie GitHub Pages.

Messbar: die Live-Seite sendet `content-encoding: gzip` und
`cache-control: max-age=600` und kommt auf 44 KiB. Der CI-Audit lief über
`python3 -m http.server`, der nichts davon tut — dadurch stand dort
`uses-text-compression: 0` (38 KiB behauptete Ersparnis) und eine
Gesamtgröße von 93 KiB, also eine Auslieferung, die die Seite nie benutzt.
"""

import gzip
import importlib.util
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

BASE3 = Path(__file__).resolve().parent.parent
SKRIPT = BASE3 / "scripts" / "serve-preview.py"

spec = importlib.util.spec_from_file_location("serve_preview", SKRIPT)
assert spec is not None and spec.loader is not None
sp = importlib.util.module_from_spec(spec)
sys.modules["serve_preview"] = sp
spec.loader.exec_module(sp)


def _freier_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def _start(root: Path):
    port = _freier_port()
    prozess = subprocess.Popen(
        [sys.executable, str(SKRIPT), "--port", str(port), "--root", str(root)],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    for _ in range(50):
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=0.2):
                return prozess, port
        except OSError:
            if prozess.poll() is not None:
                raise AssertionError("Vorschau-Server ist sofort beendet")
            time.sleep(0.1)
    prozess.kill()
    raise AssertionError("Vorschau-Server hat nicht geantwortet")


def _hol(port: int, pfad: str, accept_gzip: bool = True) -> tuple[int, dict, bytes]:
    anfrage = urllib.request.Request(f"http://127.0.0.1:{port}{pfad}")
    if accept_gzip:
        anfrage.add_header("Accept-Encoding", "gzip")
    try:
        with urllib.request.urlopen(anfrage, timeout=5) as antwort:
            return antwort.status, dict(antwort.headers), antwort.read()
    except urllib.error.HTTPError as fehler:
        return fehler.code, dict(fehler.headers), fehler.read()


def test_text_wird_gzippt_und_mit_pages_ttl_versehen(tmp_path):
    (tmp_path / "base3").mkdir()
    (tmp_path / "base3" / "index.html").write_text("<html>" + "x" * 2000 + "</html>", encoding="utf-8")
    prozess, port = _start(tmp_path)
    try:
        status, header, körper = _hol(port, "/base3/")
        assert status == 200
        assert header.get("content-encoding") == "gzip", "HTML wird nicht gzippt"
        assert header.get("cache-control") == "max-age=600", "TTL weicht von Pages ab"
        assert gzip.decompress(körper).decode("utf-8").startswith("<html>")
    finally:
        prozess.terminate()


def test_ohne_accept_encoding_kommt_unkomprimiert(tmp_path):
    (tmp_path / "base3").mkdir()
    (tmp_path / "base3" / "index.html").write_text("<html>" + "x" * 2000 + "</html>", encoding="utf-8")
    prozess, port = _start(tmp_path)
    try:
        status, header, körper = _hol(port, "/base3/", accept_gzip=False)
        assert status == 200
        assert "content-encoding" not in header
        assert körper.startswith(b"<html>")
    finally:
        prozess.terminate()


def test_binaerdateien_werden_nicht_gegzippt(tmp_path):
    (tmp_path / "base3" / "assets").mkdir(parents=True)
    # wOF2-Magic: der Handler überspringt gzip für Schriften ausdrücklich.
    (tmp_path / "base3" / "assets" / "f.woff2").write_bytes(b"wOF2" + b"\x00" * 2048)
    prozess, port = _start(tmp_path)
    try:
        status, header, körper = _hol(port, "/base3/assets/f.woff2")
        assert status == 200
        assert "content-encoding" not in header, "Schrift wird mit gzip verpackt"
        assert körper[:4] == b"wOF2"
    finally:
        prozess.terminate()


def test_fehlende_datei_und_pfad_hinter_dem_root(tmp_path):
    (tmp_path / "base3").mkdir()
    (tmp_path / "base3" / "index.html").write_text("x", encoding="utf-8")
    (tmp_path / "ausserhalb.txt").write_text("geheim", encoding="utf-8")
    prozess, port = _start(tmp_path)
    try:
        status, _, _ = _hol(port, "/base3/gibt-es-nicht")
        assert status == 404
        status, _, körper = _hol(port, "/base3/../../../ausserhalb.txt")
        assert status == 404, "Pfad hinter dem Root wird hörbar"
        assert b"geheim" not in körper
    finally:
        prozess.terminate()


def test_verzeichnis_liefert_index(tmp_path):
    (tmp_path / "base3").mkdir()
    (tmp_path / "base3" / "index.html").write_text("<html>index</html>" + "x" * 1000, encoding="utf-8")
    prozess, port = _start(tmp_path)
    try:
        status, _, körper = _hol(port, "/base3")
        assert status == 200
        assert b"index" in gzip.decompress(körper)
    finally:
        prozess.terminate()
