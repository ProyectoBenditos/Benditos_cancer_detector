/**
 * Herramientas del visor (funciones puras, testeadas).
 * "Brillo/Contraste" es un filtro CSS sobre el PNG de 8 bits, no un WW/WL real:
 * eso llega con los datos HU de la serie DICOM (fase E).
 */
import { clamp } from "./panZoomMath";

export type ViewerTool = "pan" | "adjust" | "marker" | "measure";
export type Adjust = { brightness: number; contrast: number };

export const ADJUST_DEFAULT: Adjust = { brightness: 1, contrast: 1 };
export const ADJUST_MIN = 0.2;
export const ADJUST_MAX = 3;
/** Píxeles de arrastre que equivalen a ±1.0 de brillo o contraste. */
export const ADJUST_PX_PER_UNIT = 200;
/** Por debajo de esta distancia, soltar el puntero cuenta como clic y no como arrastre. */
export const CLICK_TOLERANCE_PX = 5;

const round2 = (v: number) => Math.round(v * 100) / 100;

/** Arrastre horizontal = contraste; vertical = brillo (hacia arriba aclara). */
export function adjustFromDrag(base: Adjust, dx: number, dy: number): Adjust {
  return {
    brightness: round2(clamp(base.brightness - dy / ADJUST_PX_PER_UNIT, ADJUST_MIN, ADJUST_MAX)),
    contrast: round2(clamp(base.contrast + dx / ADJUST_PX_PER_UNIT, ADJUST_MIN, ADJUST_MAX)),
  };
}

export function isDefaultAdjust(a: Adjust): boolean {
  return a.brightness === ADJUST_DEFAULT.brightness && a.contrast === ADJUST_DEFAULT.contrast;
}

export function adjustFilter(a: Adjust): string {
  return isDefaultAdjust(a) ? "none" : `brightness(${a.brightness}) contrast(${a.contrast})`;
}

export function isClick(dx: number, dy: number): boolean {
  return Math.hypot(dx, dy) < CLICK_TOLERANCE_PX;
}
