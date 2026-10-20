import importlib.util
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("sync_versions", ROOT / "scripts" / "sync-versions.py")
sv = importlib.util.module_from_spec(spec)
sys.modules["sync_versions"] = sv
spec.loader.exec_module(sv)


def test_clean_bullet_filters_chore():
    out = sv.clean_bullet("* chore: bump deps by @x in https://example.com/pull/1", pr_list=True)
    assert out is None


def test_clean_bullet_keeps_feat():
    out = sv.clean_bullet("* feat: add something useful by @x in https://example.com/pull/1", pr_list=True)
    assert out == "add something useful"


def test_extract_bullets_from_handwritten():
    body = "- Erstes Highlight\n- Zweites Highlight\n\n## What's Changed\n* chore: bump"
    assert sv.extract_bullets(body) == ["Erstes Highlight", "Zweites Highlight"]


def test_extract_bullets_fallback_pr_list():
    body = "## What's Changed\n* feat: cooles Feature by @x in https://example.com/pull/1\n"
    assert sv.extract_bullets(body) == ["cooles Feature"]


def test_extract_repo_owner_name():
    assert sv._extract_repo_owner_name("https://github.com/a/b.git") == ("a", "b")
    assert sv._extract_repo_owner_name("git@github.com:a/b.git") == ("a", "b")
    assert sv._extract_repo_owner_name("nope") is None
