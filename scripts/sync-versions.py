#!/usr/bin/env python3
"""
sync-versions.py — holt Versionsnummern + Release-Datum aus schach9x9 & trischach
(package.json / git describe) und patcht index.html + README.md.

Usage:
  python3 scripts/sync-versions.py
  python3 scripts/sync-versions.py --schach-path ../schach9x9 --trischach-path ../trischach

Exit 0 bei up-to-date oder erfolgreich gepatcht, Exit 1 wenn ein Repo fehlt.
"""

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

# Pfade relativ zum base3-Root (wird von __file__ aufgelöst)
BASE3 = Path(__file__).resolve().parent.parent
INDEX_HTML = BASE3 / "index.html"
README_MD = BASE3 / "README.md"


def read_version_from_pkg(pkg_json: Path) -> str:
    """Liest die 'version' aus package.json."""
    data = json.loads(pkg_json.read_text(encoding="utf-8"))
    return str(data["version"])


def tag_date(schach_dir: Path, ver: str) -> str:
    """Datum des Tags v<ver> aus dem Repo (YYYY-MM-DD)."""
    tag = f"v{ver}"
    try:
        out = subprocess.check_output(
            ["git", "log", "-1", "--format=%cd", "--date=short", "--", tag],
            cwd=schach_dir,
            stderr=subprocess.DEVNULL,
        ).strip()
        return out.decode("utf-8")
    except Exception:
        return "????"


def patch_index_html(html_text: str, sv: str, sd: str, tv: str, td: str) -> tuple[str, bool]:
    """Patched index.html mit neuen Version-Pills."""
    changed = False

    # Ersetze den Schach9x9-Pill nur wenn Datum fehlt (bereits aktuell = Pill hat Datum)
    schach_pat = re.compile(
        r'(<span class="version-pill">v)' +
        re.escape(sv) +
        r'( \u00b7 (\d{4}-\d{2}-\d{2})|</span>)'
    )
    trischach_pat = re.compile(
        r'(<span class="version-pill">v)' +
        re.escape(tv) +
        r'( \u00b7 \d{4}-\d{2}-\d{2}</span>)'
    )

    # Ersetze den Schach9x9-Pill
    def schach_repl(m):
        nonlocal changed
        changed = True
        return f'{m.group(1)}{sv} \u00b7 {sd}</span>'

    # Ersetze den Trischach-Pill
    def trischach_repl(m):
        nonlocal changed
        changed = True
        return f'{m.group(1)}{tv} \u00b7 {td}</span>'

    new_text = schach_pat.sub(schach_repl, html_text)
    new_text = trischach_pat.sub(trischach_repl, new_text)

    return new_text, changed


def patch_readme(md_text: str, sv: str, sd: str, tv: str, td: str) -> tuple[str, bool]:
    """Patched README.md mit neuen Version-Angaben."""
    changed = False

    # Schach9x9: (aktuell: v1.6.2)
    schach_pat = re.compile(
        r'\(aktuell: v' + re.escape(sv) + r'\)'
    )
    trischach_pat = re.compile(
        r'\(aktuell: v' + re.escape(tv) + r'\)'
    )

    def schach_repl(m):
        nonlocal changed
        changed = True
        return f'(aktuell: v{sv})'

    def trischach_repl(m):
        nonlocal changed
        changed = True
        return f'(aktuell: v{tv})'

    new_text = schach_pat.sub(schach_repl, md_text)
    new_text = trischach_pat.sub(trischach_repl, new_text)

    return new_text, changed


def main():
    parser = argparse.ArgumentParser(
        description="Syncs version pills in base3/index.html + base3/README.md from the game subrepos."
    )
    parser.add_argument(
        "--schach-path",
        default="/home/tobber/schach9x9",
        help="Pfad zum schach9x9-Verzeichnis (standardmäßig /home/tobber/schach9x9)",
    )
    parser.add_argument(
        "--trischach-path",
        default="/home/tobber/trischach",
        help="Pfad zum trischach-Verzeichnis (standardmäßig /home/tobber/trischach)",
    )
    args = parser.parse_args()

    schach_dir = Path(args.schach_path).expanduser().resolve()
    trischach_dir = Path(args.trischach_path).expanduser().resolve()

    if not schach_dir.is_dir():
        print(f"FEHLER: schach9x9-Verzeichnis nicht gefunden: {schach_dir}", file=sys.stderr)
        sys.exit(1)
    if not trischach_dir.is_dir():
        print(f"FEHLER: trischach-Verzeichnis nicht gefunden: {trischach_dir}", file=sys.stderr)
        sys.exit(1)

    schach_pkg = schach_dir / "package.json"
    trischach_pkg = trischach_dir / "package.json"

    if not schach_pkg.is_file():
        print(f"FEHLER: package.json nicht gefunden in {schach_dir}", file=sys.stderr)
        sys.exit(1)
    if not trischach_pkg.is_file():
        print(f"FEHLER: package.json nicht gefunden in {trischach_dir}", file=sys.stderr)
        sys.exit(1)

    schach_ver = read_version_from_pkg(schach_pkg)
    trischach_ver = read_version_from_pkg(trischach_pkg)

    schach_date = tag_date(schach_dir, schach_ver)
    trischach_date = tag_date(trischach_dir, trischach_ver)

    # index.html patchen
    html_text = INDEX_HTML.read_text(encoding="utf-8")
    new_html, html_changed = patch_index_html(
        html_text, schach_ver, schach_date, trischach_ver, trischach_date
    )

    # README.md patchen
    md_text = README_MD.read_text(encoding="utf-8")
    new_md, md_changed = patch_readme(
        md_text, schach_ver, schach_date, trischach_ver, trischach_date
    )

    if html_changed:
        INDEX_HTML.write_text(new_html, encoding="utf-8")
        print("index.html: Version-Pills aktualisiert")
    else:
        print("index.html: Version-Pills bereits aktuell")

    if md_changed:
        README_MD.write_text(new_md, encoding="utf-8")
        print("README.md: Version-Angaben aktualisiert")
    else:
        print("README.md: Version-Angaben bereits aktuell")

    print()
    print(f"Schach9x9:  v{schach_ver}  ({schach_date})")
    print(f"Trischach:  v{trischach_ver}  ({trischach_date})")

    if html_changed or md_changed:
        print()
        print("Nächste Schritte:")
        print("  cd /home/tobber/base3")
        print("  git add index.html README.md")
        print("  git commit -m 'chore: sync version pills'")
        print("  git push")


if __name__ == "__main__":
    main()
