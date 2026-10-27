/**
 * Medición en mm sobre el corte (funciones puras, testeadas). Los puntos están
 * normalizados como los marcadores; los mm solo existen si la imagen mostrada
 * conserva la rejilla original del DICOM (tamaño natural = rows × columns).
 */
import type { PixelGeometry } from "@/lib/pixelGeometry";
import type { Point, Size } from "./markerMath";

export type Calibration = { rowMm: number; colMm: number };

export function calibrationFor(geometry: PixelGeometry | null, natural: Size): Calibration | null {
  if (!geometry) return null;
  if (natural.w !== geometry.columns || natural.h !== geometry.rows) return null;
  const [rowMm, colMm] = geometry.pixelSpacingMm;
  return { rowMm, colMm };
}

/** Distancia en mm entre dos puntos normalizados, sin redondear. */
export function distanceMm(a: Point, b: Point, natural: Size, cal: Calibration): number {
  const dx = (b.x - a.x) * natural.w * cal.colMm;
  const dy = (b.y - a.y) * natural.h * cal.rowMm;
  return Math.hypot(dx, dy);
}

/** Distancia en mm entre dos puntos normalizados, redondeada a 0,1 mm. */
export function measureMm(a: Point, b: Point, natural: Size, cal: Calibration): number {
  return Math.round(distanceMm(a, b, natural, cal) * 10) / 10;
}

export function formatMm(mm: number): string {
  return `${mm.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mm`;
}
