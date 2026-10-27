import base64
import io
import os
import tempfile
import time
import zipfile
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple
from uuid import uuid4

import httpx
import numpy as np
import pydicom
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from PIL import Image
from pydantic import BaseModel

from app.core.config import SUPABASE_BUCKET_NAME
from app.core.deidentifier import deidentify_dicom_bytes
from app.services.nifti_deid import deidentify_nifti_bytes
from app.core.logging import hash_id, log_event
from app.core.security import get_current_user
from app.db.supabase_client import supabase
from app.services.ai_contract import (
    ai_input_mode,
    build_inference_file,
    normalize_ai_response,
    post_predict,
)
from app.services.ct_window import apply_lung_window_hu, dicom_to_png_bytes
from app.services.dicom_series import MAX_UPLOAD_BYTES, SeriesError, read_ct_series
from app.services.upload_types import (
    VOLUME_KINDS,
    VOLUME_UPLOADS_DISABLED_DETAIL,
    classify_upload,
    kind_of_record,
    volume_uploads_enabled,
)
from app.services.volume_geometry import dicom_volume_metadata

router = APIRouter()

REQUIRED_DICOM_TAGS = [
    "Modality",
    "PatientID",
    "StudyInstanceUID",
    "SOPInstanceUID",
    "Rows",
    "Columns",
]


class ClinicalFeatures(BaseModel):
    subtlety: float = 3.0
    calcification: float = 6.0
    sphericity: float = 4.0
    margin: float = 4.0
    lobulation: float = 1.0
    spiculation: float = 1.0
    texture: float = 5.0
    malignancy: float = 3.0
    lobar_location: Optional[str] = None


@router.post("/dicom/upload")
async def upload_dicom(
    file: UploadFile = File(...),
    case_ref: str = Form(""),
    patient_id: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Archivo no válido")

    file_ext = os.path.splitext(file.filename)[1].lower()
    upload_kind = classify_upload(file.filename)
    if upload_kind is None:
        raise HTTPException(
            status_code=400,
            detail="Formato no soportado. Use .dcm, .zip, .nii, .nii.gz, .png o .jpg"
        )
    # Antes de leer el archivo: un volumen ocupa varias veces su tamaño en RAM.
    if upload_kind in VOLUME_KINDS and not volume_uploads_enabled():
        raise HTTPException(status_code=400, detail=VOLUME_UPLOADS_DISABLED_DETAIL)

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Archivo vacío")
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="El archivo supera el máximo de 50 MB.")

    is_dicom = upload_kind == "dicom"
    is_zip = upload_kind == "dicom_series"
    is_nifti = upload_kind == "nifti_volume"
    modality = None
    study_date = None
    patient_id_dicom = None
    audit_deid = None
    volume_meta = None
    preview_bytes = None

    try:
        # ── Caso A: Archivo .ZIP con Serie de Cortes DICOM ────────────────────
        if is_zip:
            try:
                extracted_slices = read_ct_series(contents)
            except SeriesError as series_err:
                raise HTTPException(status_code=400, detail=str(series_err))

            num_slices = len(extracted_slices)

            first_ds = extracted_slices[0][2]
            modality = "CT"
            study_date = str(getattr(first_ds, "StudyDate", "")) or None

            # Desidentificar cada corte y re-empaquetar en zip saneado
            cleaned_zip_buf = io.BytesIO()
            clean_slice_entries = []
            with zipfile.ZipFile(cleaned_zip_buf, "w", compression=zipfile.ZIP_DEFLATED) as clean_zf:
                for idx, (z_coord, s_bytes, _) in enumerate(extracted_slices):
                    c_bytes, s_audit = deidentify_dicom_bytes(s_bytes)
                    clean_zf.writestr(f"slice_{idx:04d}.dcm", c_bytes)
                    clean_slice_entries.append((z_coord, c_bytes))
                    if idx == 0:
                        audit_deid = s_audit
                        patient_id_dicom = s_audit["pseudonymized_patient_id"]

            contents = cleaned_zip_buf.getvalue()

            # Metadata del volumen 3D
            volume_meta = dicom_volume_metadata([item[2] for item in extracted_slices])

            # Generar preview del corte central
            mid_idx = num_slices // 2
            preview_bytes = dicom_to_png_bytes(clean_slice_entries[mid_idx][1])

        # ── Caso B: Archivo DICOM Individual (.DCM) ───────────────────────────
        elif is_dicom:
            temp_path = None
            with tempfile.NamedTemporaryFile(delete=False, suffix=".dcm") as tmp:
                tmp.write(contents)
                temp_path = tmp.name

            try:
                try:
                    dataset = pydicom.dcmread(temp_path, stop_before_pixels=True)
                except Exception:
                    raise HTTPException(
                        status_code=400,
                        detail="Archivo DICOM inválido o corrupto. Verifica que sea una tomografía de tórax.",
                    )

                for tag_name in REQUIRED_DICOM_TAGS:
                    val = getattr(dataset, tag_name, None)
                    if val is None or str(val).strip() == "":
                        raise HTTPException(
                            status_code=400,
                            detail=f"DICOM incompleto: falta el tag {tag_name}.",
                        )

                modality_val = str(dataset.Modality).strip()
                if modality_val != "CT":
                    raise HTTPException(
                        status_code=400,
                        detail=f"Modalidad {modality_val} no soportada. OncoScan procesa únicamente tomografías de tórax (CT).",
                    )

                modality = modality_val
                study_date = str(getattr(dataset, "StudyDate", "")) or None

                # Desidentificación clínica DICOM PS 3.15 Anexo E
                clean_bytes, audit_deid = deidentify_dicom_bytes(contents)
                contents = clean_bytes
                patient_id_dicom = audit_deid["pseudonymized_patient_id"]
                preview_bytes = dicom_to_png_bytes(contents)
                volume_meta = dicom_volume_metadata([pydicom.dcmread(io.BytesIO(contents), stop_before_pixels=True)])
            finally:
                if temp_path and os.path.exists(temp_path):
                    os.remove(temp_path)

        # ── Caso C: Volumen NIfTI (.NII / .NII.GZ) ────────────────────────────
        elif is_nifti:
            temp_path = None
            is_gz = file.filename.lower().endswith(".gz")
            suffix_nii = ".nii.gz" if is_gz else ".nii"
            try:
                contents, audit_deid = deidentify_nifti_bytes(contents, gzipped=is_gz)
            except ValueError as nii_err:
                raise HTTPException(status_code=400, detail=str(nii_err))
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix_nii) as tmp:
                tmp.write(contents)
                temp_path = tmp.name

            try:
                import nibabel as nib
                nii_obj = nib.as_closest_canonical(nib.load(temp_path, mmap=False))
                vol_data = nii_obj.get_fdata(dtype=np.float32)
                if vol_data.ndim == 4:
                    vol_data = vol_data[:, :, :, 0]
                if vol_data.ndim != 3:
                    raise HTTPException(status_code=400, detail="El volumen NIfTI debe ser tridimensional (3D).")

                # Eje axial Z (RAS estándar)
                num_slices = vol_data.shape[2]
                slices_px = []
                for s in range(num_slices):
                    # Canonical RAS [x,y,z] -> DICOM-like LPS image [row,column].
                    s_hu = vol_data[::-1, ::-1, s].T
                    slices_px.append(apply_lung_window_hu(s_hu))

                zooms = nii_obj.header.get_zooms()
                pixel_spacing = [float(zooms[1]), float(zooms[0])]
                slice_thickness = float(zooms[2]) if len(zooms) >= 3 else 1.25

                modality = "CT"
                study_date = datetime.now(timezone.utc).strftime("%Y%m%d")
                patient_id_dicom = audit_deid["pseudonymized_patient_id"]

                mid_idx = num_slices // 2
                mid_img = Image.fromarray(slices_px[mid_idx]).convert("RGB")
                p_buf = io.BytesIO()
                mid_img.save(p_buf, format="PNG")
                preview_bytes = p_buf.getvalue()

                volume_meta = {
                    "is_multislice": True,
                    "num_slices": num_slices,
                    "slice_thickness_mm": slice_thickness,
                    "slice_spacing": slice_thickness,
                    "slice_thickness": slice_thickness,
                    "pixel_spacing": pixel_spacing,
                    "rows": vol_data.shape[1],
                    "columns": vol_data.shape[0],
                    "matrix": [vol_data.shape[1], vol_data.shape[0]],
                    "slice_order": "inferior_to_superior",
                    "intensity_encoding": "lung_window_uint8",
                    "hu_min": -1350.0,
                    "hu_max": 150.0,
                    "format": "NIfTI-1",
                    "geometry_error": None if np.allclose(nii_obj.affine[:3, :3], np.diag(zooms[:3]), atol=1e-4)
                    else "El volumen NIfTI es oblicuo; requiere remuestreo axial antes del renderizado 3D.",
                    "window_center": -600.0,
                    "window_width": 1500.0,
                }
                file_type = "nifti_volume"
            finally:
                if temp_path and os.path.exists(temp_path):
                    os.remove(temp_path)

        # ── Caso D: Imagen Estándar (.PNG / .JPG) ─────────────────────────────
        else:
            modality = "IMG"
            preview_bytes = contents

        # ── Persistencia en Supabase Storage ──────────────────────────────────
        content_type_map = {
            ".dcm": "application/dicom",
            ".zip": "application/zip",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".nii": "application/octet-stream",
            ".gz": "application/gzip",
        }
        content_type = content_type_map.get(file_ext, "application/octet-stream")
        file_type = upload_kind

        object_name = f"{current_user['id']}/{uuid4()}_{file.filename}"

        supabase.storage.from_(SUPABASE_BUCKET_NAME).upload(
            path=object_name,
            file=contents,
            file_options={"content-type": content_type},
        )

        preview_storage_path = None
        metadata_dict = {
            "filename": file.filename,
            "content_type": file.content_type,
            "uploaded_by_email": current_user["email"],
            "file_ext": file_ext,
            "case_ref": case_ref or None,
            "deidentified": is_dicom or is_zip or is_nifti,
            "deidentified_at": audit_deid["deidentified_at"] if audit_deid else None,
            "tags_cleared": audit_deid["tags_cleared_count"] if audit_deid else 0,
            "source_sha256": audit_deid["source_sha256"] if audit_deid else None,
            "sanitized_sha256": audit_deid["sanitized_sha256"] if audit_deid else None,
            "audit_summary": audit_deid if audit_deid else None,
            "volume_metadata": volume_meta,
        }

        row = supabase.table("dicom_uploads").insert({
            "user_id": current_user["id"],
            "original_name": file.filename,
            "storage_path": object_name,
            "preview_storage_path": preview_storage_path,
            "file_size": len(contents),
            "modality": modality,
            "study_date": study_date,
            "patient_id_dicom": patient_id_dicom,
            "patient_id": patient_id or None,
            "upload_status": "uploaded",
            "file_type": file_type,
            "metadata_json": metadata_dict,
        }).execute()

        dicom_id = row.data[0]["id"] if row.data else None

        if (is_dicom or is_zip or is_nifti) and dicom_id and audit_deid:
            try:
                supabase.table("dicom_anonymization_audit").insert({
                    "upload_id": dicom_id,
                    "user_id": current_user["id"],
                    "pseudonymized_patient_id": audit_deid["pseudonymized_patient_id"],
                    "source_sha256": audit_deid["source_sha256"],
                    "sanitized_sha256": audit_deid["sanitized_sha256"],
                    "tags_cleared_count": audit_deid["tags_cleared_count"],
                    "normative_compliance": audit_deid["normative_compliance"],
                    "zero_retention_verified": audit_deid.get("zero_retention_verified", False),
                }).execute()
            except Exception as audit_err:
                log_event("dicom_audit_log_insert_failed", error_type=type(audit_err).__name__)

        return {
            "message": "Archivo cargado y procesado correctamente",
            "dicom_id": dicom_id,
            "user_id": current_user["id"],
            "filename": file.filename,
            "storage_path": object_name,
            "preview_storage_path": preview_storage_path,
            "modality": modality,
            "study_date": study_date,
            "patient_id_dicom": patient_id_dicom,
            "file_type": file_type,
            "case_ref": case_ref or None,
            "volume_metadata": volume_meta,
        }

    except HTTPException:
        raise
    except Exception as e:
        log_event(
            "dicom_upload_failed",
            level="ERROR",
            exc_info=True,
            error_type=type(e).__name__,
            http_status=500,
        )
        raise HTTPException(status_code=500, detail="Error procesando archivo")


@router.post("/dicom/analyze/{dicom_id}")
async def analyze_dicom(
    dicom_id: str,
    features: ClinicalFeatures,
    current_user: dict = Depends(get_current_user),
):
    result = supabase.table("dicom_uploads")\
        .select("*")\
        .eq("id", dicom_id)\
        .eq("user_id", current_user["id"])\
        .single()\
        .execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    record = result.data
    storage_path = record["storage_path"]
    kind = kind_of_record(record)
    is_dicom = kind == "dicom"
    is_zip = kind == "dicom_series"
    is_nifti = kind == "nifti_volume"
    if kind in VOLUME_KINDS and not volume_uploads_enabled():
        raise HTTPException(status_code=400, detail=VOLUME_UPLOADS_DISABLED_DETAIL)

    try:
        # Descargar de Storage
        file_bytes = supabase.storage.from_(SUPABASE_BUCKET_NAME).download(storage_path)

        # PNG con la normalización de main por defecto (servidor de producción v1.2);
        # archivo original solo con AI_INPUT_MODE=source (worker local v2).
        inference_file = build_inference_file(kind, record["original_name"], file_bytes, ai_input_mode())

        t0 = time.monotonic()
        raw_result = await post_predict(inference_file, features.model_dump(exclude={"lobar_location"}))
        if not raw_result:
            raise HTTPException(status_code=502, detail="No se obtuvo respuesta del modelo de IA")
        ai_result = normalize_ai_response(raw_result)

        inference_time_ms = int((time.monotonic() - t0) * 1000)
        model_version = os.getenv("HF_MODEL_VERSION", "oncoscan-ai@multimodal-v1.2")
        predicted_at = datetime.now(timezone.utc).isoformat()

        # Extraer campos de OncoScan 2.0
        score = ai_result.get("score")
        nivel_riesgo = ai_result.get("nivel_riesgo")
        recomendacion = ai_result.get("recomendacion")
        subtipo_histologico = ai_result.get("subtipo_histologico")
        explicabilidad = ai_result["explicabilidad"]
        heatmap_base64 = ai_result["heatmap_base64"]
        lobar_info = ai_result.get("lobar_info")

        # Imagen "antes": el PNG enviado; en modo source, el corte que devuelve el worker.
        png_bytes = inference_file.keyframe_png
        if png_bytes is None:
            keyframe = ai_result.get("keyframe_base64")
            if keyframe:
                png_bytes = base64.b64decode(keyframe, validate=True)
            elif is_zip or is_nifti:
                raise HTTPException(status_code=502, detail="El modelo no devolvió el corte canónico del volumen")
            elif is_dicom:
                png_bytes = dicom_to_png_bytes(file_bytes)

        source_slice_index = (
            inference_file.source_slice_index
            if inference_file.source_slice_index is not None
            else ai_result.get("source_slice_index")
        )
        volume_metadata = (record.get("metadata_json") or {}).get("volume_metadata") or {}
        total_slices = volume_metadata.get("num_slices")
        source_slice = (
            {"index": source_slice_index, "total": total_slices}
            if source_slice_index is not None and total_slices is not None
            else None
        )

        # Asegurar preview storage path
        preview_path = record.get("preview_storage_path")
        if is_dicom or is_zip or is_nifti:
            preview_path = preview_path or f"{storage_path}.preview.png"
            supabase.storage.from_(SUPABASE_BUCKET_NAME).upload(
                path=preview_path,
                file=png_bytes,
                file_options={"content-type": "image/png", "upsert": "true"},
            )

        # Actualizar registro en Supabase
        update_data = {
            "ai_score": score,
            "ai_risk_level": nivel_riesgo,
            "ai_recommendation": recomendacion,
            "ai_model_version": ai_result.get("modelo_version"),
            "ai_processed_at": datetime.now(timezone.utc).isoformat(),
            "ai_error": None,
            "upload_status": "analyzed",
            "clinical_features": features.model_dump(),
            "model_version": model_version,
            "inference_time_ms": inference_time_ms,
            "predicted_at": predicted_at,
            "ai_heatmap_base64": heatmap_base64,
            "preview_storage_path": preview_path,
        }

        # Guardar metadatos adicionales si están presentes en la tabla
        meta_json = record.get("metadata_json") or {}
        meta_json["explicabilidad"] = {key: explicabilidad.get(key) for key in
            ("metodo", "target", "scope", "native_layer_shapes", "source_slice_index", "weights_sha256")}
        meta_json["analysis_source_slice"] = source_slice_index
        if subtipo_histologico:
            meta_json["subtipo_histologico"] = subtipo_histologico
        if lobar_info:
            meta_json["lobar_info"] = lobar_info
        update_data["metadata_json"] = meta_json

        supabase.table("dicom_uploads").update(update_data).eq("id", dicom_id).execute()
        log_event(
            "dicom_analysis_completed",
            upload_id_hash=hash_id(dicom_id),
            inference_time_ms=inference_time_ms,
            model_version=model_version,
        )

        before_path = preview_path if (is_dicom or is_zip or is_nifti) else storage_path
        original_signed_url = None
        try:
            signed = supabase.storage.from_(SUPABASE_BUCKET_NAME).create_signed_url(before_path, 3600)
            original_signed_url = signed.get("signedURL") or signed.get("signedUrl")
        except Exception as e:
            log_event("signed_url_failed", level="ERROR", error_type=type(e).__name__)

        return {
            "dicom_id": dicom_id,
            "score": score,
            "nivel_riesgo": nivel_riesgo,
            "recomendacion": recomendacion,
            "modelo_version": ai_result.get("modelo_version"),
            "model_version": model_version,
            "inference_time_ms": inference_time_ms,
            "predicted_at": predicted_at,
            "heatmap_base64": heatmap_base64,
            "subtipo_histologico": subtipo_histologico,
            "lobar_info": lobar_info,
            "source_slice": source_slice,
            "original_signed_url": original_signed_url,
        }

    # Mensajes fijos al cliente y en `ai_error`: nunca `str(e)`, que puede traer rutas o nombres de archivo.
    except HTTPException as e:
        _log_analysis_failed(dicom_id, e)
        _mark_analysis_error(dicom_id)
        raise
    except httpx.ConnectError as e:
        _log_analysis_failed(dicom_id, e)
        _mark_analysis_error(dicom_id, "ConnectError")
        raise HTTPException(
            status_code=503,
            detail="No se pudo conectar con el servicio de IA. Intenta de nuevo en unos segundos.",
        )
    except httpx.TimeoutException as e:
        _log_analysis_failed(dicom_id, e)
        _mark_analysis_error(dicom_id, "TimeoutException")
        raise HTTPException(
            status_code=504,
            detail="El servicio de IA tardó demasiado en responder. Intenta de nuevo.",
        )
    except httpx.HTTPStatusError as e:
        _log_analysis_failed(dicom_id, e)
        status = e.response.status_code
        _mark_analysis_error(dicom_id, f"HTTPStatusError {status}")
        raise HTTPException(status_code=502, detail=f"El servicio de IA respondió con error {status}.")
    except httpx.HTTPError as e:
        _log_analysis_failed(dicom_id, e)
        _mark_analysis_error(dicom_id, type(e).__name__)
        raise HTTPException(status_code=502, detail="Error comunicando con el servicio de IA.")
    except Exception as e:
        _log_analysis_failed(dicom_id, e)
        _mark_analysis_error(dicom_id, type(e).__name__)
        raise HTTPException(status_code=500, detail="Error en análisis")


def _log_analysis_failed(dicom_id: str, error: Exception) -> None:
    log_event(
        "dicom_analysis_failed",
        level="ERROR",
        error_type=type(error).__name__,
        upload_id_hash=hash_id(dicom_id),
    )


def _mark_analysis_error(dicom_id: str, ai_error: str | None = None) -> None:
    """Marca el estudio en error; `ai_error` solo admite valores fijos sin datos del paciente."""
    update: dict = {"upload_status": "error"}
    if ai_error is not None:
        update["ai_error"] = ai_error
    supabase.table("dicom_uploads").update(update).eq("id", dicom_id).execute()
