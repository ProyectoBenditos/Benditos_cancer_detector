"""
Script de Prueba Local e Interactiva — OncoScan 2.0 (DenseNet-121 + MLP + XGBoost + CLID)
=========================================================================================
Uso:
  1. Prueba automática con casos reales (.dcm DICOM y .png) del proyecto:
     python docs/modelo-v2-densenet/probar_modelo_v2.py

  2. Probar un archivo específico (.dcm, .png, .jpg) con variables clínicas opcionales:
     python docs/modelo-v2-densenet/probar_modelo_v2.py --archivo dicoms_muestra/estudio_01_nodulo.dcm
"""

import os
import sys
import time
import glob
import argparse
import cv2
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.models as models
import matplotlib.pyplot as plt

# Importar arquitecturas y preprocesador desde nuestro módulo v2
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)

from entrenamiento_e_inferencia_v2 import (
    IMSIZE,
    OPERATING_THRESHOLD,
    FEAT_MEAN_V2,
    FEAT_STD_V2,
    CLID_SUBTYPE_CLASSES,
    IHQ_RECOMMENDATIONS_GPC36,
    OncoScanDenseNetMultimodal,
    build_clid_subtype_model,
    preprocesar_archivo_tc,
)

try:
    from xgboost import XGBClassifier
    HAS_XGB = True
except ImportError:
    HAS_XGB = False


def cargar_sistema_oncoscan_v2(weights_dir=None, device=None):
    """Carga los pesos de OncoScan 2.0 Multimodal, el calibrador LIDC, XGBoost y el modelo CLID."""
    if weights_dir is None:
        weights_dir = os.path.join(SCRIPT_DIR, "weights")
    if device is None:
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    t0 = time.perf_counter()

    # 1. Modelo Principal OncoScan 2.0 (DenseNet-121 + LIDC Domain + Clinical MLP)
    model_v2 = OncoScanDenseNetMultimodal(n_features=8).to(device)
    ckpt_v2 = os.path.join(weights_dir, "best_model_densenet_v2.pth")
    model_v2.load_state_dict(torch.load(ckpt_v2, map_location=device, weights_only=True))
    model_v2.eval()

    # 2. Proyector calibrado de dominio LIDC
    domain_calib_net = models.resnet18(weights=None)
    domain_calib_net.fc = nn.Sequential(
        nn.Dropout(0.5), nn.Linear(512, 64), nn.ReLU(), nn.Linear(64, 1), nn.Sigmoid()
    )
    ckpt_dom = os.path.join(weights_dir, "domain_lidc_encoder.pth")
    if os.path.exists(ckpt_dom):
        domain_calib_net.load_state_dict(torch.load(ckpt_dom, map_location=device, weights_only=True))
    domain_calib_net = domain_calib_net.to(device).eval()

    # 3. Clasificador de segundo nivel XGBoost
    xgb_clf = None
    xgb_path = os.path.join(weights_dir, "xgb_head_v2.json")
    if HAS_XGB and os.path.exists(xgb_path):
        xgb_clf = XGBClassifier()
        xgb_clf.load_model(xgb_path)

    # 4. Clasificador de Subtipo Histológico CLID (Agente Patólogo)
    clid_model = build_clid_subtype_model(num_classes=len(CLID_SUBTYPE_CLASSES)).to(device)
    ckpt_clid = os.path.join(weights_dir, "best_model_clid_subtype.pth")
    if os.path.exists(ckpt_clid):
        clid_model.load_state_dict(torch.load(ckpt_clid, map_location=device, weights_only=True))
    clid_model.eval()

    load_ms = (time.perf_counter() - t0) * 1000.0
    return {
        "device": device,
        "model_v2": model_v2,
        "domain_calib_net": domain_calib_net,
        "xgb_clf": xgb_clf,
        "clid_model": clid_model,
        "load_ms": load_ms,
    }


def generar_hirescam_v2(model_v2, tensor_v2, feat_tensor, device, target_size=IMSIZE):
    """Genera el mapa de calor HiResCAM (128x128) multiplicando activaciones * gradientes."""
    model_v2.eval()
    acts, grads = {}, {}

    def get_act(name):
        def hook(module, inp, out):
            acts[name] = out.detach()
        return hook

    def get_grad(name):
        def hook(module, grad_in, grad_out):
            grads[name] = grad_out[0].detach()
        return hook

    h1 = model_v2.visual_features.denseblock4.register_forward_hook(get_act("dense4"))
    h2 = model_v2.visual_features.denseblock4.register_full_backward_hook(get_grad("dense4"))
    h3 = model_v2.domain_encoder.layer4.register_forward_hook(get_act("dom4"))
    h4 = model_v2.domain_encoder.layer4.register_full_backward_hook(get_grad("dom4"))

    model_v2.zero_grad()
    x_in = tensor_v2.clone().detach().to(device).requires_grad_(True)
    f_in = feat_tensor.to(device)
    score_t, aux_t = model_v2(x_in, f_in, return_aux=True)
    (score_t + 0.5 * aux_t).backward()

    h1.remove(); h2.remove(); h3.remove(); h4.remove()

    cams = []
    for k in ["dense4", "dom4"]:
        hires_map = (acts[k] * grads[k]).sum(dim=1).squeeze(0)
        hires_map = torch.relu(hires_map).cpu().numpy()
        c = cv2.resize(hires_map, (target_size, target_size), interpolation=cv2.INTER_CUBIC)
        if c.max() > c.min():
            c = (c - c.min()) / (c.max() - c.min() + 1e-8)
        cams.append(c)

    cam = 0.50 * cams[0] + 0.50 * cams[1]
    cam = cv2.GaussianBlur(cam, (5, 5), 0)
    if cam.max() > cam.min():
        cam = (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)
    return cam


def evaluar_caso_completo(bundle, file_path, clinical_feats=None):
    """
    Ejecuta inferencia completa sobre un archivo DICOM (.dcm) o Imagen (.png/.jpg):
      - Preprocesamiento (Ventana Pulmonar HU si es DICOM + Letterbox 128x128 + CLAHE)
      - Inferencia Multimodal TTA 4x + XGBoost
      - Explicabilidad HiResCAM (128x128)
      - Subtipado Histológico CLID (Agente Patólogo)
      - Medición desglosada de latencia en milisegundos (ms)
    """
    device = bundle["device"]
    model_v2 = bundle["model_v2"]
    domain_calib_net = bundle["domain_calib_net"]
    xgb_clf = bundle["xgb_clf"]
    clid_model = bundle["clid_model"]

    if clinical_feats is None:
        # Vector clínico promedio de referencia cuando no se ingresan descriptores manuales
        clinical_feats = FEAT_MEAN_V2.copy()
    else:
        clinical_feats = np.array(clinical_feats, dtype=np.float32)

    t_start = time.perf_counter()

    # 1. Preprocesamiento de archivo (.dcm o .png/.jpg)
    with open(file_path, "rb") as f:
        raw_bytes = f.read()
    tensor_v2, tensor_clid, canvas_gray, metadatos = preprocesar_archivo_tc(
        raw_bytes, filename=os.path.basename(file_path)
    )
    feat_norm = (clinical_feats - FEAT_MEAN_V2) / FEAT_STD_V2
    feat_tensor = torch.tensor(feat_norm, dtype=torch.float32).unsqueeze(0)
    t_pre = time.perf_counter()

    # 2. Inferencia con Test-Time Augmentation (TTA 4x) + Ensamble XGBoost
    with torch.no_grad():
        imgs_d = tensor_v2.to(device)
        feats_d = feat_tensor.to(device)

        p1 = model_v2(imgs_d, feats_d)
        p2 = model_v2(torch.flip(imgs_d, dims=[3]), feats_d)
        p3 = model_v2(torch.flip(imgs_d, dims=[2]), feats_d)
        p4 = model_v2(torch.rot90(imgs_d, k=1, dims=[2, 3]), feats_d)
        p_densenet_tta = float((0.45 * p1 + 0.25 * p2 + 0.15 * p3 + 0.15 * p4).item())

        img_64 = F.interpolate(imgs_d, size=(64, 64), mode="bilinear", align_corners=False)
        d1 = domain_calib_net(img_64)
        d2 = domain_calib_net(torch.flip(img_64, dims=[3]))
        p_dom_tta = float((0.65 * d1 + 0.35 * d2).item())

        p_tta = 0.50 * p_densenet_tta + 0.50 * p_dom_tta

        if xgb_clf is not None:
            emb = model_v2.extract_embeddings(imgs_d, feats_d).cpu().numpy()
            X_batch = np.column_stack([
                np.array([p_tta]),
                feat_tensor.numpy(),
                emb[:, :48],
                emb[:, 1024:1072],
                emb[:, -64:]
            ])
            p_xgb = float(xgb_clf.predict_proba(X_batch)[0, 1])
            score_final = 0.80 * p_tta + 0.20 * p_xgb
        else:
            p_xgb = p_tta
            score_final = p_tta

        # 3. Clasificador de Subtipo Histológico CLID
        clid_logits = clid_model(tensor_clid.to(device))
        clid_probs = F.softmax(clid_logits, dim=1).squeeze(0).cpu().numpy()
        # Si el estudio es positivo (score >= umbral), seleccionar el subtipo histológico tumoral más probable
        if score_final >= OPERATING_THRESHOLD:
            tumor_indices = [i for i, c in enumerate(CLID_SUBTYPE_CLASSES) if c != "normal"]
            best_sub_idx = tumor_indices[int(np.argmax([clid_probs[i] for i in tumor_indices]))]
        else:
            best_sub_idx = int(np.argmax(clid_probs))
        subtipo_pred = CLID_SUBTYPE_CLASSES[best_sub_idx]
        subtipo_conf = float(clid_probs[best_sub_idx])

    t_inf = time.perf_counter()

    # 4. Explicabilidad HiResCAM (128x128)
    cam = generar_hirescam_v2(model_v2, tensor_v2, feat_tensor, device)
    t_cam = time.perf_counter()

    if score_final < OPERATING_THRESHOLD:
        nivel = "BAJO (Negativo)"
    elif score_final < 0.65:
        nivel = "MEDIO (Sospechoso — Tamizaje Positivo)"
    else:
        nivel = "ALTO (Alta Sospecha de Malignidad)"

    return {
        "archivo": os.path.basename(file_path),
        "formato": "DICOM (.dcm)" if file_path.lower().endswith(".dcm") else "Imagen (.png/.jpg)",
        "score_final": round(score_final, 4),
        "score_tta_nn": round(p_tta, 4),
        "score_xgboost": round(p_xgb, 4),
        "prediccion_binaria": 1 if score_final >= OPERATING_THRESHOLD else 0,
        "nivel_riesgo": nivel,
        "subtipo_clid": subtipo_pred,
        "subtipo_confianza": round(subtipo_conf, 4),
        "orientacion_ihq_gpc36": IHQ_RECOMMENDATIONS_GPC36[subtipo_pred],
        "metadatos_dicom": metadatos,
        "tiempos_ms": {
            "preprocesamiento_ms": round((t_pre - t_start) * 1000.0, 2),
            "inferencia_tta_xgb_clid_ms": round((t_inf - t_pre) * 1000.0, 2),
            "hirescam_128x128_ms": round((t_cam - t_inf) * 1000.0, 2),
            "total_ms": round((t_cam - t_start) * 1000.0, 2),
        },
        "canvas_gray": canvas_gray,
        "cam": cam,
    }


def main():
    parser = argparse.ArgumentParser(description="Probar OncoScan 2.0 localmente con archivos DICOM o PNG/JPG.")
    parser.add_argument("--archivo", type=str, default=None, help="Ruta a un archivo .dcm, .png o .jpg")
    args = parser.parse_args()

    print("=" * 84)
    print("🔬 BANCO DE PRUEBAS LOCAL — ONCOSCAN 2.0 (DENSENET-121 + MLP + XGBOOST + CLID)")
    print("=" * 84)
    bundle = cargar_sistema_oncoscan_v2()
    print(f"✓ Dispositivo de inferencia : {bundle['device']}")
    print(f"✓ Modelos cargados en       : {bundle['load_ms']:.1f} ms")

    project_root = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))

    if args.archivo:
        test_files = [
            (args.archivo, "Caso personalizado", [4.0, 5.5, 4.0, 4.0, 3.0, 3.5, 4.5, 4.0])
        ]
    else:
        dcm_pos = os.path.join(project_root, "dicoms_muestra", "estudio_01_nodulo.dcm")
        dcm_neg = os.path.join(project_root, "dicoms_muestra", "estudio_04_sano.dcm")
        png_pos = os.path.join(project_root, "imagenes_demo", "caso_01_nodulo.png")
        png_neg = os.path.join(project_root, "imagenes_demo", "caso_03_sano.png")

        feats_pos = [4.2, 5.8, 4.0, 4.2, 3.0, 3.5, 4.8, 4.5]
        feats_neg = [2.0, 6.0, 3.5, 2.5, 1.0, 1.0, 3.0, 1.5]

        test_files = [
            (dcm_pos, "DICOM Real Con Nódulo", feats_pos),
            (dcm_neg, "DICOM Real Sano", feats_neg),
            (png_pos, "PNG Real Con Nódulo", feats_pos),
            (png_neg, "PNG Real Sano", feats_neg),
        ]
        test_files = [(p, desc, f) for p, desc, f in test_files if os.path.exists(p)]

    resultados = []
    for fpath, desc, feats in test_files:
        res = evaluar_caso_completo(bundle, fpath, clinical_feats=feats)
        res["descripcion"] = desc
        resultados.append(res)

        print("\n" + "-" * 84)
        print(f"📂 Caso: {desc} ({res['archivo']} — {res['formato']})")
        print(f"  • Score Final Calibrado (τ=0.35) : {res['score_final']:.4f}  [Red TTA: {res['score_tta_nn']:.4f} | XGBoost: {res['score_xgboost']:.4f}]")
        print(f"  • Nivel de Riesgo                : {res['nivel_riesgo']}")
        print(f"  • Agente Patólogo (Subtipo CLID) : {res['subtipo_clid'].upper()} (confianza: {res['subtipo_confianza']*100:.1f}%)")
        print(f"  • Recomendación IHQ (GPC 36)     : {res['orientacion_ihq_gpc36']}")
        if res["metadatos_dicom"]:
            print(f"  • Metadatos DICOM                : {res['metadatos_dicom']}")
        t = res["tiempos_ms"]
        print(f"  • Tiempo de Respuesta Total      : {t['total_ms']:.1f} ms "
              f"(Preproc: {t['preprocesamiento_ms']:.1f} ms | Inferencia: {t['inferencia_tta_xgb_clid_ms']:.1f} ms | HiResCAM: {t['hirescam_128x128_ms']:.1f} ms)")

    if resultados:
        fig, axes = plt.subplots(len(resultados), 3, figsize=(12, 3.5 * len(resultados)))
        if len(resultados) == 1:
            axes = np.expand_dims(axes, axis=0)
        fig.suptitle("Prueba Local OncoScan 2.0 — Soporte Dual DICOM (.dcm) y PNG + HiResCAM (128x128)", fontsize=13, fontweight="bold")

        for row, r in enumerate(resultados):
            gray = r["canvas_gray"]
            cam = r["cam"]
            rgb = cv2.cvtColor(gray, cv2.COLOR_GRAY2RGB)
            heat = cv2.cvtColor(cv2.applyColorMap((cam * 255).astype(np.uint8), cv2.COLORMAP_JET), cv2.COLOR_BGR2RGB)
            overlay = cv2.addWeighted(rgb, 0.58, heat, 0.42, 0)

            axes[row, 0].imshow(gray, cmap="gray")
            axes[row, 0].set_title(f"{r['descripcion']}\n({r['archivo']})", fontsize=9, fontweight="bold")
            axes[row, 0].axis("off")

            axes[row, 1].imshow(cam, cmap="jet")
            axes[row, 1].set_title(f"HiResCAM 128x128 ({r['tiempos_ms']['total_ms']:.0f} ms)", fontsize=9, fontweight="bold")
            axes[row, 1].axis("off")

            color = "#e11d48" if r["prediccion_binaria"] == 1 else "#0d9488"
            axes[row, 2].imshow(overlay)
            axes[row, 2].set_title(
                f"Score: {r['score_final']:.3f} | Subtipo: {r['subtipo_clid']}",
                fontsize=9, color=color, fontweight="bold"
            )
            axes[row, 2].axis("off")

        out_plot = os.path.join(SCRIPT_DIR, "graficas", "prueba_local_dicom_y_png_v2.png")
        plt.tight_layout()
        plt.savefig(out_plot, dpi=150, bbox_inches="tight")
        plt.close(fig)
        print("\n" + "=" * 84)
        print(f"✓ Reporte visual de prueba guardado en: {out_plot}")
        print("=" * 84)


if __name__ == "__main__":
    main()

