import importlib.util
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("fetch_fonts", ROOT / "scripts" / "fetch-fonts.py")
ff = importlib.util.module_from_spec(spec)
sys.modules["fetch_fonts"] = ff
spec.loader.exec_module(ff)


def test_slug():
    assert ff.slug("Outfit") == "outfit"
    assert ff.slug("JetBrains Mono") == "jetbrains-mono"


def test_face_re_matches():
    sample = "/* latin */ @font-face { font-family: 'Outfit'; font-weight: 400; src: url(https://x/y.woff2); }"
    m = ff.FACE_RE.search(sample)
    assert m is not None
    assert m.group("subset") == "latin"
