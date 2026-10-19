"""Tests für scripts/sync-versions.py — Drift-Check + Patch-Idempotenz.

Läuft ohne Netz: die Patch-Funktionen arbeiten auf Dateikopien in tmp_path,
release_date_from_repo wird für deterministische Datumsangaben monkeypatcht.
"""

import importlib.util
import sys
from pathlib import Path

import pytest

BASE3 = Path(__file__).resolve().parent.parent

# sync-versions.py hat einen Bindestrich im Dateinamen → kein normaler Import.
_spec = importlib.util.spec_from_file_location(
    "sync_versions", BASE3 / "scripts" / "sync-versions.py"
)
sv = importlib.util.module_from_spec(_spec)
sys.modules["sync_versions"] = sv
_spec.loader.exec_module(sv)

ORIGINAL_INDEX = (BASE3 / "index.html").read_text(encoding="utf-8")
ORIGINAL_README = (BASE3 / "README.md").read_text(encoding="utf-8")
ORIGINAL_FAQ = (BASE3 / "FAQ.md").read_text(encoding="utf-8")

NEW = ("9.9.9", "2099-01-01", "8.8.8", "2099-02-02")

FIXED_DATE = "2099-01-01"

# Fixed Point für die --check-Tests: lastmod entspricht den erwarteten Werten.
SITEMAP_FIXED_POINT = """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://bumblei3.github.io/base3/</loc>
    <lastmod>2099-01-01</lastmod>
  </url>
  <url>
    <loc>https://bumblei3.github.io/schach9x9/</loc>
    <lastmod>2099-01-01</lastmod>
  </url>
  <url>
    <loc>https://bumblei3.github.io/trischach/</loc>
    <lastmod>2099-01-01</lastmod>
  </url>
</urlset>
"""


# ---------------------------------------------------------------- index.html
def test_patch_index_updates_every_version_slot():
    out, changed = sv.patch_index(ORIGINAL_INDEX, *NEW)
    assert changed
    assert "v9.9.9 · 2099-01-01" in out
    assert "v8.8.8 · 2099-02-02" in out
    assert '"softwareVersion": "v9.9.9"' in out
    assert '"datePublished": "2099-01-01"' in out
    assert '<span class="whats-new-label">Schach9x9 · v9.9.9</span>' in out


def test_patch_index_is_idempotent():
    once, _ = sv.patch_index(ORIGINAL_INDEX, *NEW)
    twice, changed = sv.patch_index(once, *NEW)
    assert not changed, "zweites Anwenden muss No-op sein"
    assert twice == once


def test_patch_index_noop_when_already_current():
    once, _ = sv.patch_index(ORIGINAL_INDEX, *NEW)
    _, changed = sv.patch_index(once, *NEW)
    assert not changed


def test_patch_index_keeps_unknown_version_shape():
    """Ein Pill ganz ohne Datum wird ebenfalls gefunden (Regex-Toleranz)."""
    broken = ORIGINAL_INDEX.replace("v2.0.0 · 2026-08-23", "v2.0.0")
    out, changed = sv.patch_index(broken, *NEW)
    assert changed
    assert "v2.0.0 ·" not in out


# ---------------------------------------------------------------- README.md
def test_patch_readme_updates_versions_and_dates():
    out, changed = sv.patch_readme(ORIGINAL_README, *NEW)
    assert changed
    assert "(aktuell: v9.9.9)" in out
    assert "(aktuell: v8.8.8)" in out
    assert "Schach9x9 · v9.9.9 (2099-01-01)" in out


def test_patch_readme_is_idempotent():
    once, _ = sv.patch_readme(ORIGINAL_README, *NEW)
    _, changed = sv.patch_readme(once, *NEW)
    assert not changed


# ---------------------------------------------------------------- FAQ.md
def test_patch_faq_updates_versions_and_dates():
    out, changed = sv.patch_faq(ORIGINAL_FAQ, *NEW)
    assert changed
    assert "**Schach9x9:** v9.9.9 (2099-01-01)" in out
    assert "**Trischach:** v8.8.8 (2099-02-02)" in out


def test_patch_faq_is_idempotent():
    once, _ = sv.patch_faq(ORIGINAL_FAQ, *NEW)
    _, changed = sv.patch_faq(once, *NEW)
    assert not changed


# ---------------------------------------------------------------- --check
def _fake_repos(tmp_path: Path) -> tuple[Path, Path]:
    schach = tmp_path / "schach9x9"
    trischach = tmp_path / "trischach"
    for d, ver in ((schach, "9.9.9"), (trischach, "8.8.8")):
        d.mkdir()
        (d / "package.json").write_text(
            f'{{"name": "x", "version": "{ver}"}}', encoding="utf-8"
        )
    return schach, trischach


def _redirect_files(monkeypatch, tmp_path: Path) -> tuple[Path, Path, Path]:
    copies = []
    for src, dst in (
        (BASE3 / "index.html", tmp_path / "index.html"),
        (BASE3 / "README.md", tmp_path / "README.md"),
        (BASE3 / "FAQ.md", tmp_path / "FAQ.md"),
    ):
        dst.write_text(src.read_text(encoding="utf-8"), encoding="utf-8")
        copies.append(dst)
    monkeypatch.setattr(sv, "INDEX_HTML", copies[0])
    monkeypatch.setattr(sv, "README_MD", copies[1])
    monkeypatch.setattr(sv, "FAQ_MD", copies[2])

    # Sitemap als Fixed Point: die erwarteten lastmod-Werte stehen schon drin,
    # damit der Sitemap-Job in den --check-Tests nicht zusätzlich driftet.
    sitemap = tmp_path / "sitemap.xml"
    sitemap.write_text(SITEMAP_FIXED_POINT, encoding="utf-8")
    monkeypatch.setattr(sv, "SITEMAP_XML", sitemap)
    monkeypatch.setattr(sv, "_get_base_lastmod", lambda: FIXED_DATE)
    return copies[0], copies[1], copies[2]


def test_check_mode_fails_on_drift_without_writing(monkeypatch, tmp_path, capsys):
    idx, readme, faq = _redirect_files(monkeypatch, tmp_path)
    schach, trischach = _fake_repos(tmp_path)
    monkeypatch.setattr(sv, "release_date_from_repo", lambda d, v: "2099-01-01")
    monkeypatch.setattr(
        sys,
        "argv",
        [
            "sync-versions.py",
            "--schach-path",
            str(schach),
            "--trischach-path",
            str(trischach),
            "--check",
        ],
    )

    with pytest.raises(SystemExit) as exc:
        sv.main()

    assert exc.value.code == 1, "--check muss bei Drift mit 1 enden"
    assert idx.read_text(encoding="utf-8") == ORIGINAL_INDEX, "--check darf nichts schreiben"
    assert readme.read_text(encoding="utf-8") == ORIGINAL_README
    assert faq.read_text(encoding="utf-8") == ORIGINAL_FAQ
    assert "DRIFT" in capsys.readouterr().out


def test_check_mode_passes_after_sync(monkeypatch, tmp_path):
    idx, readme, faq = _redirect_files(monkeypatch, tmp_path)
    schach, trischach = _fake_repos(tmp_path)
    monkeypatch.setattr(sv, "release_date_from_repo", lambda d, v: "2099-01-01")
    base = [
        "sync-versions.py",
        "--schach-path",
        str(schach),
        "--trischach-path",
        str(trischach),
    ]
    monkeypatch.setattr(sys, "argv", base)
    sv.main()
    assert "9.9.9" in idx.read_text(encoding="utf-8")

    monkeypatch.setattr(sys, "argv", base + ["--check"])
    sv.main()  # kein SystemExit → exit 0
