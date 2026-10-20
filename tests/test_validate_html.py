"""Tests für scripts/validate-html.py — Klassifikation und Schwellen ohne Netz.

Der Nu-Validator ist ein Fremddienst; die HTTP-Schicht wird hier ersetzt, damit
die Tests offline laufen und der Ausfall des Dienstes nicht als Testfehler
erscheint (das Script meldet „NICHT PRÜFBAR" und endet mit 0).
"""

import importlib.util
import sys
from pathlib import Path

import pytest

BASE3 = Path(__file__).resolve().parent.parent

_spec = importlib.util.spec_from_file_location(
    "validate_html", BASE3 / "scripts" / "validate-html.py"
)
vh = importlib.util.module_from_spec(_spec)
sys.modules["validate_html"] = vh
_spec.loader.exec_module(vh)

ERROR = {"type": "error", "lastLine": 16, "message": "Bad value for attribute href"}
WARNING = {"type": "info", "subType": "warning", "lastLine": 534, "message": "Article lacks heading"}
INFO = {"type": "info", "lastLine": 4, "message": "Trailing slash on void elements"}


def _run(monkeypatch, messages, strict=False, require_api=False):
    monkeypatch.setattr(sys, "argv", ["validate-html.py"] + (["--strict"] if strict else [])
                        + (["--require-api"] if require_api else []))
    monkeypatch.setattr(vh, "fetch_messages", lambda html, url, timeout: messages)
    return vh.main()


def test_summarize_splits_the_three_classes():
    buckets = vh.summarize([ERROR, WARNING, INFO, INFO])
    assert len(buckets["error"]) == 1
    assert len(buckets["warning"]) == 1
    assert len(buckets["info"]) == 2


def test_errors_fail_the_check(monkeypatch, capsys):
    assert _run(monkeypatch, [ERROR, INFO]) == 1
    out = capsys.readouterr().out
    assert "1 Fehler" in out and "Zeile 16" in out


def test_warnings_only_fail_in_strict_mode(monkeypatch, capsys):
    assert _run(monkeypatch, [WARNING, INFO]) == 0
    assert "HTML-CHECK OK" in capsys.readouterr().out
    assert _run(monkeypatch, [WARNING, INFO], strict=True) == 1


def test_infos_never_fail(monkeypatch):
    assert _run(monkeypatch, [INFO, INFO, INFO]) == 0
    assert _run(monkeypatch, [INFO], strict=True) == 0


def test_clean_page_passes_strict(monkeypatch):
    assert _run(monkeypatch, [], strict=True) == 0


def test_unreachable_api_is_not_a_failure(monkeypatch, capsys):
    """Lint, kein Korrektheits-Gate: Fremddienst-Ausfall darf CI nicht rot machen."""
    assert _run(monkeypatch, None) == 0
    assert "NICHT PRÜFBAR" in capsys.readouterr().out


def test_require_api_turns_outage_into_failure(monkeypatch):
    assert _run(monkeypatch, None, require_api=True) == 1


def test_missing_file_fails(monkeypatch, tmp_path, capsys):
    monkeypatch.setattr(sys, "argv", ["validate-html.py", "--file", str(tmp_path / "nicht-da.html")])
    assert vh.main() == 1
    assert "nicht gefunden" in capsys.readouterr().out


@pytest.mark.parametrize(
    "message,expected",
    [
        ({"type": "info", "subType": "warning"}, "warning"),
        ({"type": "error"}, "error"),
        ({"type": "info"}, "info"),
        ({"type": "info", "subType": "info"}, "info"),
    ],
)
def test_classification_of_message_shapes(message, expected):
    buckets = vh.summarize([message])
    assert len(buckets[expected]) == 1
