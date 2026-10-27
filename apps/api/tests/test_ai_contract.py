"""Contrato con el servicio de IA: PNG por defecto (Oracle v1.2), archivo fuente en modo local."""

from __future__ import annotations

import asyncio
import gzip
import io
import zipfile

import httpx
import nibabel as nib
import numpy as np
import pydicom
import pytest
from PIL import Image

import app.services.ai_contract as ai_contract
from app.core import config
from app.services.ai_contract import (
    ai_input_mode,
    build_inference_file,
    normalize_ai_response,
    post_predict,
)
from tests.dicom_factory import make_test_dicom_bytes

PNG_MAGIC = b"\x89PNG\r\n\x1a\n"

# Las 8 variables clínicas que `main` envía a /predict, en su orden.
MAIN_FEATURES = (
    "subtlety", "calcification", "sphericity", "margin",
    "lobulation", "spiculation", "texture", "malignancy",
)


def _main_minmax(pixels: np.ndarray) -> np.ndarray:
    """Oráculo: la conversión de `main` (dicom.py `dicom_to_png_bytes`), sin el PNG."""
    pixel_array = pixels.astype(np.float32)
    pixel_min, pixel_max = pixel_array.min(), pixel_array.max()
    if pixel_max > pixel_min:
        pixel_array = (pixel_array - pixel_min) / (pixel_max - pixel_min) * 255.0
    pixel_array = pixel_array.astype(np.uint8)
    return np.asarray(Image.fromarray(pixel_array).convert("RGB"))


def _decoded(png: bytes) -> np.ndarray:
    return np.asarray(Image.open(io.BytesIO(png)))


def _frames(n: int, seed: int) -> np.ndarray:
    """Frames con patrones aleatorios distintos: el min-max deja ver cuál se usó."""
    rng = np.random.default_rng(seed)
    return rng.integers(-1024, 400, size=(n, 8, 8)).astype(np.int16)


def _dicom_with_pixels(pixels: np.ndarray, **factory_kwargs) -> bytes:
    ds = pydicom.dcmread(io.BytesIO(make_test_dicom_bytes(rows=8, columns=8, **factory_kwargs)))
    if pixels.ndim == 3:
        ds.NumberOfFrames = pixels.shape[0]
    ds.PixelData = pixels.astype(np.int16).tobytes()
    buf = io.BytesIO()
    ds.save_as(buf)
    return buf.getvalue()


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


def test_png_con_dcm_es_identico_a_main_y_al_lote():
    """Paridad con `main`: min-max del pixel_array crudo, sin HU ni ventana."""
    from app.api.v1.routers.batch import dicom_to_png_bytes as batch_dicom_to_png

    pixels = _frames(1, seed=7)[0]
    data = _dicom_with_pixels(pixels)
    file = build_inference_file("dicom", "estudio.dcm", data, "png")
    sent = _decoded(file.content)
    assert np.array_equal(sent, _main_minmax(pixels))
    assert np.array_equal(sent, _decoded(batch_dicom_to_png(data)))


def test_png_con_dcm_multiframe_envia_frame_central():
    frames = _frames(5, seed=11)
    data = _dicom_with_pixels(frames)
    file = build_inference_file("dicom", "estudio.dcm", data, "png")
    assert file.content_type == "image/png"
    assert file.content[:8] == PNG_MAGIC
    sent = _decoded(file.content)
    assert np.array_equal(sent, _main_minmax(frames[2]))
    for other in (0, 1, 3, 4):
        assert not np.array_equal(sent, _main_minmax(frames[other]))


def test_png_con_imagen_convierte_a_png_rgb():
    buf = io.BytesIO()
    Image.new("L", (4, 4), color=200).save(buf, format="JPEG")
    file = build_inference_file("image", "foto.jpg", buf.getvalue(), "png")
    assert file.content_type == "image/png"
    assert file.content[:8] == PNG_MAGIC
    assert Image.open(io.BytesIO(file.content)).mode == "RGB"


def test_png_con_serie_zip_envia_corte_central():
    frames = _frames(5, seed=13)
    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, "w") as zf:
        # Orden de archivo distinto del orden Z para comprobar que se ordena por Z.
        for i in (4, 0, 3, 1, 2):
            zf.writestr(f"s{i}.dcm", _dicom_with_pixels(frames[i], series_uid="1.2.3.4", z=float(i)))
    file = build_inference_file("dicom_series", "serie.zip", zip_buf.getvalue(), "png")
    assert file.content_type == "image/png"
    assert file.content[:8] == PNG_MAGIC
    assert file.source_slice_index == 2
    assert file.keyframe_png == file.content
    assert np.array_equal(_decoded(file.content), _main_minmax(frames[2]))


@pytest.mark.parametrize("gzipped", [False, True])
def test_png_con_nifti_envia_corte_central(gzipped):
    rng = np.random.default_rng(17)
    vol = rng.normal(-600, 200, size=(4, 4, 6)).astype(np.float32)
    raw = nib.Nifti1Image(vol, affine=np.eye(4)).to_bytes()
    data = gzip.compress(raw) if gzipped else raw
    name = "torax.nii.gz" if gzipped else "torax.nii"
    file = build_inference_file("nifti_volume", name, data, "png")
    assert file.content_type == "image/png"
    assert file.content[:8] == PNG_MAGIC
    assert file.source_slice_index == 3
    assert file.keyframe_png == file.content
    # Misma orientación que la vista previa de la subida; min-max sobre ese corte.
    assert np.array_equal(_decoded(file.content), _main_minmax(vol[::-1, ::-1, 3].T))


def test_modo_source_envia_el_archivo_tal_cual():
    data = make_test_dicom_bytes()
    file = build_inference_file("dicom", "estudio.dcm", data, "source")
    assert file.content is data
    assert file.filename == "estudio.dcm"
    assert file.content_type == "application/octet-stream"
    assert file.keyframe_png is None
    assert file.source_slice_index is None


def test_post_predict_envia_multipart_como_main(monkeypatch):
    """Guarda de regresión: /predict recibe el PNG y las 8 variables como en `main`."""
    from app.api.v1.routers.dicom import ClinicalFeatures

    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(200, json={"score": 0.5, "modelo_version": "multimodal-v1.2"})

    real_client = httpx.AsyncClient
    monkeypatch.setattr(
        ai_contract.httpx,
        "AsyncClient",
        lambda **kwargs: real_client(transport=httpx.MockTransport(handler), **kwargs),
    )

    png = build_inference_file("dicom", "estudio.dcm", make_test_dicom_bytes(), "png")
    features = ClinicalFeatures().model_dump(exclude={"lobar_location"})
    result = asyncio.run(post_predict(png, features))

    assert result == {"score": 0.5, "modelo_version": "multimodal-v1.2"}
    assert len(seen) == 1
    request = seen[0]
    assert request.method == "POST"
    assert str(request.url) == f"{config.HF_API_BASE_URL.rstrip('/')}/predict"
    body = request.read()
    assert b'name="imagen"; filename="imagen.png"' in body
    assert b"Content-Type: image/png" in body
    assert png.content in body
    sent_keys = [
        part.split(b'"')[0].decode()
        for part in body.split(b'Content-Disposition: form-data; name="')[1:]
    ]
    assert sent_keys == [*MAIN_FEATURES, "imagen"]
    assert set(features) == set(MAIN_FEATURES)


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
