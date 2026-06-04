import { describe, expect, it } from "vitest";
import {
  clamp,
  clampTranslate,
  MAX_SCALE,
  MIN_SCALE,
  nextScale,
  zoomToCursor,
} from "./panZoomMath";

describe("clamp", () => {
  it("acota dentro del rango", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(99, 0, 10)).toBe(10);
  });
});

describe("nextScale", () => {
  it("aumenta el zoom cuando deltaY es negativo (rueda hacia arriba)", () => {
    expect(nextScale(1, -100)).toBeGreaterThan(1);
  });
  it("reduce el zoom cuando deltaY es positivo", () => {
    expect(nextScale(2, 100)).toBeLessThan(2);
  });
  it("no baja de MIN_SCALE", () => {
    expect(nextScale(MIN_SCALE, 500)).toBe(MIN_SCALE);
  });
  it("no sube de MAX_SCALE", () => {
    expect(nextScale(MAX_SCALE, -500)).toBe(MAX_SCALE);
  });
});

describe("zoomToCursor", () => {
  it("no mueve el translate si el scale no cambia", () => {
    const prev = { scale: 2, tx: -30, ty: -40 };
    const r = zoomToCursor(prev, { scale: 2 }, { x: 50, y: 50 });
    expect(r.tx).toBeCloseTo(-30);
    expect(r.ty).toBeCloseTo(-40);
  });
  it("mantiene fijo el punto bajo el cursor al hacer zoom", () => {
    // punto imagen bajo el cursor antes: (cursor - tx)/scale
    const prev = { scale: 1, tx: 0, ty: 0 };
    const cursor = { x: 100, y: 100 };
    const next = { scale: 2 };
    const r = zoomToCursor(prev, next, cursor);
    // tras el zoom, screen = scale*p + t debe seguir cayendo en el cursor
    const pX = (cursor.x - prev.tx) / prev.scale;
    const screenX = next.scale * pX + r.tx;
    expect(screenX).toBeCloseTo(cursor.x);
  });
});

describe("clampTranslate", () => {
  const stage = { w: 100, h: 100 };
  it("fuerza translate 0 cuando scale es 1 (sin bordes vacíos)", () => {
    const r = clampTranslate({ tx: 40, ty: -40 }, 1, stage);
    expect(r.tx).toBe(0);
    expect(r.ty).toBe(0);
  });
  it("no permite que la imagen escalada deje hueco a la izquierda/arriba", () => {
    const r = clampTranslate({ tx: 50, ty: 50 }, 2, stage);
    expect(r.tx).toBe(0);
    expect(r.ty).toBe(0);
  });
  it("no permite que la imagen escalada deje hueco a la derecha/abajo", () => {
    // límite mínimo = w*(1-scale) = 100*(1-2) = -100
    const r = clampTranslate({ tx: -500, ty: -500 }, 2, stage);
    expect(r.tx).toBe(-100);
    expect(r.ty).toBe(-100);
  });
});
