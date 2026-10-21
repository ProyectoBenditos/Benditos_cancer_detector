/**
 * Datos de la imagen exportada (funciones puras, testeadas). Las notas son PHI:
 * solo entran en la leyenda si el médico marca la casilla de consentimiento.
 */
import { findingLabel, type Marker } from "./markerState";

export const EXPORT_SIZE = 800;
const LEGEND_MAX_CHARS = 110;

export function hasNotes(markers: Marker[]): boolean {
  return markers.some((m) => m.note.trim() !== "");
}

/** Líneas de la leyenda. Vacío si includeNotes es false. */
export function exportLegendLines(markers: Marker[], includeNotes: boolean): string[] {
  if (!includeNotes) return [];
  return markers.map((m) => {
    const note = m.note.replace(/\s+/g, " ").trim();
    const line = `${m.seq}. ${findingLabel(m.findingType)}${note ? ` — ${note}` : ""}`;
    return line.length > LEGEND_MAX_CHARS ? `${line.slice(0, LEGEND_MAX_CHARS - 1)}…` : line;
  });
}

/** Centro de cada pin en el lienzo exportado (la imagen se dibuja estirada a size×size). */
export function exportPinPositions(
  markers: Marker[],
  size: number = EXPORT_SIZE,
): Array<{ seq: number; x: number; y: number }> {
  return markers.map((m) => ({ seq: m.seq, x: m.x * size, y: m.y * size }));
}
