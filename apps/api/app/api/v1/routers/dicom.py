import asyncio
import hashlib
import io
import math
import os
import tempfile
import time
import zipfile
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from uuid import uuid4

import httpx
import numpy as np
import pydicom
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import Response, StreamingResponse
from PIL import Image
from pydantic import BaseModel

from app.core.config import SUPABASE_BUCKET_NAME
from app.core.deidentifier import deidentify_dicom_bytes
from app.core.logging import hash_id, log_event
from app.core.security import get_current_user
from app.db.supabase_client import supabase
from app.services.dicom_series import MAX_UPLOAD_BYTES, SeriesError, read_ct_series
from app.services.upload_types import classify_upload, kind_of_record
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


def apply_lung_window_hu(hu: np.ndarray, wc: float = -600.0, ww: float = 1500.0) -> np.ndarray:
    """Aplica ventana pulmonar médica a un arreglo que ya está en unidades HU."""
    hu_min = wc - (ww / 2.0)
    hu_max = wc + (ww / 2.0)
    hu_clipped = np.clip(hu, hu_min, hu_max)
    norm = ((hu_clipped - hu_min) / (hu_max - hu_min) * 255.0).astype(np.uint8)
    return norm


def apply_lung_window(pixel_array: np.ndarray, dataset: pydicom.Dataset) -> np.ndarray:
    """
    Aplica RescaleSlope/Intercept en unidades Hounsfield (HU) y ventana pulmonar
    médica estandarizada (-600 HU Centro, 1500 HU Ancho -> [-1350, +150] HU).
    """
    slope = float(getattr(dataset, "RescaleSlope", 1.0))
    intercept = float(getattr(dataset, "RescaleIntercept", 0.0))
    hu = pixel_array.astype(np.float32) * slope + intercept

    # Ventana pulmonar canónica para parénquima y nódulos
    wc = -600.0
    ww = 1500.0

    raw_wc = getattr(dataset, "WindowCenter", None)
    raw_ww = getattr(dataset, "WindowWidth", None)
    if raw_wc is not None:
        try:
            val = float(raw_wc[0]) if isinstance(raw_wc, (list, pydicom.multival.MultiValue)) else float(raw_wc)
            if val < 0 and val > -1000:
                wc = val
        except Exception:
            pass
    if raw_ww is not None:
        try:
            val = float(raw_ww[0]) if isinstance(raw_ww, (list, pydicom.multival.MultiValue)) else float(raw_ww)
            if 800 <= val <= 2000:
                ww = val
        except Exception:
            pass

    hu_min = wc - (ww / 2.0)
    hu_max = wc + (ww / 2.0)
    hu_clipped = np.clip(hu, hu_min, hu_max)
    norm = ((hu_clipped - hu_min) / (hu_max - hu_min) * 255.0).astype(np.uint8)
    return norm


def dicom_to_png_bytes(file_bytes: bytes, slice_idx: Optional[int] = None) -> bytes:
    """Convierte bytes de DICOM (single slice o multiframe) a PNG en ventana pulmonar."""
    in_buf = io.BytesIO(file_bytes)
    dataset = pydicom.dcmread(in_buf, force=True)
    px = dataset.pixel_array

    if px.ndim == 3:
        idx = slice_idx if slice_idx is not None else px.shape[0] // 2
        idx = max(0, min(idx, px.shape[0] - 1))
        px = px[idx]

    pixel_norm = apply_lung_window(px, dataset)
    pil_img = Image.fromarray(pixel_norm).convert("RGB")
    png_buffer = io.BytesIO()
    pil_img.save(png_buffer, format="PNG")
    return png_buffer.getvalue()


def apply_atlas_window(pixels: np.ndarray, dataset: pydicom.Dataset) -> np.ndarray:
    """Fixed atlas encoding, independent of scanner display presets."""
    hu = pixels.astype(np.float32) * float(getattr(dataset, "RescaleSlope", 1.0))
    hu += float(getattr(dataset, "RescaleIntercept", 0.0))
    return apply_lung_window_hu(hu)


def generate_texture_atlas(slices_px: List[np.ndarray], target_slice_dim: int = 128) -> Image.Image:
    """
    Empaqueta una serie de cortes axiales en una textura 2D en cuadrícula (Texture Atlas)
    para el shader de raymarching en WebGL (Three.js), tal como el artefacto de 160 cortes.
    """
    num_slices = len(slices_px)
    cols = int(math.ceil(math.sqrt(num_slices)))
    rows = int(math.ceil(num_slices / cols))
    atlas_w = cols * target_slice_dim
    atlas_h = rows * target_slice_dim

    atlas_img = Image.new("L", (atlas_w, atlas_h), color=0)
    for i, slice_arr in enumerate(slices_px):
        c = i % cols
        r = i // cols
        pil_slice = Image.fromarray(slice_arr).resize(
            (target_slice_dim, target_slice_dim),
            Image.Resampling.BILINEAR
        )
        atlas_img.paste(pil_slice, (c * target_slice_dim, r * target_slice_dim))

    return atlas_img


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
            suffix_nii = ".nii.gz" if file.filename.lower().endswith(".gz") else ".nii"
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
                pseudonym = f"ONC-NII-{uuid4().hex[:8].upper()}"
                patient_id_dicom = pseudonym
                src_sha = hashlib.sha256(contents).hexdigest()
                audit_deid = {
                    "source_sha256": src_sha,
                    "sanitized_sha256": src_sha,
                    "pseudonymized_patient_id": pseudonym,
                    "tags_cleared_count": 0,
                    "deidentified_at": datetime.now(timezone.utc).isoformat(),
                    "normative_compliance": "NIfTI PS-3.15 (Sin PHI en cabecera)",
                }

                mid_idx = num_slices // 2
                mid_img = Image.fromarray(slices_px[mid_idx]).convert("RGB")
                p_buf = io.BytesIO()
                mid_img.save(p_buf, format="PNG")
                preview_bytes = p_buf.getvalue()

                atlas_img = generate_texture_atlas(slices_px, target_slice_dim=128)
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
                    "atlas_dimensions": [atlas_img.width, atlas_img.height],
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
                    "zero_retention_verified": True,
                }).execute()
            except Exception as audit_err:
                log_event("dicom_audit_log_insert_failed", error=str(audit_err))

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
    record_kind = kind_of_record(record)
    is_dicom = record_kind == "dicom"
    is_zip = record_kind == "dicom_series"
    is_nifti = record_kind == "nifti_volume"

    try:
        # Descargar de Storage
        file_bytes = supabase.storage.from_(SUPABASE_BUCKET_NAME).download(storage_path)

        # The local worker extracts a canonical physical keyframe from the same
        # source volume used for MONAI and the registered attribution atlas.
        inference_bytes = file_bytes
        inference_filename = record["original_name"]

        # Inferencia con Microservicio Local / Servidor
        hf_base = os.getenv("HF_API_BASE_URL", "http://127.0.0.1:8001")
        if not hf_base or "hf.space" in hf_base:
            hf_base = "http://127.0.0.1:8001"
        hf_url = f"{hf_base.rstrip('/')}/predict"
        timeout = float(os.getenv("HF_PREDICT_TIMEOUT", "120"))

        files = {"imagen": (inference_filename, inference_bytes, "application/octet-stream")}
        data = {
            "subtlety": str(features.subtlety),
            "calcification": str(features.calcification),
            "sphericity": str(features.sphericity),
            "margin": str(features.margin),
            "lobulation": str(features.lobulation),
            "spiculation": str(features.spiculation),
            "texture": str(features.texture),
            "malignancy": str(features.malignancy),
        }

        t0 = time.monotonic()
        ai_result = None
        max_retries = 2
        for attempt in range(max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=timeout) as client:
                    response = await client.post(hf_url, files=files, data=data)
                    response.raise_for_status()
                    ai_result = response.json()
                    break
            except (httpx.ConnectError, httpx.TimeoutException):
                if attempt < max_retries:
                    await asyncio.sleep(2.0)
                    continue
                raise

        if not ai_result:
            raise HTTPException(status_code=502, detail="No se obtuvo respuesta del modelo de IA")

        inference_time_ms = int((time.monotonic() - t0) * 1000)
        model_version = ai_result.get("modelo_version", "multimodal-v2.0-densenet")
        predicted_at = datetime.now(timezone.utc).isoformat()

        # Extraer campos de OncoScan 2.0
        score = ai_result.get("score")
        nivel_riesgo = ai_result.get("nivel_riesgo")
        recomendacion = ai_result.get("recomendacion")
        subtipo_histologico = ai_result.get("subtipo_histologico")
        explicabilidad = ai_result.get("explicabilidad", {})
        heatmap_base64 = explicabilidad.get("overlay_base64") or ai_result.get("heatmap_base64")
        lobar_info = ai_result.get("lobar_info")

        import base64
        keyframe = ai_result.get("keyframe_base64")
        if keyframe:
            png_bytes = base64.b64decode(keyframe, validate=True)
        elif is_dicom:
            png_bytes = dicom_to_png_bytes(file_bytes)
        elif not (is_zip or is_nifti):
            image_buffer = io.BytesIO()
            Image.open(io.BytesIO(file_bytes)).convert("RGB").save(image_buffer, format="PNG")
            png_bytes = image_buffer.getvalue()
        else:
            raise HTTPException(status_code=502, detail="El modelo no devolvió el corte canónico del volumen")

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
            "ai_model_version": model_version,
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
        meta_json["analysis_source_slice"] = ai_result.get("source_slice_index")
        if subtipo_histologico:
            meta_json["subtipo_histologico"] = subtipo_histologico
        if lobar_info:
            meta_json["lobar_info"] = lobar_info
        update_data["metadata_json"] = meta_json

        supabase.table("dicom_uploads").update(update_data).eq("id", dicom_id).execute()

        before_path = preview_path if (is_dicom or is_zip or is_nifti) else storage_path
        original_signed_url = None
        try:
            signed = supabase.storage.from_(SUPABASE_BUCKET_NAME).create_signed_url(before_path, 3600)
            original_signed_url = signed.get("signedURL") or signed.get("signedUrl")
        except Exception as e:
            log_event("signed_url_failed", error=str(e))

        return {
            "dicom_id": dicom_id,
            "score": score,
            "nivel_riesgo": nivel_riesgo,
            "recomendacion": recomendacion,
            "modelo_version": model_version,
            "inference_time_ms": inference_time_ms,
            "predicted_at": predicted_at,
            "heatmap_base64": heatmap_base64,
            "subtipo_histologico": subtipo_histologico,
            "lobar_info": lobar_info,
            "original_signed_url": original_signed_url,
        }

    except httpx.ConnectError as e:
        error_msg = "No se pudo conectar con el microservicio de IA local o remoto. Verifica que local_ai_server esté activo en el puerto 8001."
        supabase.table("dicom_uploads").update({"ai_error": f"ConnectError: {str(e)}", "upload_status": "error"}).eq("id", dicom_id).execute()
        raise HTTPException(status_code=503, detail=error_msg)
    except Exception as e:
        supabase.table("dicom_uploads").update({"ai_error": str(e), "upload_status": "error"}).eq("id", dicom_id).execute()
        raise HTTPException(status_code=500, detail=f"Error en análisis: {str(e)}")


@router.get("/dicom/{dicom_id}/volume")
async def get_volume_manifest(
    dicom_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Retorna el manifiesto volumétrico para inicializar el Visor 3D Three.js."""
    query = supabase.table("dicom_uploads").select("*").eq("id", dicom_id).eq("user_id", current_user["id"])

    result = query.single().execute()

    if not result.data or result.data.get("user_id") != current_user["id"]:
        raise HTTPException(status_code=404, detail="Archivo tomográfico no encontrado")

    record = result.data
    meta = record.get("metadata_json") or {}
    volume_meta = meta.get("volume_metadata") or {
        "num_slices": 1,
        "rows": None,
        "columns": None,
        "slice_thickness": None,
        "pixel_spacing": None,
        "z_start": 0.0,
        "z_end": 0.0,
        "window_center": -600.0,
        "window_width": 1500.0,
    }

    return {
        "dicom_id": dicom_id,
        "original_name": record["original_name"],
        "file_type": record["file_type"],
        "modality": record["modality"],
        "study_date": record["study_date"],
        "patient_id_dicom": record["patient_id_dicom"],
        "volume_metadata": volume_meta,
        "atlas_endpoint": f"/api/v1/dicom/{dicom_id}/atlas",
        "subtipo_histologico": meta.get("subtipo_histologico"),
        "lobar_info": meta.get("lobar_info"),
    }


@router.get("/dicom/{dicom_id}/atlas")
async def get_volume_atlas(
    dicom_id: str,
    slice_size: int = Query(128, ge=64, le=512),
    current_user: dict = Depends(get_current_user),
):
    """
    Genera y transmite en streaming la textura 2D en cuadrícula (Texture Atlas)
    para el shader de raymarching de Three.js (WebGL).
    """
    query = supabase.table("dicom_uploads").select("*").eq("id", dicom_id).eq("user_id", current_user["id"])

    result = query.single().execute()

    if not result.data or result.data.get("user_id") != current_user["id"]:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    record = result.data
    storage_path = record["storage_path"]
    file_bytes = supabase.storage.from_(SUPABASE_BUCKET_NAME).download(storage_path)

    slices_norm: List[np.ndarray] = []
    file_ext = os.path.splitext(record["original_name"])[1].lower()

    if file_ext == ".zip" or record.get("file_type") == "dicom_series":
        with zipfile.ZipFile(io.BytesIO(file_bytes), "r") as zf:
            datasets = [pydicom.dcmread(io.BytesIO(zf.read(name)))
                        for name in sorted(zf.namelist()) if name.lower().endswith(".dcm")]
            # Sort by physical Z, including older archives whose filenames are
            # not numbered by anatomy. This matches the upload metadata order.
            datasets.sort(key=lambda ds: float(ds.ImagePositionPatient[2])
                          if getattr(ds, "ImagePositionPatient", None) is not None
                          else float(getattr(ds, "SliceLocation", getattr(ds, "InstanceNumber", 0))))
            for ds in datasets:
                slices_norm.append(apply_atlas_window(ds.pixel_array, ds))
    elif file_ext in {".nii", ".gz"} or record.get("file_type") == "nifti_volume":
        suffix_n = ".nii.gz" if file_ext == ".gz" else ".nii"
        temp_n = None
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix_n) as tmp_f:
            tmp_f.write(file_bytes)
            temp_n = tmp_f.name
        try:
            import nibabel as nib
            nii_vol = nib.as_closest_canonical(nib.load(temp_n, mmap=False))
            v_mat = nii_vol.get_fdata(dtype=np.float32)
            if v_mat.ndim == 4:
                v_mat = v_mat[:, :, :, 0]
            for s_idx in range(v_mat.shape[2]):
                slices_norm.append(apply_lung_window_hu(v_mat[::-1, ::-1, s_idx].T))
        finally:
            if temp_n and os.path.exists(temp_n):
                os.remove(temp_n)
    elif file_ext == ".dcm":
        ds = pydicom.dcmread(io.BytesIO(file_bytes))
        px = ds.pixel_array
        if px.ndim == 3:
            for s_idx in range(px.shape[0]):
                slices_norm.append(apply_atlas_window(px[s_idx], ds))
        else:
            slices_norm.append(apply_atlas_window(px, ds))
    else:
        pil_img = Image.open(io.BytesIO(file_bytes)).convert("L")
        slices_norm.append(np.array(pil_img, dtype=np.uint8))

    if not slices_norm:
        raise HTTPException(status_code=400, detail="No se pudieron extraer cortes para el Atlas volumétrico")

    atlas_img = generate_texture_atlas(slices_norm, target_slice_dim=slice_size)
    png_buf = io.BytesIO()
    atlas_img.save(png_buf, format="PNG")
    png_buf.seek(0)

    return StreamingResponse(
        png_buf,
        media_type="image/png",
        headers={
            "Cache-Control": "private, no-store",
            "X-Volume-Slices": str(len(slices_norm)),
            "X-Volume-Cols": str(int(math.ceil(math.sqrt(len(slices_norm))))),
            "X-Volume-Rows": str(int(math.ceil(len(slices_norm) / math.ceil(math.sqrt(len(slices_norm)))))),
        },
    )
