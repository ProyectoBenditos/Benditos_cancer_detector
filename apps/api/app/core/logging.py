"""Logger estructurado para OncoScan API.

Toda emisión de logs en código productivo debe pasar por `log_event` o por
`logger.exception` definidos aquí. `print()` está prohibido fuera de
`scripts/` y de los tests. La lista `PHI_KEYS` es la fuente de verdad y
rechaza valores en runtime: si alguna ruta intenta loguear un campo PHI,
el helper eleva `ValueError` para forzar al desarrollador a corregir.
"""

from __future__ import annotations

import hashlib
import json
import logging
import sys
from typing import Any


PHI_KEYS: frozenset[str] = frozenset({
    "email",
    "file_path",
    "case_ref",
    "result_json",
    "score",
    "patient_id",
    "external_id",
    "display_alias",
})


class _JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": self.formatTime(record, datefmt="%Y-%m-%dT%H:%M:%S%z"),
            "level": record.levelname,
            "logger": record.name,
            "event": record.getMessage(),
        }
        extra = getattr(record, "extra_fields", None)
        if extra:
            payload["extra"] = extra
        if record.exc_info and record.exc_info[0] is not None:
            payload["exc_type"] = record.exc_info[0].__name__
        return json.dumps(payload, ensure_ascii=False)


logger = logging.getLogger("oncoscan")


def configure_logging(level: str = "INFO", *, stream: Any | None = None) -> None:
    """Inicializa el logger raíz de la app. Idempotente.

    `stream` permite inyectar un destino alternativo (útil en tests).
    Si es `None`, se usa `sys.stdout` resuelto en el momento de la llamada.
    """
    numeric = getattr(logging, level.upper(), logging.INFO)

    target_stream = stream if stream is not None else sys.stdout
    handler = logging.StreamHandler(target_stream)
    handler.setFormatter(_JsonFormatter())

    logger.handlers.clear()
    logger.addHandler(handler)
    logger.setLevel(numeric)
    logger.propagate = False


def log_event(
    event: str,
    *,
    level: str = "INFO",
    exc_info: bool = False,
    **safe_kwargs: Any,
) -> None:
    """Emite un evento estructurado. Rechaza claves PHI listadas en `PHI_KEYS`."""
    leaked = PHI_KEYS.intersection(safe_kwargs.keys())
    if leaked:
        raise ValueError(
            "log_event recibió claves PHI prohibidas: "
            f"{sorted(leaked)}. Revisar PHI_KEYS en app/core/logging.py."
        )

    numeric = getattr(logging, level.upper(), logging.INFO)
    extra = {"extra_fields": safe_kwargs} if safe_kwargs else None
    logger.log(numeric, event, extra=extra, exc_info=exc_info)


def hash_id(value: str, length: int = 12) -> str:
    """Hash sha256 truncado para identificadores que no deben loguearse en claro."""
    digest = hashlib.sha256(value.encode("utf-8")).hexdigest()
    return digest[:length]
