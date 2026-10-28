import numpy as np
import pytest

from practice_cases import (
    FEATURE_RANGES,
    consensus_features,
    is_reference,
    lung_window_u8,
    normalized_center,
)


def _annotation(**overrides):
    base = {
        "subtlety": 4,
        "calcification": 6,
        "sphericity": 3,
        "margin": 4,
        "lobulation": 2,
        "spiculation": 1,
        "texture": 5,
        "malignancy": 3,
    }
    base.update(overrides)
    return base


def test_feature_ranges_match_api_form_limits():
    assert FEATURE_RANGES["calcification"] == (1, 6)
    for name in ("subtlety", "sphericity", "margin", "lobulation", "spiculation", "texture", "malignancy"):
        assert FEATURE_RANGES[name] == (1, 5)
    assert len(FEATURE_RANGES) == 8


def test_consensus_features_uses_median_per_variable():
    features, clipped = consensus_features([
        _annotation(malignancy=2, texture=4),
        _annotation(malignancy=3, texture=5),
        _annotation(malignancy=5, texture=5),
        _annotation(malignancy=4, texture=5),
    ])
    assert features["malignancy"] == 3.5
    assert features["texture"] == 5
    assert features["calcification"] == 6
    assert features["calcification"] <= 6
    assert clipped == []


def test_consensus_features_clips_to_api_ranges_and_lists_clipped():
    features, clipped = consensus_features([
        _annotation(calcification=7, subtlety=0),
        _annotation(calcification=8, subtlety=0),
        _annotation(calcification=7, subtlety=1),
    ])
    assert features["calcification"] == 6
    assert features["subtlety"] == 1
    assert sorted(clipped) == ["calcification", "subtlety"]
    assert set(features) == set(FEATURE_RANGES)


def test_is_reference_rules():
    assert is_reference(3, 6.0) is True
    assert is_reference(2, 10) is False
    assert is_reference(4, 31) is False
    assert is_reference(4, 30) is True
    assert is_reference(4, 5.99) is False


def test_normalized_center():
    assert normalized_center(256, 128, 512, 512) == (0.5, 0.25)


def test_lung_window_u8_limits():
    out = lung_window_u8(np.array([[-1350.0, 150.0], [-3000.0, 2000.0]]))
    assert out.dtype == np.uint8
    assert out[0, 0] == 0
    assert out[0, 1] == 255
    assert out[1, 0] == 0
    assert out[1, 1] == 255


def test_lung_window_u8_custom_window():
    out = lung_window_u8(np.array([0.0, 50.0, 100.0]), center=50, width=100)
    assert out.tolist() == [0, 127, 255]


def test_consensus_features_rejects_empty():
    with pytest.raises(ValueError):
        consensus_features([])
