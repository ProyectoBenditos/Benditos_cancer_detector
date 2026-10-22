"""Real, local inference using the checked-in OncoScan checkpoints.

No image-matching cache, simulated CAM, synthetic subtype or hard-coded metrics.
CAM explains the multimodal neural fusion logit, not the XGBoost/TTA ensemble.
"""
import base64
from functools import lru_cache
import hashlib
import importlib.util
import io
from pathlib import Path
import threading

import cv2
import numpy as np
from PIL import Image
import torch
import torch.nn.functional as F
import torchvision.models as models
from xgboost import Booster, DMatrix

ROOT = Path(__file__).resolve().parents[4]
WEIGHTS = ROOT / "docs/modelo-v2-densenet/weights"
GPU_LOCK = threading.RLock()
FEATURES = ("subtlety", "calcification", "sphericity", "margin", "lobulation", "spiculation", "texture", "malignancy")


def png_b64(values):
    output = io.BytesIO()
    Image.fromarray(values.astype(np.uint8)).save(output, format="PNG")
    return base64.b64encode(output.getvalue()).decode("ascii")


def heat_rgb(values):
    # Monotonic cold-to-Cerise display; scalar attribution is stored separately.
    color = np.array([212, 0, 79], dtype=np.float32)
    return np.clip(values[..., None] * color, 0, 255).astype(np.uint8)


@lru_cache(maxsize=1)
def architecture():
    path = ROOT / "docs/modelo-v2-densenet/entrenamiento_e_inferencia_v2.py"
    spec = importlib.util.spec_from_file_location("oncoscan_v2_architecture", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class InferenceRuntime:
    def __init__(self):
        definitions = architecture()
        self.definitions = definitions
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        torch.set_num_threads(4)
        self.model = definitions.OncoScanDenseNetMultimodal().to(self.device).eval()
        self.domain = models.resnet18(weights=None)
        self.domain.fc = torch.nn.Sequential(torch.nn.Dropout(0.5), torch.nn.Linear(512, 64),
                                             torch.nn.ReLU(), torch.nn.Linear(64, 1), torch.nn.Sigmoid())
        self.domain = self.domain.to(self.device).eval()
        self.subtype = definitions.build_clid_subtype_model().to(self.device).eval()
        self.xgb = Booster()
        self.hashes = {}
        for filename, model in [("best_model_densenet_v2.pth", self.model),
                                ("domain_lidc_encoder.pth", self.domain),
                                ("best_model_clid_subtype.pth", self.subtype)]:
            path = WEIGHTS / filename
            model.load_state_dict(torch.load(path, map_location=self.device, weights_only=True), strict=True)
            self.hashes[filename] = hashlib.sha256(path.read_bytes()).hexdigest()
        self.xgb.load_model(WEIGHTS / "xgb_head_v2.json")
        self.hashes["xgb_head_v2.json"] = hashlib.sha256((WEIGHTS / "xgb_head_v2.json").read_bytes()).hexdigest()

    def cam(self, image, features):
        captured = {}
        hooks = [self.model.visual_features.denseblock4.register_forward_hook(lambda _m, _i, output: captured.update(visual=output)),
                 self.model.domain_encoder.layer4.register_forward_hook(lambda _m, _i, output: captured.update(domain=output)),
                 self.model.fusion_head[-2].register_forward_hook(lambda _m, _i, output: captured.update(logit=output))]
        try:
            with torch.enable_grad():
                image = image.detach().requires_grad_(True)
                score = self.model(image, features)
                layers = (captured["visual"], captured["domain"])
                gradients = torch.autograd.grad(captured["logit"].sum(), layers)
                maps = [F.interpolate(torch.relu((act * grad).sum(1, keepdim=True)), size=(128, 128),
                                      mode="bilinear", align_corners=False) for act, grad in zip(layers, gradients)]
                raw = (maps[0] + maps[1]).squeeze().detach().cpu().numpy()
                return raw, float(score.detach().item()), [list(layer.shape[-2:]) for layer in layers]
        finally:
            for hook in hooks:
                hook.remove()

    def features(self, supplied):
        values = np.asarray([supplied.get(name, float(self.definitions.FEAT_MEAN_V2[index]))
                             for index, name in enumerate(FEATURES)], dtype=np.float32)
        if not np.isfinite(values).all():
            raise ValueError("Las variables clínicas deben ser finitas.")
        normalized = (values - self.definitions.FEAT_MEAN_V2) / self.definitions.FEAT_STD_V2
        return torch.from_numpy(normalized[None]).to(self.device)

    def slice_cam(self, gray, supplied):
        output = io.BytesIO()
        Image.fromarray(gray.astype(np.uint8)).save(output, format="PNG")
        image, _subtype, _canvas, _meta = self.definitions.preprocesar_archivo_tc(output.getvalue(), filename="slice.png")
        with GPU_LOCK:
            raw, score, native = self.cam(image.to(self.device), self.features(supplied))
        height, width = gray.shape
        scale = min(128 / width, 128 / height)
        new_width, new_height = max(1, round(width * scale)), max(1, round(height * scale))
        left, top = (128 - new_width) // 2, (128 - new_height) // 2
        # Undo the exact training letterbox before mapping into the volume.
        field = cv2.resize(raw[top:top + new_height, left:left + new_width], (width, height), interpolation=cv2.INTER_LINEAR)
        return field, score, native

    def predict(self, data, filename, supplied):
        multiframe = False
        if filename.lower().endswith(".dcm"):
            import pydicom
            multiframe = int(getattr(pydicom.dcmread(io.BytesIO(data), stop_before_pixels=True), "NumberOfFrames", 1)) > 1
        if filename.lower().endswith((".zip", ".nii", ".nii.gz")) or multiframe:
            from app.services.ct_volume import read_ct
            volume = read_ct(data, filename)
            index = len(volume.hu) // 2
            gray = ((np.clip(volume.hu[index], -1350, 150) + 1350) / 1500 * 255).astype(np.uint8)
            output = io.BytesIO()
            Image.fromarray(gray).save(output, format="PNG")
            result = self.predict(output.getvalue(), "keyframe.png", supplied)
            result["keyframe_base64"] = base64.b64encode(output.getvalue()).decode("ascii")
            result["source_slice_index"] = index
            result["explicabilidad"]["source_slice_index"] = index
            return result
        image, subtype_image, canvas, _meta = self.definitions.preprocesar_archivo_tc(data, filename=filename)
        image, subtype_image = image.to(self.device), subtype_image.to(self.device)
        feature_tensor = self.features(supplied)
        with GPU_LOCK:
            with torch.no_grad():
                views = [image, image.flip(3), image.flip(2), image.rot90(1, (2, 3))]
                neural = sum(weight * self.model(view, feature_tensor) for weight, view in zip([0.45, 0.25, 0.15, 0.15], views))
                small = F.interpolate(image, size=(64, 64), mode="bilinear", align_corners=False)
                domain = 0.65 * self.domain(small) + 0.35 * self.domain(small.flip(3))
                tta = float(((neural + domain) * 0.5).item())
                embedding = self.model.extract_embeddings(image, feature_tensor).cpu().numpy()
                xgb_input = np.column_stack([np.array([tta]), feature_tensor.cpu().numpy(), embedding[:, :48],
                                             embedding[:, 1024:1072], embedding[:, -64:]])
                score = float(0.8 * tta + 0.2 * self.xgb.predict(DMatrix(xgb_input))[0])
                subtype = F.softmax(self.subtype(subtype_image), dim=1).squeeze().cpu().numpy()
            raw, _single_score, native = self.cam(image, feature_tensor)
        maximum = float(raw.max())
        scalar = raw / maximum if maximum > 0 else np.zeros_like(raw)
        colors = heat_rgb(scalar)
        overlay = (np.repeat(canvas[..., None], 3, axis=-1) * (1 - scalar[..., None] * 0.65) + colors * 0.65).astype(np.uint8)
        classes = self.definitions.CLID_SUBTYPE_CLASSES
        top = int(np.argmax(subtype))
        names = {"adenocarcinoma": "Adenocarcinoma", "large_cell": "Células grandes",
                 "normal": "Normal", "squamous_cell": "Escamoso"}
        probabilities = {key: float(probability) for key, probability in zip(classes, subtype)}
        return {
            "score": score, "nivel_riesgo": "ALTO" if score >= 0.65 else "MEDIO" if score >= 0.35 else "BAJO",
            "recomendacion": "Revisar la predicción y su concordancia con el estudio completo.",
            "modelo_version": "multimodal-v2.0-densenet-real",
            "subtipo_histologico": {"prediccion": names[classes[top]], "codigo": classes[top],
                "confianza": float(subtype[top]), "probabilidad": float(subtype[top]),
                "probabilidades": probabilities, "distribucion": probabilities},
            "explicabilidad": {"metodo": "HiResCAM", "target": "multimodal_fusion_logit",
                "scope": "neural_component_single_view", "native_layer_shapes": native,
                "mapa_base64": png_b64(colors), "scalar_base64": png_b64(scalar * 255),
                "overlay_base64": png_b64(overlay), "weights_sha256": self.hashes},
            "lobar_info": None,
        }


@lru_cache(maxsize=1)
def runtime():
    return InferenceRuntime()
