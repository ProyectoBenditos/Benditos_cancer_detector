"""Clasificación de subidas por extensión de archivo."""
from __future__ import annotations

from typing import Literal, Optional

UploadKind = Literal["dicom", "dicom_series", "nifti_volume", "image"]

_BY_SUFFIX: tuple[tuple[str, UploadKind], ...] = (
    (".nii.gz", "nifti_volume"),
    (".nii", "nifti_volume"),
    (".dcm", "dicom"),
    (".zip", "dicom_series"),
    (".png", "image"),
    (".jpg", "image"),
    (".jpeg", "image"),
)


def classify_upload(filename: str) -> Optional[UploadKind]:
    """Devuelve el tipo de subida según la extensión, o None si no se soporta."""
    lowered = filename.lower()
    for suffix, kind in _BY_SUFFIX:
        if lowered.endswith(suffix):
            return kind
    return None


def kind_of_record(record: dict) -> UploadKind:
    """Tipo de un registro de `dicom_uploads`; los estudios antiguos caen a imagen."""
    stored = record.get("file_type")
    if stored in ("dicom_series", "nifti_volume"):
        return stored
    return classify_upload(record.get("original_name") or "") or "image"
