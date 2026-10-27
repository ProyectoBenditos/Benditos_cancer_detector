/**
 * Geometría del dibujo del resultado (funciones puras). Todo va en unidades del
 * viewBox, es decir, píxeles de la imagen original (columns × rows).
 * La marca del lector es un punto pequeño en su ancla: cabe dentro del anillo
 * de referencia más pequeño de los casos reales (7,8 mm ≈ 5,4 px de radio), y
 * su número va desplazado, fuera de los anillos, unido al punto por una línea.
 */
import type { PixelGeometry } from "@/lib/pixelGeometry";

export type OverlaySizes = {
  unit: number;
  ringStroke: number;
  haloStroke: number;
  dash: string;
  tickGap: number;
  tickLen: number;
  dotR: number;
  dotStroke: number;
  badgeR: number;
  badgeStroke: number;
  badgeFont: number;
  leaderGap: number;
};

export type Ring = { cx: number; cy: number; r: number };
type Pt = { x: number; y: number };

export function overlaySizes(columns: number, rows: number): OverlaySizes {
  const unit = Math.max(columns, rows);
  return {
    unit,
    ringStroke: unit * 0.005,
    haloStroke: unit * 0.009,
    dash: `${unit * 0.012} ${unit * 0.008}`,
    tickGap: unit * 0.012,
    tickLen: unit * 0.03,
    dotR: unit * 0.0045,
    dotStroke: unit * 0.0015,
    // A 375 px (corte de ~311 px) el número mide ~19 px y su texto ~10,6 px.
    badgeR: unit * 0.03,
    badgeStroke: unit * 0.006,
    badgeFont: unit * 0.034,
    leaderGap: unit * 0.008,
  };
}

/** Radio del anillo en píxeles de la imagen: diámetro real en mm con el espaciado de columna. */
export function ringRadius(diameterMm: number, geometry: PixelGeometry): number {
  return diameterMm / 2 / geometry.pixelSpacingMm[1];
}

/** Borde interior del anillo contando su halo blanco. */
export function ringInnerEdge(r: number, s: OverlaySizes): number {
  return r - s.haloStroke / 2;
}

/** Hasta dónde llega el anillo con sus marcas exteriores y su halo. */
export function ringOuterExtent(r: number, s: OverlaySizes): number {
  return r + s.tickGap + s.tickLen + s.haloStroke / 2;
}

export function dotExtent(s: OverlaySizes): number {
  return s.dotR + s.dotStroke / 2;
}

export function badgeExtent(s: OverlaySizes): number {
  return s.badgeR + s.badgeStroke / 2;
}

// Diagonales, en orden de preferencia: arriba-derecha, arriba-izquierda, abajo-derecha, abajo-izquierda.
const DIRS: Pt[] = [
  [1, -1],
  [-1, -1],
  [1, 1],
  [-1, 1],
].map(([x, y]) => ({ x: x / Math.SQRT2, y: y / Math.SQRT2 }));

/**
 * Centro del número de una marca: en la primera diagonal donde cabe dentro de
 * la imagen, a la menor distancia que lo deja fuera de todos los anillos.
 */
export function badgeCenter(anchor: Pt, rings: Ring[], size: { w: number; h: number }, s: OverlaySizes): Pt {
  const e = badgeExtent(s);
  const base = dotExtent(s) + s.leaderGap + e;
  const step = s.unit * 0.004;
  const inside = (c: Pt) => c.x - e >= 0 && c.y - e >= 0 && c.x + e <= size.w && c.y + e <= size.h;
  const clear = (c: Pt) => rings.every((g) => Math.hypot(c.x - g.cx, c.y - g.cy) >= ringOuterExtent(g.r, s) + e);

  for (const dir of DIRS) {
    // A lo largo de un rayo, una vez fuera de la imagen ya no se vuelve a entrar.
    for (let d = base; d <= base + s.unit; d += step) {
      const c = { x: anchor.x + dir.x * d, y: anchor.y + dir.y * d };
      if (!inside(c)) break;
      if (clear(c)) return c;
    }
  }
  const c = { x: anchor.x + DIRS[0].x * base, y: anchor.y + DIRS[0].y * base };
  return { x: Math.min(Math.max(c.x, e), size.w - e), y: Math.min(Math.max(c.y, e), size.h - e) };
}
