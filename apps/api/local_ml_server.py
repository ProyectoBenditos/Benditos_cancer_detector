"""Loopback-only PyTorch/MONAI service for local OncoScan development."""
from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
import re
import threading

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
import torch
import uvicorn

from app.ml.runtime import runtime
from app.ml.volume_pipeline import ASSETS, CACHE, cache_key, prepare_volume

app = FastAPI(title="OncoScan Local PyTorch + MONAI", version="3.0.0")
executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="volume-ml")
jobs = {}
job_lock = threading.Lock()


@app.get("/health")
def health():
    return {"status": "ok", "service": "oncoscan-local-ml", "inference": "real_checkpoints",
            "torch_version": torch.__version__, "cuda_available": torch.cuda.is_available(),
            "gpu": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
            "models_loaded": runtime.cache_info().currsize > 0}


@app.post("/predict")
def predict(imagen: UploadFile = File(...), subtlety: float = Form(3), calcification: float = Form(6),
            sphericity: float = Form(4), margin: float = Form(4), lobulation: float = Form(1),
            spiculation: float = Form(1), texture: float = Form(5), malignancy: float = Form(3)):
    supplied = {name: value for name, value in locals().items() if name != "imagen"}
    try:
        return runtime().predict(imagen.file.read(), imagen.filename or "image.png", supplied)
    except (ValueError, OSError) as error:
        raise HTTPException(status_code=422, detail=str(error))


def job_status(job_id):
    if not re.fullmatch(r"[a-f0-9]{64}", job_id):
        raise HTTPException(status_code=404, detail="Volumen no encontrado")
    manifest = CACHE / job_id / "manifest.json"
    if manifest.exists():
        return {"job_id": job_id, "status": "ready", "progress": 1,
                "manifest": json.loads(manifest.read_text(encoding="utf-8"))}
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Volumen no preparado")
    return {"job_id": job_id, **jobs[job_id]}


@app.post("/volumes")
def start_volume(imagen: UploadFile = File(...), features_json: str = Form("{}"), study_key: str = Form(...)):
    data = imagen.file.read()
    if not data or len(data) > 400_000_000:
        raise HTTPException(status_code=413, detail="Volumen vacío o mayor de 400 MB")
    try:
        features = json.loads(features_json)
        if not isinstance(features, dict):
            raise ValueError("Las variables clínicas deben ser un objeto")
        features = {key: float(value) for key, value in features.items() if isinstance(value, (int, float))}
        key = cache_key(data, features, study_key)
    except (ValueError, TypeError) as error:
        raise HTTPException(status_code=422, detail=str(error))
    with job_lock:
        if (CACHE / key / "manifest.json").exists() or key in jobs and jobs[key]["status"] != "error":
            return job_status(key)
        if sum(job["status"] in {"queued", "processing"} for job in jobs.values()) >= 4:
            raise HTTPException(status_code=429, detail="La cola local está ocupada; reintente más tarde")
        jobs[key] = {"status": "queued", "progress": 0, "message": "En cola local", "study_key": study_key}
        filename = imagen.filename or "study.nii.gz"

        def work():
            def update(progress, message):
                jobs[key] = {"status": "processing", "progress": progress, "message": message, "study_key": study_key}
            try:
                prepare_volume(data, filename, features, study_key, CACHE / key, update)
                jobs[key] = {"status": "ready", "progress": 1, "message": "Volumen preparado", "study_key": study_key}
            except Exception:
                import logging
                logging.getLogger("oncoscan.ml").exception("Volume preparation failed")
                jobs[key] = {
                    "status": "error",
                    "progress": 0,
                    "message": "No se pudo preparar el volumen. Revise el registro local del servicio.",
                    "study_key": study_key,
                }
        executor.submit(work)
    return job_status(key)


@app.get("/volumes/{job_id}")
def volume_status(job_id: str):
    return job_status(job_id)


@app.get("/volumes/{job_id}/assets/{name}")
def asset(job_id: str, name: str):
    if name not in ASSETS or job_status(job_id)["status"] != "ready":
        raise HTTPException(status_code=404, detail="Artefacto no disponible")
    return FileResponse(CACHE / job_id / name, media_type="application/json" if name.endswith(".json") else "image/png")


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8001)
