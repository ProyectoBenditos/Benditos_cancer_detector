"""Tests del procesamiento en background de /api/v1/analysis/batch."""

from __future__ import annotations


def test_batch_item_fallido_guarda_mensaje_fijo_en_ai_error(supabase_mock, monkeypatch):
    """ai_error nunca guarda el detalle de la excepción (rutas y nombres de archivo son PHI)."""
    import app.api.v1.routers.batch as batch_module

    async def no_warm_up() -> None:
        return None

    def failing_png(file_bytes: bytes) -> bytes:
        raise RuntimeError("user-1/abc_PEREZ_CARLOS.dcm no se pudo leer")

    monkeypatch.setattr(batch_module, "supabase", supabase_mock)
    monkeypatch.setattr(batch_module, "_warm_up_hf", no_warm_up)
    monkeypatch.setattr(batch_module, "BATCH_DELAY_BETWEEN_S", 0)
    monkeypatch.setattr(batch_module, "dicom_to_png_bytes", failing_png)

    item = {"is_dicom": True, "contents": b"x", "filename": "PEREZ_CARLOS.dcm"}
    batch_module._process_batch("batch-1", ["upload-1"], [item], {})

    errors = [
        c.args[0]["ai_error"]
        for c in supabase_mock.table().update.call_args_list
        if c.args and "ai_error" in c.args[0]
    ]
    assert errors == ["No se pudo analizar este estudio del lote."]
