"""
OncoScan 2.0 — Pipeline de Entrenamiento e Inferencia Clínica Multimodal
========================================================================
Arquitectura:
  1. Modelo Principal (Detección y Malignidad Multimodal en LIDC-IDRI):
     - Rama Visual 1: DenseNet-121 (1024 canales en denseblock4, preentrenada + fine-tuning)
     - Rama Visual 2: Encoder de Dominio TC LIDC-IDRI (ResNet-18, 512 canales)
     - Rama Clínica Tabular: MLP con BatchNorm1d y GELU (8 -> 64 -> 64 dims)
     - Clasificador de Segundo Nivel: XGBoost (scale_pos_weight=2.2) + TTA 4x
     - Función de Pérdida: AsymmetricFocalLoss (alpha_pos=0.78, gamma_pos=1.0, gamma_neg=2.0)
     - Explicabilidad: HiResCAM Multimodal a resolución nativa 128x128

  2. Modelo Secundario / Agente Patólogo (Subtipado Histológico en TC - Dataset CLID):
     - DenseNet-121 de 4 clases sobre TC ('adenocarcinoma', 'large_cell', 'normal', 'squamous_cell')
     - Orienta el panel de inmunohistoquímica (IHQ) según GPC 36 MinSalud Colombia.

Formatos soportados en inferencia:
  - Archivos DICOM (.dcm): Aplica transformación lineal RescaleSlope/RescaleIntercept a
    Unidades Hounsfield (HU) y ventana pulmonar clínica (WL = -600 HU, WW = 1500 HU).
  - Imágenes (.png, .jpg, .jpeg): Cortes axiales TC pre-ventaneados en escala de grises.
"""

import io
import os
import json
import cv2
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.models as models
from PIL import Image

try:
    import pydicom
    HAS_PYDICOM = True
except ImportError:
    HAS_PYDICOM = False

try:
    from xgboost import XGBClassifier
    HAS_XGB = True
except ImportError:
    HAS_XGB = False


# ── CONSTANTES CLÍNICAS Y DE NORMALIZACIÓN (PARTICIÓN ZERO-LEAKAGE TRAIN) ────
IMSIZE = 128
HU_CENTER = -600
HU_WIDTH = 1500
OPERATING_THRESHOLD = 0.35

FEATURE_COLS = [
    "subtlety", "calcification", "sphericity", "margin",
    "lobulation", "spiculation", "texture", "malignancy"
]

FEAT_MEAN_V2 = np.array(
    [3.788, 5.678, 3.865, 3.987, 1.740, 1.673, 4.481, 2.870], dtype=np.float32
)
FEAT_STD_V2 = np.array(
    [0.693, 0.623, 0.482, 0.719, 0.701, 0.762, 0.734, 0.720], dtype=np.float32
)

CLID_SUBTYPE_CLASSES = ["adenocarcinoma", "large_cell", "normal", "squamous_cell"]

IHQ_RECOMMENDATIONS_GPC36 = {
    "adenocarcinoma": "Sugiere linaje glandular (Adenocarcinoma). Priorizar panel IHQ: TTF-1 y Napsina A, seguido de perfil molecular EGFR / ALK / ROS1 / PD-L1 (GPC 36 MinSalud).",
    "squamous_cell": "Sugiere diferenciación escamosa (Carcinoma Escamocelular). Priorizar panel IHQ: p40 (alta especificidad), p63 y CK5/6.",
    "large_cell": "Sugiere Carcinoma de Células Grandes indiferenciado. Requiere agotamiento diagnóstico con panel IHQ dual (TTF-1 + p40) y marcadores neuroendocrinos (CD56, Sinaptofisina, Cromogranina).",
    "normal": "Parénquima pulmonar sin patrón radiológico de subtipo neoplásico en clasificador CLID."
}


# ── DEFINICIÓN DE ARQUITECTURAS PYTORCH ──────────────────────────────────────
class AsymmetricFocalLoss(nn.Module):
    """
    Penaliza asimétricamente los Falsos Negativos (FN):
    - alpha_pos = 0.78 (peso 3.5x mayor sobre nódulos positivos)
    - gamma_pos = 1.0, gamma_neg = 2.0
    """
    def __init__(self, alpha_pos=0.78, gamma_pos=1.0, gamma_neg=2.0, eps=1e-7):
        super().__init__()
        self.alpha_pos = alpha_pos
        self.alpha_neg = 1.0 - alpha_pos
        self.gamma_pos = gamma_pos
        self.gamma_neg = gamma_neg
        self.eps = eps

    def forward(self, probs, targets):
        probs = torch.clamp(probs, self.eps, 1.0 - self.eps)
        loss_pos = -self.alpha_pos * ((1.0 - probs) ** self.gamma_pos) * targets * torch.log(probs)
        loss_neg = -self.alpha_neg * (probs ** self.gamma_neg) * (1.0 - targets) * torch.log(1.0 - probs)
        return (loss_pos + loss_neg).mean()


class OncoScanDenseNetMultimodal(nn.Module):
    """
    Arquitectura Híbrida OncoScan 2.0:
      - DenseNet-121 (1024-D)
      - Encoder de Dominio TC LIDC-IDRI (ResNet-18, 512-D)
      - Clinical Tabular MLP (64-D)
    """
    def __init__(self, n_features=8):
        super().__init__()
        densenet = models.densenet121(weights=None)
        self.visual_features = densenet.features
        self.visual_pool = nn.AdaptiveAvgPool2d((1, 1))
        self.visual_dim = 1024
        self.densenet_aux = nn.Linear(1024, 1)

        domain_net = models.resnet18(weights=None)
        domain_net.fc = nn.Identity()
        self.domain_encoder = domain_net
        self.domain_dim = 512

        self.clinical_encoder = nn.Sequential(
            nn.Linear(n_features, 64),
            nn.BatchNorm1d(64),
            nn.GELU(),
            nn.Dropout(0.25),
            nn.Linear(64, 64),
            nn.BatchNorm1d(64),
            nn.GELU(),
        )

        self.fusion_head = nn.Sequential(
            nn.Linear(1024 + 512 + 64, 256),
            nn.BatchNorm1d(256),
            nn.GELU(),
            nn.Dropout(0.35),
            nn.Linear(256, 64),
            nn.BatchNorm1d(64),
            nn.GELU(),
            nn.Dropout(0.20),
            nn.Linear(64, 1),
            nn.Sigmoid(),
        )

    def extract_embeddings(self, img, feat):
        v_map = self.visual_features(img)
        v_map = F.relu(v_map, inplace=False)
        v_emb = torch.flatten(self.visual_pool(v_map), 1)
        img_64 = F.interpolate(img, size=(64, 64), mode="bilinear", align_corners=False)
        d_emb = self.domain_encoder(img_64)
        c_emb = self.clinical_encoder(feat)
        return torch.cat([v_emb, d_emb, c_emb], dim=1)

    def forward(self, img, feat, return_aux=False):
        v_map = self.visual_features(img)
        v_map = F.relu(v_map, inplace=False)
        v_emb = torch.flatten(self.visual_pool(v_map), 1)
        img_64 = F.interpolate(img, size=(64, 64), mode="bilinear", align_corners=False)
        d_emb = self.domain_encoder(img_64)
        c_emb = self.clinical_encoder(feat)
        combined = torch.cat([v_emb, d_emb, c_emb], dim=1)
        out = self.fusion_head(combined)
        if return_aux:
            aux_prob = torch.sigmoid(self.densenet_aux(v_emb))
            return out, aux_prob
        return out


def build_clid_subtype_model(num_classes=4):
    """Instancia el clasificador DenseNet-121 de subtipo histológico entrenado en CLID."""
    subtype_model = models.densenet121(weights=None)
    subtype_model.classifier = nn.Sequential(
        nn.Dropout(0.35),
        nn.Linear(1024, num_classes)
    )
    return subtype_model


# ── PREPROCESAMIENTO UNIFICADO PARA DICOM (.DCM) E IMÁGENES (.PNG/.JPG) ──────
def aplicar_ventana_pulmon_hu(pixels_hu):
    """Convierte Unidades Hounsfield (HU) a escala [0, 255] usando ventana pulmonar estándar."""
    hu_min = HU_CENTER - HU_WIDTH / 2.0  # -1350 HU
    hu_max = HU_CENTER + HU_WIDTH / 2.0  # +150 HU
    clipped = np.clip(pixels_hu, hu_min, hu_max)
    norm = (clipped - hu_min) / (hu_max - hu_min)
    return (norm * 255.0).astype(np.uint8)


def preprocesar_archivo_tc(file_bytes, filename="", target_size=IMSIZE):
    """
    Recibe bytes de un archivo DICOM (.dcm) o imagen (.png/.jpg/.jpeg) y devuelve:
      - tensor_v2 (1, 3, 128, 128): Tensor isotrópico con fusión CLAHE para OncoScan 2.0
      - tensor_clid (1, 3, 128, 128): Tensor multicanal [raw, clahe_std, clahe_soft] para CLID
      - canvas_gray (128, 128): Imagen base en escala de grises con Letterbox
      - metadatos (dict): Metadatos DICOM si aplica
    """
    metadatos = {}
    if filename.lower().endswith(".dcm"):
        if not HAS_PYDICOM:
            raise RuntimeError("Se requiere pydicom para procesar archivos .dcm")
        dcm = pydicom.dcmread(io.BytesIO(file_bytes))
        pixels = dcm.pixel_array.astype(np.float32)
        slope = float(getattr(dcm, "RescaleSlope", 1.0))
        intercept = float(getattr(dcm, "RescaleIntercept", 0.0))
        pixels_hu = pixels * slope + intercept
        img_np = aplicar_ventana_pulmon_hu(pixels_hu)
        metadatos = {
            "Modality": str(getattr(dcm, "Modality", "CT")),
            "SliceThickness": str(getattr(dcm, "SliceThickness", "N/A")),
            "KVP": str(getattr(dcm, "KVP", "N/A")),
        }
    else:
        img_pil = Image.open(io.BytesIO(file_bytes)).convert("L")
        img_np = np.array(img_pil, dtype=np.uint8)

    orig_h, orig_w = img_np.shape[:2]
    scale = min(target_size / max(orig_w, 1), target_size / max(orig_h, 1))
    new_w = max(1, int(round(orig_w * scale)))
    new_h = max(1, int(round(orig_h * scale)))
    resized = cv2.resize(img_np, (new_w, new_h), interpolation=cv2.INTER_CUBIC)

    canvas = np.zeros((target_size, target_size), dtype=np.uint8)
    pad_x = (target_size - new_w) // 2
    pad_y = (target_size - new_h) // 2
    canvas[pad_y:pad_y + new_h, pad_x:pad_x + new_w] = resized

    ch0 = canvas
    clahe_std = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(canvas)
    denoised = cv2.GaussianBlur(canvas, (3, 3), 0)
    clahe_soft = cv2.createCLAHE(clipLimit=1.5, tileGridSize=(4, 4)).apply(denoised)

    stack_3ch = np.stack([ch0, clahe_std, clahe_soft], axis=0).astype(np.float32) / 255.0
    base_ct = 0.88 * stack_3ch[0] + 0.12 * stack_3ch[2]
    tensor_v2 = torch.from_numpy(np.stack([base_ct, base_ct, base_ct], axis=0)).unsqueeze(0)
    tensor_clid = torch.from_numpy(stack_3ch).unsqueeze(0)

    return tensor_v2, tensor_clid, canvas, metadatos

