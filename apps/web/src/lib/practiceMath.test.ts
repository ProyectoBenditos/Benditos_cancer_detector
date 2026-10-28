import { describe, expect, it } from "vitest";
import type { Marker } from "@/components/ui/markerState";
import type { PixelGeometry } from "./pixelGeometry";
import type { PracticeReference } from "./practiceCases";
import { MATCH_RADIUS_MM, anchorMatches, markerAnchor, matchReader, practiceSummary } from "./practiceMath";

const geometry: PixelGeometry = { pixelSpacingMm: [1, 1], rows: 512, columns: 512 };
const ref = (x: number, y: number): PracticeReference => ({ x, y, diameterMm: 8, readers: 4 });
const mm = (n: number) => n / 512;

const base: Marker = {
  id: "m1",
  seq: 1,
  kind: "point",
  x: 0.3,
  y: 0.4,
  x2: null,
  y2: null,
  findingType: null,
  aiAgreement: null,
  note: "",
  sizeMm: null,
};

describe("markerAnchor", () => {
  it("devuelve el punto de un marcador", () => {
    expect(markerAnchor(base)).toEqual({ x: 0.3, y: 0.4 });
  });
  it("devuelve el punto medio de una medición", () => {
    const p = markerAnchor({ ...base, kind: "measure", x2: 0.5, y2: 0.8 });
    expect(p.x).toBeCloseTo(0.4, 12);
    expect(p.y).toBeCloseTo(0.6, 12);
  });
});

describe("matchReader", () => {
  it("el radio es 10 mm", () => {
    expect(MATCH_RADIUS_MM).toBe(10);
  });
  it("un ancla a exactamente 10 mm cuenta como encontrada", () => {
    const r = matchReader([{ x: 0.25 + mm(10), y: 0.5 }], [ref(0.25, 0.5)], geometry);
    expect(r).toEqual({ found: [true], unmatched: 0 });
  });
  it("a 10,01 mm no", () => {
    const r = matchReader([{ x: 0.25 + mm(10.01), y: 0.5 }], [ref(0.25, 0.5)], geometry);
    expect(r).toEqual({ found: [false], unmatched: 1 });
  });
  it("dos anclas cerca del mismo nódulo: una sobra", () => {
    const r = matchReader([{ x: 0.25, y: 0.5 }, { x: 0.25 + mm(2), y: 0.5 }], [ref(0.25, 0.5)], geometry);
    expect(r).toEqual({ found: [true], unmatched: 1 });
  });
  it("A cerca de R1 y R2, B solo de R1: ambos nódulos encontrados", () => {
    const r1 = ref(0.5, 0.5);
    const r2 = ref(0.5 + mm(10), 0.5);
    const a = { x: 0.5 + mm(6), y: 0.5 }; // R1 a 6 mm, R2 a 4 mm
    const b = { x: 0.5 - mm(5), y: 0.5 }; // R1 a 5 mm, R2 a 15 mm
    const r = matchReader([a, b], [r1, r2], geometry);
    expect(r).toEqual({ found: [true, true], unmatched: 0 });
  });
  it("la pareja global más cercana gana aunque otra ancla la prefiera", () => {
    const r1 = ref(0.5, 0.5);
    const r2 = ref(0.5 + mm(10), 0.5);
    const a = { x: 0.5 + mm(4), y: 0.5 }; // R1 a 4 mm (la más cercana global)
    const b = { x: 0.5 - mm(5), y: 0.5 }; // R1 a 5 mm, R2 a 15 mm
    const r = matchReader([a, b], [r1, r2], geometry);
    expect(r).toEqual({ found: [true, false], unmatched: 1 });
  });
  it("sin referencia todo son marcas sin coincidir", () => {
    expect(matchReader([{ x: 0.1, y: 0.1 }], [], geometry)).toEqual({ found: [], unmatched: 1 });
  });
});

describe("anchorMatches", () => {
  it("devuelve, por ancla, el índice del nódulo emparejado o null", () => {
    const r1 = ref(0.5, 0.5);
    const r2 = ref(0.5 + mm(10), 0.5);
    const a = { x: 0.5 + mm(4), y: 0.5 }; // R1 a 4 mm (la más cercana global)
    const b = { x: 0.5 - mm(5), y: 0.5 }; // R1 a 5 mm, R2 a 15 mm
    const far = { x: 0.1, y: 0.1 };
    expect(anchorMatches([a, b, far], [r1, r2], geometry)).toEqual([0, null, null]);
  });
  it("cada ancla toma su nódulo cuando no compiten", () => {
    const r1 = ref(0.5, 0.5);
    const r2 = ref(0.5 + mm(10), 0.5);
    const a = { x: 0.5 + mm(6), y: 0.5 };
    const b = { x: 0.5 - mm(5), y: 0.5 };
    expect(anchorMatches([a, b], [r1, r2], geometry)).toEqual([1, 0]);
  });
  it("sin anclas devuelve una lista vacía", () => {
    expect(anchorMatches([], [ref(0.5, 0.5)], geometry)).toEqual([]);
  });
});

describe("practiceSummary", () => {
  it("plural", () => {
    expect(practiceSummary([true, false], 0)).toBe("Encontraste 1 de 2 nódulos de referencia.");
  });
  it("singular", () => {
    expect(practiceSummary([true], 0)).toBe("Encontraste 1 de 1 nódulo de referencia.");
  });
  it("una marca sin coincidir", () => {
    expect(practiceSummary([false], 1)).toMatch(/ 1 marca no coincide con ningún nódulo de referencia\.$/);
  });
  it("varias marcas sin coincidir", () => {
    expect(practiceSummary([false], 2)).toMatch(/ 2 marcas no coinciden con ningún nódulo de referencia\.$/);
  });
});
