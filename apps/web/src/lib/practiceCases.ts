/**
 * Casos del modo práctica: manifest estático en /demo/practica (snake_case)
 * convertido a tipos de la app. Si algo no cumple el contrato se devuelve null.
 */
import type { RiskLevel } from "@/components/ui/RiskBadge";
import type { PixelGeometry } from "./pixelGeometry";

export const PRACTICE_MANIFEST_URL = "/demo/practica/manifest.json";
export const PRACTICE_BASE = "/demo/practica/";

/** Motivo que muestra el visor mientras se lee un caso sin IA. */
export const PRACTICE_VIEWER_REASON = "La IA se muestra al pulsar «Ver resultado».";

/** Aviso fijo sobre lo que hace (y no hace) la IA en el modo práctica. */
export const PRACTICE_AI_NOTICE =
  "La IA de OncoScan da un score y un mapa de calor para el corte completo: no localiza ni cuenta nódulos. Sus 8 variables clínicas, incluida la sospecha de malignidad, vienen del consenso de los radiólogos de LIDC-IDRI.";

/** Aclaración fija junto al resultado de la IA: es un apoyo, no un diagnóstico. */
export const PRACTICE_SUPPORT_NOTICE = "Resultado de apoyo académico: no reemplaza el criterio del especialista.";

/** Pie de la página del modo práctica. */
export const PRACTICE_FOOTER =
  "Casos públicos de LIDC-IDRI (The Cancer Imaging Archive, CC BY 3.0). No son pacientes de OncoScan y tus lecturas no se guardan.";

export type PracticeReference = { x: number; y: number; diameterMm: number; readers: number };

export type PracticeCase = {
  id: string;
  imageUrl: string;
  heatmapUrl: string;
  geometry: PixelGeometry;
  reference: PracticeReference[];
  ai: { score: number; riskLevel: RiskLevel; modelVersion: string };
};

const RISK_LEVELS: ReadonlyArray<RiskLevel> = ["ALTO", "MEDIO", "BAJO"];

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isPositive = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;
const isUnit = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1;
const isFileName = (v: unknown): v is string => typeof v === "string" && v.length > 0 && !/[\\/]/.test(v);

function parseReference(raw: unknown): PracticeReference | null {
  if (!isObj(raw)) return null;
  const { x, y, diameter_mm: diameterMm, readers } = raw;
  if (!isUnit(x) || !isUnit(y) || !isPositive(diameterMm) || !isPositive(readers)) return null;
  return { x, y, diameterMm, readers };
}

function parseCase(raw: unknown): PracticeCase | null {
  if (!isObj(raw)) return null;
  const { id, image, heatmap, pixel_spacing: spacing, rows, columns, reference, ai } = raw;
  if (typeof id !== "string" || id.length === 0 || !isFileName(image) || !isFileName(heatmap)) return null;
  if (!Array.isArray(spacing) || spacing.length !== 2 || !isPositive(spacing[0]) || !isPositive(spacing[1])) return null;
  if (!isPositive(rows) || !Number.isInteger(rows) || !isPositive(columns) || !Number.isInteger(columns)) return null;
  if (!Array.isArray(reference) || !isObj(ai)) return null;
  const refs: PracticeReference[] = [];
  for (const r of reference) {
    const parsed = parseReference(r);
    if (!parsed) return null;
    refs.push(parsed);
  }
  const { score, risk_level: risk, model_version: modelVersion } = ai;
  if (!isUnit(score) || !RISK_LEVELS.includes(risk as RiskLevel) || typeof modelVersion !== "string") return null;
  return {
    id,
    imageUrl: PRACTICE_BASE + image,
    heatmapUrl: PRACTICE_BASE + heatmap,
    geometry: { pixelSpacingMm: [spacing[0], spacing[1]], rows, columns },
    reference: refs,
    ai: { score, riskLevel: risk as RiskLevel, modelVersion },
  };
}

export function parsePracticeManifest(json: unknown): PracticeCase[] | null {
  if (!isObj(json) || !Array.isArray(json.cases)) return null;
  const cases: PracticeCase[] = [];
  for (const raw of json.cases) {
    const parsed = parseCase(raw);
    if (!parsed) return null;
    cases.push(parsed);
  }
  return cases;
}
