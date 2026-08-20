#!/usr/bin/env python3
"""
sync-versions.py — liest Versionsnummern + Release-Datum aus schach9x9/trischach
(package.json + git tag) und patcht index.html + README.md.

Aufruf: python3 scripts/sync-versions.py
        python3 scripts/sync-versions.py --schach-path ../schach9x9 --trischach-path ../trischach
"""

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

BASE3 = Path(__file__).resolve().parent.parent
INDEX_HTML = BASE3 / "index.html"
README_MD = BASE3 / "README.md"


def version_from_pkg(pkg_path: Path) -> str:
    data = json.loads(pkg_path.read_text(encoding="utf-8"))
    return str(data.get("version", ""))


def release_date(repo_path: Path, version: str) -> str:
    """Datum des Tags `v<version>` im Repo (YYYY-MM-DD)."""
    tag = f"v{version}"
    try:
        out = subprocess.check_output(
            ["git", "log", "-1", "--format=%cd", "--date=short", tag],
            cwd=repo_path,
            stderr=subprocess.DEVNULL,
            text=True,
        ).strip()
        return out
    except (subprocess.CalledProcessError, FileNotFoundError, ValueError):
        return "????-??-??"


def patch_index(html_text: str, sv: str, sd: str, tv: str, td: str) -> tuple[str, bool]:
    changed = False

    # version-pills im <span class="version-pill">v1.6.2 · 2026-07-20</span>
    schach_pat = re.compile(
        r'(<span class="version-pill">v)' + re.escape(sv) +
        r'( · \d{4}-\d{2}-\d{2})</span>'
    )
    trischach_pat = re.compile(
        r'(<span class="version-pill">v)' + re.escape(tv) +
        r'( · \d{4}-\d{2}-\d{2})</span>'
    )

    def _schach(m):
        nonlocal changed
        changed = True
        return f'{m.group(1)}{sv} · {sd}</span>'

    def _trischach(m):
        nonlocal changed
        changed = True
        return f'{m.group(1)}{tv} · {td}</span>'

    text2 = schach_pat.sub(_schach, html_text)
    text3 = trischach_pat.sub(_trischach, text2)
    if changed:
        return text3, True
    return html_text, False


def patch_readme(md_text: str, sv: str, sd: str, tv: str, td: str) -> tuple[str, bool]:
    changed = False

    # README: *(aktuell: v1.6.2)* und ### Schach9x9 · v1.6.2 (2026-07-20)
    schach_pill_pat = re.compile(r'\(aktuell: v' + re.escape(sv) + r'\)')
    trischach_pill_pat = re.compile(r'\(aktuell: v' + re.escape(tv) + r'\)')

    # "Was ist neu": ### Schach9x9 · v1.6.2 (2026-07-20)
    schach_new_pat = re.compile(r'(### Schach9x9 · v)' + re.escape(sv) + r'(\ \(\d{4}-\d{2}-\d{2}\))')
    trischach_new_pat = re.compile(r'(### Trischach · v)' + re.escape(tv) + r'(\ \(\d{4}-\d{2}-\d{2}\))')

    def _schach_pill(m):
        nonlocal changed
        changed = True
        return f'(aktuell: v{sv})'

    def _trischach_pill(m):
        nonlocal changed
        changed = True
        return f'(aktuell: v{tv})'

    def _schach_new(m):
        nonlocal changed
        changed = True
        return f'{m.group(1)}{sv}{m.group(2)}'

    def _trischach_new(m):
        nonlocal changed
        changed = True
        return f'{m.group(1)}{tv}{m.group(2)}'

    text2 = schach_pill_pat.sub(_schach_pill, md_text)
    text3 = trischach_pill_pat.sub(_trischach_pill, text2)
    text4 = schach_new_pat.sub(_schach_new, text3)
    text5 = trischach_new_pat.sub(_trischach_new, text4)

    if changed:
        return text5, True
    return md_text, False


def main():
    parser = argparse.ArgumentParser(description="Sync version pills in base3 from schach9x9 + trischach.")
    parser.add_argument("--schach-path", default="/home/tobber/schach9x9",
                        help="Pfad zum schach9x9-Repo (default: /home/tobber/schach9x9)")
    parser.add_argument("--trischach-path", default="/home/tobber/trischach",
                        help="Pfad zum trischach-Repo (default: /home/tobber/trischach)")
    args = parser.parse_args()

    schach_dir = Path(args.schach_path).expanduser().resolve()
    trischach_dir = Path(args.trischach_path).expanduser().resolve()

    if not schach_dir.is_dir():
        print(f"FEHLER: schach9x9-Repo nicht gefunden: {schach_dir}", file=sys.stderr)
        sys.exit(1)
    if not trischach_dir.is_dir():
        print(f"FEHLER: trischach-Repo nicht gefunden: {trischach_dir}", file=sys.stderr)
        sys.exit(1)

    schach_pkg = schach_dir / "package.json"
    trischach_pkg = trischach_dir / "package.json"
    if not schach_pkg.is_file():
        print(f"FEHLER: {schach_pkg} nicht gefunden", file=sys.stderr)
        sys.exit(1)
    if not trischach_pkg.is_file():
        print(f"FEHLER: {trischach_pkg} nicht gefunden", file=sys.stderr)
        sys.exit(1)

    sv = version_from_pkg(schach_pkg)
    tv = version_from_pkg(trischach_pkg)
    sd = release_date(schach_dir, sv)
    td = release_date(trischach_dir, tv)

    if not sv or not tv:
        print("FEHLER: Versionsnummern konnten nicht gelesen werden", file=sys.stderr)
        sys.exit(1)

    # index.html
    html_text = INDEX_HTML.read_text(encoding="utf-8")
    new_html, html_changed = patch_index(html_text, sv, sd, tv, td)
    if html_changed:
        INDEX_HTML.write_text(new_html, encoding="utf-8")
        print(f"index.html: Version-Pills aktualisiert (Schach9x9 v{sv} · {sd}, Trischach v{tv} · {td})")
    else:
        print("index.html: keine Änderungen (bereits aktuell)")

    # README.md
    md_text = README_MD.read_text(encoding="utf-8")
    new_md, md_changed = patch_readme(md_text, sv, sd, tv, td)
    if md_changed:
        README_MD.write_text(new_md, encoding="utf-8")
        print(f"README.md: Version-Angaben aktualisiert (Schach9x9 v{sv} {sd}, Trischach v{tv} {td})")
    else:
        print("README.md: keine Änderungen (bereits aktuell)")


if __name__ == "__main__":
    main()
