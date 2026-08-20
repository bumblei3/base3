#!/usr/bin/env python3
"""
sync-versions.py — liest Versionsnummern + Release-Datum aus schach9x9/trischach
(package.json + git tag) und patcht index.html, README.md und FAQ.md.

Ersetzt Version-Pills, JSON-LD (softwareVersion + datePublished),
whats-new-Labels und die FAQ-/README-Versionszeilen — unabhängig davon,
welche Version vorher stand. Die Bullet-Texte unter „Was ist neu“ bleiben
manuell (kommen aus den Changelogs).

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
FAQ_MD = BASE3 / "FAQ.md"

VER = r"\d+\.\d+\.\d+"
DATE = r"\d{4}-\d{2}-\d{2}"


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


def _sub(pattern: str, repl: str, text: str, flags: int = 0, count: int = 0) -> tuple[str, bool]:
    new = re.sub(pattern, repl, text, count=count, flags=flags)
    return new, new != text


def patch_index(html_text: str, sv: str, sd: str, tv: str, td: str) -> tuple[str, bool]:
    changed = False

    def apply(pat: str, repl: str) -> None:
        nonlocal html_text, changed
        html_text, hit = _sub(pat, repl, html_text)
        changed = changed or hit

    apply(
        rf'(<article class="game-card schach9x9">[\s\S]*?<span class="version-pill">)v{VER}(?: · (?:{DATE})?)?(</span>)',
        rf"\g<1>v{sv} · {sd}\g<2>",
    )
    apply(
        rf'(<article class="game-card trischach">[\s\S]*?<span class="version-pill">)v{VER}(?: · (?:{DATE})?)?(</span>)',
        rf"\g<1>v{tv} · {td}\g<2>",
    )
    apply(
        rf'(<span class="whats-new-label">Schach9x9 · )v{VER}(</span>)',
        rf"\g<1>v{sv}\g<2>",
    )
    apply(
        rf'(<span class="whats-new-label">Trischach · )v{VER}(</span>)',
        rf"\g<1>v{tv}\g<2>",
    )
    apply(
        rf'("name": "Schach9x9"[\s\S]*?"softwareVersion": ")v{VER}(")',
        rf"\g<1>v{sv}\g<2>",
    )
    apply(
        rf'("name": "Schach9x9"[\s\S]*?"datePublished": "){DATE}(")',
        rf"\g<1>{sd}\g<2>",
    )
    apply(
        rf'("name": "Trischach"[\s\S]*?"softwareVersion": ")v{VER}(")',
        rf"\g<1>v{tv}\g<2>",
    )
    apply(
        rf'("name": "Trischach"[\s\S]*?"datePublished": "){DATE}(")',
        rf"\g<1>{td}\g<2>",
    )
    return html_text, changed


def patch_readme(md_text: str, sv: str, sd: str, tv: str, td: str) -> tuple[str, bool]:
    changed = False

    def apply(pat: str, repl: str) -> None:
        nonlocal md_text, changed
        md_text, hit = _sub(pat, repl, md_text)
        changed = changed or hit

    apply(
        rf"(Feenfiguren \(Erzbischof, Kanzler, Engel\)\. \*\(aktuell: v){VER}(\)\*)",
        rf"\g<1>{sv}\g<2>",
    )
    apply(
        rf"(Stein-Schere-Papier-Kampfmechanik\. \*\(aktuell: v){VER}(\)\*)",
        rf"\g<1>{tv}\g<2>",
    )
    apply(
        rf"(### Schach9x9 · v){VER}( \({DATE}\))",
        rf"\g<1>{sv} ({sd})",
    )
    apply(
        rf"(### Trischach · v){VER}( \({DATE}\))",
        rf"\g<1>{tv} ({td})",
    )
    return md_text, changed


def patch_faq(md_text: str, sv: str, sd: str, tv: str, td: str) -> tuple[str, bool]:
    changed = False

    def apply(pat: str, repl: str) -> None:
        nonlocal md_text, changed
        md_text, hit = _sub(pat, repl, md_text)
        changed = changed or hit

    apply(
        rf"(\*\*Schach9x9:\*\* v){VER}( \({DATE}\))",
        rf"\g<1>{sv} ({sd})",
    )
    apply(
        rf"(\*\*Trischach:\*\* v){VER}( \({DATE}\))",
        rf"\g<1>{tv} ({td})",
    )
    apply(
        rf"(\*\*Schach9x9 \(v){VER}(\):\*\*)",
        rf"\g<1>{sv}\g<2>",
    )
    apply(
        rf"(\*\*Trischach \(v){VER}(\):\*\*)",
        rf"\g<1>{tv}\g<2>",
    )
    return md_text, changed


def main():
    parser = argparse.ArgumentParser(
        description="Sync version pills in base3 from schach9x9 + trischach."
    )
    parser.add_argument(
        "--schach-path",
        default="/home/tobber/schach9x9",
        help="Pfad zum schach9x9-Repo (default: /home/tobber/schach9x9)",
    )
    parser.add_argument(
        "--trischach-path",
        default="/home/tobber/trischach",
        help="Pfad zum trischach-Repo (default: /home/tobber/trischach)",
    )
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
    if sd.startswith("?") or td.startswith("?"):
        print(
            f"WARNUNG: Tag-Datum unvollständig (Schach9x9 v{sv}={sd}, Trischach v{tv}={td})",
            file=sys.stderr,
        )

    jobs = (
        (INDEX_HTML, patch_index, "index.html"),
        (README_MD, patch_readme, "README.md"),
        (FAQ_MD, patch_faq, "FAQ.md"),
    )
    any_changed = False
    for path, fn, label in jobs:
        text = path.read_text(encoding="utf-8")
        new_text, changed = fn(text, sv, sd, tv, td)
        if changed:
            path.write_text(new_text, encoding="utf-8")
            print(f"{label}: Versionen → Schach9x9 v{sv} · {sd}, Trischach v{tv} · {td}")
            any_changed = True
        else:
            print(f"{label}: keine Änderungen (bereits aktuell)")

    if not any_changed:
        print("Alles bereits auf dem Stand der Nachbar-Repos.")


if __name__ == "__main__":
    main()
