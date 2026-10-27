"""Ventana pulmonar y conversión de cortes CT a PNG."""
from __future__ import annotations

import io
from typing import Optional

import numpy as np
import pydicom
from PIL import Image

from app.services.dicom_series import MAX_ZIP_UNCOMPRESSED_BYTES, read_ct_series
from app.services.nifti_deid import _bounded_gunzip
from app.services.upload_types import UploadKind


def apply_lung_window(pixel_array: np.ndarray, dataset: pydicom.Dataset) -> np.ndarray:
    """
    Aplica RescaleSlope/Intercept en unidades Hounsfield (HU) y ventana pulmonar
    médica estandarizada (-600 HU Centro, 1500 HU Ancho -> [-1350, +150] HU).
    """
    slope = float(getattr(dataset, "RescaleSlope", 1.0))
    intercept = float(getattr(dataset, "RescaleIntercept", 0.0))
    hu = pixel_array.astype(np.float32) * slope + intercept

    # Ventana pulmonar canónica para parénquima y nódulos
    wc = -600.0
    ww = 1500.0

    raw_wc = getattr(dataset, "WindowCenter", None)
    raw_ww = getattr(dataset, "WindowWidth", None)
    if raw_wc is not None:
        try:
            val = float(raw_wc[0]) if isinstance(raw_wc, (list, pydicom.multival.MultiValue)) else float(raw_wc)
            if val < 0 and val > -1000:
                wc = val
        except Exception:
            pass
    if raw_ww is not None:
        try:
            val = float(raw_ww[0]) if isinstance(raw_ww, (list, pydicom.multival.MultiValue)) else float(raw_ww)
            if 800 <= val <= 2000:
                ww = val
        except Exception:
            pass

    hu_min = wc - (ww / 2.0)
    hu_max = wc + (ww / 2.0)
    hu_clipped = np.clip(hu, hu_min, hu_max)
    norm = ((hu_clipped - hu_min) / (hu_max - hu_min) * 255.0).astype(np.uint8)
    return norm


def dicom_to_png_bytes(file_bytes: bytes, slice_idx: Optional[int] = None) -> bytes:
    """Convierte bytes de DICOM (single slice o multiframe) a PNG en ventana pulmonar."""
    in_buf = io.BytesIO(file_bytes)
    dataset = pydicom.dcmread(in_buf, force=True)
    px = dataset.pixel_array

    if px.ndim == 3:
        idx = slice_idx if slice_idx is not None else px.shape[0] // 2
        idx = max(0, min(idx, px.shape[0] - 1))
        px = px[idx]

    pixel_norm = apply_lung_window(px, dataset)
    pil_img = Image.fromarray(pixel_norm).convert("RGB")
    png_buffer = io.BytesIO()
    pil_img.save(png_buffer, format="PNG")
    return png_buffer.getvalue()


def model_input_png(pixels: np.ndarray) -> bytes:
    """PNG de entrada al modelo, idéntico a la conversión de ``main`` y del análisis por lotes.

    Estira el arreglo 2D crudo a 0-255 con su mínimo y máximo (sin HU ni ventana),
    lo pasa a ``uint8`` y lo guarda como PNG RGB. Es la entrada que espera
    multimodal-v1.2; cambiarla altera los scores.
    """
    pixel_array = pixels.astype(np.float32)
    pixel_min, pixel_max = pixel_array.min(), pixel_array.max()
    if pixel_max > pixel_min:
        pixel_array = (pixel_array - pixel_min) / (pixel_max - pixel_min) * 255.0
    pixel_array = pixel_array.astype(np.uint8)

    png_buffer = io.BytesIO()
    Image.fromarray(pixel_array).convert("RGB").save(png_buffer, format="PNG")
    return png_buffer.getvalue()


def dicom_to_model_png(file_bytes: bytes) -> bytes:
    """``model_input_png`` de un ``.dcm``; si es multiframe, del frame central."""
    dataset = pydicom.dcmread(io.BytesIO(file_bytes))
    px = dataset.pixel_array
    if px.ndim == 3:
        px = px[px.shape[0] // 2]
    return model_input_png(px)


def volume_keyframe_png(kind: UploadKind, data: bytes) -> tuple[bytes, int]:
    """PNG de entrada al modelo (``model_input_png``) del corte axial central y su índice 0-based.

    - ``dicom_series``: el ``pixel_array`` del corte ``n // 2`` de ``read_ct_series`` (orden Z).
    - ``nifti_volume``: el volumen canónico RAS, con la misma orientación que la
      subida (``vol[::-1, ::-1, s].T``); ``s = shape[2] // 2``.
    """
    if kind == "dicom_series":
        slices = read_ct_series(data)
        idx = len(slices) // 2
        px = slices[idx][2].pixel_array
        if px.ndim == 3:
            px = px[px.shape[0] // 2]
        return model_input_png(px), idx

    if kind == "nifti_volume":
        import nibabel as nib

        if data[:2] == b"\x1f\x8b":
            raw = _bounded_gunzip(data, MAX_ZIP_UNCOMPRESSED_BYTES)
        elif len(data) > MAX_ZIP_UNCOMPRESSED_BYTES:
            raise ValueError("El volumen NIfTI supera el tamaño máximo permitido.")
        else:
            raw = data
        nii = nib.as_closest_canonical(nib.Nifti1Image.from_bytes(raw))
        vol = nii.get_fdata(dtype=np.float32)
        if vol.ndim == 4:
            vol = vol[:, :, :, 0]
        if vol.ndim != 3:
            raise ValueError("El volumen NIfTI debe ser tridimensional (3D).")
        s = vol.shape[2] // 2
        return model_input_png(vol[::-1, ::-1, s].T), s

    raise ValueError(f"volume_keyframe_png no aplica al tipo {kind}")
