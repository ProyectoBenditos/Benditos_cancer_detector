"""Desidentificación de cabeceras NIfTI-1 antes de persistir el archivo."""

from __future__ import annotations

import gzip
import hashlib
import zlib
from datetime import datetime, timezone
from typing import Any, Dict, Tuple
from uuid import uuid4

import nibabel as nib

from app.services.dicom_series import MAX_ZIP_UNCOMPRESSED_BYTES

NIFTI_TEXT_FIELDS = ("descrip", "aux_file", "db_name", "intent_name", "data_type")

_INVALID_MSG = "El archivo NIfTI no es válido."
_NORMATIVE = (
    "NIfTI: descrip, aux_file, db_name, intent_name, data_type y extensiones de cabecera eliminados"
)


_TOO_BIG_MSG = "El volumen NIfTI descomprimido supera el tamaño máximo permitido."


class _TooBig(Exception):
    pass


def _bounded_gunzip(data: bytes, limit: int) -> bytes:
    """Descomprime gzip sin superar ``limit`` bytes (protege de bombas de descompresión)."""
    d = zlib.decompressobj(16 + zlib.MAX_WBITS)
    out = d.decompress(data, limit + 1)
    if len(out) > limit or d.unconsumed_tail:
        raise _TooBig
    if not d.eof:
        raise ValueError("gzip truncado")
    return out


def deidentify_nifti_bytes(
    data: bytes,
    *,
    gzipped: bool,
    max_uncompressed: int = MAX_ZIP_UNCOMPRESSED_BYTES,
) -> Tuple[bytes, Dict[str, Any]]:
    """Vacía los campos de texto libre y las extensiones de la cabecera NIfTI.

    El affine se conserva. Los vóxeles se vuelven a serializar con nibabel, así que
    pueden diferir del original por el redondeo del reescalado (``scl_slope`` /
    ``scl_inter``); no se garantiza que los bytes de vóxel sean idénticos.
    Regla de conteo de ``tags_cleared_count``:
    un campo de ``NIFTI_TEXT_FIELDS`` cuenta 1 solo si tenía contenido no vacío
    (descontando bytes nulos y espacios), y cada extensión de cabecera presente
    cuenta 1. Lo que ya estaba vacío no se cuenta.

    Lanza ``ValueError`` si los bytes no se pueden interpretar como NIfTI.
    """
    source_sha256 = hashlib.sha256(data).hexdigest()

    try:
        if gzipped:
            raw = _bounded_gunzip(data, max_uncompressed)
        elif len(data) > max_uncompressed:
            raise _TooBig
        else:
            raw = data
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
    except _TooBig as exc:
        raise ValueError(_TOO_BIG_MSG) from exc
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
