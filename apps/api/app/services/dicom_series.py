"""Lectura segura de series DICOM dentro de un ZIP (una sola serie CT)."""
from __future__ import annotations

import io
import posixpath
import zipfile

import pydicom

MAX_UPLOAD_BYTES = 50 * 1024 * 1024
MAX_ZIP_ENTRIES = 1000
MAX_ZIP_UNCOMPRESSED_BYTES = 300 * 1024 * 1024
MAX_COMPRESSION_RATIO = 100

SIZE_LIMIT_MESSAGE = "El ZIP excede el tamaño máximo permitido al descomprimirse."
NO_CT_MESSAGE = "El archivo .zip no contiene cortes tomográficos de tórax (CT) válidos en formato DICOM."


class SeriesError(ValueError):
    """Error de lectura de la serie; el mensaje es apto para mostrar al usuario."""


def _is_candidate(name: str) -> bool:
    if name.startswith("__MACOSX/"):
        return False
    base = posixpath.basename(name)
    if not base or base.startswith("."):
        return False
    return base.lower().endswith(".dcm") or "." not in base


def _z_position(ds: pydicom.Dataset) -> float:
    if hasattr(ds, "ImagePositionPatient") and len(ds.ImagePositionPatient) >= 3:
        return float(ds.ImagePositionPatient[2])
    if hasattr(ds, "SliceLocation") and ds.SliceLocation is not None:
        return float(ds.SliceLocation)
    if hasattr(ds, "InstanceNumber") and ds.InstanceNumber is not None:
        return float(ds.InstanceNumber)
    return 0.0


def read_ct_series(
    zip_bytes: bytes, *, max_uncompressed: int = MAX_ZIP_UNCOMPRESSED_BYTES
) -> list[tuple[float, bytes, pydicom.Dataset]]:
    """Lee los cortes CT de una única serie, ordenados por posición Z.

    Valida entradas, tamaño descomprimido y relación de compresión con los
    metadatos de `infolist()` antes de leer ningún contenido.
    """
    try:
        archive = zipfile.ZipFile(io.BytesIO(zip_bytes), "r")
    except zipfile.BadZipFile as exc:
        raise SeriesError("El archivo ZIP está dañado o no es un archivo válido.") from exc

    with archive:
        infos = archive.infolist()
        if len(infos) > MAX_ZIP_ENTRIES:
            raise SeriesError(f"El ZIP contiene más de {MAX_ZIP_ENTRIES} archivos.")
        files = [info for info in infos if not info.is_dir()]
        if sum(info.file_size for info in files) > max_uncompressed:
            raise SeriesError(SIZE_LIMIT_MESSAGE)
        for info in files:
            if info.file_size / max(info.compress_size, 1) > MAX_COMPRESSION_RATIO:
                raise SeriesError("El ZIP tiene una relación de compresión sospechosa y fue rechazado.")

        slices: list[tuple[str, float, bytes, pydicom.Dataset]] = []
        for info in files:
            if not _is_candidate(info.filename):
                continue
            raw = archive.read(info)
            try:
                ds = pydicom.dcmread(io.BytesIO(raw), stop_before_pixels=False)
                if str(getattr(ds, "Modality", "")).strip() != "CT":
                    continue
                slices.append((str(getattr(ds, "SeriesInstanceUID", "") or ""), _z_position(ds), raw, ds))
            except Exception:
                continue

    if not slices:
        raise SeriesError(NO_CT_MESSAGE)

    series_uids = {item[0] for item in slices}
    if len(series_uids) > 1:
        raise SeriesError(f"El ZIP contiene varias series ({len(series_uids)} series CT); suba una sola serie.")

    ordered = sorted(((z, raw, ds) for _, z, raw, ds in slices), key=lambda item: item[0])
    return ordered
