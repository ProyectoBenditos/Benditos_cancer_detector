/**
 * Matemática pura para el visor de imágenes médicas.
 * El modelo de transform es: screen = scale * punto + translate,
 * con transform-origin en (0, 0) del stage (esquina superior izquierda).
 */

export const MIN_SCALE = 1;
export const MAX_SCALE = 8;

/** Sensibilidad de la rueda. Mayor = zoom más agresivo por tick. */
const ZOOM_SENSITIVITY = 0.0015;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Nuevo scale tras un evento de rueda, acotado a [min, max]. deltaY<0 = acercar. */
export function nextScale(
  current: number,
  deltaY: number,
  min: number = MIN_SCALE,
  max: number = MAX_SCALE,
): number {
  const factor = Math.exp(-deltaY * ZOOM_SENSITIVITY);
  return clamp(current * factor, min, max);
}

/**
 * Ajusta el translate para que el punto bajo el cursor quede fijo al cambiar de scale.
 * cursor: coordenadas relativas al stage (px desde su esquina superior izquierda).
 */
export function zoomToCursor(
  prev: { scale: number; tx: number; ty: number },
  next: { scale: number },
  cursor: { x: number; y: number },
): { tx: number; ty: number } {
  const ratio = next.scale / prev.scale;
  return {
    tx: cursor.x - ratio * (cursor.x - prev.tx),
    ty: cursor.y - ratio * (cursor.y - prev.ty),
  };
}

/**
 * Acota tx/ty para que la imagen escalada cubra el stage sin dejar bordes vacíos.
 * Rango válido: [stage*(1-scale), 0].
 */
export function clampTranslate(
  t: { tx: number; ty: number },
  scale: number,
  stage: { w: number; h: number },
): { tx: number; ty: number } {
  return {
    tx: clamp(t.tx, stage.w * (1 - scale), 0),
    ty: clamp(t.ty, stage.h * (1 - scale), 0),
  };
}
