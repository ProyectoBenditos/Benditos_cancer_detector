"""Tests del router /api/v1/analysis con HF mockeado."""

from __future__ import annotations

import io

import pytest


def _png_bytes() -> bytes:
    """Devuelve bytes mínimos de un PNG válido (header + IHDR estándar)."""
    return (
        b"\x89PNG\r\n\x1a\n"
        b"\x00\x00\x00\rIHDR"
        b"\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89"
        b"\x00\x00\x00\rIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\rj-\xd9"
        b"\x00\x00\x00\x00IEND\xaeB`\x82"
    )


def test_analysis_predict_sin_auth_devuelve_401(client):
    response = client.post(
        "/api/v1/analysis/predict",
        files={"imagen": ("img.png", _png_bytes(), "image/png")},
        data={
            "subtlety": "3",
            "calcification": "6",
            "sphericity": "4",
            "margin": "4",
            "lobulation": "1",
            "spiculation": "1",
            "texture": "5",
            "malignancy": "3",
        },
    )
    assert response.status_code == 401


def test_analysis_predict_happy_path(client, auth_headers, hf_predict_mock):
    response = client.post(
        "/api/v1/analysis/predict",
        headers=auth_headers,
        files={"imagen": ("img.png", _png_bytes(), "image/png")},
        data={
            "subtlety": "3",
            "calcification": "6",
            "sphericity": "4",
            "margin": "4",
            "lobulation": "1",
            "spiculation": "1",
            "texture": "5",
            "malignancy": "3",
        },
    )
    assert response.status_code == 202
    payload = response.json()
    assert payload["status"] == "processing"
    assert "upload_id" in payload


def test_analysis_predict_extension_invalida_devuelve_400(client, auth_headers):
    response = client.post(
        "/api/v1/analysis/predict",
        headers=auth_headers,
        files={"imagen": ("malicious.exe", b"PE\x00\x00", "application/octet-stream")},
        data={
            "subtlety": "3",
            "calcification": "6",
            "sphericity": "4",
            "margin": "4",
            "lobulation": "1",
            "spiculation": "1",
            "texture": "5",
            "malignancy": "3",
        },
    )
    assert response.status_code == 400
    assert "Extension no soportada" in response.json().get("detail", "")


def test_analysis_predict_archivo_vacio_devuelve_400(client, auth_headers):
    response = client.post(
        "/api/v1/analysis/predict",
        headers=auth_headers,
        files={"imagen": ("img.png", b"", "image/png")},
        data={
            "subtlety": "3",
            "calcification": "6",
            "sphericity": "4",
            "margin": "4",
            "lobulation": "1",
            "spiculation": "1",
            "texture": "5",
            "malignancy": "3",
        },
    )
    assert response.status_code == 400


def test_analysis_get_inexistente_devuelve_404(client, auth_headers, monkeypatch):
    """GET /analysis/{id} cuando supabase devuelve [] → 404."""
    import app.api.v1.routers.analysis as analysis_module
    from types import SimpleNamespace

    table_chain = analysis_module.supabase.table.return_value
    table_chain.execute.return_value = SimpleNamespace(data=[])

    response = client.get(
        "/api/v1/analysis/no-existe",
        headers=auth_headers,
    )
    assert response.status_code == 404


@pytest.mark.parametrize(
    "exc, expected",
    [
        ("hf", "El servicio de IA no respondió correctamente."),
        ("runtime", "Error inesperado en el análisis."),
    ],
)
def test_run_inference_fallida_guarda_mensaje_fijo_en_ai_error(supabase_mock, monkeypatch, exc, expected):
    """ai_error nunca guarda el detalle interno de la excepción (rutas, cuerpos de respuesta)."""
    import app.api.v1.routers.analysis as analysis_module
    from app.services.hf_client import HFInferenceError

    error = HFInferenceError("HF respondio 500: /ruta/secreta") if exc == "hf" else RuntimeError("/ruta/secreta")

    async def failing_predict(**kwargs):
        raise error

    monkeypatch.setattr(analysis_module, "hf_predict", failing_predict)

    analysis_module._run_inference("upload-uuid-test", b"img", "img.png", "image/png", {})

    updates = [c.args[0] for c in supabase_mock.table().update.call_args_list if c.args]
    assert updates, "no se persistió el fallo"
    assert updates[-1]["ai_error"] == expected
    assert all("/ruta" not in str(u.get("ai_error", "")) for u in updates)
