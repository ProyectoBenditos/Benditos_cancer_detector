"""Router para subida y análisis de lotes (batch upload)."""

import asyncio
import os
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
)

from app.core.config import HF_API_BASE_URL, SUPABASE_BUCKET_NAME
from app.core.logging import hash_id, log_event
from app.core.security import get_current_user
from app.db.supabase_client import supabase
from app.services.hf_client import HFInferenceError, predict as hf_predict

router = APIRouter()

# ── Configuración de lotes ───────────────────────────────────────────────────
BATCH_MAX_ITEMS = 20
BATCH_CONCURRENCY = 2
BATCH_DELAY_BETWEEN_S = 0.5
BATCH_HF_TIMEOUT = 150.0
BATCH_MAX_RETRIES = 2

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg"}
ALLOWED_CONTENT_TYPES = {"image/png", "image/jpeg", "image/jpg"}
MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB per image


# ── Helpers ──────────────────────────────────────────────────────────────────

def _safe_float(value: Any) -> Optional[float]:
    try:
        return float(value) if value is not None else None
    except (TypeError, ValueError):
        return None


async def _warm_up_hf() -> None:
    """Ping al health endpoint del Space para despertarlo antes del lote."""
    import httpx

    url = f"{HF_API_BASE_URL.rstrip('/')}/health"
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            await client.get(url)
        log_event("hf_warmup_ok")
    except Exception:
        log_event("hf_warmup_failed", level="WARNING")


async def _predict_with_retry(
    image_bytes: bytes,
    filename: str,
    content_type: str,
    features: Dict[str, float],
    max_retries: int = BATCH_MAX_RETRIES,
) -> Dict:
    """Llama a hf_predict con reintentos para cold-start."""
    last_err: Optional[Exception] = None
    for attempt in range(1, max_retries + 1):
        try:
            return await hf_predict(
                image_bytes=image_bytes,
                filename=filename,
                content_type=content_type,
                features=features,
            )
        except HFInferenceError as e:
            last_err = e
            if attempt < max_retries:
                log_event(
                    "batch_retry",
                    level="WARNING",
                    attempt=attempt,
                    max_retries=max_retries,
                )
                await asyncio.sleep(2 ** attempt)
            else:
                raise
    raise last_err  # type: ignore[misc]


# ── POST /analysis/batch ─────────────────────────────────────────────────────

@router.post("/batch", status_code=202)
async def create_batch(
    background_tasks: BackgroundTasks,
    imagenes: List[UploadFile] = File(...),
    subtlety: float = Form(..., ge=1, le=5),
    calcification: float = Form(..., ge=1, le=6),
    sphericity: float = Form(..., ge=1, le=5),
    margin: float = Form(..., ge=1, le=5),
    lobulation: float = Form(..., ge=1, le=5),
    spiculation: float = Form(..., ge=1, le=5),
    texture: float = Form(..., ge=1, le=5),
    malignancy: float = Form(..., ge=1, le=5),
    current_user: dict = Depends(get_current_user),
):
    """Crea un lote de análisis IA con features clínicas compartidas."""

    if not imagenes:
        raise HTTPException(status_code=400, detail="Debes enviar al menos una imagen.")

    if len(imagenes) > BATCH_MAX_ITEMS:
        raise HTTPException(
            status_code=400,
            detail=f"Máximo {BATCH_MAX_ITEMS} imágenes por lote. Recibidas: {len(imagenes)}.",
        )

    # Verificar que no hay un lote activo para este usuario
    try:
        active_check = (
            supabase.table("batch_jobs")
            .select("id")
            .eq("user_id", current_user["id"])
            .in_("status", ["pending", "processing"])
            .limit(1)
            .execute()
        )
        if getattr(active_check, "data", None):
            raise HTTPException(
                status_code=409,
                detail="Ya tienes un lote en proceso. Espera a que termine antes de crear otro.",
            )
    except HTTPException:
        raise
    except Exception as e:
        log_event(
            "batch_active_check_failed",
            level="ERROR",
            exc_info=True,
            error_type=type(e).__name__,
        )

    features = {
        "subtlety": subtlety,
        "calcification": calcification,
        "sphericity": sphericity,
        "margin": margin,
        "lobulation": lobulation,
        "spiculation": spiculation,
        "texture": texture,
        "malignancy": malignancy,
    }

    # Validar y leer todas las imágenes antes de crear registros
    items: List[Dict[str, Any]] = []
    total_bytes = 0

    for idx, imagen in enumerate(imagenes):
        if not imagen.filename:
            raise HTTPException(
                status_code=400,
                detail=f"Imagen #{idx + 1} no tiene nombre válido.",
            )

        file_ext = os.path.splitext(imagen.filename)[1].lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Imagen '{imagen.filename}': extensión no soportada. Permitidas: {sorted(ALLOWED_EXTENSIONS)}.",
            )

        ct = (imagen.content_type or "").lower()
        if ct and ct not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Imagen '{imagen.filename}': Content-Type no soportado.",
            )

        contents = await imagen.read()
        if not contents:
            raise HTTPException(
                status_code=400,
                detail=f"Imagen '{imagen.filename}' está vacía.",
            )

        if len(contents) > MAX_IMAGE_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"Imagen '{imagen.filename}' excede {MAX_IMAGE_BYTES // (1024 * 1024)} MB.",
            )

        total_bytes += len(contents)
        items.append({
            "filename": imagen.filename,
            "content_type": ct or "image/png",
            "contents": contents,
        })

    # Crear batch_job
    try:
        batch_resp = (
            supabase.table("batch_jobs")
            .insert({
                "user_id": current_user["id"],
                "status": "pending",
                "total_items": len(items),
            })
            .execute()
        )
    except Exception as e:
        log_event(
            "batch_create_failed",
            level="ERROR",
            exc_info=True,
            error_type=type(e).__name__,
        )
        raise HTTPException(status_code=500, detail="Error creando el lote.")

    batch_rows = getattr(batch_resp, "data", None) or []
    if not batch_rows:
        raise HTTPException(status_code=500, detail="No se obtuvo ID del lote.")

    batch_id = batch_rows[0]["id"]

    # Subir imágenes a Storage y crear registros en dicom_uploads
    upload_ids: List[str] = []

    for item in items:
        object_name = f"{current_user['id']}/batch/{batch_id}/{uuid4()}_{item['filename']}"

        try:
            supabase.storage.from_(SUPABASE_BUCKET_NAME).upload(
                path=object_name,
                file=item["contents"],
                file_options={"content-type": item["content_type"]},
            )
        except Exception as e:
            log_event(
                "batch_storage_upload_failed",
                level="ERROR",
                exc_info=True,
                error_type=type(e).__name__,
            )
            # Marcar el lote como fallido si no podemos subir los archivos
            _update_batch_status(batch_id, "failed")
            raise HTTPException(status_code=500, detail="Error subiendo imágenes al storage.")

        try:
            insert_resp = (
                supabase.table("dicom_uploads")
                .insert({
                    "user_id": current_user["id"],
                    "original_name": item["filename"],
                    "storage_path": object_name,
                    "file_size": len(item["contents"]),
                    "modality": None,
                    "study_date": None,
                    "patient_id_dicom": None,
                    "upload_status": "queued",
                    "file_type": "png_analysis",
                    "clinical_features": features,
                    "batch_id": batch_id,
                    "metadata_json": {
                        "filename": item["filename"],
                        "content_type": item["content_type"],
                        "uploaded_by_email": current_user["email"],
                        "batch_id": batch_id,
                    },
                })
                .execute()
            )
        except Exception as e:
            log_event(
                "batch_insert_failed",
                level="ERROR",
                exc_info=True,
                error_type=type(e).__name__,
            )
            _update_batch_status(batch_id, "failed")
            raise HTTPException(status_code=500, detail="Error registrando imágenes del lote.")

        rows = getattr(insert_resp, "data", None) or []
        if rows:
            upload_ids.append(rows[0]["id"])

    # Disparar procesamiento en background
    background_tasks.add_task(
        _process_batch,
        batch_id=batch_id,
        upload_ids=upload_ids,
        items=items,
        features=features,
    )

    log_event(
        "batch_created",
        batch_id_hash=hash_id(batch_id),
        total_items=len(items),
    )

    return {
        "batch_id": batch_id,
        "status": "pending",
        "total_items": len(items),
    }


# ── GET /analysis/batch/{batch_id} ───────────────────────────────────────────

@router.get("/batch/{batch_id}")
async def get_batch_status(
    batch_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Devuelve el estado del lote y sus items para polling."""

    try:
        batch_resp = (
            supabase.table("batch_jobs")
            .select("*")
            .eq("id", batch_id)
            .eq("user_id", current_user["id"])
            .limit(1)
            .execute()
        )
    except Exception as e:
        log_event(
            "batch_read_failed",
            level="ERROR",
            exc_info=True,
            error_type=type(e).__name__,
        )
        raise HTTPException(status_code=500, detail="Error consultando el lote.")

    batch_rows = getattr(batch_resp, "data", None) or []
    if not batch_rows:
        raise HTTPException(status_code=404, detail="Lote no encontrado.")

    batch = batch_rows[0]

    # Obtener items del lote
    try:
        items_resp = (
            supabase.table("dicom_uploads")
            .select(
                "id, original_name, upload_status, ai_score, ai_risk_level, "
                "ai_recommendation, ai_error, created_at"
            )
            .eq("batch_id", batch_id)
            .eq("user_id", current_user["id"])
            .order("created_at", desc=False)
            .execute()
        )
    except Exception as e:
        log_event(
            "batch_items_read_failed",
            level="ERROR",
            exc_info=True,
            error_type=type(e).__name__,
        )
        raise HTTPException(status_code=500, detail="Error consultando items del lote.")

    items = getattr(items_resp, "data", None) or []

    return {
        "batch": batch,
        "items": items,
    }


# ── GET /analysis/batch ──────────────────────────────────────────────────────

@router.get("/batch")
async def list_batches(
    current_user: dict = Depends(get_current_user),
):
    """Devuelve historial de lotes del usuario."""

    try:
        resp = (
            supabase.table("batch_jobs")
            .select("*")
            .eq("user_id", current_user["id"])
            .order("created_at", desc=True)
            .limit(50)
            .execute()
        )
    except Exception as e:
        log_event(
            "batch_list_failed",
            level="ERROR",
            exc_info=True,
            error_type=type(e).__name__,
        )
        raise HTTPException(status_code=500, detail="Error consultando lotes.")

    return getattr(resp, "data", None) or []


# ── Background task ──────────────────────────────────────────────────────────

def _process_batch(
    batch_id: str,
    upload_ids: List[str],
    items: List[Dict[str, Any]],
    features: Dict[str, float],
) -> None:
    """Procesa el lote completo en background con throttling."""
    asyncio.run(_process_batch_async(batch_id, upload_ids, items, features))


async def _process_batch_async(
    batch_id: str,
    upload_ids: List[str],
    items: List[Dict[str, Any]],
    features: Dict[str, float],
) -> None:
    """Orquesta la inferencia del lote con concurrencia limitada."""

    _update_batch_status(batch_id, "processing")

    # Paso 1: despertar HF Space
    await _warm_up_hf()

    completed = 0
    failed = 0
    semaphore = asyncio.Semaphore(BATCH_CONCURRENCY)

    async def process_one(upload_id: str, item: Dict[str, Any]) -> None:
        nonlocal completed, failed
        async with semaphore:
            await asyncio.sleep(BATCH_DELAY_BETWEEN_S)

            # Marcar como processing
            try:
                supabase.table("dicom_uploads").update(
                    {"upload_status": "processing"}
                ).eq("id", upload_id).execute()
            except Exception:
                pass

            try:
                t0 = time.monotonic()
                payload = await _predict_with_retry(
                    image_bytes=item["contents"],
                    filename=item["filename"],
                    content_type=item["content_type"],
                    features=features,
                )
                inference_ms = int((time.monotonic() - t0) * 1000)
                model_version = os.getenv("HF_MODEL_VERSION", "luisdam-oncoscan-ai@unknown")
                predicted_at = datetime.now(timezone.utc).isoformat()

                update_data: Dict[str, Any] = {
                    "upload_status": "ai_completed",
                    "ai_score": _safe_float(payload.get("score")),
                    "ai_risk_level": payload.get("nivel_riesgo"),
                    "ai_recommendation": payload.get("recomendacion"),
                    "ai_model_version": payload.get("modelo_version"),
                    "ai_processed_at": datetime.now(timezone.utc).isoformat(),
                    "ai_error": None,
                    "model_version": model_version,
                    "inference_time_ms": inference_ms,
                    "predicted_at": predicted_at,
                    "ai_heatmap_base64": payload.get("heatmap_base64"),
                }

                supabase.table("dicom_uploads").update(
                    update_data
                ).eq("id", upload_id).execute()

                completed += 1
                log_event(
                    "batch_item_completed",
                    upload_id_hash=hash_id(upload_id),
                    batch_id_hash=hash_id(batch_id),
                    inference_time_ms=inference_ms,
                )

            except Exception as e:
                failed += 1
                error_msg = str(e)[:1000]
                try:
                    supabase.table("dicom_uploads").update({
                        "upload_status": "ai_failed",
                        "ai_error": error_msg,
                        "ai_processed_at": datetime.now(timezone.utc).isoformat(),
                    }).eq("id", upload_id).execute()
                except Exception:
                    pass

                log_event(
                    "batch_item_failed",
                    level="ERROR",
                    upload_id_hash=hash_id(upload_id),
                    batch_id_hash=hash_id(batch_id),
                    error_type=type(e).__name__,
                )

            # Actualizar progreso del lote
            _update_batch_progress(batch_id, completed, failed)

    # Ejecutar con concurrencia limitada
    tasks = [
        process_one(uid, item)
        for uid, item in zip(upload_ids, items)
    ]
    await asyncio.gather(*tasks, return_exceptions=True)

    # Estado final del lote
    total = len(items)
    if failed == total:
        final_status = "failed"
    elif failed > 0:
        final_status = "partial"
    else:
        final_status = "completed"

    try:
        supabase.table("batch_jobs").update({
            "status": final_status,
            "completed_items": completed,
            "failed_items": failed,
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", batch_id).execute()
    except Exception as e:
        log_event(
            "batch_final_update_failed",
            level="ERROR",
            exc_info=True,
            batch_id_hash=hash_id(batch_id),
            error_type=type(e).__name__,
        )

    log_event(
        "batch_finished",
        batch_id_hash=hash_id(batch_id),
        final_status=final_status,
        completed_count=completed,
        failed_count=failed,
        total=total,
    )


def _update_batch_status(batch_id: str, status: str) -> None:
    try:
        supabase.table("batch_jobs").update(
            {"status": status}
        ).eq("id", batch_id).execute()
    except Exception as e:
        log_event(
            "batch_status_update_failed",
            level="ERROR",
            batch_id_hash=hash_id(batch_id),
            error_type=type(e).__name__,
        )


def _update_batch_progress(batch_id: str, completed: int, failed: int) -> None:
    try:
        supabase.table("batch_jobs").update({
            "completed_items": completed,
            "failed_items": failed,
        }).eq("id", batch_id).execute()
    except Exception as e:
        log_event(
            "batch_progress_update_failed",
            level="ERROR",
            batch_id_hash=hash_id(batch_id),
            error_type=type(e).__name__,
        )
