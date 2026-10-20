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


# ------------------------------------------------- dekoratives Emoji in Bullets
# Was v1.7.0 (reine PR-Autoliste) auf die Karte bringt.
AUTO = ["Code-Splitting — game.ts in separate chunk"]
EMOJI_BULLETS = [
    "Statistik-Dashboard: Partien-/Puzzle-Statistik lokal, plus 💬 Feedback-Button.",
    "Test-Suite 800 → 838 Tests.",
]


def test_bullets_hide_decorative_emoji():
    """Das Emoji wiederholt das Wort — ohne aria-hidden liest der
    Screenreader „plus Feedback-Button Feedback-Button“. Der Generator besitzt
    die Liste (sie kommt aus den Release-Notes), also muss er das barrierefreie
    Markup selbst erzeugen und darf sich nicht auf Hand-Pflege verlassen."""
    out, _ = sv.patch_index(ORIGINAL_INDEX, *NEW, EMOJI_BULLETS, EMOJI_BULLETS)
    assert (
        '<li>Statistik-Dashboard: Partien-/Puzzle-Statistik lokal, plus '
        '<span aria-hidden="true">💬</span> Feedback-Button.</li>'
    ) in out


def test_bullets_keep_meaningful_arrows():
    """Pfeile tragen Bedeutung („800 → 838“) — ein aria-hidden darüber würde
    sie zerstören. Sie bleiben unangetastet."""
    out, _ = sv.patch_index(ORIGINAL_INDEX, *NEW, EMOJI_BULLETS, EMOJI_BULLETS)
    assert "<li>Test-Suite 800 → 838 Tests.</li>" in out
    assert "aria-hidden" not in "<li>Test-Suite 800 → 838 Tests.</li>"


def test_emoji_with_variation_selector_is_wrapped_whole():
    """♟️ ist U+265F + U+FE0F. Der Selektor muss mit in den Span, sonst bleibt
    er außen und beschädigt das Emoji."""
    out, _ = sv.patch_index(ORIGINAL_INDEX, *NEW, ["Bauer ♟️ gefixt."], [])
    assert "<span aria-hidden=\"true\">♟️</span>" in out
    assert "</span>️" not in out


def test_bullet_emoji_wrapping_is_idempotent():
    """Ein zweiter Lauf ersetzt den ganzen Block — kein doppeltes Wrappen."""
    once, _ = sv.patch_index(ORIGINAL_INDEX, *NEW, EMOJI_BULLETS, EMOJI_BULLETS)
    again, changed = sv.patch_index(once, *NEW, EMOJI_BULLETS, EMOJI_BULLETS)
    assert not changed
    assert again.count('<span aria-hidden="true">💬</span>') == once.count(
        '<span aria-hidden="true">💬</span>'
    )


# ------------------------------------------- handgeschrieben vs. PR-Autoliste


def test_handwritten_highlights_win():
    """Ein Release mit eigenem Highlights-Block (v1.6.0) nimmt diesen — die
    PR-Autoliste dahinter wird nicht mehr angefasst."""
    bullets = sv.extract_bullets(_fixture("trischach-v1.6.0.md"))
    assert bullets[0].startswith("Deterministisches Tagespuzzle")
    assert any("Statistik-Dashboard" in b for b in bullets)
    assert not any("bump" in b or "rollup" in b for b in bullets)


def test_autogenerated_body_yields_the_real_feature():
    """v1.7.0 hatte nur die PR-Autoliste. Ohne den Zweitpfad wäre die Karte
    stehen geblieben und hätte die Bullets von v1.6.0 unter v1.7.0 gezeigt."""
    bullets = sv.extract_bullets(_fixture("trischach-v1.7.0.md"))
    assert bullets == ["Code-Splitting — game.ts in separate chunk"]


def test_autogenerated_body_sieves_maintenance():
    """Dependabot-Bumps, Hausaltung und reine Interna fallen durch — auch
    wenn sie keinen Typ-Präfix haben („145 transitive Pseudo-Dependencies")."""
    bullets = sv.extract_bullets(_fixture("trischach-v1.7.0.md"))
    joined = " ".join(bullets)
    for noise in ("bump", "dependabot", "rollup", "terser", "happy-dom", "Pseudo", "Bundle-Size", "README"):
        assert noise not in joined, f"„{noise}“ kam durch: {bullets}"


def test_pr_bullet_is_stripped_of_attribution_and_prefix():
    """URL, „by @user in …" und der Typ-Präfix gehören nicht auf die Karte."""
    out = sv.clean_bullet(
        "* feat: Code-Splitting — game.ts in separate chunk "
        "by @bumblei3 in https://github.com/bumblei3/trischach/pull/164",
        pr_list=True,
    )
    assert out == "Code-Splitting — game.ts in separate chunk"


def test_pr_list_mode_still_rejects_urls_without_pr_list_flag():
    """Der alte, strenge Pfad bleibt unverändert: eine URL beendet den Bullet."""
    assert sv.clean_bullet("* siehe https://example.com/feature") is None


def test_autogenerated_body_is_idempotent():
    once, _ = sv.patch_index(ORIGINAL_INDEX, *NEW, AUTO, AUTO)
    again, changed = sv.patch_index(once, *NEW, AUTO, AUTO)
    assert not changed
    assert "<li>Code-Splitting — game.ts in separate chunk</li>" in once


def test_readme_bullets_stay_plain_markdown():
    """Die README ist Markdown — aria-hidden-Spans dort würden den Roh-Text
    verunstalten. Nur die Seite bekommt sie."""
    out, _ = sv.patch_readme(ORIGINAL_README, *NEW, EMOJI_BULLETS, EMOJI_BULLETS)
    assert "- Test-Suite 800 → 838 Tests.\n" in out
    assert "aria-hidden" not in out


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
