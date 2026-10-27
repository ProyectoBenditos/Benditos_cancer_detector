import { describe, expect, it } from "vitest";
import { pixelGeometryFrom } from "./pixelGeometry";

describe("pixelGeometryFrom", () => {
  it("lee pixel_spacing, rows y columns de volume_metadata", () => {
    expect(pixelGeometryFrom({ pixel_spacing: [0.7, 0.7], rows: 512, columns: 512 })).toEqual({
      pixelSpacingMm: [0.7, 0.7],
      rows: 512,
      columns: 512,
    });
  });

  it.each([
    ["null", null],
    ["objeto vacío", {}],
    ["espaciado en cero", { pixel_spacing: [0, 0.7], rows: 512, columns: 512 }],
    ["rows como texto", { pixel_spacing: [0.7, 0.7], rows: "512", columns: 512 }],
    ["pixel_spacing nulo", { pixel_spacing: null, rows: 512, columns: 512 }],
    ["rows no entero", { pixel_spacing: [0.7, 0.7], rows: 511.5, columns: 512 }],
    ["espaciado infinito", { pixel_spacing: [Infinity, 0.7], rows: 512, columns: 512 }],
    ["espaciado con un solo valor", { pixel_spacing: [0.7], rows: 512, columns: 512 }],
  ])("sin calibración: %s", (_name, input) => {
    expect(pixelGeometryFrom(input)).toBeNull();
  });
});
