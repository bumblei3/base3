"""Lighthouse läuft gegen eine lokale Kopie der Seiten-URL.

Die absolute /base3/-Angabe ist kein Detail: Schriften, Manifest und Service
Worker werden in index.html als /base3/... referenziert. Serviert man die
Wurzel, antwortet der Server dort mit 404 — und Lighthouse bestraft genau
diese 404er als Konsolenfehler (best-practices 0.96 statt 1.0), obwohl die
Seite live fehlerfrei ist.
"""

from __future__ import annotations

import json
from pathlib import Path

BASE3 = Path(__file__).resolve().parent.parent
AUDIT_URL = "http://localhost:8765/base3/"


def test_lighthouse_config_audits_the_pages_path():
    cfg = json.loads((BASE3 / ".lighthouserc.json").read_text(encoding="utf-8"))
    assert cfg["ci"]["collect"]["url"] == [AUDIT_URL], (
        "Lighthouse prüft nicht die /base3/-URL — die /base3/-Pfade in "
        "index.html würden zu Konsolenfehlern führen"
    )


def test_lighthouse_workflow_serves_the_repo_under_base3():
    text = (BASE3 / ".github" / "workflows" / "lighthouse.yml").read_text(encoding="utf-8")
    assert "urls: http://localhost:8765/base3/" in text, (
        "lighthouse.yml auditet nicht die /base3/-URL"
    )
    assert "serve-preview.py" in text, (
        "lighthouse.yml serviert mit python3 -m http.server — der liefert weder "
        "gzip noch Cache-Control, Lighthouse maß 93 KiB statt der 44 KiB live"
    )
    assert "ln -sfn" in text and ".lh/base3" in text, (
        "lighthouse.yml legt das Repo nicht unter .lh/base3 aus"
    )
    assert "curl -sSf http://localhost:8765/base3/" in text, (
        "die Bereitschaftsprüfung prüft nicht die auditierte URL"
    )
