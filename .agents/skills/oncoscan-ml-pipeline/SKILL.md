---
name: oncoscan-ml-pipeline
description: >-
  Master orchestration skill for OncoScan's medical AI pipeline. Enforces clinical-grade
  standards for lung nodule detection: dataset auditing (LIDC-IDRI / DICOM), patient-level
  leakage-free splitting, multimodal training (PyTorch ResNet-18 + clinical MLP), comprehensive
  medical evaluation (sensitivity >= 90%, specificity, AUC-ROC, threshold analysis),
  error analysis for false negative reduction, and certified Grad-CAM/HiResCAM explainability.
metadata:
  triggers: "oncoscan model, lung cancer AI, LIDC-IDRI pipeline, multimodal training, patient-level split, medical imaging ML, reduce false negatives, audit oncoscan, grad-cam oncoscan, monai lung nodule, train oncoscan model"
---

# OncoScan Medical AI Pipeline — Master Orchestration Skill

> **Single Source of Truth** for Machine Learning, Deep Learning, and Medical AI in **OncoScan Platform**.
> Aligns all installed agent skills (`imaging-data`, `model-assessment`, `model-scaffold`, `designing-leakage-safe-experiments`, `auditing-data-and-ground-truth`, `validating-models-and-claims`, `diagnosing-ml-failures`, `shipping-reproducible-results`) to OncoScan's specific clinical context.

---

## 1. Project Context & Technical Grounding

OncoScan assists radiologists in the early detection and risk stratification of suspected pulmonary nodules in thoracic CT scans:

* **Modality & Input:** Thoracic CT scans (DICOM or PNG/JPG slices) + 8 clinical/morphological variables from LIDC-IDRI consensus (`subtlety`, `calcification`, `sphericity`, `margin`, `lobulation`, `spiculation`, `texture`, `malignancy`).
* **Hounsfield Unit (HU) Window:** Lung Window: $\text{Window Center (WL)} = -600\,\text{HU}$, $\text{Window Width (WW)} = 1500\,\text{HU} \rightarrow \text{HU min} = -1350$, $\text{HU max} = +150$.
* **Current Production Model:** `multimodal-v1.1` (ResNet-18 visual encoder + 2-layer clinical MLP + 544D fusion layer $\rightarrow$ Sigmoid probability).
* **Explainability:** Grad-CAM over `layer3` and `layer4` with 55% CT + 45% JET heatmap overlay.

---

## 2. The 10-Step Canonical Clinical AI Lifecycle

```
[1. DATASET] ──► [2. AUDIT] ──► [3. PREPROCESS] ──► [4. PATIENT SPLIT] ──► [5. TRAINING]
                                                                                   │
[10. REPRODUCE] ◄── [9. GRAD-CAM] ◄── [8. ERROR ANALYSIS] ◄── [7. TEST] ◄── [6. VALIDATE]
```

### Step 1: Dataset & Ground Truth Integrity
* **Reference Skill:** `auditing-data-and-ground-truth` & `imaging-data`
* **Rules:**
  1. Never trust column names blindly. In LIDC-IDRI, ground truth is based on the consensus of 4 independent thoracic radiologists.
  2. Consensus definition:
     * Label 1 (Nodule/Malignant): $4/4$ radiologists agree.
     * Label 0 (No nodule/Benign): $\ge 3/4$ radiologists agree on absence.
     * Ambiguous cases ($1/4$ or $2/4$): **Must be discarded** from binary training to prevent label noise contamination.

### Step 2: Preprocessing & Intensity Harmonization
* **Reference Skill:** `imaging-data`
* **Rules:**
  1. For DICOM: Apply rescale slope and intercept: $\text{HU} = \text{pixel} \times \text{slope} + \text{intercept}$.
  2. Clip strictly to Lung Window $[-1350, +150]\,\text{HU}$ and normalize to $[0, 1]$.
  3. Preprocessing parameters (e.g. Z-score mean and std for the 8 features) must be **computed strictly on the Training set** and frozen (`FEAT_MEAN`, `FEAT_STD`). Never compute normalization statistics over the entire dataset (Leakage Violation).

### Step 3: Leakage-Safe Patient-Level Partitioning (CRITICAL RULE)
* **Reference Skill:** `designing-leakage-safe-experiments` & `model-assessment` (Part A)
* **Mandatory Requirements:**
  1. **PATIENT-LEVEL DISJOINTNESS:** Slices/nodules belonging to the same `patient_id` must NEVER exist in both train and test/val partitions. Violating this causes shortcut learning (the network memorizes patient-specific thorax geometry, artificially inflating accuracy).
  2. Partitioning ratio: 70% Train, 15% Validation, 15% Test.
  3. The split must be locked with a deterministic seed and exported to `splits/split_assignment.csv` (`patient_id,split`) and `splits/split_seed.txt`.
  4. Execute the leakage audit script before touching any model:
     ```bash
     python .agents/skills/model-assessment/scripts/check_split_leakage.py --splits splits/split_assignment.csv --strict
     ```

### Step 4: Multimodal Model Training
* **Reference Skill:** `model-scaffold` & `model-selection`
* **Rules:**
  1. Transfer Learning Hygiene: Keep `layer1`, `layer2`, `layer3` frozen during initial epochs; fine-tune `layer4` and classification head.
  2. Data Augmentation: Fit on Train ONLY. Apply clinically valid augmentations (random flips, rotations $\le 15^\circ$, Gaussian blur, subtle brightness/contrast). Never distort biological aspect ratios.
  3. Model checkpoints: Save checkpoints based strictly on **Validation Loss / Validation AUC**, NEVER based on Test performance.

### Step 5: Independent Evaluation & Multi-Metric Protocol (CRITICAL RULE)
* **Reference Skill:** `validating-models-and-claims` & `model-assessment` (Part B)
* **Mandatory Metrics (Accuracy alone is prohibited):**
  * **Sensitivity (Recall):** Primary clinical metric ($\ge 90\%$ baseline, target $\ge 95\%$ for v1.2).
  * **Specificity:** Healthy tissue / non-nodule rule-out capability ($\ge 85\%$).
  * **Precision (PPV) & F1-Score.**
  * **AUC-ROC & Precision-Recall AUC (PR-AUC):** Essential for class-imbalanced medical cohorts.
  * **Confusion Matrix:** Full breakdown of $TN, FP, FN, TP$.
  * **Confidence Intervals:** 95% Bootstrap CI over 1000 resamples.
  * **Test Set Sanctity:** The test set is evaluated **once** at the end. Never tune hyperparameters or make architectural choices by repeatedly inspecting test set scores.

### Step 6: Threshold Analysis & False Negative Reduction
* **Reference Skill:** `diagnosing-ml-failures`
* **Rules:**
  1. In oncology, **False Negatives (missed tumors) are the highest clinical risk**.
  2. Perform threshold sweeps ($[0.20, 0.60]$ in steps of $0.05$) on the **Validation Set** to determine the optimal decision threshold (e.g., threshold $0.30 - 0.35$ reduces missed nodules significantly while preserving specificity $>86\%$).
  3. Lock the decision threshold before evaluating on the final Test partition.

### Step 7: Explainable AI & Grad-CAM Validation
* **Reference Skill:** `model-assessment` (Part D)
* **Rules:**
  1. Grad-CAM heatmaps must be evaluated over the entire cohort, not cherry-picked.
  2. Run Adebayo sanity checks: Randomizing model weights must collapse the heatmap. If the heatmap stays unchanged, the explanation is an edge-detector artifact, not genuine feature attribution.
  3. Strive for HiResCAM to avoid global average pooling blur and corner diffusion.

### Step 8: Reproducibility & Clean-Room Handoff
* **Reference Skill:** `shipping-reproducible-results`
* **Deliverables:**
  * Frozen weights: `best_model_multimodal.pth` with SHA256 checksum.
  * Configuration: exact hyperparameter YAML, seed, and environment locks.
  * Documentation: complete evaluation report matching the format in `docs/evaluacion-v1.1-plan-v1.2.md`.

---

## 3. Quick Command Reference

```bash
# 1. Audit split for patient leakage:
python .agents/skills/model-assessment/scripts/check_split_leakage.py --splits <splits.csv> --strict

# 2. Audit preprocessing pipeline for data leakage:
python .agents/skills/imaging-data/scripts/check_preprocessing_leakage.py --manifest <manifest.json> --strict

# 3. Audit metric reporting against CLAIM / Metrics Reloaded standards:
python .agents/skills/model-assessment/scripts/check_metric_reporting.py --results <results.json> --strict

# 4. Audit Grad-CAM explainability report:
python .agents/skills/model-assessment/scripts/check_explainability_report.py --manifest <xai_manifest.json> --strict
```
