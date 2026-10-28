/**
 * Datos de la imagen exportada (funciones puras, testeadas). Las notas son PHI:
 * solo entran en la leyenda si el médico marca la casilla de consentimiento.
 * Los mm de una medición no son PHI y van siempre.
 */
import { findingLabel, type Marker } from "./markerState";
import { formatMm } from "./measureMath";

export const EXPORT_SIZE = 800;
const LEGEND_MAX_CHARS = 110;

export function hasNotes(markers: Marker[]): boolean {
  return markers.some((m) => m.note.trim() !== "");
}

function markerTitle(m: Marker): string {
  return m.kind === "measure" && m.sizeMm !== null ? `Medición ${formatMm(m.sizeMm)}` : findingLabel(m.findingType);
}

/** Líneas de la leyenda. Sin consentimiento, solo las mediciones y sin nota. */
export function exportLegendLines(markers: Marker[], includeNotes: boolean): string[] {
  const shown = includeNotes ? markers : markers.filter((m) => m.kind === "measure");
  return shown.map((m) => {
    const note = includeNotes ? m.note.replace(/\s+/g, " ").trim() : "";
    const line = `${m.seq}. ${markerTitle(m)}${note ? ` — ${note}` : ""}`;
    return line.length > LEGEND_MAX_CHARS ? `${line.slice(0, LEGEND_MAX_CHARS - 1)}…` : line;
  });
}

export type ExportPin = { seq: number; x: number; y: number; x2?: number; y2?: number };

/** Centro de cada pin (y extremo de cada medición) en el lienzo exportado, estirado a size×size. */
export function exportPinPositions(markers: Marker[], size: number = EXPORT_SIZE): ExportPin[] {
  return markers.map((m) => {
    const pin: ExportPin = { seq: m.seq, x: m.x * size, y: m.y * size };
    if (m.kind === "measure" && m.x2 !== null && m.y2 !== null) {
      pin.x2 = m.x2 * size;
      pin.y2 = m.y2 * size;
    }
    return pin;
  });
}
