#!/usr/bin/env python3
"""
sync-versions.py — liest Versionsnummern + Release-Datum aus schach9x9/trischach
und patcht index.html, README.md, FAQ.md sowie sitemap.xml.

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
welche Version vorher stand.

Zusätzlich (nur im --api-mode) die „Was ist neu“-Bullets: bis zu 4 Highlights
aus den Release-Notes des neuesten Releases des jeweiligen Repos. Zu lange
Bullets werden gekürzt (erst Klammerdetails, dann der abschließende Satz,
erst danach hart am Wortrand). Mit --no-whats-new bleibt die Liste unangetastet.

Aufruf: python3 scripts/sync-versions.py
        python3 scripts/sync-versions.py --schach-path ../schach9x9 --trischach-path ../trischach
        python3 scripts/sync-versions.py --api-mode
        python3 scripts/sync-versions.py --api-mode --check
        python3 scripts/sync-versions.py --api-mode --schach-repo-owner bumblei3 --schach-repo-name schach9x9 --trischach-repo-owner bumblei3 --trischach-repo-name trischach
"""

import argparse
import base64
import datetime
import html
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

SITEMAP_XML = BASE3 / "sitemap.xml"

VER = r"\d+\.\d+\.\d+"
DATE = r"\d{4}-\d{2}-\d{2}"
# Unbekannte Daten (????-??-??) sind matchbar, damit ein Platzhalter aus einem
# fehlgeschlagenen Sync-Lauf durch ein echtes Datum ersetzt werden kann.
UNKNOWN_DATE = r"\?\?\?\?-\?\?-\?\?"
DATE_SLOT = rf"(?:{DATE}|{UNKNOWN_DATE})"

# Was-ist-neu-Bullets: so viele wie die Karte trägt (2er-Grid), so lang wie
# eine Zelle bequem belegt (ca. 3 Zeilen bei 0.85rem).
WHATS_NEW_MAX = 4
BULLET_MAX_LEN = 130


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


def _get_base_lastmod() -> str:
    """Datum des letzten Commits, der index.html / README.md / FAQ.md geändert hat (sitemap.xml ausgeschlossen, da selbstgeneriert).

    Fallback: Heutiges Datum (z. B. CI-Runner ohne lokale History für diese Pfade).
    """
    try:
        # Sitemap bewusst ausgeschlossen: er wird von diesem Script selbst
        # geschrieben; sonst würde der Heiler-Commit (toucht nur sitemap.xml)
        # base_lastmod auf sein eigenes UTC-Datum ziehen und bei jedem Lauf
        # um einen Tag zurückdriften.
        targets = [str(p.relative_to(BASE3)) for p in (INDEX_HTML, README_MD, FAQ_MD)]
    except ValueError:
        # Dateien liegen außerhalb des Repos (z. B. Test-Redirect) → absolut
        targets = [str(p) for p in (INDEX_HTML, README_MD, FAQ_MD)]
    try:
        out = subprocess.run(
            ["git", "log", "-1", "--format=%cs", "--", *targets],
            capture_output=True,
            text=True,
            check=True,
            cwd=BASE3,
        ).stdout.strip()
        if out:
            return out
    except (OSError, subprocess.CalledProcessError):
        pass
    return datetime.date.today().strftime("%Y-%m-%d")


def _api_get_json(url: str) -> dict:
    req = urllib.request.Request(
        url, headers={"Accept": "application/vnd.github+json"}
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode("utf-8"))


def fetch_release_body(owner: str, name: str) -> str | None:
    """Liest den Body des neuesten Releases (Markdown).

    Rückgabe: Body-Text oder None bei Fehler (kein Netz, kein Release, ...).
    Unauthenticated Request — öffentliche Repos, rate-limited (60/h).
    """
    url = f"https://api.github.com/repos/{owner}/{name}/releases/latest"
    try:
        return _api_get_json(url).get("body") or ""
    except Exception as exc:
        print(
            f"WARNUNG: Release-Notes für {owner}/{name} nicht lesbar ({exc})",
            file=sys.stderr,
        )
        return None


# Ab hier endet der Release-Kram, den wir als Highlights nutzen wollen.
BULLET_STOP = re.compile(
    r"full changelog|voller changelog|what'?s changed|compare:", re.IGNORECASE
)

# GitHubs PR-Autoliste: „* feat: Text by @user in https://…/pull/164".
# Erst Attribution und URL entfernen, dann entscheidet der Änderungstyp.
PR_ATTRIBUTION = re.compile(r"\s+by\s+@[\w\[\].-]+\s+in\s+\S+", re.IGNORECASE)

# Nicht nutzerseitig — das gehört nicht auf eine Landing Page: Abhängigkeits-
# Bumps, Hausaltung, reine Interna. Wird auf den Typ-Präfix und Schlagworte
# geprüft, bevor der Präfix selbst entfernt wird.
NON_USER_FACING = re.compile(
    r"^(?:chore|ci|docs|build|style|refactor|test|release)\b"
    r"|\bbump\b|\bdependabot\b|\bpseudo-?\s?dependenc",
    re.IGNORECASE,
)


def clean_bullet(line: str, *, pr_list: bool = False) -> str | None:
    """Macht aus einer Markdown-Bulletzeile einen kurzen, flachen Listeneintrag.

    Rückgabe: bereinigter Text oder None, wenn die Zeile kein nutzbarer
    Bullet ist (PR-Autoliste, Linkzeile, zu kurz, ...).

    pr_list=False (Standard) für handgeschriebene Highlights: dort genügt die
    strenge Regel — alles mit URL oder `by @` ist PR-Autoliste und gehört
    nicht auf die Landing Page.

    pr_list=True für die automatisch generierte „What's Changed"-Liste. Dort
    ist die URL nur Anhängsel, ausgewertet wird der vorangestellte
    Änderungstyp. So kommt ein echtes Feature auf die Karte, während
    Dependabot-Bumps und Hausaltung durchfallen.
    """
    t = line.strip()
    if not re.match(r"^[-*+]\s+", t):
        return None
    t = re.sub(r"^[-*+]\s+", "", t)
    if pr_list:
        # „… by @bumblei3 in https://…/pull/164" → „…"
        t = PR_ATTRIBUTION.sub("", t)
        t = re.sub(r"https?://\S+", "", t)
        t = re.sub(r"\bpull/\d+", "", t)
        t = t.strip(" \t:;,")
        if NON_USER_FACING.search(t):
            return None
        # Konventioneller Präfix wie „feat:" passt nicht auf die Karte.
        t = re.sub(
            r"^(?:feat|fix|perf|refactor|chore|ci|docs|build|style|test|release)"
            r"(?:\([^)]*\))?!?:\s*",
            "",
            t,
            flags=re.I,
        )
    elif re.search(r"https?://|by @|pull/\d+", t):
        # PR-Autolisten ("* feat(x): ... by @user in https://...") und
        # URL-Zeilen gehören nicht auf die Landing Page.
        return None
    t = re.sub(r"\((?:#\d+(?:\s*[–-]\s*#?\d+)?)\)", "", t)  # (#140) / (#142–144)
    t = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", t)  # [Text](URL) → Text
    t = t.replace("**", "").replace("`", "")
    t = re.sub(r"\s+", " ", t)
    t = re.sub(r"\s+([:,;])", r"\1", t)  # „Puzzle : FNV“ → „Puzzle: FNV“
    t = t.strip(" \t:;-–—")
    if len(t) < 12:
        return None
    if len(t) <= BULLET_MAX_LEN:
        return t
    # Zu lang für die Karten-Zelle: erst Klammerdetails, dann den
    # abschließenden Satz weglassen — die Kernaussage bleibt erhalten.
    trimmed = re.sub(r"\s*\([^)]*\)", "", t)
    trimmed = re.sub(r"\s+", " ", trimmed).strip(" \t:;-–—,")
    if 12 <= len(trimmed) <= BULLET_MAX_LEN:
        return trimmed
    parts = re.split(r"(?<=[.!?])\s+", t)
    if len(parts) > 1:
        shortened = " ".join(parts[:-1]).strip(" \t:;-–—,")
        if len(shortened) > BULLET_MAX_LEN:
            t = shortened
        elif len(shortened) >= 12:
            return shortened
    return t[:BULLET_MAX_LEN].rsplit(" ", 1)[0].rstrip(" ,;:-–—") + "…"


def _collect(lines: list[str], *, pr_list: bool = False) -> list[str]:
    out: list[str] = []
    for line in lines:
        if not pr_list and BULLET_STOP.search(line):
            break
        bullet = clean_bullet(line, pr_list=pr_list)
        if bullet and bullet not in out:
            out.append(bullet)
    return out


def extract_bullets(body: str | None, max_n: int = WHATS_NEW_MAX) -> list[str]:
    """Zieht bis zu max_n Highlights aus einem Release-Body (Markdown).

    Handgeschriebene Highlights (vor „What's Changed") gewinnen — die sind
    für die Karte geschrieben. Hat ein Release nur die automatisch generierte
    PR-Liste, werden daraus die nutzerseitigen Änderungen gesiebt.

    Ohne diesen Zweitpfad bliebe die Karte bei einer neuen Version stehen und
    zeigte weiter die Bullets der vorherigen — das ist genau die Falle, in die
    Trischach v1.7.0 geraten war: ein reines „What's Changed"-Release, keine
    Bullet davor, also Stillstand bei altem Inhalt.
    """
    if not body:
        return []
    head: list[str] = []
    for line in body.splitlines():
        if BULLET_STOP.search(line):
            break
        head.append(line)
    bullets = _collect(head)
    if bullets:
        return bullets[:max_n]
    return _collect(body.splitlines(), pr_list=True)[:max_n]


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
    parser.add_argument(
        "--check",
        action="store_true",
        help="Dry-Run: patcht nur im Speicher und schreibt nichts. "
        "Exit-Code 1, wenn sich index.html/README.md/FAQ.md ändern würden "
        "(Drift-Check für CI).",
    )
    parser.add_argument(
        "--no-whats-new",
        dest="whats_new",
        action="store_false",
        help="Nur Versionen/Daten syncen; die „Was ist neu“-Bullets unangetastet lassen.",
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

        if args.whats_new:
            sbullets = extract_bullets(fetch_release_body(schach_owner, schach_name))
            tbullets = extract_bullets(fetch_release_body(trischach_owner, trischach_name))
            if sbullets:
                print(f"Was ist neu (Schach9x9): {len(sbullets)} Bullet(s) aus Release-Notes")
            if tbullets:
                print(f"Was ist neu (Trischach): {len(tbullets)} Bullet(s) aus Release-Notes")
        else:
            sbullets, tbullets = [], []
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
        # Release-Notes gibt es lokal nicht — nur im API-Modus.
        sbullets, tbullets = [], []
        if args.whats_new:
            print(
                "HINWEIS: Was-ist-neu-Bullets nur im --api-mode (GitHub Releases API). "
                "Im lokalen Modus bleiben die Bullet-Texte unangetastet.",
                file=sys.stderr,
            )

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
        new_text, changed = fn(text, sv, sd, tv, td, sbullets, tbullets)
        if changed:
            if args.check:
                print(
                    f"DRIFT: {label} wäre nicht aktuell "
                    f"(Schach9x9 v{sv} · {sd}, Trischach v{tv} · {td})"
                )
            else:
                path.write_text(new_text, encoding="utf-8")
                print(
                    f"{label}: Versionen → Schach9x9 v{sv} · {sd}, Trischach v{tv} · {td}"
                )
            any_changed = True
        else:
            print(f"{label}: keine Änderungen (bereits aktuell)")

    # sitemap.xml: lastmod aktualisieren (separate Behandlung wegen base_lastmod)
    base_lastmod = _get_base_lastmod()
    xml_text = SITEMAP_XML.read_text(encoding="utf-8")
    new_xml, xml_changed = patch_sitemap(xml_text, base_lastmod, sv, sd, tv, td)
    if xml_changed:
        if args.check:
            print(
                f"DRIFT: sitemap.xml wäre nicht aktuell "
                f"(lastmod muss {base_lastmod} bzw. Release-Daten sein)"
            )
        else:
            SITEMAP_XML.write_text(new_xml, encoding="utf-8")
            print(f"sitemap.xml: lastmod → base3={base_lastmod}, schach9x9={sd}, trischach={td}")
        any_changed = True
    else:
        print("sitemap.xml: keine Änderungen (bereits aktuell)")

    if args.check:
        if any_changed:
            print(
                "FEHLER: Version-Pills sind nicht auf dem Stand der Nachbar-Repos. "
                "Fix: 'gh workflow run sync-versions.yml' (oder --api-mode lokal).",
                file=sys.stderr,
            )
            sys.exit(1)
        print("CHECK OK: index.html, README.md und FAQ.md sind aktuell.")
    elif any_changed:
        print(f"Angewendet: Schach9x9 v{sv} · {sd}, Trischach v{tv} · {td}")
    else:
        print("Alles bereits auf dem Stand der Nachbar-Repos.")


# Dekorative Bildschrift-Symbole, die ein Wort nur wiederholen. Bewusst OHNE
# Pfeile (U+2190–U+21FF): „800 → 838“ trägt Bedeutung — ein aria-hidden darüber
# würde sie zerstören. \uFE0F? hängt den Variationsselektor an die Basis, sonst
# bliebe er außen und beschädigte das Emoji.
DECORATIVE_EMOJI = re.compile(
    "[\U0001F000-\U0001FAFF\u2600-\u26FF\u2700-\u27BF\u2B00-\u2BFF]\uFE0F?"
)


def _hide_decorative_emoji(escaped: str) -> str:
    """Wrapped dekorative Emoji in einen aria-hidden-Span.

    Läuft über bereits escaptem Text, damit die Spans selbst nicht escapt
    werden. Ohne den Span liest der Screenreader das Wort doppelt („Feuer
    Feuer“), wo das Emoji es nur illustriert.
    """
    return DECORATIVE_EMOJI.sub(
        lambda m: f'<span aria-hidden="true">{m.group()}</span>', escaped
    )


def _render_bullet_list(indent: str, bullets: list[str]) -> str:
    return "".join(
        f"{indent}<li>{_hide_decorative_emoji(html.escape(b, quote=False))}</li>\n"
        for b in bullets
    )


def _replace_bullet_list(html_text: str, card_class: str, bullets: list[str]) -> tuple[str, bool]:
    """Ersetzt die <li>-Zeilen der whats-new-Liste einer Karte (index.html)."""
    if not bullets:
        return html_text, False
    pat = (
        rf'(<article class="whats-new-card {card_class}">[\s\S]*?<ul class="whats-new-list">\n)'
        rf"((?:[ \t]*<li>[\s\S]*?</li>\n)+)"
        rf"([ \t]*</ul>)"
    )
    m = re.search(pat, html_text)
    if not m:
        return html_text, False
    indent_match = re.match(r"[ \t]*", m.group(2))
    indent = indent_match.group(0) if indent_match else "  "
    new_block = _render_bullet_list(indent, bullets)
    if new_block == m.group(2):
        return html_text, False
    return html_text[: m.start(2)] + new_block + html_text[m.end(2):], True


def _replace_md_bullets(md_text: str, heading: str, bullets: list[str]) -> tuple[str, bool]:
    """Ersetzt die Bullet-Blockzeilen hinter einer Markdown-Überschrift."""
    if not bullets:
        return md_text, False
    pat = rf"({heading}\n)\n?((?:- .*\n)+)"
    m = re.search(pat, md_text)
    if not m:
        return md_text, False
    new_block = "".join(f"- {b}\n" for b in bullets)
    if new_block == m.group(2):
        return md_text, False
    return md_text[: m.start(2)] + new_block + md_text[m.end(2):], True


def patch_index(
    html_text: str,
    sv: str,
    sd: str,
    tv: str,
    td: str,
    sbullets: list[str] | None = None,
    tbullets: list[str] | None = None,
) -> tuple[str, bool]:
    changed = False

    def apply(pat: str, repl: str) -> None:
        nonlocal html_text, changed
        html_text, hit = _sub(pat, repl, html_text)
        changed = changed or hit

    def pill(card: str, ver: str, date: str) -> None:
        """Version-Pill: unbekanntes Datum (????-??-??) stehen lassen, nicht überschreiben.

        `[^>]*>` nach der Klasse: die Karte darf weitere Attribute tragen (z. B.
        id="schach9x9" für die Manifest-Shortcuts). Ein Muster, das exakt
        `<article class="game-card schach9x9">` verlangt, patcht sonst still
        gar nichts mehr.
        """
        pat = (
            rf'(<article class="game-card {card}\b[^>]*>[\s\S]*?<span class="version-pill">)'
            rf"v{VER}( · (?:{DATE_SLOT})?)?(</span>)"
        )
        repl = (
            rf"\g<1>v{ver}\g<2>\g<3>"
            if date.startswith("?")
            else rf"\g<1>v{ver} · {date}\g<3>"
        )
        apply(pat, repl)

    def faq_version(label: str, ver: str, date: str) -> None:
        """FAQ-Liste „Welche Versionen sind aktuell?“: unbekanntes Datum stehen lassen."""
        pat = (
            rf"(<li><b>{label}:</b> )v{VER}"
            rf"( \({DATE_SLOT}\))?(</li>)"
        )
        repl = (
            rf"\g<1>v{ver}\g<2>\g<3>"
            if date.startswith("?")
            else rf"\g<1>v{ver} ({date})\g<3>"
        )
        apply(pat, repl)

    pill("schach9x9", sv, sd)
    pill("trischach", tv, td)
    faq_version("Schach9x9", sv, sd)
    faq_version("Trischach", tv, td)
    apply(
        # Tag-agnostisch: das Label ist ein <h3> (Überschrift im Artikel, war
        # früher <span>). Ein Muster, das am Tag klebt, patcht nach einer
        # Markup-Änderung still gar nicht mehr — deshalb nur auf die Klasse.
        rf'(class="whats-new-label">Schach9x9 · )v{VER}(</)',
        rf"\g<1>v{sv}\g<2>",
    )
    apply(
        rf'(class="whats-new-label">Trischach · )v{VER}(</)',
        rf"\g<1>v{tv}\g<2>",
    )
    apply(
        rf'("name": "Schach9x9"[\s\S]*?"softwareVersion": ")v{VER}(")',
        rf"\g<1>v{sv}\g<2>",
    )
    if not sd.startswith("?"):
        apply(
            rf'("name": "Schach9x9"[\s\S]*?"datePublished": "){DATE_SLOT}(")',
            rf"\g<1>{sd}\g<2>",
        )
    apply(
        rf'("name": "Trischach"[\s\S]*?"softwareVersion": ")v{VER}(")',
        rf"\g<1>v{tv}\g<2>",
    )
    if not td.startswith("?"):
        apply(
            rf'("name": "Trischach"[\s\S]*?"datePublished": "){DATE_SLOT}(")',
            rf"\g<1>{td}\g<2>",
        )
    if sbullets:
        html_text, hit = _replace_bullet_list(html_text, "schach9x9-card", sbullets)
        changed = changed or hit
    if tbullets:
        html_text, hit = _replace_bullet_list(html_text, "trischach-card", tbullets)
        changed = changed or hit
    return html_text, changed


def patch_sitemap(
    xml_text: str, base_lastmod: str, sv: str, sd: str, tv: str, td: str
) -> tuple[str, bool]:
    """Setzt die <lastmod>-Werte in sitemap.xml (Struktur bleibt erhalten).

    Base3-Seite: Datum des letzten Commits, der index.html/README.md/FAQ.md
    geändert hat (lokal) bzw. das Synchronisationsdatum (API-Modus).
    Sub-Repos: Release-Datum ihrer jeweils neuesten Version.
    """
    changed = False

    def swap(url_path: str, lastmod: str) -> None:
        """Schreibt <lastmod> für einen Eintrag — ersetzt ihn oder fügt ihn ein."""
        nonlocal xml_text, changed
        # Unbekannte Daten (z. B. API nicht erreichbar) dürfen keinen
        # Platzhalter ins XML schreiben — dann bleibt der alte Wert stehen.
        if lastmod.startswith("?"):
            return
        pat = (
            rf"(<loc>https://bumblei3\.github\.io/{url_path}</loc>)"
            r"(\s*<lastmod>[^<]+</lastmod>)?"
        )
        m = re.search(pat, xml_text)
        if not m:
            return
        if m.group(2):
            new = xml_text[: m.start(2)] + f"\n    <lastmod>{lastmod}</lastmod>" + xml_text[m.end(2):]
        else:
            new = xml_text[: m.end(1)] + f"\n    <lastmod>{lastmod}</lastmod>" + xml_text[m.end(1):]
        if new != xml_text:
            xml_text = new
            changed = True

    swap("base3/", base_lastmod)
    swap("schach9x9/", sd)
    swap("trischach/", td)
    return xml_text, changed


def _sub(pattern: str, repl: str, text: str, flags: int = 0, count: int = 0) -> tuple[str, bool]:
    new = re.sub(pattern, repl, text, count=count, flags=flags)
    return new, new != text


def patch_readme(
    md_text: str,
    sv: str,
    sd: str,
    tv: str,
    td: str,
    sbullets: list[str] | None = None,
    tbullets: list[str] | None = None,
) -> tuple[str, bool]:
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
    def dated_heading(prefix: str, ver: str, date: str) -> None:
        """Überschrift mit Versions-Datum: unbekanntes Datum stehen lassen."""
        pat = rf"({re.escape(prefix)} · v){VER}( \(" + DATE_SLOT + r"\))"
        repl = (
            rf"\g<1>{ver}\g<2>"
            if date.startswith("?")
            else rf"\g<1>{ver} ({date})"
        )
        apply(pat, repl)

    dated_heading("### Schach9x9", sv, sd)
    dated_heading("### Trischach", tv, td)
    if sbullets:
        md_text, hit = _replace_md_bullets(
            md_text, rf"### Schach9x9 · v{VER} \({DATE_SLOT}\)", sbullets
        )
        changed = changed or hit
    if tbullets:
        md_text, hit = _replace_md_bullets(
            md_text, rf"### Trischach · v{VER} \({DATE_SLOT}\)", tbullets
        )
        changed = changed or hit
    return md_text, changed


def patch_faq(
    md_text: str,
    sv: str,
    sd: str,
    tv: str,
    td: str,
    sbullets: list[str] | None = None,
    tbullets: list[str] | None = None,
) -> tuple[str, bool]:
    changed = False

    def apply(pat: str, repl: str) -> None:
        nonlocal md_text, changed
        md_text, hit = _sub(pat, repl, md_text)
        changed = changed or hit

    def dated(prefix: str, ver: str, date: str) -> None:
        """Versionszeile mit Datum: unbekanntes Datum stehen lassen."""
        pat = rf"({re.escape(prefix)} v){VER}( \(" + DATE_SLOT + r"\))"
        repl = (
            rf"\g<1>{ver}\g<2>"
            if date.startswith("?")
            else rf"\g<1>{ver} ({date})"
        )
        apply(pat, repl)

    dated("**Schach9x9:**", sv, sd)
    dated("**Trischach:**", tv, td)
    apply(
        rf"(\*\*Schach9x9 \(v){VER}(\)\:\*\*)",
        rf"\g<1>{sv}\g<2>",
    )
    apply(
        rf"(\*\*Trischach \(v){VER}(\)\:\*\*)",
        rf"\g<1>{tv}\g<2>",
    )
    if sbullets:
        md_text, hit = _replace_md_bullets(
            md_text, rf"\*\*Schach9x9 \(v{VER}\):\*\*", sbullets
        )
        changed = changed or hit
    if tbullets:
        md_text, hit = _replace_md_bullets(
            md_text, rf"\*\*Trischach \(v{VER}\):\*\*", tbullets
        )
        changed = changed or hit
    return md_text, changed


if __name__ == "__main__":
    main()
