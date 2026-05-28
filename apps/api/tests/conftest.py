"""Fixtures compartidos para la suite de tests del backend.

Estrategia:
- Antes de importar `app.main`, fijamos las env vars obligatorias para que
  `app/core/config.py` no eleve `RuntimeError`.
- Parcheamos `supabase` y el cliente HF antes de que los routers los usen.
- Exponemos un `client` (TestClient) listo para invocar endpoints.
"""

from __future__ import annotations

import os
import sys
from types import SimpleNamespace
from typing import Any
from unittest.mock import MagicMock

import pytest


# Env vars mock antes de cualquier import de `app.*`.
# SUPABASE_URL debe parecer una URL pública válida y SUPABASE_SERVICE_ROLE_KEY
# debe tener forma JWT (header.payload.signature) para que el cliente
# supabase-py no rechace el formato al boot.
os.environ.setdefault("SUPABASE_URL", "https://test-project.supabase.co")
os.environ.setdefault(
    "SUPABASE_SERVICE_ROLE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoidGVzdCJ9."
    "fake-signature-for-tests-only",
)
os.environ.setdefault("SUPABASE_BUCKET_NAME", "dicom-files-test")
os.environ.setdefault("HF_API_BASE_URL", "https://hf-test.invalid")
os.environ.setdefault("HF_PREDICT_TIMEOUT", "5")


# El JWT mock pasa el regex de validación de supabase-py
# (^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$) por lo que el
# cliente se construye sin contactar la red. Las llamadas reales se mockean
# vía monkeypatch en la fixture `supabase_mock`.


@pytest.fixture
def supabase_mock(monkeypatch) -> MagicMock:
    """Reemplaza `app.db.supabase_client.supabase` por un mock encadenable."""
    mock = MagicMock(name="supabase_client")

    # storage.from_(bucket).upload / download
    mock.storage.from_().upload.return_value = SimpleNamespace(data={"path": "ok"})
    mock.storage.from_().download.return_value = b"fake-bytes"

    # table().select()/insert()/update()/eq()/limit()/execute()
    table_chain = MagicMock()
    table_chain.execute.return_value = SimpleNamespace(
        data=[{"id": "upload-uuid-test", "user_id": "user-uuid-test"}]
    )
    mock.table.return_value = table_chain
    # cualquier método encadenable devuelve la misma cadena
    for method in ("select", "insert", "update", "eq", "limit", "single"):
        getattr(table_chain, method).return_value = table_chain

    # auth.get_user retorna user con id/email
    mock.auth.get_user.return_value = SimpleNamespace(
        user=SimpleNamespace(id="user-uuid-test", email="user@test.invalid"),
        data=None,
    )

    import app.db.supabase_client as supabase_module

    monkeypatch.setattr(supabase_module, "supabase", mock)

    # Routers ya importaron `supabase` por nombre → parchear cada referencia
    import app.api.v1.routers.analysis as analysis_module
    import app.api.v1.routers.dicom as dicom_module
    import app.core.security as security_module

    monkeypatch.setattr(analysis_module, "supabase", mock)
    monkeypatch.setattr(dicom_module, "supabase", mock)
    monkeypatch.setattr(security_module, "supabase", mock)

    return mock


@pytest.fixture
def hf_predict_mock(monkeypatch) -> MagicMock:
    """Mockea `app.services.hf_client.predict` para no llamar a HF."""
    import app.api.v1.routers.analysis as analysis_module

    async def fake_predict(**kwargs: Any) -> dict:
        return {
            "score": 0.42,
            "nivel_riesgo": "MEDIO",
            "recomendacion": "Seguimiento clínico estándar.",
            "modelo_version": "test-v0.0.1",
        }

    mock = MagicMock(side_effect=fake_predict)
    mock.__name__ = "hf_predict"
    monkeypatch.setattr(analysis_module, "hf_predict", fake_predict)
    return mock


@pytest.fixture
def client(supabase_mock):
    """TestClient de FastAPI con dependencias mockeadas."""
    from fastapi.testclient import TestClient

    from app.main import app

    return TestClient(app)


@pytest.fixture
def auth_headers() -> dict[str, str]:
    return {"Authorization": "Bearer test-token-jwt"}
