"""Prepara los casos públicos del modo práctica a partir de LIDC-IDRI.

Ejecutar desde la raíz del repositorio con el entorno del script:

    .venv-practice/Scripts/python.exe scripts/prepare_practice_cases.py --dry-run
    .venv-practice/Scripts/python.exe scripts/prepare_practice_cases.py

1. Toma los pacientes ``test`` de la partición del modelo v2, en orden alfabético, y se
   queda con los 5 primeros que tienen al menos un nódulo de referencia (``pylidc``).
2. Descarga cada serie de TCIA (nbia-api) a ``samples/practice/dicom/<uid>/``.
3. Elige el corte axial más cercano al centroide del nódulo de referencia más grande.
4. Guarda el corte con ventana pulmonar y envía a ``/predict`` el corte completo con la
   misma conversión que una subida ``.dcm`` (``model_input_png``).
5. Escribe ``manifest.json`` (web) y ``samples/practice/provenance.json``.

Los archivos solo se escriben si los 5 casos se completan; ante cualquier fallo de
TCIA o del servidor de IA el script se detiene sin escribir nada.
"""
from __future__ import annotations

import argparse
import base64
import csv
import hashlib
import io
import json
import sys
import zipfile
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
import numpy as np
import pydicom
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps/api"))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.services.ct_window import model_input_png  # noqa: E402
from practice_cases import (  # noqa: E402
    FEATURE_RANGES,
    consensus_features,
    is_reference,
    lung_window_u8,
    normalized_center,
)

SPLIT_CSV = ROOT / "docs/modelo-v2-densenet/splits/split_assignment.csv"
WEB_OUT = ROOT / "apps/web/public/demo/practica"
DICOM_DIR = ROOT / "samples/practice/dicom"
PROVENANCE = ROOT / "samples/practice/provenance.json"
TCIA_URL = "https://services.cancerimagingarchive.net/nbia-api/services/v1/getImage"
DEFAULT_AI_URL = "https://oncoscan-ai.duckdns.org"
N_CASES = 5
MAX_SERIES_BYTES = 2 * 1024 ** 3
Z_EPS_MM = 1e-3
SPLIT_NOTE = (
    "Pacientes del conjunto de test de la partición del modelo v2 "
    "(docs/modelo-v2-densenet/splits/split_assignment.csv), no de la partición de "
    "multimodal-v1.2: no se garantiza que la v1.2 no los haya visto en su entrenamiento."
)


@dataclass
class Reference:
    x: float
    y: float
    diameter_mm: float
    readers: int


@dataclass
class Candidate:
    patient_id: str
    series_uid: str
    study_uid: str
    z_mm: float
    slice_thickness_mm: float
    chosen_diameter_mm: float
    chosen_readers: int
    features: dict[str, float]
    clipped: list[str]
    # (fila, columna) en píxeles de cada referencia en el corte, con su diámetro y lectores
    reference_px: list[tuple[float, float, float, int]] = field(default_factory=list)


def log(message: str) -> None:
    print(message, flush=True)  # noqa: T201


def split_test_patients() -> list[str]:
    with SPLIT_CSV.open(encoding="utf-8", newline="") as handle:
        rows = csv.DictReader(handle)
        return sorted(row["patient_id"] for row in rows if row["split"].strip() == "test")


def _cluster_diameter(cluster) -> float:
    return float(np.mean([ann.diameter for ann in cluster]))


def _centroid_z(scan, cluster) -> float:
    zvals = np.asarray(scan.slice_zvals, dtype=float)
    ks = [float(ann.centroid[2]) for ann in cluster]
    return float(np.mean(np.interp(ks, np.arange(len(zvals)), zvals)))


def _in_slice_center(cluster, z_mm: float, half_thickness: float) -> tuple[float, float] | None:
    """Centro (fila, columna) del nódulo en el corte: media de los lectores con contorno a ±½ grosor."""
    centers = []
    for ann in cluster:
        points = [
            contour.to_matrix(include_k=False)
            for contour in ann.contours
            if contour.inclusion and abs(float(contour.image_z_position) - z_mm) <= half_thickness + Z_EPS_MM
        ]
        if points:
            ij = np.vstack(points).astype(float)
            centers.append((float(ij[:, 0].mean()), float(ij[:, 1].mean())))
    if not centers:
        return None
    rows, cols = zip(*centers)
    return float(np.mean(rows)), float(np.mean(cols))


def build_candidate(scan) -> Candidate | None:
    references = [c for c in scan.cluster_annotations() if is_reference(len(c), _cluster_diameter(c))]
    if not references:
        return None
    chosen = max(references, key=_cluster_diameter)
    zvals = np.asarray(scan.slice_zvals, dtype=float)
    target = _centroid_z(scan, chosen)
    z_mm = float(zvals[int(np.argmin(np.abs(zvals - target)))])
    thickness = float(scan.slice_thickness)
    reference_px = []
    for cluster in references:
        center = _in_slice_center(cluster, z_mm, thickness / 2.0)
        if center is not None:
            reference_px.append((center[0], center[1], _cluster_diameter(cluster), len(cluster)))
    features, clipped = consensus_features(
        [{name: float(getattr(ann, name)) for name in FEATURE_RANGES} for ann in chosen]
    )
    return Candidate(
        patient_id=scan.patient_id,
        series_uid=scan.series_instance_uid,
        study_uid=scan.study_instance_uid,
        z_mm=z_mm,
        slice_thickness_mm=thickness,
        chosen_diameter_mm=_cluster_diameter(chosen),
        chosen_readers=len(chosen),
        features=features,
        clipped=clipped,
        reference_px=reference_px,
    )


def select_candidates(patients: list[str]) -> list[Candidate]:
    import pylidc as pl

    selected: list[Candidate] = []
    for patient_id in patients:
        scans = pl.query(pl.Scan).filter(pl.Scan.patient_id == patient_id).order_by(pl.Scan.id).all()
        for scan in scans:
            candidate = build_candidate(scan)
            if candidate is not None and candidate.reference_px:
                selected.append(candidate)
                break
        if len(selected) == N_CASES:
            break
    return selected


def download_series(series_uid: str) -> Path:
    """Descarga el zip de la serie y extrae solo sus ``.dcm`` en una carpeta propia."""
    target = DICOM_DIR / series_uid
    if target.is_dir() and any(target.glob("*.dcm")):
        log(f"  serie ya descargada: {target.relative_to(ROOT)}")
        return target
    DICOM_DIR.mkdir(parents=True, exist_ok=True)
    zip_path = DICOM_DIR / f"{series_uid}.zip"
    with httpx.stream("GET", TCIA_URL, params={"SeriesInstanceUID": series_uid},
                      follow_redirects=True, timeout=600) as response:
        response.raise_for_status()
        with zip_path.open("wb") as output:
            for chunk in response.iter_bytes(1024 * 1024):
                output.write(chunk)
    target.mkdir(parents=True, exist_ok=False)
    total = 0
    with zipfile.ZipFile(zip_path) as archive:
        for info in archive.infolist():
            name = Path(info.filename.replace("\\", "/")).name
            if info.is_dir() or not name.lower().endswith(".dcm"):
                continue
            total += info.file_size
            if total > MAX_SERIES_BYTES:
                raise RuntimeError("La serie descargada supera el tamaño máximo permitido.")
            (target / name).write_bytes(archive.read(info))
    zip_path.unlink()
    if not any(target.glob("*.dcm")):
        raise RuntimeError(f"El zip de TCIA de la serie {series_uid} no contiene DICOM.")
    return target


def pick_slice(folder: Path, series_uid: str, z_mm: float, tolerance: float) -> pydicom.Dataset:
    best: tuple[float, Path] | None = None
    for path in sorted(folder.glob("*.dcm")):
        header = pydicom.dcmread(path, stop_before_pixels=True)
        if str(header.get("SeriesInstanceUID", "")) != series_uid or "ImagePositionPatient" not in header:
            continue
        distance = abs(float(header.ImagePositionPatient[2]) - z_mm)
        if best is None or distance < best[0]:
            best = (distance, path)
    if best is None or best[0] > tolerance:
        raise RuntimeError(f"No hay un corte DICOM a z={z_mm} en la serie {series_uid}.")
    return pydicom.dcmread(best[1])


def png_bytes(image: Image.Image) -> bytes:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG", optimize=True)
    return buffer.getvalue()


def predict(ai_url: str, model_png: bytes, features: dict[str, float]) -> dict[str, Any]:
    response = httpx.post(
        f"{ai_url.rstrip('/')}/predict",
        files={"imagen": ("imagen.png", model_png, "image/png")},
        data={name: str(value) for name, value in features.items()},
        timeout=180,
    )
    response.raise_for_status()
    payload = response.json()
    explicabilidad = payload.get("explicabilidad") or {}
    if not isinstance(explicabilidad, dict):
        explicabilidad = {}
    heatmap = payload.get("heatmap_base64") or explicabilidad.get("overlay_base64")
    for key in ("score", "nivel_riesgo", "modelo_version"):
        if payload.get(key) is None:
            raise RuntimeError(f"La respuesta de /predict no trae '{key}'.")
    if not heatmap:
        raise RuntimeError("La respuesta de /predict no trae mapa de calor.")
    if "," in heatmap and heatmap.startswith("data:"):
        heatmap = heatmap.split(",", 1)[1]
    heatmap_png = png_bytes(Image.open(io.BytesIO(base64.b64decode(heatmap))))
    return {
        "score": float(payload["score"]),
        "nivel_riesgo": str(payload["nivel_riesgo"]),
        "modelo_version": str(payload["modelo_version"]),
        "recomendacion": payload.get("recomendacion"),
        "heatmap_png": heatmap_png,
    }


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def prepare_case(index: int, candidate: Candidate, ai_url: str) -> tuple[dict, dict, dict[str, bytes]]:
    case_id = f"caso-{index:02d}"
    log(f"[{case_id}] {candidate.patient_id} serie {candidate.series_uid}")
    folder = download_series(candidate.series_uid)
    dataset = pick_slice(folder, candidate.series_uid, candidate.z_mm, candidate.slice_thickness_mm / 2.0)
    pixels = dataset.pixel_array
    if pixels.ndim != 2:
        raise RuntimeError("El corte elegido no es una imagen 2D.")
    slope = float(getattr(dataset, "RescaleSlope", 1.0))
    intercept = float(getattr(dataset, "RescaleIntercept", 0.0))
    hu = pixels.astype(np.float32) * slope + intercept
    image_png = png_bytes(Image.fromarray(lung_window_u8(hu), mode="L"))
    model_png = model_input_png(pixels)
    log(f"  corte z={float(dataset.ImagePositionPatient[2])} mm; llamando a /predict")
    ai = predict(ai_url, model_png, candidate.features)
    log(f"  IA: score={ai['score']} riesgo={ai['nivel_riesgo']} modelo={ai['modelo_version']}")

    rows, columns = int(dataset.Rows), int(dataset.Columns)
    spacing = [float(v) for v in dataset.PixelSpacing]
    references = []
    for row, col, diameter, readers in candidate.reference_px:
        x, y = normalized_center(col, row, columns, rows)
        references.append({"x": round(x, 4), "y": round(y, 4),
                           "diameter_mm": round(diameter, 1), "readers": readers})
    manifest_case = {
        "id": case_id,
        "image": f"{case_id}.png",
        "heatmap": f"{case_id}-heatmap.png",
        "pixel_spacing": spacing,
        "rows": rows,
        "columns": columns,
        "reference": references,
        "ai": {"score": ai["score"], "risk_level": ai["nivel_riesgo"], "model_version": ai["modelo_version"]},
    }
    provenance_case = {
        "id": case_id,
        "lidc_patient_id": candidate.patient_id,
        "study_instance_uid": candidate.study_uid,
        "series_instance_uid": candidate.series_uid,
        "sop_instance_uid": str(dataset.SOPInstanceUID),
        "z_mm": float(dataset.ImagePositionPatient[2]),
        "slice_thickness_mm": candidate.slice_thickness_mm,
        "chosen_nodule": {"diameter_mm": round(candidate.chosen_diameter_mm, 2),
                          "readers": candidate.chosen_readers},
        "reference": references,
        "features": candidate.features,
        "clipped_features": candidate.clipped,
        "image_png_sha256": sha256(image_png),
        "model_input_png_sha256": sha256(model_png),
        "heatmap_png_sha256": sha256(ai["heatmap_png"]),
        "ai": {"score": ai["score"], "nivel_riesgo": ai["nivel_riesgo"],
               "modelo_version": ai["modelo_version"], "recomendacion": ai["recomendacion"]},
    }
    files = {f"{case_id}.png": image_png, f"{case_id}-heatmap.png": ai["heatmap_png"]}
    return manifest_case, provenance_case, files


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--patients", help="Pacientes LIDC separados por comas (por defecto, los de test de v2).")
    parser.add_argument("--ai-url", default=DEFAULT_AI_URL)
    parser.add_argument("--dry-run", action="store_true", help="Solo lista los candidatos; no descarga ni llama a la IA.")
    args = parser.parse_args()

    patients = [p.strip() for p in args.patients.split(",") if p.strip()] if args.patients else split_test_patients()
    candidates = select_candidates(patients)
    for index, candidate in enumerate(candidates, start=1):
        log(f"caso-{index:02d} {candidate.patient_id} serie={candidate.series_uid} z={candidate.z_mm} "
            f"referencias={len(candidate.reference_px)} nodulo={candidate.chosen_diameter_mm:.1f}mm/"
            f"{candidate.chosen_readers} lectores variables={candidate.features} recortes={candidate.clipped}")
    if len(candidates) < N_CASES:
        raise SystemExit(f"Solo hay {len(candidates)} candidatos con nódulo de referencia; se necesitan {N_CASES}.")
    if args.dry_run:
        return

    manifest_cases, provenance_cases, outputs = [], [], {}
    for index, candidate in enumerate(candidates, start=1):
        manifest_case, provenance_case, files = prepare_case(index, candidate, args.ai_url)
        if not manifest_case["reference"]:
            raise RuntimeError(f"{manifest_case['id']} no tiene nódulos de referencia en el corte.")
        manifest_cases.append(manifest_case)
        provenance_cases.append(provenance_case)
        outputs.update(files)

    import pylidc

    WEB_OUT.mkdir(parents=True, exist_ok=True)
    for name, data in outputs.items():
        (WEB_OUT / name).write_bytes(data)
    manifest = {"version": 1, "cases": manifest_cases}
    (WEB_OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    provenance = {
        "source": "LIDC-IDRI, The Cancer Imaging Archive (TCIA)",
        "license": "CC BY 3.0",
        "tcia_url": TCIA_URL,
        "annotations": f"pylidc {getattr(pylidc, '__version__', '0.2.3')} (base de datos incluida)",
        "ai_url": f"{args.ai_url.rstrip('/')}/predict",
        "model_input": "apps/api/app/services/ct_window.py::model_input_png (pixel_array crudo, min-max)",
        "reference_rule": "al menos 3 lectores y diámetro medio entre 6 y 30 mm",
        "split_note": SPLIT_NOTE,
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "cases": provenance_cases,
    }
    PROVENANCE.parent.mkdir(parents=True, exist_ok=True)
    PROVENANCE.write_text(json.dumps(provenance, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    log(f"Listo: {len(manifest_cases)} casos en {WEB_OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
