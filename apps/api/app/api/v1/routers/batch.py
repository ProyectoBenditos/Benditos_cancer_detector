"""Router para subida y análisis de lotes (batch upload) v2.

Soporta:
- Selección de modo de paciente ('single' vs 'multi')
- Asignación de código de paciente automático 'batch_{n:03d}_{i}' en modo multi
- Carga de imágenes (.png, .jpg) y archivos DICOM (.dcm)
- Generación de Signed URLs y metadatos completos para modal de detalle por ítem
"""

import asyncio
import io
import os
import tempfile
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

import numpy as np
import pydicom
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
)
from PIL import Image

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

ALLOWED_EXTENSIONS = {".dcm", ".png", ".jpg", ".jpeg"}
MAX_FILE_BYTES = 50 * 1024 * 1024  # 50 MB per file

REQUIRED_DICOM_TAGS = [
    "Modality",
    "PatientID",
    "StudyInstanceUID",
    "SOPInstanceUID",
    "Rows",
    "Columns",
]


# ── Helpers ──────────────────────────────────────────────────────────────────

def _safe_float(value: Any) -> Optional[float]:
    try:
        return float(value) if value is not None else None
    except (TypeError, ValueError):
        return None


def dicom_to_png_bytes(file_bytes: bytes) -> bytes:
    """Convierte bytes de DICOM a bytes de PNG."""
    with tempfile.NamedTemporaryFile(delete=False, suffix=".dcm") as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        dataset = pydicom.dcmread(tmp_path)
        pixel_array = dataset.pixel_array.astype(np.float32)

        pixel_min, pixel_max = pixel_array.min(), pixel_array.max()
        if pixel_max > pixel_min:
            pixel_array = (pixel_array - pixel_min) / (pixel_max - pixel_min) * 255.0
        pixel_array = pixel_array.astype(np.uint8)

        pil_img = Image.fromarray(pixel_array).convert("RGB")
        png_buffer = io.BytesIO()
        pil_img.save(png_buffer, format="PNG")
        return png_buffer.getvalue()
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


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


# ── POST /batch ─────────────────────────────────────────────────────────────

@router.post("/batch", status_code=202)
async def create_batch(
    background_tasks: BackgroundTasks,
    imagenes: List[UploadFile] = File(...),
    patient_mode: str = Form("single"),
    patient_id: Optional[str] = Form(None),
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
    """Crea un lote de análisis IA con soporte para imágenes y DICOMs."""

    if not imagenes:
        raise HTTPException(status_code=400, detail="Debes enviar al menos un archivo.")

    if len(imagenes) > BATCH_MAX_ITEMS:
        raise HTTPException(
            status_code=400,
            detail=f"Máximo {BATCH_MAX_ITEMS} archivos por lote. Recibidos: {len(imagenes)}.",
        )

    # Validar patient_mode
    if patient_mode not in ("single", "multi"):
        patient_mode = "single"

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

    # Obtener secuencia del lote del usuario (cantidad previa + 1)
    batch_seq = 1
    try:
        count_resp = (
            supabase.table("batch_jobs")
            .select("id", count="exact")
            .eq("user_id", current_user["id"])
            .execute()
        )
        if count_resp.count is not None:
            batch_seq = count_resp.count + 1
    except Exception:
        pass

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

    items: List[Dict[str, Any]] = []

    for idx, imagen in enumerate(imagenes):
        if not imagen.filename:
            raise HTTPException(
                status_code=400,
                detail=f"Archivo #{idx + 1} no tiene nombre válido.",
            )

        file_ext = os.path.splitext(imagen.filename)[1].lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Archivo '{imagen.filename}': extensión no soportada. Permitidas: .dcm, .png, .jpg, .jpeg",
            )

        contents = await imagen.read()
        if not contents:
            raise HTTPException(
                status_code=400,
                detail=f"Archivo '{imagen.filename}' está vacío.",
            )

        if len(contents) > MAX_FILE_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"Archivo '{imagen.filename}' excede {MAX_FILE_BYTES // (1024 * 1024)} MB.",
            )

        is_dicom = file_ext == ".dcm"
        modality = None
        study_date = None
        original_patient_id_dicom = None

        if is_dicom:
            temp_path = None
            try:
                with tempfile.NamedTemporaryFile(delete=False, suffix=".dcm") as tmp:
                    tmp.write(contents)
                    temp_path = tmp.name

                dataset = pydicom.dcmread(temp_path, stop_before_pixels=True)

                for tag_name in REQUIRED_DICOM_TAGS:
                    val = getattr(dataset, tag_name, None)
                    if val is None or str(val).strip() == "":
                        raise HTTPException(
                            status_code=400,
                            detail=f"DICOM '{imagen.filename}' incompleto: falta el tag {tag_name}.",
                        )

                modality_val = str(dataset.Modality).strip()
                if modality_val != "CT":
                    raise HTTPException(
                        status_code=400,
                        detail=f"Modalidad {modality_val} no soportada en '{imagen.filename}'. OncoScan requiere tomografías (CT).",
                    )

                modality = modality_val
                study_date = str(getattr(dataset, "StudyDate", "")) or None
                original_patient_id_dicom = str(getattr(dataset, "PatientID", "")) or None

            except HTTPException:
                raise
            except Exception as err:
                raise HTTPException(
                    status_code=400,
                    detail=f"Archivo DICOM inválido '{imagen.filename}': {str(err)}",
                )
            finally:
                if temp_path and os.path.exists(temp_path):
                    os.remove(temp_path)
        else:
            modality = "IMG"

        content_type_map = {
            ".dcm": "application/dicom",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
        }
        content_type = content_type_map.get(file_ext, "application/octet-stream")

        # Determinación de patient_id_dicom / patient_id
        if patient_mode == "multi":
            assigned_patient_code = f"batch_{batch_seq:03d}_{idx + 1}"
            assigned_patient_id = None
        else:
            assigned_patient_code = original_patient_id_dicom
            assigned_patient_id = patient_id if patient_id else None

        items.append({
            "filename": imagen.filename,
            "file_ext": file_ext,
            "is_dicom": is_dicom,
            "content_type": content_type,
            "contents": contents,
            "modality": modality,
            "study_date": study_date,
            "patient_id_dicom": assigned_patient_code,
            "patient_id": assigned_patient_id,
        })

    # Crear registro en batch_jobs
    try:
        batch_resp = (
            supabase.table("batch_jobs")
            .insert({
                "user_id": current_user["id"],
                "status": "pending",
                "total_items": len(items),
                "patient_mode": patient_mode,
                "patient_id": patient_id if (patient_mode == "single" and patient_id) else None,
                "batch_sequence": batch_seq,
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
        raise HTTPException(status_code=500, detail="Error creando el registro de lote.")

    batch_rows = getattr(batch_resp, "data", None) or []
    if not batch_rows:
        raise HTTPException(status_code=500, detail="No se obtuvo ID del lote.")

    batch_id = batch_rows[0]["id"]

    # Subir imágenes a Storage y registrar en dicom_uploads
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
            _update_batch_status(batch_id, "failed")
            raise HTTPException(status_code=500, detail="Error subiendo archivos al storage.")

        try:
            insert_resp = (
                supabase.table("dicom_uploads")
                .insert({
                    "user_id": current_user["id"],
                    "original_name": item["filename"],
                    "storage_path": object_name,
                    "file_size": len(item["contents"]),
                    "modality": item["modality"],
                    "study_date": item["study_date"],
                    "patient_id_dicom": item["patient_id_dicom"],
                    "patient_id": item["patient_id"],
                    "upload_status": "queued",
                    "file_type": "dicom" if item["is_dicom"] else "png_analysis",
                    "clinical_features": features,
                    "batch_id": batch_id,
                    "metadata_json": {
                        "filename": item["filename"],
                        "content_type": item["content_type"],
                        "uploaded_by_email": current_user["email"],
                        "batch_id": batch_id,
                        "batch_sequence": batch_seq,
                        "case_ref": f"Batch #{batch_seq:03d}",
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
            raise HTTPException(status_code=500, detail="Error registrando archivos del lote.")

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
        batch_seq=batch_seq,
    )

    return {
        "batch_id": batch_id,
        "batch_sequence": batch_seq,
        "status": "pending",
        "total_items": len(items),
    }


# ── GET /batch/{batch_id} ───────────────────────────────────────────────────

@router.get("/batch/{batch_id}")
async def get_batch_status(
    batch_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Devuelve el estado del lote y sus items con Signed URLs para detalle."""

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
                "id, original_name, storage_path, preview_storage_path, modality, "
                "study_date, patient_id_dicom, upload_status, ai_score, ai_risk_level, "
                "ai_recommendation, ai_heatmap_base64, ai_error, created_at, clinical_features, file_type"
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

    # Generar Signed URLs para previsualización
    for item in items:
        signed_url = None
        before_path = item.get("preview_storage_path") or item.get("storage_path")
        if before_path:
            try:
                signed = supabase.storage.from_(SUPABASE_BUCKET_NAME).create_signed_url(before_path, 3600)
                signed_url = signed.get("signedURL") or signed.get("signedUrl")
            except Exception:
                pass
        item["original_signed_url"] = signed_url

    return {
        "batch": batch,
        "items": items,
    }


# ── GET /batch ──────────────────────────────────────────────────────────────

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


# ── Background Task ──────────────────────────────────────────────────────────

def _process_batch(
    batch_id: str,
    upload_ids: List[str],
    items: List[Dict[str, Any]],
    features: Dict[str, float],
) -> None:
    """Procesa el lote completo en background con concurrencia y reintentos."""
    asyncio.run(_process_batch_async(batch_id, upload_ids, items, features))


async def _process_batch_async(
    batch_id: str,
    upload_ids: List[str],
    items: List[Dict[str, Any]],
    features: Dict[str, float],
) -> None:
    """Orquesta la inferencia del lote."""

    _update_batch_status(batch_id, "processing")
    await _warm_up_hf()

    completed = 0
    failed = 0
    semaphore = asyncio.Semaphore(BATCH_CONCURRENCY)

    async def process_one(upload_id: str, item: Dict[str, Any]) -> None:
        nonlocal completed, failed
        async with semaphore:
            await asyncio.sleep(BATCH_DELAY_BETWEEN_S)

            try:
                supabase.table("dicom_uploads").update(
                    {"upload_status": "processing"}
                ).eq("id", upload_id).execute()
            except Exception:
                pass

            try:
                # Si es DICOM, obtener PNG bytes
                if item["is_dicom"]:
                    png_bytes = dicom_to_png_bytes(item["contents"])
                    content_type = "image/png"
                else:
                    png_bytes = item["contents"]
                    content_type = item["content_type"]

                t0 = time.monotonic()
                payload = await _predict_with_retry(
                    image_bytes=png_bytes,
                    filename=item["filename"],
                    content_type=content_type,
                    features=features,
                )
                inference_ms = int((time.monotonic() - t0) * 1000)
                model_version = os.getenv("HF_MODEL_VERSION", "luisdam-oncoscan-ai@unknown")
                predicted_at = datetime.now(timezone.utc).isoformat()

                preview_path = None
                if item["is_dicom"]:
                    # Guardar preview PNG para renderizado
                    try:
                        storage_path = f"{items[0]['filename']}"  # fallback
                        # Obtener storage_path del registro
                        row_info = supabase.table("dicom_uploads").select("storage_path").eq("id", upload_id).single().execute()
                        if row_info.data:
                            storage_path = row_info.data["storage_path"]
                        preview_path = f"{storage_path}.preview.png"
                        supabase.storage.from_(SUPABASE_BUCKET_NAME).upload(
                            path=preview_path,
                            file=png_bytes,
                            file_options={"content-type": "image/png", "upsert": "true"},
                        )
                    except Exception:
                        pass

                update_data: Dict[str, Any] = {
                    "upload_status": "analyzed",
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
                    "preview_storage_path": preview_path,
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
                        "upload_status": "error",
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

            _update_batch_progress(batch_id, completed, failed)

    tasks = [
        process_one(uid, item)
        for uid, item in zip(upload_ids, items)
    ]
    await asyncio.gather(*tasks, return_exceptions=True)

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


def _update_batch_status(batch_id: str, status: str) -> None:
    try:
        supabase.table("batch_jobs").update(
            {"status": status}
        ).eq("id", batch_id).execute()
    except Exception:
        pass


def _update_batch_progress(batch_id: str, completed: int, failed: int) -> None:
    try:
        supabase.table("batch_jobs").update({
            "completed_items": completed,
            "failed_items": failed,
        }).eq("id", batch_id).execute()
    except Exception:
        pass
