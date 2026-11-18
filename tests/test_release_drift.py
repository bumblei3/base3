"""Tests für scripts/check-release-drift.py — Vergleichslogik ohne Netz.

Die GitHub-Abfrage wird monkeypatcht; das eigentliche Verhalten gegen die
Live-API steht im Scheduled-Workflow release-drift.yml.
"""

import importlib.util
import sys
from pathlib import Path

import pytest

BASE3 = Path(__file__).resolve().parent.parent
INDEX = BASE3 / "index.html"

_spec = importlib.util.spec_from_file_location(
    "check_release_drift", BASE3 / "scripts" / "check-release-drift.py"
)
assert _spec is not None and _spec.loader is not None
rd = importlib.util.module_from_spec(_spec)
sys.modules["check_release_drift"] = rd
_spec.loader.exec_module(rd)

ARGS = [
    "--schach-repo-owner", "bumblei3",
    "--schach-repo-name", "schach9x9",
    "--trischach-repo-owner", "bumblei3",
    "--trischach-repo-name", "trischach",
]


def _fake_latest(shown: dict[str, tuple[str, str]]):
    """Liefert je Spiel dieselbe Version wie die Seite anzeigt."""
    return lambda owner, name: (
        (shown["Schach9x9"][0], shown["Schach9x9"][1])
        if name == "schach9x9"
        else (shown["Trischach"][0], shown["Trischach"][1])
    )


# ----------------------------------------------------------- Anzeige lesen


def test_shown_versions_findet_beide_spiele():
    shown = rd.shown_versions(INDEX.read_text(encoding="utf-8"))
    assert set(shown) == {"Schach9x9", "Trischach"}
    for version, datum in shown.values():
        assert rd.version_key(version) >= (1, 0, 0)
        assert datum[:4].isdigit() or datum.startswith("????")


# ------------------------------------------------------------- Vergleich


@pytest.mark.parametrize(
    ("shown", "latest", "erwartung"),
    [
        ("2.1.0", "2.1.0", False),
        ("2.1.0", "2.1.1", True),
        ("2.1.0", "2.2.0", True),
        ("2.1.0", "3.0.0", True),
        # Numerisch, nicht lexikografisch: 1.10.0 > 1.9.0
        ("1.9.0", "1.10.0", True),
        ("1.10.0", "1.9.0", False),
        ("9.9.9", "9.9.8", False),  # Seite weiter als GitHub ist kein Drift
    ],
)
def test_is_stale(shown, latest, erwartung):
    assert rd.is_stale(shown, latest) is erwartung


# ----------------------------------------------------------------- main()


def test_main_ok_wenn_seite_auf_dem_neuesten_stand(monkeypatch, capsys):
    shown = rd.shown_versions(INDEX.read_text(encoding="utf-8"))
    monkeypatch.setattr(rd, "fetch_latest", _fake_latest(shown))
    assert rd.main(ARGS) == 0
    out = capsys.readouterr().out
    ok_zeilen = [z for z in out.splitlines() if z.strip().startswith("OK")]
    assert len(ok_zeilen) == 2
    assert "RELEASE-DRIFT OK" in out


def test_main_meldet_veraltete_version(monkeypatch, capsys):
    def fake(owner, name):
        return ("9.9.9", "2099-01-01") if name == "schach9x9" else ("1.7.0", "2026-10-20")

    monkeypatch.setattr(rd, "fetch_latest", fake)
    assert rd.main(ARGS) == 1
    captured = capsys.readouterr()
    assert "VERALTET" in captured.out
    assert "Schach9x9" in captured.err
    assert "sync-versions.py" in captured.err


def test_main_nicht_prufbar_ist_kein_gate(monkeypatch, capsys):
    def fake(owner, name):
        raise OSError("Rate limit")

    monkeypatch.setattr(rd, "fetch_latest", fake)
    assert rd.main(ARGS) == 0
    assert "NICHT PRÜFBAR" in capsys.readouterr().err


def test_main_beklagt_sich_ueber_fehlende_versionsliste(tmp_path, capsys):
    kaputt = tmp_path / "index.html"
    kaputt.write_text("<html><body>keine Versionsliste</body></html>", encoding="utf-8")
    assert rd.main([*ARGS, "--index", str(kaputt)]) == 1
    assert "Versionsliste" in capsys.readouterr().err
