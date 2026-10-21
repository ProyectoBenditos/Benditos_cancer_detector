import { describe, expect, it } from "vitest";
import {
  containRect,
  normalizedToStage,
  nudge,
  NUDGE_STEP,
  stageToNormalized,
  visibleCenter,
} from "./markerMath";

const square = { w: 400, h: 400 };
const wide = { w: 800, h: 400 }; // imagen 2:1 → franjas arriba y abajo
const id = { scale: 1, tx: 0, ty: 0 };

describe("containRect", () => {
  it("deja franjas en una imagen apaisada", () => {
    expect(containRect(square, wide)).toEqual({ left: 0, top: 100, width: 400, height: 200 });
  });

  it("con stage 100×100 devuelve porcentajes", () => {
    expect(containRect({ w: 100, h: 100 }, wide)).toEqual({ left: 0, top: 25, width: 100, height: 50 });
  });
});

describe("stageToNormalized", () => {
  it("un clic en la franja negra no da coordenada", () => {
    expect(stageToNormalized({ x: 200, y: 50 }, id, square, wide)).toBeNull();
    expect(stageToNormalized({ x: 200, y: 200 }, id, square, wide)).toEqual({ x: 0.5, y: 0.5 });
  });

  it("deshace zoom y pan", () => {
    const t = { scale: 2, tx: -200, ty: -200 }; // centro del stage = centro de la imagen
    expect(stageToNormalized({ x: 200, y: 200 }, t, square, square)).toEqual({ x: 0.5, y: 0.5 });
    expect(stageToNormalized({ x: 0, y: 0 }, t, square, square)).toEqual({ x: 0.25, y: 0.25 });
  });

  it("ida y vuelta conserva el punto", () => {
    const p = normalizedToStage({ x: 0.25, y: 0.75 }, square, wide);
    expect(stageToNormalized(p, id, square, wide)).toEqual({ x: 0.25, y: 0.75 });
  });

  it("stage sin medidas no da coordenada", () => {
    expect(stageToNormalized({ x: 0, y: 0 }, id, { w: 0, h: 0 }, square)).toBeNull();
  });
});

describe("visibleCenter", () => {
  it("stage sin medidas: centro por defecto, sin NaN", () => {
    expect(visibleCenter(id, { w: 0, h: 0 }, square)).toEqual({ x: 0.5, y: 0.5 });
  });

  it("sigue al pan", () => {
    const t = { scale: 2, tx: 0, ty: 0 }; // se ve el cuadrante superior izquierdo
    expect(visibleCenter(t, square, square)).toEqual({ x: 0.25, y: 0.25 });
  });

  it("si el centro cae en una franja, se acota al borde de la imagen", () => {
    const t = { scale: 4, tx: 0, ty: 0 }; // centro del stage → (50, 50): franja superior
    expect(visibleCenter(t, square, wide)).toEqual({ x: 0.125, y: 0 });
  });
});

describe("nudge", () => {
  it("acota a [0,1]", () => {
    expect(nudge({ x: 0.995, y: 0 }, NUDGE_STEP, -NUDGE_STEP)).toEqual({ x: 1, y: 0 });
  });

  it("no acumula error de coma flotante", () => {
    expect(nudge({ x: 0.5, y: 0.5 }, NUDGE_STEP, 0)).toEqual({ x: 0.51, y: 0.5 });
  });
});
