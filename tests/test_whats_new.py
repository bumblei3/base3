"""Tests für die Was-ist-neu-Extraktion aus GitHub Release-Notes.

Fixtures: die echten Release-Bodies von schach9x9 v2.0.0 und trischach v1.6.0
(tests/fixtures/release-notes/). So bleiben die Tests offline und deterministisch,
ohne die Extraktions-Logik gegen die Live-API zu koppeln.
"""

import re
import sys
from pathlib import Path

import pytest

BASE3 = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE3 / "scripts"))

import sync_versions as sv  # noqa: E402

ORIGINAL_INDEX = (BASE3 / "index.html").read_text(encoding="utf-8")
ORIGINAL_README = (BASE3 / "README.md").read_text(encoding="utf-8")
ORIGINAL_FAQ = (BASE3 / "FAQ.md").read_text(encoding="utf-8")
FIXTURES = Path(__file__).resolve().parent / "fixtures" / "release-notes"


def _fixture(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


def _bullet_lists(text: str) -> list[str]:
    """Die beiden whats-new-Listen aus index.html, wortgleich vergleichbar."""
    return re.findall(r'<ul class="whats-new-list">\n[\s\S]*?</ul>', text)


NEW = ("9.9.9", "2099-01-01", "8.8.8", "2099-02-02")


# ------------------------------------------------------------ clean_bullet
def test_clean_bullet_strips_markdown_and_issue_refs():
    out = sv.clean_bullet("- **Deterministisches Tagespuzzle** (#140): FNV-1a-Auswahl pro Datum.")
    assert out == "Deterministisches Tagespuzzle: FNV-1a-Auswahl pro Datum."
    assert "**" not in out and "(#140)" not in out


def test_clean_bullet_keeps_quotes_unescaped():
    out = sv.clean_bullet("- Perk „Taktik-Genie“ wirksam (Tipps in Kampagnen nur mit Perk)")
    assert out == "Perk „Taktik-Genie“ wirksam (Tipps in Kampagnen nur mit Perk)"


def test_clean_bullet_drops_parenthetical_when_too_long():
    """Klammerdetails gehen verloren, die Kernaussage bleibt."""
    line = (
        "- **Statistik-Dashboard** (#141): Partien-/Puzzle-Statistik lokal "
        "(Siege pro Fraktion, Lösequote, Daily-Streak), plus 💬 Feedback-Button "
        "mit GitHub-Issue-Template."
    )
    out = sv.clean_bullet(line)
    assert out == (
        "Statistik-Dashboard: Partien-/Puzzle-Statistik lokal, "
        "plus 💬 Feedback-Button mit GitHub-Issue-Template."
    )


def test_clean_bullet_drops_trailing_sentence_when_too_long():
    out = sv.clean_bullet("- Test-Suite 800 → 838 Tests: invariant-first Härtung von board/analysis/ai-core/pwa/rps-puzzle/tutorial/opening-book/game-stats. Branch-Coverage 82.9% → 84.5%.")
    assert "invariant-first" in out
    assert "Branch-Coverage" not in out
    assert len(out) <= sv.BULLET_MAX_LEN


def test_clean_bullet_skips_pr_autolist_and_links():
    assert sv.clean_bullet("* feat(puzzles): deterministisches Tagespuzzle by @bumblei3 in https://github.com/x/y/pull/140") is None
    assert sv.clean_bullet("- Full Changelog: https://github.com/bumblei3/schach9x9/blob/main/CHANGELOG.md") is None
    assert sv.clean_bullet("- [x](https://example.com) kurzer Text") is None


def test_clean_bullet_rejects_non_bullets_and_short_lines():
    assert sv.clean_bullet("## Highlights") is None
    assert sv.clean_bullet("- kurz") is None
    assert sv.clean_bullet("") is None


def test_clean_bullet_truncates_at_word_boundary():
    out = sv.clean_bullet("- " + "wort " * 40)
    assert out.endswith("…")
    assert len(out) <= sv.BULLET_MAX_LEN


# ---------------------------------------------------------- extract_bullets
def test_extract_bullets_from_real_schach_body():
    bullets = sv.extract_bullets(_fixture("schach9x9-v2.0.0.md"))
    assert len(bullets) == 4
    assert bullets[0].startswith("Kapitel 7–12:")
    assert all(len(b) <= sv.BULLET_MAX_LEN for b in bullets)


def test_extract_bullets_from_real_trischach_body():
    bullets = sv.extract_bullets(_fixture("trischach-v1.6.0.md"))
    assert len(bullets) == 3, "PR-Autoliste (What's Changed) darf nicht mitlaufen"
    assert all("pull/" not in b and "by @" not in b for b in bullets)
    assert "838" in bullets[-1]


def test_extract_bullets_respects_max_n():
    bullets = sv.extract_bullets(_fixture("schach9x9-v2.0.0.md"), max_n=2)
    assert len(bullets) == 2


def test_extract_bullets_empty_and_none():
    assert sv.extract_bullets(None) == []
    assert sv.extract_bullets("") == []
    assert sv.extract_bullets("kein Bullet hier") == []


def test_extract_bullets_no_duplicates():
    body = "- gleicher Punkt\n- gleicher Punkt\n"
    assert sv.extract_bullets(body) == ["gleicher Punkt"]


# ------------------------------------------------- Bullet-Patching in Dateien
BULLETS = ["Erster Punkt", "Zweiter Punkt mit & Zeichen", "Dritter <Punkt>"]


def test_patch_index_replaces_bullet_list():
    out, changed = sv.patch_index(ORIGINAL_INDEX, *NEW, BULLETS, BULLETS)
    assert changed
    assert "<li>Erster Punkt</li>" in out
    assert "<li>Zweiter Punkt mit &amp; Zeichen</li>" in out  # HTML-escaped
    assert "<li>Dritter &lt;Punkt&gt;</li>" in out
    assert "Engine-M1.1" not in out  # alte Bullets weg


def test_patch_index_bullets_are_idempotent():
    once, _ = sv.patch_index(ORIGINAL_INDEX, *NEW, BULLETS, BULLETS)
    _, changed = sv.patch_index(once, *NEW, BULLETS, BULLETS)
    assert not changed


def test_patch_index_without_bullets_leaves_list_alone():
    """Ohne Bullets aus den Release-Notes bleibt die Liste wortgleich."""
    out, changed = sv.patch_index(ORIGINAL_INDEX, *NEW)
    assert _bullet_lists(out) == _bullet_lists(ORIGINAL_INDEX)


def test_patch_readme_replaces_bullet_list():
    out, changed = sv.patch_readme(ORIGINAL_README, *NEW, BULLETS, BULLETS)
    assert changed
    assert "- Erster Punkt\n" in out
    # Die Schach9x9-Sektion enthält jetzt genau die neuen Bullets
    m = re.search(r"### Schach9x9 · v9\.9\.9 \(2099-01-01\)\n\n((?:- .*\n)+)", out)
    assert m is not None
    assert m.group(1).count("\n") == len(BULLETS)
    once, _ = sv.patch_readme(ORIGINAL_README, *NEW, BULLETS, BULLETS)
    _, again = sv.patch_readme(once, *NEW, BULLETS, BULLETS)
    assert not again


def test_patch_faq_replaces_bullet_list():
    out, changed = sv.patch_faq(ORIGINAL_FAQ, *NEW, BULLETS, BULLETS)
    assert changed
    assert "- Erster Punkt\n" in out
    once, _ = sv.patch_faq(ORIGINAL_FAQ, *NEW, BULLETS, BULLETS)
    _, again = sv.patch_faq(once, *NEW, BULLETS, BULLETS)
    assert not again
