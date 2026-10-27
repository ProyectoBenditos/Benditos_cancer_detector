import { describe, expect, it } from "vitest";
import manifestJson from "../../../../public/demo/practica/manifest.json";
import { parsePracticeManifest } from "@/lib/practiceCases";
import {
  badgeCenter,
  badgeExtent,
  dotExtent,
  overlaySizes,
  ringInnerEdge,
  ringOuterExtent,
  ringRadius,
} from "./practiceOverlay";

const cases = parsePracticeManifest(manifestJson) ?? [];

/** Ancho del corte a 375 px: main p-4 (16 + 16) y CardContent p-4 (16 + 16). */
const FIGURE_PX_AT_375 = 375 - 32 - 32;

describe("capa del resultado con los casos reales", () => {
  it("el manifest real tiene 5 casos", () => {
    expect(cases).toHaveLength(5);
  });

  it.each(cases.map((c) => [c.id, c] as const))(
    "%s: una marca en el centro del nódulo no tapa el anillo y su número no lo pisa",
    (_id, c) => {
      const { columns, rows } = c.geometry;
      const s = overlaySizes(columns, rows);
      const rings = c.reference.map((ref) => ({
        cx: ref.x * columns,
        cy: ref.y * rows,
        r: ringRadius(ref.diameterMm, c.geometry),
      }));
      for (const ring of rings) {
        const anchor = { x: ring.cx, y: ring.cy };
        // El punto de la marca cabe dentro del borde interior del anillo (con su halo).
        expect(dotExtent(s)).toBeLessThan(ringInnerEdge(ring.r, s));
        // El número va fuera del anillo y de sus marcas exteriores, dentro de la imagen.
        const badge = badgeCenter(anchor, rings, { w: columns, h: rows }, s);
        for (const other of rings) {
          const d = Math.hypot(badge.x - other.cx, badge.y - other.cy);
          expect(d).toBeGreaterThanOrEqual(ringOuterExtent(other.r, s) + badgeExtent(s));
        }
        expect(badge.x - badgeExtent(s)).toBeGreaterThanOrEqual(0);
        expect(badge.y - badgeExtent(s)).toBeGreaterThanOrEqual(0);
        expect(badge.x + badgeExtent(s)).toBeLessThanOrEqual(columns);
        expect(badge.y + badgeExtent(s)).toBeLessThanOrEqual(rows);
      }
    }
  );

  it("a 375 px el número de la marca sigue siendo legible", () => {
    const s = overlaySizes(512, 512);
    const scale = FIGURE_PX_AT_375 / 512;
    expect(s.badgeR * scale).toBeGreaterThanOrEqual(9);
    expect(s.badgeFont * scale).toBeGreaterThanOrEqual(10);
  });
});

describe("badgeCenter", () => {
  const s = overlaySizes(512, 512);

  it("sin anillos cerca va arriba a la derecha, pegado a la marca", () => {
    const b = badgeCenter({ x: 256, y: 256 }, [], { w: 512, h: 512 }, s);
    expect(b.x).toBeGreaterThan(256);
    expect(b.y).toBeLessThan(256);
    expect(Math.hypot(b.x - 256, b.y - 256)).toBeLessThan(dotExtent(s) + badgeExtent(s) + 10);
  });

  it("en la esquina superior derecha cambia de lado para no salirse", () => {
    const b = badgeCenter({ x: 508, y: 4 }, [], { w: 512, h: 512 }, s);
    expect(b.x).toBeLessThan(508);
    expect(b.y).toBeGreaterThan(4);
  });
});
