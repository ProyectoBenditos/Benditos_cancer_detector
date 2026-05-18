"""Router para el flujo de analisis IA (PNG + features clinicas)."""

import asyncio
import os
from datetime import datetime, timezone
from typing import Any, Dict, Optional
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

from app.core.config import SUPABASE_BUCKET_NAME
from app.core.security import get_current_user
from app.db.supabase_client import supabase
from app.services.hf_client import HFInferenceError, predict as hf_predict

router = APIRouter()

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg"}
ALLOWED_CONTENT_TYPES = {"image/png", "image/jpeg", "image/jpg"}
MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB


@router.post("/analysis/predict", status_code=202)
async def create_analysis(
    background_tasks: BackgroundTasks,
    imagen: UploadFile = File(...),
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
    """Crea un registro de analisis y dispara la inferencia HF en background."""

    if not imagen.filename:
        raise HTTPException(status_code=400, detail="Imagen no valida")

    file_ext = os.path.splitext(imagen.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Extension no soportada. Permitidas: {sorted(ALLOWED_EXTENSIONS)}",
        )

    content_type = (imagen.content_type or "").lower()
    if content_type and content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Content-Type no soportado: {content_type}",
        )

    contents = await imagen.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Archivo vacio")

    if len(contents) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Imagen excede el limite de {MAX_IMAGE_BYTES // (1024*1024)} MB",
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

    object_name = f"{current_user['id']}/analysis/{uuid4()}_{imagen.filename}"

    try:
        supabase.storage.from_(SUPABASE_BUCKET_NAME).upload(
            path=object_name,
            file=contents,
            file_options={"content-type": content_type or "image/png"},
        )
    except Exception as e:
        print(f"DEBUG EXCEPTION uploading analysis image: {repr(e)}")
        raise HTTPException(status_code=500, detail=f"Error subiendo imagen: {str(e)}")

    try:
        insert_response = supabase.table("dicom_uploads").insert({
            "user_id": current_user["id"],
            "original_name": imagen.filename,
            "storage_path": object_name,
            "file_size": len(contents),
            "modality": None,
            "study_date": None,
            "patient_id_dicom": None,
            "upload_status": "processing",
            "file_type": "png_analysis",
            "clinical_features": features,
            "metadata_json": {
                "filename": imagen.filename,
                "content_type": content_type or "image/png",
                "uploaded_by_email": current_user["email"],
            },
        }).execute()
    except Exception as e:
        print(f"DEBUG EXCEPTION inserting analysis row: {repr(e)}")
        raise HTTPException(status_code=500, detail=f"Error registrando analisis: {str(e)}")

    rows = getattr(insert_response, "data", None) or []
    if not rows:
        raise HTTPException(status_code=500, detail="No se obtuvo id del registro insertado")
    upload_id = rows[0].get("id")
    if not upload_id:
        raise HTTPException(status_code=500, detail="Registro insertado sin id")

    background_tasks.add_task(
        _run_inference,
        upload_id=upload_id,
        image_bytes=contents,
        filename=imagen.filename,
        content_type=content_type or "image/png",
        features=features,
    )

    return {
        "upload_id": upload_id,
        "status": "processing",
    }


@router.get("/analysis/{upload_id}")
async def get_analysis(
    upload_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Devuelve el estado y resultado IA del registro. Usado para polling."""

    try:
        response = (
            supabase.table("dicom_uploads")
            .select(
                "id, user_id, original_name, storage_path, file_size, file_type, "
                "upload_status, clinical_features, ai_score, ai_risk_level, "
                "ai_recommendation, ai_model_version, ai_processed_at, ai_error, "
                "metadata_json, created_at"
            )
            .eq("id", upload_id)
            .eq("user_id", current_user["id"])
            .limit(1)
            .execute()
        )
    except Exception as e:
        print(f"DEBUG EXCEPTION reading analysis row: {repr(e)}")
        raise HTTPException(status_code=500, detail=f"Error consultando registro: {str(e)}")

    rows = getattr(response, "data", None) or []
    if not rows:
        raise HTTPException(status_code=404, detail="Analisis no encontrado")

    return rows[0]


def _run_inference(
    upload_id: str,
    image_bytes: bytes,
    filename: str,
    content_type: str,
    features: Dict[str, float],
) -> None:
    """Tarea de background: llama HF y persiste el resultado en la fila."""

    try:
        payload = asyncio.run(
            hf_predict(
                image_bytes=image_bytes,
                filename=filename,
                content_type=content_type,
                features=features,
            )
        )
        _persist_success(upload_id, payload)
        print(f"DEBUG analysis {upload_id} completed with score={payload.get('score')}")
    except HFInferenceError as e:
        print(f"DEBUG HFInferenceError for {upload_id}: {e}")
        _persist_failure(upload_id, str(e))
    except Exception as e:
        print(f"DEBUG unexpected error in inference for {upload_id}: {repr(e)}")
        _persist_failure(upload_id, f"Error inesperado: {str(e)}")


def _persist_success(upload_id: str, payload: Dict[str, Any]) -> None:
    update: Dict[str, Optional[Any]] = {
        "upload_status": "ai_completed",
        "ai_score": _safe_float(payload.get("score")),
        "ai_risk_level": payload.get("nivel_riesgo"),
        "ai_recommendation": payload.get("recomendacion"),
        "ai_model_version": payload.get("modelo_version"),
        "ai_processed_at": datetime.now(timezone.utc).isoformat(),
        "ai_error": None,
    }
    try:
        supabase.table("dicom_uploads").update(update).eq("id", upload_id).execute()
    except Exception as e:
        print(f"DEBUG persist_success failed for {upload_id}: {repr(e)}")


def _persist_failure(upload_id: str, message: str) -> None:
    update = {
        "upload_status": "ai_failed",
        "ai_error": message[:1000],
        "ai_processed_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        supabase.table("dicom_uploads").update(update).eq("id", upload_id).execute()
    except Exception as e:
        print(f"DEBUG persist_failure failed for {upload_id}: {repr(e)}")


def _safe_float(value: Any) -> Optional[float]:
    try:
        return float(value) if value is not None else None
    except (TypeError, ValueError):
        return None
