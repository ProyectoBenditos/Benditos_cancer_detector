/** Atlas contract: top-left tiles; axial slices ordered inferior → superior.
 * Model axes: x = image column, y = slice, z = reversed image row.
 * DICOM PixelSpacing is [row, column], in millimetres.
 */
export interface VolumeMetadata {
  num_slices: number;
  rows?: number;
  columns?: number;
  matrix?: number[];
  pixel_spacing: number[];
  slice_spacing?: number;
  slice_thickness?: number;
  slice_thickness_mm?: number;
  z_start?: number;
  z_end?: number;
  geometry_error?: string | null;
}

export function getVolumeGeometry(meta: VolumeMetadata, tileWidth: number, tileHeight: number) {
  if (meta.geometry_error) throw new Error(meta.geometry_error);
  const rows = meta.rows ?? meta.matrix?.[0];
  const columns = meta.columns ?? meta.matrix?.[1];
  const count = meta.num_slices;
  const [rowSpacing, columnSpacing] = meta.pixel_spacing ?? [];
  // Legacy manifests contain z_start/end but no slice_spacing. Thickness is
  // acquisition width; it need not equal the distance between slice centres.
  const positionSpacing = count > 1 && meta.z_start != null && meta.z_end != null
    ? Math.abs(meta.z_end - meta.z_start) / (count - 1) : 0;
  const sliceSpacing = meta.slice_spacing ?? (positionSpacing > 0 ? positionSpacing :
    meta.slice_thickness ?? meta.slice_thickness_mm);
  if (![rows, columns, count, rowSpacing, columnSpacing, sliceSpacing, tileWidth, tileHeight]
    .every((value) => typeof value === "number" && Number.isFinite(value) && value > 0)) {
    throw new Error("El volumen no contiene dimensiones y espaciado de vóxel válidos.");
  }
  if (!Number.isInteger(count) || count < 2) {
    throw new Error("La reconstrucción 3D necesita al menos dos cortes.");
  }
  const dimensionsMm: [number, number, number] = [
    columns! * columnSpacing, count * sliceSpacing!, rows! * rowSpacing,
  ];
  const maxExtent = Math.max(...dimensionsMm);
  const scale = dimensionsMm.map((v) => v / maxExtent) as [number, number, number];
  const voxelStep: [number, number, number] = [
    1 / Math.max(1, tileWidth - 1), 1 / (count - 1), 1 / Math.max(1, tileHeight - 1),
  ];
  return { dimensionsMm, scale, voxelStep };
}

/** Coordinates must be supplied explicitly in source voxel indices [column,row,slice]. */
export function normalizeNodule(
  point: { x: number; y: number; z: number }, meta: VolumeMetadata,
): [number, number, number] {
  const rows = meta.rows ?? meta.matrix?.[0] ?? 0;
  const columns = meta.columns ?? meta.matrix?.[1] ?? 0;
  if (![point.x, point.y, point.z].every(Number.isFinite) ||
    point.x < 0 || point.x > columns - 1 || point.y < 0 || point.y > rows - 1 ||
    point.z < 0 || point.z > meta.num_slices - 1 || rows < 2 || columns < 2) {
    throw new Error("Las coordenadas del nódulo están fuera del volumen.");
  }
  return [point.x / (columns - 1), point.z / (meta.num_slices - 1), 1 - point.y / (rows - 1)];
}
