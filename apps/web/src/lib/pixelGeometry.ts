/**
 * Geometría de píxel de un estudio DICOM, leída de `metadata_json.volume_metadata`
 * (la API la guarda en cada subida .dcm). Sin ella no hay mm: se devuelve null.
 */

/** pixelSpacingMm = [fila, columna] en mm, como PixelSpacing de DICOM. */
export type PixelGeometry = { pixelSpacingMm: [number, number]; rows: number; columns: number };

const isPositive = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;
const isPositiveInt = (v: unknown): v is number => isPositive(v) && Number.isInteger(v);

export function pixelGeometryFrom(volumeMetadata: unknown): PixelGeometry | null {
  if (!volumeMetadata || typeof volumeMetadata !== "object") return null;
  const { pixel_spacing: spacing, rows, columns } = volumeMetadata as Record<string, unknown>;
  if (!Array.isArray(spacing) || spacing.length !== 2) return null;
  const [rowMm, colMm] = spacing;
  if (!isPositive(rowMm) || !isPositive(colMm) || !isPositiveInt(rows) || !isPositiveInt(columns)) return null;
  return { pixelSpacingMm: [rowMm, colMm], rows, columns };
}
