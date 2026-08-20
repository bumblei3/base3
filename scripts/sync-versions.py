#!/usr/bin/env python3
"""
sync-versions.py — holt Versionsnummern + Release-Datum aus schach9x9 &
trischach (package.json → git tag date) und patcht index.html + README.md.

Aufruf aus dem base3-Verzeichnis:
    python3 scripts/sync-versions.py
    python3 scripts/sync-versions.py --schach-path /home/tobber/schach9x9 --trischach-path /home/tobber/trischach

Exit 0 = up-to-date oder gepatcht, Exit 1 = ein Repo nicht gefunden.
"""

from __future__ import annotations
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

INDEX_HTML = Path("/home/tobber/base3/index.html")
README_MD = Path("/home/tobber/base3/README.md")


def read_version(pkg_json: Path) -> str:
    data = json.loads(pkg_json.read_text(encoding="utf-8"))
    return str(data["version"])


def tag_date(repo_dir: Path, version: str) -> str:
    """Datum des Tags v<version> im Repo (ISO YYYY-MM-DD)."""
    tag = f"v{version}"
    try:
        out = subprocess.check_output(
            ["git", "log", "-1", "--format=%cd", "--date=short", tag],
            cwd=repo_dir,
            text=True,
            stderr=subprocess.DEVNULL,
        ).strip()
        return out
    except (subprocess.CalledProcessError, FileNotFoundError):
        return "????"


def patch_index_html(html: Path, schach_ver: str, schach_date: str,
                     trischach_ver: str, trischach_date: str) -> bool:
    text = html.read_text(encoding="utf-8")
    changed = False

    # Pattern: <span class="version-pill">v1.6.2 · 2026-07-20</span>
    schach_re = re.compile(
        r'(<span class="version-pill">v)' + re.escape(schach_ver) +
        r'( \xc2\xb7 \d{4}-\d{2}-\d{2})</span>'
    )
    trischach_re = re.compile(
        r'(<span class="version-pill">v)' + re.escape(trischach_ver) +
        r'( \xc2\xb7 \d{4}-\d{2}-\d{2})</span>'
    )

    def _replace_schach(m):
        nonlocal changed
        changed = True
        return f'{m.group(1)}{schach_ver} \xc2\xb7 {schach_date}</span>'

    def _replace_trischach(m):
        nonlocal changed
        changed = True
        return f'{m.group(1)}{trischach_ver} \xc2\xb7 {trischach_date}</span>'

    text2 = schach_re.sub(_replace_schach, text)
    text3 = trischach_re.sub(_replace_trischach, text2)

    if changed:
        html.write_text(text3, encoding="utf-8")
    return changed


def patch_readme(md: Path, schach_ver: str, schach_date: str,
                 trischach_ver: str, trischach_date: str) -> bool:
    text = md.read_text(encoding="utf-8")
    changed = False

    # Spiel-Abschnitt: *(aktuell: v1.6.2)*
    schach_re = re.compile(r'\(aktuell: v' + re.escape(schach_ver) + r'\)')
    trischach_re = re.compile(r'\(aktuell: v' + re.escape(trischach_ver) + r'\)')

    def _schach(m):
        nonlocal changed
        changed = True
        return f'(aktuell: v{schach_ver})'

    def _trischach(m):
        nonlocal changed
        changed = True
        return f'(aktuell: v{trischach_ver})'

    text2 = schach_re.sub(_schach, text)
    text3 = trischach_re.sub(_trischach, text2)

    # "Was ist neu" Sektion: ### Schach9x9 · v1.6.2 (2026-07-20)
    schach_new_re = re.compile(
        r'(### Schach9x9 \xc2\xb7 v)' + re.escape(schach_ver) +
        r'(\ \(\d{4}-\d{2}-\d{2}\))'
    )
    trischach_new_re = re.compile(
        r'(### Trischach \xc2\xb7 v)' + re.escape(trischach_ver) +
        r'(\ \(\d{4}-\d{2}-\d{2}\))'
    )

    def _schach_new(m):
        nonlocal changed
        changed = True
        return f'{m.group(1)}{schach_ver}{m.group(2)}'

    def _trischach_new(m):
        nonlocal changed
        changed = True
        return f'{m.group(1)}{trischach_ver}{m.group(2)}'

    text4 = schach_new_re.sub(_schach_new, text3)
    text5 = trischach_new_re.sub(_trischach_new, text4)

    if changed:
        md.write_text(text5, encoding="utf-8")
    return changed


def main():
    parser = argparse.ArgumentParser(
        description="Sync version pills in base3 from sub-repos"
    )
    parser.add_argument(
        "--schach-path", default="/home/tobber/schach9x9",
        help="Pfad zum schach9x9-Verzeichnis",
    )
    parser.add_argument(
        "--trischach-path", default="/home/tobber/trischach",
        help="Pfad zum trischach-Verzeichnis",
    )
    args = parser.parse_args()

    schach_dir = Path(args.schach_path).expanduser().resolve()
    trischach_dir = Path(args.trischach_path).expanduser().resolve()

    if not schach_dir.is_dir():
        print(f"FEHLER: schach9x9 nicht gefunden unter {schach_dir}", file=sys.stderr)
        sys.exit(1)
    if not trischach_dir.is_dir():
        print(f"FEHLER: trischach nicht gefunden unter {trischach_dir}", file=sys.stderr)
        sys.exit(1)

    pkg_schach = schach_dir / "package.json"
    pkg_trischach = trischach_dir / "package.json"

    if not pkg_schach.is_file():
        print(f"FEHLER: {pkg_schach} nicht gefunden", file=sys.stderr)
        sys.exit(1)
    if not pkg_trischach.is_file():
        print(f"FEHLER: {pkg_trischach} nicht gefunden", file=sys.stderr)
        sys.exit(1)

    schach_ver = read_version(pkg_schach)
    trischach_ver = read_version(pkg_trischach)
    schach_date = tag_date(schach_dir, schach_ver)
    trischach_date = tag_date(trischach_dir, trischach_ver)

    # index.html
    idx_changed = patch_index_html(
        INDEX_HTML, schach_ver, schach_date, trischach_ver, trischach_date
    )
    # README.md
    readme_changed = patch_readme(
        README_MD, schach_ver, schach_date, trischach_ver, trischach_date
    )

    print(f"Schach9x9: v{schach_ver} ({schach_date})")
    print(f"Trischach: v{trischach_ver} ({trischach_date})")
    print()
    print(f"index.html aktualisiert: {'JA' if idx_changed else 'Nein (bereits aktuell)'}")
    print(f"README.md aktualisiert: {'JA' if readme_changed else 'Nein (bereits aktuell)'}")

    if idx_changed or readme_changed:
        print()
        print("Git-Commit:"
              "\n  cd /home/tobber/base3"
              "\n  git add index.html README.md"
              "\n  git commit -m \"chore: sync version pills via sync-versions.py\""
              "\n  git push")
    else:
        print("\nAlles aktuell — kein Commit nötig.")


if __name__ == "__main__":
    main()
