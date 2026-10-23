// ─── Types ────────────────────────────────────────────────────────────
export interface AccuracyDataPoint {
  epoch: number;
  train: number;
  val: number;
}

export interface ROCDataPoint {
  fpr: number;
  tpr: number;
}

export interface RiskDistributionPoint {
  level: string;
  count: number;
  percentage: number;
  color: string;
}

export interface ScoreHistogramPoint {
  binStart: number;
  binEnd: number;
  count: number;
  risk: "BAJO" | "MEDIO" | "ALTO";
  binLabel: string;
}

export interface FeatureData {
  name: string;
  nameEs: string;
  scale: string;
  description: string;
}

export interface HistologicalSubtype {
  id: string;
  name: string;
  code: string;
  frequency: string;
  color: string;
  description: string;
  biomarkers: string;
}

// ─── Accuracy per Epoch (DenseNet-121 Fine-Tuning, 45 epochs) ────────────
export const ACCURACY_DATA: AccuracyDataPoint[] = [
  { epoch: 1, train: 0.6120, val: 0.5840 },
  { epoch: 2, train: 0.6480, val: 0.6210 },
  { epoch: 3, train: 0.6830, val: 0.6570 },
  { epoch: 4, train: 0.7150, val: 0.6890 },
  { epoch: 5, train: 0.7420, val: 0.7180 },
  { epoch: 6, train: 0.7680, val: 0.7410 },
  { epoch: 7, train: 0.7910, val: 0.7630 },
  { epoch: 8, train: 0.8120, val: 0.7820 },
  { epoch: 9, train: 0.8300, val: 0.7990 },
  { epoch: 10, train: 0.8460, val: 0.8130 },
  { epoch: 12, train: 0.8650, val: 0.8320 },
  { epoch: 14, train: 0.8810, val: 0.8470 },
  { epoch: 16, train: 0.8930, val: 0.8590 },
  { epoch: 18, train: 0.9040, val: 0.8690 },
  { epoch: 20, train: 0.9120, val: 0.8770 },
  { epoch: 22, train: 0.9190, val: 0.8840 },
  { epoch: 24, train: 0.9250, val: 0.8900 },
  { epoch: 26, train: 0.9300, val: 0.8940 },
  { epoch: 28, train: 0.9340, val: 0.8980 },
  { epoch: 30, train: 0.9370, val: 0.9010 },
  { epoch: 32, train: 0.9400, val: 0.9030 },
  { epoch: 34, train: 0.9420, val: 0.9050 },
  { epoch: 36, train: 0.9440, val: 0.9070 },
  { epoch: 38, train: 0.9460, val: 0.9080 },
  { epoch: 40, train: 0.9480, val: 0.9090 },
  { epoch: 42, train: 0.9490, val: 0.9100 },
  { epoch: 45, train: 0.9510, val: 0.9104 },
];

// ─── Estado del modelo: qué versión documenta la página y cuál responde ──
export const MODEL_STATUS = {
  servingVersion: "multimodal-v1.2",
  documentedVersion: "multimodal-v2.0-densenet",
  documentedInProduction: false,
} as const;

// ─── Cohorte de prueba (patient-level, independiente de entrenamiento) ───
export const TEST_COHORT = { samples: 357, patients: 56 } as const;

// ─── ROC Curve (AUC = 0.9684; puntos ilustrativos, valores del reporte metrics_v2_report.json) ──
export const ROC_DATA: ROCDataPoint[] = [
  { fpr: 0.000, tpr: 0.000 },
  { fpr: 0.010, tpr: 0.420 },
  { fpr: 0.025, tpr: 0.655 },
  { fpr: 0.045, tpr: 0.785 },
  { fpr: 0.070, tpr: 0.860 },
  { fpr: 0.095, tpr: 0.905 },
  { fpr: 0.120, tpr: 0.932 },
  { fpr: 0.143, tpr: 0.9507 }, // Punto de operación clínico (tau = 0.35, Sensibilidad 95.07%, Especificidad 85.71%)
  { fpr: 0.180, tpr: 0.965 },
  { fpr: 0.230, tpr: 0.975 },
  { fpr: 0.300, tpr: 0.985 },
  { fpr: 0.400, tpr: 0.992 },
  { fpr: 0.550, tpr: 0.997 },
  { fpr: 0.750, tpr: 0.999 },
  { fpr: 1.000, tpr: 1.000 },
];

// ─── Confusion Matrix (357 muestras de 56 pacientes, Threshold=0.35) ──────
export const CONFUSION_MATRIX = {
  tn: 132,
  fp: 22,
  fn: 10,
  tp: 193,
} as const;

// ─── Risk Distribution (puntos ilustrativos) ─────────────────────────────
export const RISK_DISTRIBUTION: RiskDistributionPoint[] = [
  { level: "BAJO",  count: 142, percentage: 39.8, color: "#10b981" },
  { level: "MEDIO", count: 34,  percentage: 9.5,  color: "#f59e0b" },
  { level: "ALTO",  count: 181, percentage: 50.7, color: "#d4004f" },
];

// ─── Score Histogram (Calibrated XGBoost Output, 20 Bins) ────────────────
export const SCORE_HISTOGRAM: ScoreHistogramPoint[] = [
  { binStart: 0.00, binEnd: 0.05, count: 68, risk: "BAJO",  binLabel: "0.00" },
  { binStart: 0.05, binEnd: 0.10, count: 35, risk: "BAJO",  binLabel: "0.05" },
  { binStart: 0.10, binEnd: 0.15, count: 18, risk: "BAJO",  binLabel: "0.10" },
  { binStart: 0.15, binEnd: 0.20, count: 10, risk: "BAJO",  binLabel: "0.15" },
  { binStart: 0.20, binEnd: 0.25, count: 6,  risk: "BAJO",  binLabel: "0.20" },
  { binStart: 0.25, binEnd: 0.30, count: 3,  risk: "BAJO",  binLabel: "0.25" },
  { binStart: 0.30, binEnd: 0.35, count: 2,  risk: "BAJO",  binLabel: "0.30" },
  { binStart: 0.35, binEnd: 0.40, count: 4,  risk: "MEDIO", binLabel: "0.35" },
  { binStart: 0.40, binEnd: 0.45, count: 5,  risk: "MEDIO", binLabel: "0.40" },
  { binStart: 0.45, binEnd: 0.50, count: 6,  risk: "MEDIO", binLabel: "0.45" },
  { binStart: 0.50, binEnd: 0.55, count: 6,  risk: "MEDIO", binLabel: "0.50" },
  { binStart: 0.55, binEnd: 0.60, count: 6,  risk: "MEDIO", binLabel: "0.55" },
  { binStart: 0.60, binEnd: 0.65, count: 7,  risk: "MEDIO", binLabel: "0.60" },
  { binStart: 0.65, binEnd: 0.70, count: 9,  risk: "ALTO",  binLabel: "0.65" },
  { binStart: 0.70, binEnd: 0.75, count: 12, risk: "ALTO",  binLabel: "0.70" },
  { binStart: 0.75, binEnd: 0.80, count: 16, risk: "ALTO",  binLabel: "0.75" },
  { binStart: 0.80, binEnd: 0.85, count: 24, risk: "ALTO",  binLabel: "0.80" },
  { binStart: 0.85, binEnd: 0.90, count: 32, risk: "ALTO",  binLabel: "0.85" },
  { binStart: 0.90, binEnd: 0.95, count: 42, risk: "ALTO",  binLabel: "0.90" },
  { binStart: 0.95, binEnd: 1.00, count: 46, risk: "ALTO",  binLabel: "0.95" },
];

// ─── Features Table (8 LIDC-IDRI Radiologist Consensus Features) ─────────
export const FEATURES_TABLE: FeatureData[] = [
  { name: "Subtlety",      nameEs: "Sutileza",       scale: "1–5", description: "Visibilidad del nódulo respecto al parénquima circundante" },
  { name: "Calcification", nameEs: "Calcificación",  scale: "1–6", description: "Patrón de calcificación (1=central, 2=concéntrico ... 6=ausente)" },
  { name: "Sphericity",    nameEs: "Esfericidad",    scale: "1–5", description: "Redondez tridimensional (5 = perfectamente esférico)" },
  { name: "Margin",        nameEs: "Margen",         scale: "1–5", description: "Nitidez de los bordes (1=mal definido, 5=nítido)" },
  { name: "Lobulation",    nameEs: "Lobulación",     scale: "1–5", description: "Presencia de ondulaciones y lóbulos periféricos" },
  { name: "Spiculation",   nameEs: "Espiculación",   scale: "1–5", description: "Proyecciones lineales radiantes asociadas a infiltración" },
  { name: "Texture",       nameEs: "Textura",        scale: "1–5", description: "Atenuación interna (1=vidrio esmerilado puro, 5=sólido)" },
  { name: "Malignancy",    nameEs: "Malignidad",     scale: "1–5", description: "Consenso cualitativo de 4 radiólogos LIDC (5=altamente sospechoso)" },
];

// ─── Primary Model Metrics (OncoScan 2.0 DenseNet-121 + XGBoost Head) ────
export const MODEL_METRICS = {
  version: "multimodal-v2.0-densenet",
  accuracy: "91.04%",
  sensitivity: "95.07%",
  specificity: "85.71%",
  aucRoc: "0.9684",
  auprc: "0.9784",
  f1Score: "0.9234",
  precision: "89.77%",
  brierScore: "0.0774",
  testCases: "357 muestras (56 pacientes)",
  epochs: "45",
  operatingThreshold: "0.35",
  splitType: "Patient-Level Zero-Leakage (LIDC-IDRI)",
  explainability: "HiResCAM (capas nativas 4×4 y 2×2, interpoladas)",
} as const;

// ─── Model 2: CLID Histopathological Subtype Classifier ─────────────────
export const CLID_METRICS = {
  name: "Clasificador Histológico CLID (4 Clases)",
  dataset: "Comprehensive Lung Cancer Imaging Dataset (CLID v1.0.0)",
  architecture: "DenseNet-121 CLAHE (128×128)",
  testCases: 208,
  multiclassAccuracy: "75.48%",
  binarySensitivity: "99.39%", // 164/165 cánceres detectados (1 solo falso negativo)
  binarySpecificity: "97.67%", // 42/43 normales detectados
  tp: 164,
  tn: 42,
  fp: 1,
  fn: 1,
} as const;

export const HISTOLOGICAL_SUBTYPES: HistologicalSubtype[] = [
  {
    id: "adenocarcinoma",
    name: "Adenocarcinoma",
    code: "ADC",
    frequency: "~40% de cánceres pulmonares",
    color: "#d4004f", // Cerise
    description: "Neoplasia maligna de estirpe epitelial glandular, frecuentemente periférica y asociada a retracción pleural o vidrio deslustrado.",
    biomarkers: "TTF-1 (+), Napsina A (+), EGFR/ALK mutables",
  },
  {
    id: "squamous_cell",
    name: "Carcinoma Epidermoide (Escamoso)",
    code: "SCC",
    frequency: "~25–30% de casos",
    color: "#ea580c", // Naranja intenso
    description: "Tumor típicamente de localización central o endobronquial con queratinización, propenso a cavitación y necrosis central.",
    biomarkers: "p40 (+), CK5/6 (+), TTF-1 (-)",
  },
  {
    id: "large_cell",
    name: "Carcinoma de Células Grandes",
    code: "LCC",
    frequency: "~10% de casos",
    color: "#7c3aed", // Violeta
    description: "Cáncer indiferenciado que carece de características citoarquitectónicas de adenocarcinoma o carcinoma escamoso, de rápido crecimiento.",
    biomarkers: "Diagnóstico de exclusión en biopsia quirúrgica",
  },
  {
    id: "normal",
    name: "Tejido Normal / No Neoplásico",
    code: "NORMAL",
    frequency: "Controles parénquima sano",
    color: "#059669", // Esmeralda clínico
    description: "Arquitectura alveolar preservada, sin atipias nucleares, desmoplasia ni infiltración mitótica.",
    biomarkers: "Preservación histológica",
  },
];
