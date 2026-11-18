"""Die README-Installzeile muss abdecken, was die Skripte wirklich importieren.

Ursprung: Dort stand nur `pip install pytest`, die Suite importiert aber PIL
(`test_pwa.py`, `test_assets.py`) und `make-og-image.py` braucht playwright.
Wörtlich der Anleitung gefolgt, scheitert `pytest` schon am Import.
"""

from __future__ import annotations

import ast
import re
import sys
from pathlib import Path

BASE3 = Path(__file__).resolve().parent.parent

# Modulname != Paketname
MODULE_TO_PIP = {"PIL": "pillow", "fontTools": "fonttools"}

# Pip-Pakete, die nicht direkt importiert werden, aber nötig sind: brotli
# dekodiert WOFF2 für fontTools (test_font_coverage liest die Schriften als
# TTFont, um Zeichenmenge und fvar-Achsen zu prüfen).
EXTRA_PIP = {"brotli"}


def _third_party_modules(paths: list[Path]) -> set[str]:
    modules: set[str] = set()
    for path in paths:
        tree = ast.parse(path.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                modules.update(alias.name.split(".")[0] for alias in node.names)
            elif isinstance(node, ast.ImportFrom) and node.level == 0 and node.module:
                modules.add(node.module.split(".")[0])
    # lokale Module (scripts/sync-versions.py wird als sync_versions geladen)
    own = {path.stem.replace("-", "_") for path in paths}
    return {
        MODULE_TO_PIP.get(module, module)
        for module in modules
        if module not in sys.stdlib_module_names
        and module.replace("-", "_") not in own
    }


def test_readme_install_line_covers_every_dependency():
    readme = (BASE3 / "README.md").read_text(encoding="utf-8")
    match = re.search(r"pip install ([^\n`]+)", readme)
    assert match, "README hat keinen `pip install`-Befehl"
    installed = set(match.group(1).split())
    needed = _third_party_modules(
        sorted((BASE3 / "tests").glob("*.py")) + sorted((BASE3 / "scripts").glob("*.py"))
    )
    missing = sorted((needed - EXTRA_PIP) - installed)
    assert not missing, (
        f"README installiert nicht, aber importiert wird: {missing}. "
        "Führst du die Anleitung aus, scheitert pytest schon am Import."
    )


def test_ci_installs_what_the_suite_imports():
    """tests.yml muss dieselbe Deckung haben wie die README-Zeile."""
    workflow = (BASE3 / ".github" / "workflows" / "tests.yml").read_text(encoding="utf-8")
    match = re.search(r"pip install ([^\n]+)", workflow)
    assert match, "tests.yml installiert nichts"
    installed = set(match.group(1).split())
    needed = _third_party_modules(
        sorted((BASE3 / "tests").glob("*.py")) + sorted((BASE3 / "scripts").glob("*.py"))
    )
    missing = sorted((needed - EXTRA_PIP) - installed)
    assert not missing, (
        f"tests.yml installiert nicht, aber importiert wird: {missing}"
    )
