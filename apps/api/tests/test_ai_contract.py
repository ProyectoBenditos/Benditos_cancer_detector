"""Contrato con el servicio de IA: PNG por defecto (Oracle v1.2), archivo fuente en modo local."""

from __future__ import annotations

import io
import zipfile

import nibabel as nib
import numpy as np
import pydicom
import pytest
from PIL import Image

from app.services.ai_contract import (
    ai_input_mode,
    build_inference_file,
    normalize_ai_response,
)
from tests.dicom_factory import make_test_dicom_bytes

PNG_MAGIC = b"\x89PNG\r\n\x1a\n"


def _dicom_with_frames(values: list[int]) -> bytes:
    """DICOM CT con un frame por valor (HU constantes; slope 1, intercept 0)."""
    ds = pydicom.dcmread(io.BytesIO(make_test_dicom_bytes(rows=8, columns=8)))
    frames = np.stack([np.full((8, 8), v, dtype=np.int16) for v in values])
    if len(values) > 1:
        ds.NumberOfFrames = len(values)
        ds.PixelData = frames.tobytes()
    else:
        ds.PixelData = frames[0].tobytes()
    buf = io.BytesIO()
    ds.save_as(buf)
    return buf.getvalue()


def _slice_with_value(value: int, z: float) -> bytes:
    ds = pydicom.dcmread(io.BytesIO(make_test_dicom_bytes(series_uid="1.2.3.4", z=z, rows=8, columns=8)))
    ds.PixelData = np.full((8, 8), value, dtype=np.int16).tobytes()
    buf = io.BytesIO()
    ds.save_as(buf)
    return buf.getvalue()


def _png_pixel(png: bytes) -> int:
    img = Image.open(io.BytesIO(png))
    return img.convert("L").getpixel((0, 0))


# Ventana pulmonar [-1350, 150] HU: -600 HU -> 127; los demás valores dan otro gris.
VALUES = [-1350, -1000, -600, -300, 0]
CENTER_GRAY = 127


def test_ai_input_mode_por_defecto_es_png(monkeypatch):
    monkeypatch.delenv("AI_INPUT_MODE", raising=False)
    assert ai_input_mode() == "png"


def test_ai_input_mode_invalido_es_png(monkeypatch):
    monkeypatch.setenv("AI_INPUT_MODE", "PNG?")
    assert ai_input_mode() == "png"


def test_ai_input_mode_source(monkeypatch):
    monkeypatch.setenv("AI_INPUT_MODE", "source")
    assert ai_input_mode() == "source"


def test_png_con_dcm_de_un_corte_envia_png():
    data = make_test_dicom_bytes()
    file = build_inference_file("dicom", "estudio.dcm", data, "png")
    assert file.content_type == "image/png"
    assert file.content[:8] == PNG_MAGIC
    assert file.filename == "imagen.png"
    assert file.keyframe_png == file.content
    assert file.source_slice_index is None


def test_png_con_dcm_multiframe_envia_frame_central():
    data = _dicom_with_frames(VALUES)
    file = build_inference_file("dicom", "estudio.dcm", data, "png")
    assert file.content_type == "image/png"
    assert file.content[:8] == PNG_MAGIC
    assert _png_pixel(file.content) == CENTER_GRAY


def test_png_con_imagen_convierte_a_png_rgb():
    buf = io.BytesIO()
    Image.new("L", (4, 4), color=200).save(buf, format="JPEG")
    file = build_inference_file("image", "foto.jpg", buf.getvalue(), "png")
    assert file.content_type == "image/png"
    assert file.content[:8] == PNG_MAGIC
    assert Image.open(io.BytesIO(file.content)).mode == "RGB"


def test_png_con_serie_zip_envia_corte_central():
    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, "w") as zf:
        # Orden de archivo distinto del orden Z para comprobar que se ordena por Z.
        for i in (4, 0, 3, 1, 2):
            zf.writestr(f"s{i}.dcm", _slice_with_value(VALUES[i], z=float(i)))
    file = build_inference_file("dicom_series", "serie.zip", zip_buf.getvalue(), "png")
    assert file.content_type == "image/png"
    assert file.content[:8] == PNG_MAGIC
    assert file.source_slice_index == 2
    assert file.keyframe_png == file.content
    assert _png_pixel(file.content) == CENTER_GRAY


@pytest.mark.parametrize("gzipped", [False, True])
def test_png_con_nifti_envia_corte_central(gzipped):
    import gzip

    vol = np.zeros((4, 4, 6), dtype=np.float32) - 1350.0
    vol[:, :, 3] = -600.0
    raw = nib.Nifti1Image(vol, affine=np.eye(4)).to_bytes()
    data = gzip.compress(raw) if gzipped else raw
    name = "torax.nii.gz" if gzipped else "torax.nii"
    file = build_inference_file("nifti_volume", name, data, "png")
    assert file.content_type == "image/png"
    assert file.content[:8] == PNG_MAGIC
    assert file.source_slice_index == 3
    assert file.keyframe_png == file.content
    assert _png_pixel(file.content) == CENTER_GRAY


def test_modo_source_envia_el_archivo_tal_cual():
    data = make_test_dicom_bytes()
    file = build_inference_file("dicom", "estudio.dcm", data, "source")
    assert file.content is data
    assert file.filename == "estudio.dcm"
    assert file.content_type == "application/octet-stream"
    assert file.keyframe_png is None
    assert file.source_slice_index is None


def test_normalize_conserva_heatmap_base64():
    assert normalize_ai_response({"score": 1, "heatmap_base64": "A"})["heatmap_base64"] == "A"


def test_normalize_usa_overlay_de_explicabilidad():
    assert normalize_ai_response({"explicabilidad": {"overlay_base64": "B"}})["heatmap_base64"] == "B"


def test_normalize_con_explicabilidad_null_no_falla():
    out = normalize_ai_response({"explicabilidad": None, "heatmap_base64": "C"})
    assert out["explicabilidad"] == {}
    assert out["heatmap_base64"] == "C"


def test_normalize_no_modifica_el_original():
    payload = {"score": 1}
    out = normalize_ai_response(payload)
    assert "heatmap_base64" not in payload
    assert out["heatmap_base64"] is None
