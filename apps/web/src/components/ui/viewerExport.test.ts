import { describe, expect, it } from "vitest";
import { exportLegendLines, exportPinPositions, hasNotes } from "./viewerExport";
import type { Marker } from "./markerState";

const m = (seq: number, note: string, findingType: Marker["findingType"] = "solido"): Marker => ({
  id: `m${seq}`,
  seq,
  x: 0.25,
  y: 0.5,
  findingType,
  aiAgreement: null,
  note,
  sizeMm: null,
  kind: "point",
  x2: null,
  y2: null,
});

describe("exportLegendLines", () => {
  it("sin consentimiento no hay texto de notas", () => {
    expect(exportLegendLines([m(1, "dato sensible")], false)).toEqual([]);
  });

  it("con consentimiento, una línea por marcador y sin saltos de línea", () => {
    expect(exportLegendLines([m(1, "borde\nespiculado")], true)).toEqual(["1. Nódulo sólido — borde espiculado"]);
  });

  it("marcador sin nota lleva solo el tipo", () => {
    expect(exportLegendLines([m(2, "", null)], true)).toEqual(["2. Sin clasificar"]);
  });

  it("corta las líneas largas a 110 caracteres", () => {
    const [line] = exportLegendLines([m(1, "x".repeat(300))], true);
    expect(line).toHaveLength(110);
    expect(line.endsWith("…")).toBe(true);
  });
});

describe("exportPinPositions", () => {
  it("posición de los pins en el lienzo exportado", () => {
    expect(exportPinPositions([m(2, "")])).toEqual([{ seq: 2, x: 200, y: 400 }]);
  });
});

describe("hasNotes", () => {
  it("ignora notas en blanco", () => {
    expect(hasNotes([m(1, "   ")])).toBe(false);
    expect(hasNotes([m(1, "   "), m(2, "x")])).toBe(true);
  });
});
