"""Desidentificación de cabeceras NIfTI-1 antes de persistir el archivo."""

from __future__ import annotations

import gzip
import hashlib
from datetime import datetime, timezone
from typing import Any, Dict, Tuple
from uuid import uuid4

import nibabel as nib

NIFTI_TEXT_FIELDS = ("descrip", "aux_file", "db_name")

_INVALID_MSG = "El archivo NIfTI no es válido."
_NORMATIVE = "NIfTI: descrip, aux_file, db_name y extensiones de cabecera eliminados"


def deidentify_nifti_bytes(data: bytes, *, gzipped: bool) -> Tuple[bytes, Dict[str, Any]]:
    """Vacía los campos de texto libre y las extensiones de la cabecera NIfTI.

    Los vóxeles y el affine no se tocan. Regla de conteo de ``tags_cleared_count``:
    un campo de ``NIFTI_TEXT_FIELDS`` cuenta 1 solo si tenía contenido no vacío
    (descontando bytes nulos y espacios), y cada extensión de cabecera presente
    cuenta 1. Lo que ya estaba vacío no se cuenta.

    Lanza ``ValueError`` si los bytes no se pueden interpretar como NIfTI.
    """
    source_sha256 = hashlib.sha256(data).hexdigest()

    try:
        raw = gzip.decompress(data) if gzipped else data
        img = nib.Nifti1Image.from_bytes(raw)
        header = img.header

        cleared = 0
        for field in NIFTI_TEXT_FIELDS:
            if bytes(header[field]).strip(b"\x00 "):
                cleared += 1
            header[field] = b""

        cleared += len(header.extensions)
        header.extensions.clear()

        clean = img.to_bytes()
        if gzipped:
            clean = gzip.compress(clean)
    except Exception as exc:
        raise ValueError(_INVALID_MSG) from exc

    audit = {
        "source_sha256": source_sha256,
        "sanitized_sha256": hashlib.sha256(clean).hexdigest(),
        "pseudonymized_patient_id": f"ONC-NII-{uuid4().hex[:8].upper()}",
        "tags_cleared_count": cleared,
        "deidentified_at": datetime.now(timezone.utc).isoformat(),
        "normative_compliance": _NORMATIVE,
    }
    return clean, audit
