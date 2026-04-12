import os
import tempfile
from uuid import uuid4

import pydicom
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.core.config import SUPABASE_BUCKET_NAME
from app.core.security import get_current_user
from app.db.supabase_client import supabase

router = APIRouter()


@router.post("/dicom/upload")
async def upload_dicom(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Archivo no válido")

    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext != ".dcm":
        raise HTTPException(status_code=400, detail="El archivo debe tener extensión .dcm")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Archivo vacío")

    temp_path = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".dcm") as temp_file:
            temp_file.write(contents)
            temp_path = temp_file.name

        dataset = pydicom.dcmread(temp_path, stop_before_pixels=True)

        modality = str(getattr(dataset, "Modality", "")) or None
        study_date = str(getattr(dataset, "StudyDate", "")) or None
        patient_id_dicom = str(getattr(dataset, "PatientID", "")) or None

        object_name = f"{current_user['id']}/{uuid4()}_{file.filename}"

        supabase.storage.from_(SUPABASE_BUCKET_NAME).upload(
            path=object_name,
            file=contents,
            file_options={"content-type": "application/dicom"},
        )

        supabase.table("dicom_uploads").insert({
            "user_id": current_user["id"],
            "original_name": file.filename,
            "storage_path": object_name,
            "file_size": len(contents),
            "modality": modality,
            "study_date": study_date,
            "patient_id_dicom": patient_id_dicom,
            "upload_status": "uploaded",
            "metadata_json": {
                "filename": file.filename,
                "content_type": file.content_type,
                "uploaded_by_email": current_user["email"],
            },
        }).execute()

        return {
            "message": "DICOM cargado correctamente",
            "user_id": current_user["id"],
            "filename": file.filename,
            "storage_path": object_name,
            "modality": modality,
            "study_date": study_date,
            "patient_id_dicom": patient_id_dicom,
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"DEBUG EXCEPTION IN dicom.py: {repr(e)}")
        raise HTTPException(status_code=500, detail=f"Error procesando DICOM: {str(e)}")

    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)