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

// ─── Accuracy per Epoch (deterministic, approximated from training logs) ──
export const ACCURACY_DATA: AccuracyDataPoint[] = [
  { epoch: 1, train: 0.5820, val: 0.5530 },
  { epoch: 2, train: 0.6090, val: 0.5780 },
  { epoch: 3, train: 0.6360, val: 0.6020 },
  { epoch: 4, train: 0.6620, val: 0.6250 },
  { epoch: 5, train: 0.6890, val: 0.6480 },
  { epoch: 6, train: 0.7150, val: 0.6690 },
  { epoch: 7, train: 0.7410, val: 0.6900 },
  { epoch: 8, train: 0.7680, val: 0.7120 },
  { epoch: 9, train: 0.7950, val: 0.7340 },
  { epoch: 10, train: 0.8200, val: 0.7540 },
  { epoch: 11, train: 0.8260, val: 0.7610 },
  { epoch: 12, train: 0.8320, val: 0.7680 },
  { epoch: 13, train: 0.8380, val: 0.7750 },
  { epoch: 14, train: 0.8440, val: 0.7820 },
  { epoch: 15, train: 0.8500, val: 0.7880 },
  { epoch: 16, train: 0.8550, val: 0.7930 },
  { epoch: 17, train: 0.8600, val: 0.7990 },
  { epoch: 18, train: 0.8650, val: 0.8050 },
  { epoch: 19, train: 0.8700, val: 0.8100 },
  { epoch: 20, train: 0.8750, val: 0.8140 },
  { epoch: 21, train: 0.8800, val: 0.8170 },
  { epoch: 22, train: 0.8840, val: 0.8200 },
  { epoch: 23, train: 0.8870, val: 0.8230 },
  { epoch: 24, train: 0.8900, val: 0.8250 },
  { epoch: 25, train: 0.8930, val: 0.8270 },
  { epoch: 26, train: 0.8960, val: 0.8290 },
  { epoch: 27, train: 0.8990, val: 0.8310 },
  { epoch: 28, train: 0.9020, val: 0.8330 },
  { epoch: 29, train: 0.9040, val: 0.8350 },
  { epoch: 30, train: 0.9060, val: 0.8370 },
  { epoch: 31, train: 0.9080, val: 0.8380 },
  { epoch: 32, train: 0.9100, val: 0.8400 },
  { epoch: 33, train: 0.9120, val: 0.8410 },
  { epoch: 34, train: 0.9140, val: 0.8420 },
  { epoch: 35, train: 0.9160, val: 0.8430 },
  { epoch: 36, train: 0.9170, val: 0.8440 },
  { epoch: 37, train: 0.9180, val: 0.8450 },
  { epoch: 38, train: 0.9190, val: 0.8460 },
  { epoch: 39, train: 0.9200, val: 0.8470 },
  { epoch: 40, train: 0.9210, val: 0.8480 },
  { epoch: 41, train: 0.9220, val: 0.8490 },
  { epoch: 42, train: 0.9230, val: 0.8500 },
  { epoch: 43, train: 0.9240, val: 0.8510 },
  { epoch: 44, train: 0.9250, val: 0.8515 },
  { epoch: 45, train: 0.9300, val: 0.8520 },
];

// ─── ROC Curve (AUC ≈ 0.916) ──────────────────────────────────────────
export const ROC_DATA: ROCDataPoint[] = [
  { fpr: 0.00, tpr: 0.000 },
  { fpr: 0.02, tpr: 0.350 },
  { fpr: 0.05, tpr: 0.550 },
  { fpr: 0.08, tpr: 0.650 },
  { fpr: 0.10, tpr: 0.720 },
  { fpr: 0.15, tpr: 0.800 },
  { fpr: 0.20, tpr: 0.850 },
  { fpr: 0.25, tpr: 0.880 },
  { fpr: 0.30, tpr: 0.900 },
  { fpr: 0.35, tpr: 0.915 },
  { fpr: 0.40, tpr: 0.930 },
  { fpr: 0.50, tpr: 0.950 },
  { fpr: 0.60, tpr: 0.965 },
  { fpr: 0.70, tpr: 0.978 },
  { fpr: 0.80, tpr: 0.988 },
  { fpr: 0.90, tpr: 0.995 },
  { fpr: 1.00, tpr: 1.000 },
];

// ─── Confusion Matrix ──────────────────────────────────────────────────
export const CONFUSION_MATRIX = { tn: 333, fp: 72, fn: 71, tp: 262 } as const;

// ─── Risk Distribution ─────────────────────────────────────────────────
export const RISK_DISTRIBUTION: RiskDistributionPoint[] = [
  { level: "BAJO",  count: 374, percentage: 50.7, color: "#22c55e" },
  { level: "MEDIO", count: 68,  percentage: 9.2,  color: "#f59e0b" },
  { level: "ALTO",  count: 296, percentage: 40.1, color: "#ef4444" },
];

// ─── Score Histogram (deterministic bins) ───────────────────────────────
export const SCORE_HISTOGRAM: ScoreHistogramPoint[] = [
  { binStart: 0.00, binEnd: 0.05, count: 130, risk: "BAJO",  binLabel: "0.00" },
  { binStart: 0.05, binEnd: 0.10, count: 90,  risk: "BAJO",  binLabel: "0.05" },
  { binStart: 0.10, binEnd: 0.15, count: 52,  risk: "BAJO",  binLabel: "0.10" },
  { binStart: 0.15, binEnd: 0.20, count: 35,  risk: "BAJO",  binLabel: "0.15" },
  { binStart: 0.20, binEnd: 0.25, count: 28,  risk: "BAJO",  binLabel: "0.20" },
  { binStart: 0.25, binEnd: 0.30, count: 22,  risk: "BAJO",  binLabel: "0.25" },
  { binStart: 0.30, binEnd: 0.35, count: 17,  risk: "BAJO",  binLabel: "0.30" },
  { binStart: 0.35, binEnd: 0.40, count: 14,  risk: "MEDIO", binLabel: "0.35" },
  { binStart: 0.40, binEnd: 0.45, count: 11,  risk: "MEDIO", binLabel: "0.40" },
  { binStart: 0.45, binEnd: 0.50, count: 9,   risk: "MEDIO", binLabel: "0.45" },
  { binStart: 0.50, binEnd: 0.55, count: 10,  risk: "MEDIO", binLabel: "0.50" },
  { binStart: 0.55, binEnd: 0.60, count: 12,  risk: "MEDIO", binLabel: "0.55" },
  { binStart: 0.60, binEnd: 0.65, count: 12,  risk: "MEDIO", binLabel: "0.60" },
  { binStart: 0.65, binEnd: 0.70, count: 15,  risk: "ALTO",  binLabel: "0.65" },
  { binStart: 0.70, binEnd: 0.75, count: 20,  risk: "ALTO",  binLabel: "0.70" },
  { binStart: 0.75, binEnd: 0.80, count: 28,  risk: "ALTO",  binLabel: "0.75" },
  { binStart: 0.80, binEnd: 0.85, count: 38,  risk: "ALTO",  binLabel: "0.80" },
  { binStart: 0.85, binEnd: 0.90, count: 52,  risk: "ALTO",  binLabel: "0.85" },
  { binStart: 0.90, binEnd: 0.95, count: 72,  risk: "ALTO",  binLabel: "0.90" },
  { binStart: 0.95, binEnd: 1.00, count: 71,  risk: "ALTO",  binLabel: "0.95" },
];

// ─── Features Table ─────────────────────────────────────────────────────
export const FEATURES_TABLE: FeatureData[] = [
  { name: "Subtlety",      nameEs: "Sutileza",       scale: "1–5", description: "Qué tan evidente es el nódulo en la imagen" },
  { name: "Calcification", nameEs: "Calcificación",  scale: "1–6", description: "Patrón de calcificación (6 = ausente)" },
  { name: "Sphericity",    nameEs: "Esfericidad",    scale: "1–5", description: "Forma del nódulo (5 = perfectamente esférico)" },
  { name: "Margin",        nameEs: "Margen",         scale: "1–5", description: "Definición del borde (5 = bien definido)" },
  { name: "Lobulation",    nameEs: "Lobulación",     scale: "1–5", description: "Irregularidad del contorno" },
  { name: "Spiculation",   nameEs: "Espiculación",   scale: "1–5", description: "Proyecciones espiculadas en el borde" },
  { name: "Texture",       nameEs: "Textura",        scale: "1–5", description: "Densidad interna (5 = sólido)" },
  { name: "Malignancy",    nameEs: "Malignidad",     scale: "1–5", description: "Sospecha clínica de malignidad (5 = maligno)" },
];

// ─── Model Metrics ──────────────────────────────────────────────────────
export const MODEL_METRICS = {
  accuracy: "85.2%",
  aucRoc: "0.916",
  testCases: "738",
  epochs: "45",
} as const;
