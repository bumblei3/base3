"""Tests für scripts/sync-faq-schema.py — Extraktion, Idempotenz, Drift-Erkennung.

Der FAQPage-Block wird aus der sichtbaren FAQ-Sektion abgeleitet. Diese Tests
sichern genau die beiden Richtungen ab, in denen das schiefgehen kann:
zu wenig (Frage fehlt im Schema) und daneben (Schema veraltet, weil eine
Antwort geändert wurde — z. B. die Versions-Antwort, die sync-versions.py
bei jedem Sub-Release neu schreibt).
"""

import importlib.util
import json
import re
import subprocess
import sys
from pathlib import Path

import pytest

BASE3 = Path(__file__).resolve().parent.parent
INDEX = BASE3 / "index.html"

# Bindestrich im Dateinamen → kein normaler Import.
_spec = importlib.util.spec_from_file_location(
    "sync_faq_schema", BASE3 / "scripts" / "sync-faq-schema.py"
)
fs = importlib.util.module_from_spec(_spec)
sys.modules["sync_faq_schema"] = fs
_spec.loader.exec_module(fs)


@pytest.fixture()
def repo_copy(tmp_path):
    """Kopie von index.html, damit Tests nie im echten Repo schreiben."""
    target = tmp_path / "index.html"
    target.write_text(INDEX.read_text(encoding="utf-8"), encoding="utf-8")
    return target


def _run(monkeypatch, index, check=False):
    argv = ["sync-faq-schema.py", "--index", str(index)] + (["--check"] if check else [])
    monkeypatch.setattr(sys, "argv", argv)
    return fs.main()


def test_every_visible_question_is_in_the_schema():
    html = INDEX.read_text(encoding="utf-8")
    pairs = fs.extract_faq(html)
    visible = re.findall(r'<h3 class="faq-q">(.*?)</h3>', html, re.S)
    assert len(pairs) == len(visible)
    assert [q for q, _ in pairs] == [fs.to_text(v) for v in visible]
    assert len({q for q, _ in pairs}) == len(pairs), "doppelte Fragen im Schema"


def test_answers_are_plain_text():
    for question, answer in fs.extract_faq(INDEX.read_text(encoding="utf-8")):
        assert answer.strip()
        assert not fs.TAG_RE.search(answer), f"{question}: Tags in der Antwort"
        assert not fs.ENTITY_RE.search(answer), f"{question}: undekodierte Entität"


def test_version_answer_tracks_the_jsonld_versions():
    """Die Versions-Antwort wird von sync-versions.py gepatcht — Schema zieht mit."""
    html = INDEX.read_text(encoding="utf-8")
    versions = set(re.findall(r'"softwareVersion":\s*"([^"]+)"', html))
    assert versions, "keine softwareVersion im JSON-LD gefunden"
    answers = {q: a for q, a in fs.extract_faq(html)}
    answer = answers["Welche Versionen sind aktuell?"]
    for version in versions:
        assert version in answer, f"{version} fehlt in der Versions-Antwort"


def test_committed_block_is_valid_faqpage():
    html = INDEX.read_text(encoding="utf-8")
    block = fs.current_block(html)
    assert block is not None, "FAQPage-Block fehlt in index.html"
    payload = json.loads(block[block.index("{"):block.rindex("}") + 1])
    assert payload["@type"] == "FAQPage"
    assert payload["inLanguage"] == "de-DE"
    entities = payload["mainEntity"]
    assert len(entities) == len(fs.extract_faq(html))
    for entity in entities:
        assert entity["@type"] == "Question"
        assert entity["name"] and entity["acceptedAnswer"]["text"]
        assert entity["acceptedAnswer"]["@type"] == "Answer"


def test_committed_block_matches_the_faq_section():
    """Der eigentliche Drift-Check: Repo-Stand == generierter Stand."""
    html = INDEX.read_text(encoding="utf-8")
    assert fs.current_block(html) == fs.build_block(fs.extract_faq(html))


def test_apply_is_idempotent(repo_copy):
    """Zweiter Lauf muss ein byte-identischer No-Op sein."""
    text = repo_copy.read_text(encoding="utf-8")
    start = text.index(fs.START_MARKER)
    end = text.index(fs.END_MARKER) + len(fs.END_MARKER)
    repo_copy.write_text(text[:start] + text[end:], encoding="utf-8")  # Block entfernen

    pairs = fs.extract_faq(INDEX.read_text(encoding="utf-8"))
    first_text, first_changed = fs.sync(repo_copy.read_text(encoding="utf-8"), pairs)
    assert first_changed is True
    repo_copy.write_text(first_text, encoding="utf-8")
    before = repo_copy.read_bytes()

    second_text, second_changed = fs.sync(repo_copy.read_text(encoding="utf-8"), pairs)
    assert second_changed is False, "zweiter Lauf darf nichts ändern"
    assert repo_copy.read_bytes() == before


def test_check_mode_passes_on_current_state(monkeypatch, repo_copy):
    assert _run(monkeypatch, repo_copy) == 0
    assert _run(monkeypatch, repo_copy, check=True) == 0


def test_check_mode_fails_when_block_missing(monkeypatch, repo_copy):
    text = repo_copy.read_text(encoding="utf-8")
    start = text.index(fs.START_MARKER)
    end = text.index(fs.END_MARKER) + len(fs.END_MARKER)
    repo_copy.write_text(text[:start] + text[end:], encoding="utf-8")
    assert fs.current_block(repo_copy.read_text(encoding="utf-8")) is None
    assert _run(monkeypatch, repo_copy, check=True) == 1


def test_check_mode_fails_when_answer_changed(monkeypatch, repo_copy):
    """Geänderte sichtbare Antwort ohne Schema-Update = Drift."""
    text = repo_copy.read_text(encoding="utf-8")
    # Nur das sichtbare Markup ändern (das <p class="faq-a"> gibt es nur im
    # FAQ-Bereich); der Schema-Text im <head> bleibt absichtlich stehen.
    old = '<p class="faq-a">base3 als Landing Page ist aktiv'
    assert old in text
    repo_copy.write_text(
        text.replace(old, '<p class="faq-a">base3 als Landing Page ist ganz klar aktiv'),
        encoding="utf-8",
    )
    assert _run(monkeypatch, repo_copy, check=True) == 1
    # und der Schreib-Lauf heilt genau das
    assert _run(monkeypatch, repo_copy) == 0
    assert _run(monkeypatch, repo_copy, check=True) == 0
    assert "ganz klar aktiv" in fs.current_block(repo_copy.read_text(encoding="utf-8"))


def test_malformed_faq_section_raises(tmp_path):
    broken = tmp_path / "broken.html"
    broken.write_text(
        '<article class="faq-card"><h3 class="faq-q">Frage?</h3></article>',
        encoding="utf-8",
    )
    with pytest.raises(ValueError, match="leere Frage oder Antwort"):
        fs.extract_faq(broken.read_text(encoding="utf-8"))
    with pytest.raises(ValueError, match="keine FAQ-Karten"):
        fs.extract_faq("<html><body>nichts</body></html>")


def test_page_validator_accepts_the_schema():
    """Der zusätzliche JSON-LD-Block muss durch den Seiten-Validator kommen."""
    result = subprocess.run(
        [sys.executable, str(BASE3 / "scripts" / "validate_landing_page.py")],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stdout + result.stderr
