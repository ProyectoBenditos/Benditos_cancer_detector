import io
import os
import tempfile
from datetime import datetime, timezone
from uuid import uuid4

import httpx
import numpy as np
import pydicom
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from PIL import Image
from pydantic import BaseModel

from app.core.config import SUPABASE_BUCKET_NAME
from app.core.security import get_current_user
from app.db.supabase_client import supabase

router = APIRouter()

ALLOWED_EXTENSIONS = {".dcm", ".png", ".jpg", ".jpeg"}


class ClinicalFeatures(BaseModel):
    subtlety:      float = 3.0
    calcification: float = 6.0
    sphericity:    float = 4.0
    margin:        float = 4.0
    lobulation:    float = 1.0
    spiculation:   float = 1.0
    texture:       float = 5.0
    malignancy:    float = 3.0


def dicom_to_png_bytes(file_bytes: bytes) -> bytes:
    """Convierte bytes de DICOM a bytes de PNG."""
    with tempfile.NamedTemporaryFile(delete=False, suffix=".dcm") as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        dataset     = pydicom.dcmread(tmp_path)
        pixel_array = dataset.pixel_array.astype(np.float32)

        pixel_min, pixel_max = pixel_array.min(), pixel_array.max()
        if pixel_max > pixel_min:
            pixel_array = (pixel_array - pixel_min) / (pixel_max - pixel_min) * 255.0
        pixel_array = pixel_array.astype(np.uint8)

        pil_img    = Image.fromarray(pixel_array).convert("RGB")
        png_buffer = io.BytesIO()
        pil_img.save(png_buffer, format="PNG")
        return png_buffer.getvalue()
    finally:
        os.remove(tmp_path)


@router.post("/dicom/upload")
async def upload_dicom(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Archivo no válido")

    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Formato no soportado. Use .dcm, .png o .jpg"
        )

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Archivo vacío")

    # Determinar tipo de archivo
    is_dicom = file_ext == ".dcm"

    # Extraer metadatos según tipo
    modality         = None
    study_date       = None
    patient_id_dicom = None
    temp_path        = None

    try:
        if is_dicom:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".dcm") as tmp:
                tmp.write(contents)
                temp_path = tmp.name

            dataset          = pydicom.dcmread(temp_path, stop_before_pixels=True)
            modality         = str(getattr(dataset, "Modality",  "")) or None
            study_date       = str(getattr(dataset, "StudyDate", "")) or None
            patient_id_dicom = str(getattr(dataset, "PatientID", "")) or None
        else:
            # Para PNG/JPG indicamos que es imagen directa
            modality = "IMG"

        # Determinar content-type para storage
        content_type_map = {
            ".dcm":  "application/dicom",
            ".png":  "image/png",
            ".jpg":  "image/jpeg",
            ".jpeg": "image/jpeg",
        }
        content_type = content_type_map.get(file_ext, "application/octet-stream")

        object_name = f"{current_user['id']}/{uuid4()}_{file.filename}"

        supabase.storage.from_(SUPABASE_BUCKET_NAME).upload(
            path=object_name,
            file=contents,
            file_options={"content-type": content_type},
        )

        row = supabase.table("dicom_uploads").insert({
            "user_id":          current_user["id"],
            "original_name":    file.filename,
            "storage_path":     object_name,
            "file_size":        len(contents),
            "modality":         modality,
            "study_date":       study_date,
            "patient_id_dicom": patient_id_dicom,
            "upload_status":    "uploaded",
            "file_type":        "dicom" if is_dicom else "image",
            "metadata_json": {
                "filename":          file.filename,
                "content_type":      file.content_type,
                "uploaded_by_email": current_user["email"],
                "file_ext":          file_ext,
            },
        }).execute()

        dicom_id = row.data[0]["id"] if row.data else None

        return {
            "message":          "Archivo cargado correctamente",
            "dicom_id":         dicom_id,
            "user_id":          current_user["id"],
            "filename":         file.filename,
            "storage_path":     object_name,
            "modality":         modality,
            "study_date":       study_date,
            "patient_id_dicom": patient_id_dicom,
            "file_type":        "dicom" if is_dicom else "image",
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"DEBUG EXCEPTION IN dicom.py upload: {repr(e)}")
        raise HTTPException(status_code=500, detail=f"Error procesando archivo: {str(e)}")

    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


@router.post("/dicom/analyze/{dicom_id}")
async def analyze_dicom(
    dicom_id: str,
    features: ClinicalFeatures,
    current_user: dict = Depends(get_current_user),
):
    # 1. Buscar el registro en Supabase
    result = supabase.table("dicom_uploads")\
        .select("*")\
        .eq("id", dicom_id)\
        .eq("user_id", current_user["id"])\
        .single()\
        .execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    record       = result.data
    storage_path = record["storage_path"]
    file_ext     = os.path.splitext(record["original_name"])[1].lower()
    is_dicom     = file_ext == ".dcm"

    try:
        # 2. Descargar el archivo de Supabase Storage
        file_bytes = supabase.storage.from_(SUPABASE_BUCKET_NAME).download(storage_path)

        # 3. Preparar PNG para el modelo
        if is_dicom:
            # Convertir DICOM → PNG
            png_bytes = dicom_to_png_bytes(file_bytes)
        else:
            # PNG/JPG: convertir a RGB por si acaso y recodificar como PNG
            pil_img    = Image.open(io.BytesIO(file_bytes)).convert("RGB")
            png_buffer = io.BytesIO()
            pil_img.save(png_buffer, format="PNG")
            png_bytes  = png_buffer.getvalue()

        # 4. Llamar al modelo en Hugging Face
        hf_url  = f"{os.getenv('HF_API_BASE_URL', 'https://luisdam-oncoscan-ai.hf.space')}/predict"
        timeout = float(os.getenv("HF_PREDICT_TIMEOUT", "120"))

        files = {"imagen": ("imagen.png", png_bytes, "image/png")}
        data  = {
            "subtlety":      str(features.subtlety),
            "calcification": str(features.calcification),
            "sphericity":    str(features.sphericity),
            "margin":        str(features.margin),
            "lobulation":    str(features.lobulation),
            "spiculation":   str(features.spiculation),
            "texture":       str(features.texture),
            "malignancy":    str(features.malignancy),
        }

        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(hf_url, files=files, data=data)
            response.raise_for_status()
            ai_result = response.json()

        # 5. Guardar resultado en Supabase
        supabase.table("dicom_uploads").update({
            "ai_score":          ai_result.get("score"),
            "ai_risk_level":     ai_result.get("nivel_riesgo"),
            "ai_recommendation": ai_result.get("recomendacion"),
            "ai_model_version":  ai_result.get("modelo_version"),
            "ai_processed_at":   datetime.now(timezone.utc).isoformat(),
            "ai_error":          None,
            "upload_status":     "analyzed",
            "clinical_features": features.model_dump(),
        }).eq("id", dicom_id).execute()

        # 6. Devolver resultado al frontend
        return {
            "dicom_id":       dicom_id,
            "score":          ai_result.get("score"),
            "nivel_riesgo":   ai_result.get("nivel_riesgo"),
            "recomendacion":  ai_result.get("recomendacion"),
            "modelo_version": ai_result.get("modelo_version"),
        }

    except httpx.HTTPError as e:
        supabase.table("dicom_uploads").update({
            "ai_error":      str(e),
            "upload_status": "error",
        }).eq("id", dicom_id).execute()
        raise HTTPException(status_code=502, detail=f"Error llamando al modelo: {str(e)}")

    except Exception as e:
        supabase.table("dicom_uploads").update({
            "ai_error":      str(e),
            "upload_status": "error",
        }).eq("id", dicom_id).execute()
        raise HTTPException(status_code=500, detail=f"Error en análisis: {str(e)}")