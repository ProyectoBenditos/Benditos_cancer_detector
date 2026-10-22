"""Authenticated bridge to local CT/MONAI/CAM artifacts. No patient data is sent to a cloud ML service."""
import hashlib
import json
import os
from urllib.parse import urlsplit

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response

from app.core.config import SUPABASE_BUCKET_NAME
from app.core.security import get_current_user
from app.db.supabase_client import supabase

router = APIRouter()


def owned_study(dicom_id, user):
    result = supabase.table("dicom_uploads").select("*").eq("id", dicom_id).eq("user_id", user["id"]).single().execute()
    if not result.data or result.data.get("user_id") != user["id"]:
        raise HTTPException(status_code=404, detail="Estudio no encontrado")
    return result.data


def study_key(record):
    return hashlib.sha256(f"{record['user_id']}:{record['id']}:{record['storage_path']}".encode()).hexdigest()


def local_ml_base():
    # Local artifacts must never be uploaded to the configured production inference host.
    url = os.getenv("LOCAL_ML_URL", "http://127.0.0.1:8001").rstrip("/")
    if urlsplit(url).hostname not in {"127.0.0.1", "localhost", "::1"}:
        raise HTTPException(status_code=503, detail="El procesamiento de volúmenes debe usar el servicio local")
    return url


def verify_job(payload, record):
    key = (payload.get("manifest") or payload).get("study_key")
    if key != study_key(record):
        raise HTTPException(status_code=404, detail="Volumen no encontrado para este estudio")
    return payload


def public_job(payload, dicom_id):
    manifest = payload.get("manifest")
    if manifest:
        assets = manifest.get("assets", {})
        manifest["assets"] = {kind: f"/api/v1/dicom/{dicom_id}/volume/artifacts/{payload['job_id']}/{name}"
                              for kind, name in assets.items()}
    return payload


async def status_from_worker(job_id):
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(f"{local_ml_base()}/volumes/{job_id}")
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="El volumen local no está disponible")
        return response.json()
    except httpx.RequestError:
        raise HTTPException(status_code=503, detail="El servicio local PyTorch/MONAI no está disponible en el puerto 8001")


@router.post("/dicom/{dicom_id}/volume/prepare")
async def prepare(dicom_id: str, user=Depends(get_current_user)):
    record = owned_study(dicom_id, user)
    data = supabase.storage.from_(SUPABASE_BUCKET_NAME).download(record["storage_path"])
    try:
        async with httpx.AsyncClient(timeout=180) as client:
            response = await client.post(f"{local_ml_base()}/volumes",
                files={"imagen": (record["original_name"], data, "application/octet-stream")},
                data={"features_json": json.dumps(record.get("clinical_features") or {}), "study_key": study_key(record)})
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="No se pudo preparar el volumen en el servicio local")
        return public_job(verify_job(response.json(), record), dicom_id)
    except httpx.RequestError:
        raise HTTPException(status_code=503, detail="Inicie el servicio local PyTorch/MONAI en el puerto 8001")


@router.get("/dicom/{dicom_id}/volume/jobs/{job_id}")
async def status(dicom_id: str, job_id: str, user=Depends(get_current_user)):
    record = owned_study(dicom_id, user)
    return public_job(verify_job(await status_from_worker(job_id), record), dicom_id)


@router.get("/dicom/{dicom_id}/volume/artifacts/{job_id}/{name}")
async def asset(dicom_id: str, job_id: str, name: str, user=Depends(get_current_user)):
    if name not in {"atlas.png", "lobes.png", "heatmap.png"}:
        raise HTTPException(status_code=404, detail="Artefacto no encontrado")
    record = owned_study(dicom_id, user)
    verify_job(await status_from_worker(job_id), record)
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.get(f"{local_ml_base()}/volumes/{job_id}/assets/{name}")
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Artefacto no disponible")
        return Response(content=response.content, media_type="image/png", headers={"Cache-Control": "private, no-store"})
    except httpx.RequestError:
        raise HTTPException(status_code=503, detail="El servicio local dejó de responder")
