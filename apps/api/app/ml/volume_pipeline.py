"""Local artifacts for one study: CT + aligned lobes + genuine slice-wise CAM."""
import hashlib
import json
from pathlib import Path
import time

import numpy as np
from scipy.ndimage import zoom

from app.ml.runtime import ROOT, runtime
from app.ml.segmentation import segment_lobes, CHECKPOINT_MD5, SEGMENTATION_VERSION
from app.services.ct_volume import read_ct, render_grid, pack_atlas

CACHE = ROOT / "apps/api/.cache/volumes"
MASK_CACHE = ROOT / "apps/api/.cache/lung-masks"
PIPELINE_VERSION = "monai-hirescam-volume-v2"
ASSETS = {"atlas.png", "lobes.png", "heatmap.png", "manifest.json"}


def cache_key(data, features, study_key):
    config = json.dumps({"features": features, "study_key": study_key, "pipeline": PIPELINE_VERSION,
                         "weights": runtime().hashes, "segmentation": CHECKPOINT_MD5,
                         "segmentation_version": SEGMENTATION_VERSION}, sort_keys=True)
    return hashlib.sha256(data + config.encode()).hexdigest()


def prepare_volume(data: bytes, filename: str, features: dict, study_key: str, output: Path, update=lambda *_: None):
    started = time.monotonic()
    update(0.03, "Leyendo geometría física de la TC")
    source = read_ct(data, filename)
    volume = render_grid(source)
    update(0.08, "Segmentando los cinco lóbulos con MONAI")
    mask_key = hashlib.sha256(data + CHECKPOINT_MD5.encode() + SEGMENTATION_VERSION.encode()).hexdigest()
    mask_file = MASK_CACHE / f"{mask_key}.npz"
    if mask_file.exists():
        with np.load(mask_file, allow_pickle=False) as cached:
            native_lobes = cached["labels"]
            segmentation = json.loads(str(cached["metadata"].item()))
        if native_lobes.shape != source.hu.shape:
            raise ValueError("La máscara guardada no coincide con la geometría de la TC")
    else:
        native_lobes, segmentation = segment_lobes(source)
        MASK_CACHE.mkdir(parents=True, exist_ok=True)
        temporary_mask = mask_file.with_suffix(".tmp")
        with temporary_mask.open("wb") as output_mask:
            np.savez_compressed(output_mask, labels=native_lobes, metadata=json.dumps(segmentation))
        temporary_mask.replace(mask_file)
    windowed = np.clip((np.clip(volume.hu, -1350, 150) + 1350) / 1500 * 255, 0, 255).astype(np.uint8)
    heat = np.zeros(source.hu.shape, dtype=np.float32)
    active_slices = [index for index in range(len(native_lobes)) if np.any(native_lobes[index])]
    if not active_slices:
        raise ValueError("MONAI no encontró soporte pulmonar en este volumen; revise la cobertura y la modalidad de la TC.")
    native = None
    engine = runtime()
    for done, index in enumerate(active_slices):
        native_slice = ((np.clip(source.hu[index], -1350, 150) + 1350) / 1500 * 255).astype(np.uint8)
        heat[index], _score, native = engine.slice_cam(native_slice, features)
        update(0.45 + 0.45 * (done + 1) / max(1, len(active_slices)),
               f"HiResCAM · corte pulmonar {done + 1}/{len(active_slices)}")
    # Anatomical support removes chest wall/exterior activation from this display.
    # It does not turn attribution into a tumor mask or validate lesion location.
    heat *= native_lobes > 0
    factors = tuple(new / old for new, old in zip(volume.hu.shape, source.hu.shape))
    lobes = zoom(native_lobes, factors, order=0, prefilter=False) if volume.hu.shape != source.hu.shape else native_lobes
    heat = zoom(heat, factors, order=1, prefilter=False) if volume.hu.shape != source.hu.shape else heat
    heat *= lobes > 0
    maximum = float(heat.max())
    heat = heat / maximum if maximum > 0 else heat
    peak = None
    if maximum > 0:
        z, y, x = (int(value) for value in np.unravel_index(np.argmax(heat), heat.shape))
        peak = {"x": x, "y": y, "z": z, "label": "Pico de activación HiResCAM", "is_lesion_detection": False}
    output.mkdir(parents=True, exist_ok=True)
    for values, name in [(windowed, "atlas.png"), (lobes, "lobes.png"), (heat * 255, "heatmap.png")]:
        pack_atlas(values).save(output / name)
    manifest = {
        "pipeline_version": PIPELINE_VERSION, "study_key": study_key,
        "source_sha256": hashlib.sha256(data).hexdigest(),
        "volume_metadata": volume.metadata(), "source_metadata": source.metadata(),
        "assets": {"atlas": "atlas.png", "lobes": "lobes.png", "heatmap": "heatmap.png"},
        "segmentation": segmentation,
        "attribution": {"method": "HiResCAM", "construction": "2D CAM computed independently on every lung slice",
            "target": "multimodal_fusion_logit", "explained_component": "neural_component_single_view",
            "normalization": "single_global_max_over_masked_volume", "native_layer_shapes": native,
            "weights_sha256": engine.hashes, "positive_activation": maximum > 0,
            "is_tumor_segmentation": False},
        "peak_activation": peak, "duration_seconds": round(time.monotonic() - started, 2),
    }
    # Publish manifest last; a half-written volume is never considered ready.
    temporary = output / "manifest.tmp"
    temporary.write_text(json.dumps(manifest, ensure_ascii=False), encoding="utf-8")
    temporary.replace(output / "manifest.json")
    update(1, "Volumen preparado")
    return manifest
