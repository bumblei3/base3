import importlib.util
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("check_contrast", ROOT / "scripts" / "check-contrast.py")
cc = importlib.util.module_from_spec(spec)
sys.modules["check_contrast"] = cc
spec.loader.exec_module(cc)


def test_luminance_black_white():
    assert cc.luminance("#000000") == 0.0
    assert cc.luminance("#ffffff") == 1.0


def test_contrast_ratio_black_white():
    assert abs(cc.contrast_ratio("#000000", "#ffffff") - 21.0) < 0.01


def test_check_palette_consistency_ok():
    errors = cc.check_palette_consistency()
    assert errors == [], errors


def test_main_returns_zero():
    assert cc.main() == 0
