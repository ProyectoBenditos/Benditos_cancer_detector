// Categoría Lung-RADS y conducta del informe estandarizado. Las asigna el
// especialista: primero su valoración, si no su impresión inicial de la lectura
// ciega. Nunca se derivan del nivel de riesgo de la IA.

import { CONDUCTA_OPTIONS, LUNG_RADS_OPTIONS } from "./uploadReview";

export const UNASSIGNED_TEXT = "Sin asignar — pendiente del especialista";
export const IMPRESSION_SOURCE_LABEL = "Impresión inicial (antes de la IA)";

export type ReportAssignment = {
  source: "review" | "impression" | "none";
  heading: string;
  text: string;
  /** Descriptor ACR de la categoría mostrada; null si no hay categoría. */
  description: string | null;
};

type Assigned = { lung_rads?: string | null; conducta?: string | null } | null | undefined;

function pick(review: Assigned, impression: Assigned, key: "lung_rads" | "conducta") {
  if (review?.[key]) return { source: "review" as const, value: review[key] as string };
  if (impression?.[key]) return { source: "impression" as const, value: impression[key] as string };
  return null;
}

function lungRadsDescriptor(value: string): string | null {
  const label = LUNG_RADS_OPTIONS.find((o) => o.value === value)?.label;
  return label ? label.split(" — ")[1] ?? null : null;
}

export function reportLungRads(review: Assigned, impression: Assigned): ReportAssignment {
  const picked = pick(review, impression, "lung_rads");
  if (!picked) {
    return { source: "none", heading: "Categoría Lung-RADS", text: UNASSIGNED_TEXT, description: null };
  }
  return {
    source: picked.source,
    heading:
      picked.source === "review"
        ? "Categoría Lung-RADS Registrada"
        : `Categoría Lung-RADS · ${IMPRESSION_SOURCE_LABEL}`,
    text: `Categoría ${picked.value}`,
    description: lungRadsDescriptor(picked.value),
  };
}

export function reportConducta(review: Assigned, impression: Assigned): ReportAssignment {
  const picked = pick(review, impression, "conducta");
  if (!picked) {
    return { source: "none", heading: "Conducta", text: UNASSIGNED_TEXT, description: null };
  }
  return {
    source: picked.source,
    heading:
      picked.source === "review"
        ? "Conducta Registrada por el Especialista"
        : `Conducta · ${IMPRESSION_SOURCE_LABEL}`,
    text: CONDUCTA_OPTIONS.find((o) => o.value === picked.value)?.label ?? picked.value,
    description: null,
  };
}
