"""Cliente para el servicio de inferencia de OncaScan en Hugging Face Spaces."""

import asyncio
from typing import Dict

import httpx

from app.core.config import HF_API_BASE_URL, HF_PREDICT_TIMEOUT


class HFInferenceError(Exception):
    """Error tipado para fallos de inferencia contra el Space de HF."""


FEATURE_FIELDS = (
    "subtlety",
    "calcification",
    "sphericity",
    "margin",
    "lobulation",
    "spiculation",
    "texture",
    "malignancy",
)

REQUIRED_RESPONSE_KEYS = ("score", "nivel_riesgo", "recomendacion", "modelo_version")


async def predict(
    image_bytes: bytes,
    filename: str,
    content_type: str,
    features: Dict[str, float],
) -> Dict:
    """Envia la imagen + features al endpoint /predict del Space.

    Lanza HFInferenceError en cualquier escenario que impida obtener un
    resultado utilizable: timeout, error de red, status >= 400, payload
    incompleto, o JSON invalido.
    """

    missing = [f for f in FEATURE_FIELDS if f not in features]
    if missing:
        raise HFInferenceError(f"Faltan features clinicas: {missing}")

    url = f"{HF_API_BASE_URL.rstrip('/')}/predict"

    files = {"imagen": (filename, image_bytes, content_type or "image/png")}
    data = {f: str(features[f]) for f in FEATURE_FIELDS}

    response = None
    max_retries = 2
    for attempt in range(max_retries + 1):
        try:
            async with httpx.AsyncClient(timeout=HF_PREDICT_TIMEOUT) as client:
                response = await client.post(url, files=files, data=data)
                break
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            if attempt < max_retries:
                await asyncio.sleep(2.0)
                continue
            if isinstance(exc, httpx.TimeoutException):
                raise HFInferenceError(
                    f"Timeout consultando el servicio de IA ({HF_PREDICT_TIMEOUT}s). El servidor puede estar en cold-start."
                ) from exc
            raise HFInferenceError(
                "No se pudo conectar con el microservicio de IA en Hugging Face "
                "(error de conexión temporal o servidor iniciando tras hibernación)."
            ) from exc
        except httpx.HTTPError as e:
            raise HFInferenceError(f"Error de red consultando HF: {e}") from e

    if response is None:
        raise HFInferenceError("No se obtuvo respuesta del microservicio de IA")

    if response.status_code >= 400:
        body_preview = response.text[:300] if response.text else ""
        raise HFInferenceError(
            f"HF respondio {response.status_code}: {body_preview}"
        )

    try:
        payload = response.json()
    except ValueError as e:
        raise HFInferenceError(f"Respuesta de HF no es JSON valido: {e}") from e

    if not isinstance(payload, dict):
        raise HFInferenceError(f"Respuesta de HF no es un objeto: {type(payload).__name__}")

    missing_keys = [k for k in REQUIRED_RESPONSE_KEYS if k not in payload]
    if missing_keys:
        raise HFInferenceError(f"Respuesta de HF incompleta, faltan: {missing_keys}")

    return payload
