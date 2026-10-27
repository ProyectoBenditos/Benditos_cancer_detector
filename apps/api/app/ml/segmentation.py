"""Pinned MONAI SegResNet checkpoint; invert preprocessing onto the CT grid."""
from functools import lru_cache
import hashlib
from pathlib import Path

import nibabel as nib
from nibabel.processing import resample_from_to
import numpy as np
import torch
from monai.data import MetaTensor
from monai.inferers import sliding_window_inference
from monai.networks.nets import SegResNet
from monai.transforms import CropForeground, GaussianSmooth, NormalizeIntensity, ScaleIntensity, Spacing

from app.ml.runtime import GPU_LOCK, ROOT
from app.services.ct_volume import CTVolume, to_nifti

CHECKPOINT = ROOT / "apps/api/.cache/models/monai-wholebody-lowres.pt"
CHECKPOINT_MD5 = "dbdebeae650f4fb5ea7f4ad01e0d2431"
SOURCE = "https://developer.download.nvidia.com/assets/Clara/monai/tutorials/model_zoo/model_lowres_wholebody_ct_segmentation.pt"
MODEL_REVISION = "13f6d33ae9de6664571d935ee647039f477c3fad"
SEGMENTATION_VERSION = "monai-lowres-training-preprocess-v4"
# MONAI wholeBody_ct_segmentation v0.2.9 -> OncoScan's explicit label contract.
LABEL_MAP = {15: 1, 16: 2, 17: 3, 13: 4, 14: 5}


@lru_cache(maxsize=1)
def network():
    if not CHECKPOINT.exists():
        raise RuntimeError("Faltan los pesos MONAI. Ejecute scripts/prepare_lung_demo.py --download-only.")
    if hashlib.md5(CHECKPOINT.read_bytes()).hexdigest() != CHECKPOINT_MD5:
        raise RuntimeError("El checksum del checkpoint MONAI no coincide con el publicado.")
    model = SegResNet(spatial_dims=3, in_channels=1, out_channels=105, init_filters=32,
                      blocks_down=(1, 2, 2, 4), blocks_up=(1, 1, 1), dropout_prob=0.2)
    state = torch.load(CHECKPOINT, map_location="cpu", weights_only=True)
    model.load_state_dict(state.get("model", state.get("state_dict", state)), strict=True)
    return model.eval()


def segment_lobes(volume: CTVolume):
    source = to_nifti(volume)
    values = np.asarray(source.dataobj, dtype=np.float32)
    # Out-of-field CT padding (e.g. -3024 HU in Slicer's CTChest) is not
    # patient tissue. Leaving it in a global min/max transform changes the
    # intensity of every lung voxel seen by the pretrained network.
    values = np.where(values < -1500, -1000.0, values).astype(np.float32)
    tensor = MetaTensor(torch.from_numpy(values.copy()[None]), affine=source.affine)
    sampled = Spacing(pixdim=(3, 3, 3), mode="bilinear")(tensor)
    del tensor, values
    normalized = NormalizeIntensity(nonzero=True)(sampled)
    cropped = CropForeground(margin=10, k_divisible=(96, 96, 96), allow_smaller=True)(normalized)
    prepared = ScaleIntensity(minv=-1, maxv=1)(GaussianSmooth(sigma=0.4)(cropped))
    del normalized, cropped
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    with GPU_LOCK:
        model = network().to(device)
        try:
            with torch.inference_mode(), torch.autocast(device_type=device.type, dtype=torch.float16, enabled=device.type == "cuda"):
                # Half-precision CPU stitching keeps the 105-class tensor out
                # of VRAM and within the memory available on this workstation.
                model_input = prepared.to(dtype=torch.float16 if device.type == "cuda" else torch.float32)
                logits = sliding_window_inference(model_input[None], roi_size=(96, 96, 96), sw_batch_size=1,
                    predictor=model, overlap=0.25, mode="gaussian", sw_device=device, device=torch.device("cpu"))
                labels = logits.argmax(dim=1)[0].cpu().numpy().astype(np.uint8)
                del logits
        finally:
            # Leave room for CAM and the browser on the 4 GB GPU.
            model.to("cpu")
            if device.type == "cuda":
                torch.cuda.empty_cache()
    mapped = np.zeros_like(labels, dtype=np.uint8)
    for source_label, target_label in LABEL_MAP.items():
        mapped[labels == source_label] = target_label
    mask_image = nib.Nifti1Image(mapped, np.asarray(prepared.affine))
    aligned = resample_from_to(mask_image, source, order=0, cval=0)
    mask = np.asarray(aligned.dataobj, dtype=np.uint8)[::-1, ::-1, :].transpose(2, 1, 0).copy()
    return mask, {
        "method": "MONAI SegResNet wholeBody_ct_segmentation lowres",
        "bundle_revision": MODEL_REVISION, "checkpoint_md5": CHECKPOINT_MD5,
        "checkpoint_sha256": hashlib.sha256(CHECKPOINT.read_bytes()).hexdigest(),
        "sampling_mm": 3, "device": str(device), "label_map": LABEL_MAP,
        "grid": "same_as_render_ct", "is_manual_ground_truth": False,
        "preprocessing": "out-of-field values below -1500 HU replaced by -1000 HU before MONAI normalization",
        "training_transforms": "NormalizeIntensity(nonzero), CropForeground(margin=10,k_divisible=96), GaussianSmooth(sigma=0.4), ScaleIntensity(-1,1)",
        "implementation_version": SEGMENTATION_VERSION,
        "roi_size": [96, 96, 96],
        "present_labels": [int(value) for value in np.unique(mask) if value],
    }
