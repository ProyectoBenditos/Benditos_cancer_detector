"""Clasificación de subidas por extensión de archivo."""
from __future__ import annotations

import os
from typing import Literal, Optional

UploadKind = Literal["dicom", "dicom_series", "nifti_volume", "image"]

VOLUME_KINDS: tuple[UploadKind, ...] = ("dicom_series", "nifti_volume")
VOLUME_UPLOADS_DISABLED_DETAIL = (
    "La carga de series ZIP y volúmenes NIfTI no está habilitada en este entorno."
)

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


def volume_uploads_enabled() -> bool:
    """Bandera ``VOLUME_UPLOADS_ENABLED`` ("true" o "1"); se lee en cada petición.

    Las series ZIP y los volúmenes NIfTI necesitan varias veces su tamaño en RAM,
    así que quedan apagados salvo en máquinas con memoria para ellos.
    """
    return os.getenv("VOLUME_UPLOADS_ENABLED", "").strip().lower() in ("true", "1")


def kind_of_record(record: dict) -> UploadKind:
    """Tipo de un registro de `dicom_uploads`; los estudios antiguos caen a imagen."""
    stored = record.get("file_type")
    if stored in ("dicom_series", "nifti_volume"):
        return stored
    return classify_upload(record.get("original_name") or "") or "image"
