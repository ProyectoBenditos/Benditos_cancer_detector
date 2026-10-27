/**
 * Comparación de las marcas del lector con los nódulos de referencia (funciones puras).
 * La distancia usa la misma convención de ejes que Medir, sin redondear.
 */
import { calibrationFor, distanceMm } from "@/components/ui/measureMath";
import type { Marker } from "@/components/ui/markerState";
import type { Point } from "@/components/ui/markerMath";
import type { PixelGeometry } from "./pixelGeometry";
import type { PracticeReference } from "./practiceCases";

/** Una marca coincide con un nódulo si su ancla está a esta distancia o menos (incluida). */
export const MATCH_RADIUS_MM = 10;

/** Tolerancia para el error de coma flotante al comparar con el radio. */
const EPS = 1e-9;

/** Punto de una marca; el de una medición es su punto medio. */
export function markerAnchor(m: Marker): Point {
  if (m.kind === "measure" && m.x2 !== null && m.y2 !== null) {
    return { x: (m.x + m.x2) / 2, y: (m.y + m.y2) / 2 };
  }
  return { x: m.x, y: m.y };
}

/**
 * Emparejamiento uno a uno, voraz por la pareja (ancla, referencia) más cercana
 * dentro del radio. Devuelve, por ancla, el índice de la referencia que le tocó o null.
 */
export function anchorMatches(
  anchors: Point[],
  reference: PracticeReference[],
  geometry: PixelGeometry
): (number | null)[] {
  const byAnchor: (number | null)[] = anchors.map(() => null);
  const natural = { w: geometry.columns, h: geometry.rows };
  const cal = calibrationFor(geometry, natural);
  if (!cal) return byAnchor;

  const pairs: { a: number; r: number; d: number }[] = [];
  anchors.forEach((anchor, a) => {
    reference.forEach((ref, r) => {
      const d = distanceMm(anchor, { x: ref.x, y: ref.y }, natural, cal);
      if (d <= MATCH_RADIUS_MM + EPS) pairs.push({ a, r, d });
    });
  });
  pairs.sort((p, q) => p.d - q.d);

  const usedRefs = new Set<number>();
  for (const { a, r } of pairs) {
    if (byAnchor[a] !== null || usedRefs.has(r)) continue;
    byAnchor[a] = r;
    usedRefs.add(r);
  }
  return byAnchor;
}

/** Mismo emparejamiento visto desde la referencia: `found[i]` indica si la referencia i fue encontrada. */
export function matchReader(
  anchors: Point[],
  reference: PracticeReference[],
  geometry: PixelGeometry
): { found: boolean[]; unmatched: number } {
  const byAnchor = anchorMatches(anchors, reference, geometry);
  const found = reference.map(() => false);
  for (const r of byAnchor) if (r !== null) found[r] = true;
  return { found, unmatched: byAnchor.filter((r) => r === null).length };
}

export function practiceSummary(found: boolean[], unmatched: number): string {
  const total = found.length;
  const hits = found.filter(Boolean).length;
  let text = `Encontraste ${hits} de ${total} ${total === 1 ? "nódulo" : "nódulos"} de referencia.`;
  if (unmatched > 0) {
    text +=
      unmatched === 1
        ? " 1 marca no coincide con ningún nódulo de referencia."
        : ` ${unmatched} marcas no coinciden con ningún nódulo de referencia.`;
  }
  return text;
}
