import { describe, expect, it } from "vitest";
import type { PixelGeometry } from "@/lib/pixelGeometry";
import { calibrationFor, formatMm, measureMm } from "./measureMath";

const geo512: PixelGeometry = { pixelSpacingMm: [0.7, 0.7], rows: 512, columns: 512 };

describe("calibrationFor", () => {
  it("calibra cuando la imagen natural coincide con rows × columns", () => {
    expect(calibrationFor(geo512, { w: 512, h: 512 })).toEqual({ rowMm: 0.7, colMm: 0.7 });
  });

  it("no calibra una imagen reescalada", () => {
    expect(calibrationFor(geo512, { w: 256, h: 256 })).toBeNull();
  });

  it("no calibra sin geometría", () => {
    expect(calibrationFor(null, { w: 512, h: 512 })).toBeNull();
  });

  it("separa fila y columna: pixel_spacing es [fila, columna]", () => {
    const geo: PixelGeometry = { pixelSpacingMm: [1, 0.5], rows: 100, columns: 200 };
    expect(calibrationFor(geo, { w: 200, h: 100 })).toEqual({ rowMm: 1, colMm: 0.5 });
  });
});

describe("measureMm", () => {
  it("media imagen horizontal a 0,7 mm/px en 512 px son 179,2 mm", () => {
    expect(measureMm({ x: 0, y: 0 }, { x: 0.5, y: 0 }, { w: 512, h: 512 }, { rowMm: 0.7, colMm: 0.7 })).toBe(179.2);
  });

  it("píxel no cuadrado usa el espaciado de cada eje", () => {
    expect(measureMm({ x: 0, y: 0 }, { x: 0.1, y: 0.1 }, { w: 100, h: 100 }, { rowMm: 1, colMm: 0.5 })).toBe(11.2);
  });
});

describe("formatMm", () => {
  it("un decimal con coma", () => {
    expect(formatMm(12.44)).toBe("12,4 mm");
  });
});
