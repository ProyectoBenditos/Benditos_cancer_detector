"""Tests del logger estructurado y su política PHI."""

import io
import json

import pytest

from app.core.logging import (
    PHI_KEYS,
    configure_logging,
    hash_id,
    log_event,
    logger,
)


@pytest.fixture
def log_stream() -> io.StringIO:
    stream = io.StringIO()
    configure_logging(level="DEBUG", stream=stream)
    yield stream
    logger.handlers.clear()


@pytest.mark.parametrize("phi_key", sorted(PHI_KEYS))
def test_log_event_rechaza_claves_phi(phi_key, log_stream):
    with pytest.raises(ValueError, match="PHI"):
        log_event("evento_dummy", **{phi_key: "valor-prohibido"})


def test_log_event_acepta_campos_seguros(log_stream):
    log_event(
        "upload_completed",
        upload_id_hash=hash_id("uuid-de-prueba"),
        http_status=202,
    )
    output = log_stream.getvalue()
    assert output, "El logger no escribió en el stream"
    payload = json.loads(output.strip().splitlines()[-1])
    assert payload["event"] == "upload_completed"
    assert payload["level"] == "INFO"
    assert payload["extra"]["http_status"] == 202
    assert "upload_id_hash" in payload["extra"]


def test_log_event_propaga_exc_info(log_stream):
    try:
        raise RuntimeError("fallo simulado")
    except RuntimeError:
        log_event(
            "hf_inference_failed",
            level="ERROR",
            exc_info=True,
            error_type="RuntimeError",
        )
    payload = json.loads(log_stream.getvalue().strip().splitlines()[-1])
    assert payload["level"] == "ERROR"
    assert payload["exc_type"] == "RuntimeError"
    assert payload["extra"]["error_type"] == "RuntimeError"


def test_hash_id_truncado_y_hex():
    h = hash_id("upload-uuid", length=12)
    assert len(h) == 12
    assert all(c in "0123456789abcdef" for c in h)


def test_configure_logging_es_idempotente(log_stream):
    configure_logging(level="INFO", stream=log_stream)
    log_event("evento", marker=True)
    assert log_stream.getvalue().count("\"event\": \"evento\"") == 1


def test_log_event_acepta_set_vacio_de_kwargs(log_stream):
    log_event("noop")
    payload = json.loads(log_stream.getvalue().strip().splitlines()[-1])
    assert payload["event"] == "noop"
    assert "extra" not in payload
