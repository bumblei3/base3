#!/usr/bin/env python3
"""
sync-versions.py — liest Versionsnummern + Release-Datum aus schach9x9/trischach
und patcht index.html, README.md und FAQ.md.

Zwei Betriebsarten:
1) Lokal (Standard): package.json + lokales Git-Tag aus den Nachbar-Repos.
   Standard-Pfade: /home/tobber/schach9x9, /home/tobber/trischach.
2) API-Modus (--api-mode):  Keine lokale Sub-Repo-Verfügbarkeit nötig.
   - Version aus GitHub Contents API (package.json)
   - Release-Datum aus GitHub Releases API (releases/tags/vX.Y.Z)
   Repository.owner/name wird aus dem lokalen package.json (repository.url) oder
   expliziten CLI-Args bezogen.

Ersetzt Version-Pills, JSON-LD (softwareVersion + datePublished),
whats-new-Labels und die FAQ-/README-Versionszeilen — unabhängig davon,
welche Version vorher stand. Die Bullet-Texte unter „Was ist neu" bleiben
manuell (kommen aus den Changelogs).

Aufruf: python3 scripts/sync-versions.py
        python3 scripts/sync-versions.py --schach-path ../schach9x9 --trischach-path ../trischach
        python3 scripts/sync-versions.py --api-mode
        python3 scripts/sync-versions.py --api-mode --schach-repo-owner bumblei3 --schach-repo-name schach9x9 --trischach-repo-owner bumblei3 --trischach-repo-name trischach
"""

import argparse
import base64
import json
import re
import subprocess
import sys
import urllib.request
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


def release_date_from_repo(repo_path: Path, version: str) -> str:
    """Datum des Tags `v<version>` im Repo (YYYY-MM-DD).

    Primär: lokales Git-Tag. Fallback: GitHub Releases API (aus package.json).
    """
    tag = f"v{version}"
    # 1) Lokales Git-Tag versuchen
    try:
        out = subprocess.check_output(
            ["git", "log", "-1", "--format=%cd", "--date=short", tag],
            cwd=repo_path,
            stderr=subprocess.DEVNULL,
            text=True,
        ).strip()
        if out and not out.startswith("?"):
            return out
    except (subprocess.CalledProcessError, FileNotFoundError, ValueError):
        pass

    # 2) Fallback: GitHub API über repository.url aus package.json
    pkg_path = repo_path / "package.json"
    if pkg_path.is_file():
        try:
            pkg = json.loads(pkg_path.read_text(encoding="utf-8"))
            repo_url = pkg.get("repository", {}).get("url", "")
            if repo_url:
                m = re.search(r"github\.com[/:]([^/]+)/([^/]+)", repo_url)
                if m:
                    owner, name = m.group(1), m.group(2)
                    gd = release_date_from_github(owner, name, version)
                    if not gd.startswith("?"):
                        return gd
        except (json.JSONDecodeError, OSError):
            pass

    return "????-??-??"


def release_date_from_github(repo_owner: str, repo_name: str, version: str) -> str:
    """Fragt GitHub Releases API nach dem Release-Datum für v<version>.

    Rückgabe: YYYY-MM-DD oder '????-??-??' bei Fehler.
    Unauthenticated Request — public repos, rate-limited (60/h).
    """
    tag = f"v{version}"
    url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/releases/tags/{tag}"
    try:
        req = urllib.request.Request(
            url, headers={"Accept": "application/vnd.github+json"}
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            published = data.get("published_at") or data.get("created_at") or ""
            if published:
                return published[:10]
    except Exception:
        pass
    return "????-??-??"


def _release_date_from_github(repo_owner: str, repo_name: str, version: str) -> str:
    """Alias für release_date_from_github (zur Kompatibilität mit bestehendem Code)."""
    return release_date_from_github(repo_owner, repo_name, version)


def _extract_repo_owner_name(repo_url: str) -> tuple[str, str] | None:
    # HTTPS: https://github.com/OWNER/NAME  oder https://github.com/OWNER/NAME.git
    # SSH/git: git@github.com:OWNER/NAME.git  oder git+https://github.com/OWNER/NAME.git
    m = re.search(r"github\.com[/:]([^/]+)/([^/]+?)(?:\.git)?$", repo_url)
    if m:
        owner, name = m.group(1), m.group(2)
        if owner and name:
            return owner, name
    return None


def fetch_remote_package_json(owner: str, name: str) -> dict | None:
    """Liest package.json aus dem GitHub Contents API (base64-dekodiert).

    Unauthenticated — öffentliche Repos, rate-limited (60/h).
    """
    url = f"https://api.github.com/repos/{owner}/{name}/contents/package.json"
    try:
        req = urllib.request.Request(
            url, headers={"Accept": "application/vnd.github+json"}
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
            content = payload.get("content", "")
            if content:
                raw = base64.b64decode(content).decode("utf-8")
                return json.loads(raw)
    except Exception:
        pass
    return None


def version_from_remote_package(owner: str, name: str) -> str:
    pkg = fetch_remote_package_json(owner, name)
    if pkg:
        return str(pkg.get("version", ""))
    return ""


def read_repo_url_from_pkg(pkg_path: Path) -> str:
    if pkg_path.is_file():
        try:
            pkg = json.loads(pkg_path.read_text(encoding="utf-8"))
            return str(pkg.get("repository", {}).get("url", ""))
        except (json.JSONDecodeError, OSError):
            pass
    return ""


def resolve_owner_name_from_git(repo_path: Path) -> tuple[str, str] | None:
    """Versucht, GitHub owner+name aus dem lokalen Git remote origin zu bestimmen.

    Rückgabe: (owner, name) oder None, wenn nichts Passendes gefunden.
    """
    try:
        out = subprocess.check_output(
            ["git", "remote", "get-url", "origin"],
            cwd=repo_path,
            stderr=subprocess.DEVNULL,
            text=True,
        ).strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None

    if not out:
        return None

    # HTTPS: https://github.com/OWNER/NAME.git  oder https://github.com/OWNER/NAME
    # SSH: git@github.com:OWNER/NAME.git
    m = re.search(r"github\.com[/:]([^/]+)/([^/]+?)(?:\.git)?$", out)
    if m:
        owner, name = m.group(1), m.group(2)
        if owner and name:
            return owner, name
    return None


def main():
    parser = argparse.ArgumentParser(
        description="Sync version pills in base3 from schach9x9 + trischach."
    )
    parser.add_argument(
        "--schach-path",
        default="/home/tobber/schach9x9",
        help="Pfad zum schach9x9-Repo (default: /home/tobber/schach9x9). "
        "Wird im --api-mode ignoriert, außer zur Extraktion von repository.url.",
    )
    parser.add_argument(
        "--trischach-path",
        default="/home/tobber/trischach",
        help="Pfad zum trischach-Repo (default: /home/tobber/trischach). "
        "Wird im --api-mode ignoriert, außer zur Extraktion von repository.url.",
    )
    parser.add_argument(
        "--api-mode",
        action="store_true",
        help="Betrieb ohne lokale Sub-Repos — Version + Datum per GitHub API.",
    )
    parser.add_argument(
        "--schach-repo-owner",
        default=None,
        help="Optional: GitHub-owner für schach9x9, wenn package.json nicht lokal verfügbar.",
    )
    parser.add_argument(
        "--schach-repo-name",
        default=None,
        help="Optional: GitHub-name für schach9x9.",
    )
    parser.add_argument(
        "--trischach-repo-owner",
        default=None,
        help="Optional: GitHub-owner für trischach.",
    )
    parser.add_argument(
        "--trischach-repo-name",
        default=None,
        help="Optional: GitHub-name für trischach.",
    )
    args = parser.parse_args()

    if args.api_mode:
        # --------------------------------------------------
        # Betriebsart: API-Modus (keine lokale Sub-Repo nötig)
        # --------------------------------------------------
        schach_owner, schach_name = None, None
        trischach_owner, trischach_name = None, None

        if args.schach_repo_owner and args.schach_repo_name:
            schach_owner, schach_name = args.schach_repo_owner, args.schach_repo_name
        else:
            # Versuche, repository.url aus lokalem package.json zu extrahieren
            schach_url = read_repo_url_from_pkg(Path(args.schach_path) / "package.json")
            pair = _extract_repo_owner_name(schach_url)
            if not pair:
                # Fallback: git remote origin
                pair = resolve_owner_name_from_git(Path(args.schach_path))
            if pair:
                schach_owner, schach_name = pair

        if args.trischach_repo_owner and args.trischach_repo_name:
            trischach_owner, trischach_name = (
                args.trischach_repo_owner,
                args.trischach_repo_name,
            )
        else:
            trisch_url = read_repo_url_from_pkg(Path(args.trischach_path) / "package.json")
            pair = _extract_repo_owner_name(trisch_url)
            if not pair:
                # Fallback: git remote origin
                pair = resolve_owner_name_from_git(Path(args.trischach_path))
            if pair:
                trischach_owner, trischach_name = pair

        if not schach_owner or not schach_name:
            print(
                "FEHLER: schach9x9-Repository (owner/name) nicht bestimmt. "
                "Entweder --schach-repo-owner/--schach-repo-name angeben, "
                "oder lokales package.json mit repository.url vorhanden sein.",
                file=sys.stderr,
            )
            sys.exit(1)
        if not trischach_owner or not trischach_name:
            print(
                "FEHLER: trischach-Repository (owner/name) nicht bestimmt. "
                "Entweder --trischach-repo-owner/--trischach-repo-name angeben, "
                "oder lokales package.json mit repository.url vorhanden sein.",
                file=sys.stderr,
            )
            sys.exit(1)

        sv = version_from_remote_package(schach_owner, schach_name)
        tv = version_from_remote_package(trischach_owner, trischach_name)
        sd = release_date_from_github(schach_owner, schach_name, sv)
        td = release_date_from_github(trischach_owner, trischach_name, tv)
    else:
        # --------------------------------------------------
        # Betriebsart: Lokal
        # --------------------------------------------------
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
        sd = release_date_from_repo(schach_dir, sv)
        td = release_date_from_repo(trischach_dir, tv)

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
            print(
                f"{label}: Versionen → Schach9x9 v{sv} · {sd}, Trischach v{tv} · {td}"
            )
            any_changed = True
        else:
            print(f"{label}: keine Änderungen (bereits aktuell)")

    if not any_changed:
        print("Alles bereits auf dem Stand der Nachbar-Repos.")


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


def _sub(pattern: str, repl: str, text: str, flags: int = 0, count: int = 0) -> tuple[str, bool]:
    new = re.sub(pattern, repl, text, count=count, flags=flags)
    return new, new != text


def patch_readme(md_text: str, sv: str, sd: str, tv: str, td: str) -> tuple[str, bool]:
    changed = False

    def apply(pat: str, repl: str) -> None:
        nonlocal md_text, changed
        md_text, hit = _sub(pat, repl, md_text)
        changed = changed or hit

    apply(
        rf"(Feenfiguren \(Erzbischof, Kanzler, Engel\)\. \(aktuell: v){VER}(\))",
        rf"\g<1>{sv}\g<2>",
    )
    apply(
        rf"(Stein-Schere-Papier-Kampfmechanik\. \(aktuell: v){VER}(\))",
        rf"\g<1>{tv}\g<2>",
    )
    apply(
        rf"(### Schach9x9 · v){VER}( \(" + DATE + r"\))",
        rf"\g<1>{sv} ({sd})",
    )
    apply(
        rf"(### Trischach · v){VER}( \(" + DATE + r"\))",
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
        rf"(\*\*Schach9x9:\*\* v){VER}( \(" + DATE + r"\))",
        rf"\g<1>{sv} ({sd})",
    )
    apply(
        rf"(\*\*Trischach:\*\* v){VER}( \(" + DATE + r"\))",
        rf"\g<1>{tv} ({td})",
    )
    apply(
        rf"(\*\*Schach9x9 \(v){VER}(\)\:\*\*)",
        rf"\g<1>{sv}\g<2>",
    )
    apply(
        rf"(\*\*Trischach \(v){VER}(\)\:\*\*)",
        rf"\g<1>{tv}\g<2>",
    )
    return md_text, changed


if __name__ == "__main__":
    main()
