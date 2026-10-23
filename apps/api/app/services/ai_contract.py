"""Contrato con el servicio de inferencia.

Por defecto (``AI_INPUT_MODE`` ausente o ``png``) se envía a ``/predict`` un PNG en
ventana pulmonar, que es lo que espera el servidor de producción (multimodal-v1.2).
Con ``AI_INPUT_MODE=source`` se envía el archivo original, para el worker local v2,
que extrae el corte por su cuenta y lo devuelve en ``keyframe_base64``.
"""
from __future__ import annotations

import asyncio
import io
import os
from dataclasses import dataclass
from typing import Literal, Optional

import httpx
from PIL import Image

from app.core import config
from app.services.ct_window import dicom_to_png_bytes, volume_keyframe_png
from app.services.upload_types import UploadKind

AiInputMode = Literal["png", "source"]

_MAX_RETRIES = 2
_RETRY_DELAY_S = 2.0


def ai_input_mode() -> AiInputMode:
    """Lee ``AI_INPUT_MODE``; ausente o inválido equivale a ``png``."""
    raw = (os.environ.get("AI_INPUT_MODE") or "").strip().lower()
    return "source" if raw == "source" else "png"


@dataclass(frozen=True)
class InferenceFile:
    filename: str
    content: bytes
    content_type: str
    keyframe_png: Optional[bytes]
    source_slice_index: Optional[int]


def _image_to_png(data: bytes) -> bytes:
    buf = io.BytesIO()
    Image.open(io.BytesIO(data)).convert("RGB").save(buf, format="PNG")
    return buf.getvalue()


def build_inference_file(kind: UploadKind, original_name: str, data: bytes, mode: AiInputMode) -> InferenceFile:
    """Prepara el archivo que se envía a ``/predict`` según el modo de entrada."""
    if mode == "source":
        return InferenceFile(original_name, data, "application/octet-stream", None, None)

    if kind == "dicom":
        png = dicom_to_png_bytes(data)
        return InferenceFile("imagen.png", png, "image/png", png, None)
    if kind in ("dicom_series", "nifti_volume"):
        png, idx = volume_keyframe_png(kind, data)
        return InferenceFile("imagen.png", png, "image/png", png, idx)
    png = _image_to_png(data)
    return InferenceFile("imagen.png", png, "image/png", png, None)


async def post_predict(file: InferenceFile, features: dict[str, float]) -> dict:
    """Envía el archivo y las variables clínicas a ``/predict`` y devuelve el JSON.

    Reintenta dos veces ante ``ConnectError`` o timeout; los errores HTTP se propagan
    con ``raise_for_status``.
    """
    url = f"{config.HF_API_BASE_URL.rstrip('/')}/predict"
    files = {"imagen": (file.filename, file.content, file.content_type)}
    data = {key: str(value) for key, value in features.items()}

    for attempt in range(_MAX_RETRIES + 1):
        try:
            async with httpx.AsyncClient(timeout=config.HF_PREDICT_TIMEOUT) as client:
                response = await client.post(url, files=files, data=data)
                response.raise_for_status()
                return response.json()
        except (httpx.ConnectError, httpx.TimeoutException):
            if attempt < _MAX_RETRIES:
                await asyncio.sleep(_RETRY_DELAY_S)
                continue
            raise
    raise RuntimeError("unreachable")  # pragma: no cover


def normalize_ai_response(payload: dict) -> dict:
    """Unifica las respuestas de v1.2 (``heatmap_base64``) y v2 (``explicabilidad.overlay_base64``)."""
    out = dict(payload)
    explicabilidad = payload.get("explicabilidad") or {}
    if not isinstance(explicabilidad, dict):
        explicabilidad = {}
    out["explicabilidad"] = explicabilidad
    out["heatmap_base64"] = payload.get("heatmap_base64") or explicabilidad.get("overlay_base64")
    return out
