/**
 * Coordenadas de los marcadores (funciones puras, testeadas).
 * Un marcador se guarda normalizado sobre la imagen (x, y entre 0 y 1 del PNG),
 * no en píxeles de pantalla: así sobrevive al zoom, al tamaño de la ventana y
 * al dispositivo. Como la imagen se pinta con object-contain, puede dejar
 * franjas; por eso todo pasa por el rectángulo real que ocupa (containRect).
 */
import { clamp } from "./panZoomMath";

export type Size = { w: number; h: number };
export type Point = { x: number; y: number };
export type Rect = { left: number; top: number; width: number; height: number };
export type Transform = { scale: number; tx: number; ty: number };

/** Paso de las flechas al mover un marcador (1 % de la imagen). */
export const NUDGE_STEP = 0.01;

const round4 = (v: number) => Math.round(v * 10_000) / 10_000;

/**
 * Rectángulo que ocupa la imagen con object-contain, en las unidades de `stage`.
 * Con stage = { w: 100, h: 100 } el resultado está en porcentaje.
 */
export function containRect(stage: Size, natural: Size): Rect {
  const k = Math.min(stage.w / natural.w, stage.h / natural.h);
  const width = natural.w * k;
  const height = natural.h * k;
  return { left: (stage.w - width) / 2, top: (stage.h - height) / 2, width, height };
}

/** Punto del stage → coordenada normalizada sin acotar (puede salir de [0,1]). null si el stage mide 0. */
function toImage(p: Point, t: Transform, stage: Size, natural: Size): Point | null {
  if (stage.w <= 0 || stage.h <= 0) return null;
  const r = containRect(stage, natural);
  const layerX = (p.x - t.tx) / t.scale;
  const layerY = (p.y - t.ty) / t.scale;
  return { x: (layerX - r.left) / r.width, y: (layerY - r.top) / r.height };
}

/**
 * Punto en px relativos al stage (lo que mide el puntero) → coordenada
 * normalizada de la imagen, deshaciendo el transform. null si cae fuera de la
 * imagen (p. ej. en una franja negra) o si el stage no tiene medidas.
 */
export function stageToNormalized(p: Point, t: Transform, stage: Size, natural: Size): Point | null {
  const n = toImage(p, t, stage, natural);
  if (!n || n.x < 0 || n.x > 1 || n.y < 0 || n.y > 1) return null;
  return { x: round4(n.x), y: round4(n.y) };
}

/** Normalizada → posición en la capa sin transformar, en unidades de `stage`. */
export function normalizedToStage(n: Point, stage: Size, natural: Size): Point {
  const r = containRect(stage, natural);
  return { x: r.left + n.x * r.width, y: r.top + n.y * r.height };
}

/** Centro de lo que se ve, normalizado y acotado a [0,1]. {0.5, 0.5} si el stage mide 0. */
export function visibleCenter(t: Transform, stage: Size, natural: Size): Point {
  const n = toImage({ x: stage.w / 2, y: stage.h / 2 }, t, stage, natural);
  if (!n) return { x: 0.5, y: 0.5 };
  return { x: round4(clamp(n.x, 0, 1)), y: round4(clamp(n.y, 0, 1)) };
}

/** Mueve una coordenada normalizada, acotada a [0,1]. */
export function nudge(n: Point, dx: number, dy: number): Point {
  return { x: round4(clamp(n.x + dx, 0, 1)), y: round4(clamp(n.y + dy, 0, 1)) };
}
