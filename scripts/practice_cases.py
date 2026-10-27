"""Funciones puras para preparar los casos públicos del modo práctica (LIDC-IDRI)."""
from __future__ import annotations

from statistics import median

import numpy as np

# Rangos de las variables clínicas que acepta la API
# (apps/api/app/api/v1/routers/analysis.py, parámetros Form de /analysis/predict).
FEATURE_RANGES: dict[str, tuple[float, float]] = {
    "subtlety": (1, 5),
    "calcification": (1, 6),
    "sphericity": (1, 5),
    "margin": (1, 5),
    "lobulation": (1, 5),
    "spiculation": (1, 5),
    "texture": (1, 5),
    "malignancy": (1, 5),
}

MIN_READERS = 3
MIN_DIAMETER_MM = 6.0
MAX_DIAMETER_MM = 30.0


def consensus_features(annotations: list[dict[str, float]]) -> tuple[dict[str, float], list[str]]:
    """Mediana por variable de las lecturas, recortada a ``FEATURE_RANGES``.

    Devuelve las variables de consenso y la lista de las que se recortaron.
    """
    if not annotations:
        raise ValueError("Se necesita al menos una anotación para el consenso.")
    features: dict[str, float] = {}
    clipped: list[str] = []
    for name, (low, high) in FEATURE_RANGES.items():
        value = float(median(float(a[name]) for a in annotations))
        bounded = min(max(value, low), high)
        if bounded != value:
            clipped.append(name)
        features[name] = bounded
    return features, clipped


def is_reference(n_readers: int, diameter_mm: float) -> bool:
    """Nódulo de referencia: marcado por al menos 3 radiólogos y de 6 a 30 mm."""
    return n_readers >= MIN_READERS and MIN_DIAMETER_MM <= diameter_mm <= MAX_DIAMETER_MM


def normalized_center(col: float, row: float, columns: int, rows: int) -> tuple[float, float]:
    """Centro en coordenadas normalizadas ``(x, y)`` del corte, de 0 a 1."""
    return (col / columns, row / rows)


def lung_window_u8(hu: np.ndarray, center: float = -600, width: float = 1500) -> np.ndarray:
    """Ventana pulmonar sobre valores HU, a ``uint8`` (por defecto [-1350, 150] HU)."""
    low = center - width / 2.0
    high = center + width / 2.0
    clipped = np.clip(np.asarray(hu, dtype=np.float32), low, high)
    return ((clipped - low) / (high - low) * 255.0).astype(np.uint8)
