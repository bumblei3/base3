"""Kommentare in .github dürfen keine Workflows erwähnen, die es nicht gibt.

dependabot.yml nannte check-sync.yml als Prüfer der Dependabot-PRs — der
Workflow wurde in a534266 entfernt, der Kommentar blieb. Solche Verweise
irren: sie sagen etwas über die CI, das nicht stimmt.
"""

from __future__ import annotations

import re
from pathlib import Path

BASE3 = Path(__file__).resolve().parent.parent


def test_dependabot_comment_names_existing_workflows():
    text = (BASE3 / ".github" / "dependabot.yml").read_text(encoding="utf-8")
    existing = {path.name for path in (BASE3 / ".github" / "workflows").glob("*.yml")}
    mentioned = set(re.findall(r"\b([\w-]+\.yml)\b", text))
    assert mentioned <= existing, (
        f"dependabot.yml erwähnt Workflows, die es nicht gibt: "
        f"{sorted(mentioned - existing)}"
    )


def test_workflow_comments_name_existing_workflows():
    existing = {path.name for path in (BASE3 / ".github" / "workflows").glob("*.yml")}
    for path in (BASE3 / ".github" / "workflows").glob("*.yml"):
        mentioned = set(re.findall(r"\b([\w-]+\.yml)\b", path.read_text(encoding="utf-8")))
        assert mentioned <= existing, (
            f"{path.name} erwähnt Workflows, die es nicht gibt: "
            f"{sorted(mentioned - existing)}"
        )
