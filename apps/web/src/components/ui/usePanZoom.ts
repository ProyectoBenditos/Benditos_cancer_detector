"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clamp,
  clampTranslate,
  MAX_SCALE,
  MIN_SCALE,
  nextScale,
  zoomToCursor,
} from "./panZoomMath";

type Transform = { scale: number; tx: number; ty: number };
const INITIAL: Transform = { scale: 1, tx: 0, ty: 0 };
const BUTTON_FACTOR = 1.4;

/**
 * Estado de zoom/pan compartido. Una sola instancia puede gobernar varios "stages"
 * (p. ej. los dos paneles del modo lado-a-lado quedan sincronizados).
 */
export function usePanZoom() {
  const [t, setT] = useState<Transform>(INITIAL);
  // Espejo de la última transform comprometida para que los event handlers
  // (puntero) lean valores actuales sin tocar el ref durante el render.
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  // Último stage registrado: lo usan los botones y el teclado para medir/centrar.
  const lastStage = useRef<HTMLDivElement | null>(null);
  const dragging = useRef<{
    startX: number;
    startY: number;
    baseTx: number;
    baseTy: number;
  } | null>(null);

  // Ref-callback (React 19): adjunta el listener de rueda NO pasivo para poder
  // llamar preventDefault, y devuelve su limpieza.
  const registerStage = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    lastStage.current = el;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cursor = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      setT((prev) => {
        const s = nextScale(prev.scale, e.deltaY);
        const moved = zoomToCursor(prev, { scale: s }, cursor);
        const stage = { w: el.clientWidth, h: el.clientHeight };
        return { scale: s, ...clampTranslate(moved, s, stage) };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      if (lastStage.current === el) lastStage.current = null;
    };
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (tRef.current.scale <= MIN_SCALE) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseTx: tRef.current.tx,
      baseTy: tRef.current.ty,
    };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragging.current;
    if (!d) return;
    const el = e.currentTarget;
    const moved = {
      tx: d.baseTx + (e.clientX - d.startX),
      ty: d.baseTy + (e.clientY - d.startY),
    };
    const stage = { w: el.clientWidth, h: el.clientHeight };
    setT((prev) => ({ scale: prev.scale, ...clampTranslate(moved, prev.scale, stage) }));
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragging.current = null;
  }, []);

  const zoomBy = useCallback((factor: number) => {
    const el = lastStage.current;
    const w = el?.clientWidth ?? 0;
    const h = el?.clientHeight ?? 0;
    const center = { x: w / 2, y: h / 2 };
    setT((prev) => {
      const s = clamp(prev.scale * factor, MIN_SCALE, MAX_SCALE);
      const moved = zoomToCursor(prev, { scale: s }, center);
      return { scale: s, ...clampTranslate(moved, s, { w, h }) };
    });
  }, []);

  const zoomIn = useCallback(() => zoomBy(BUTTON_FACTOR), [zoomBy]);
  const zoomOut = useCallback(() => zoomBy(1 / BUTTON_FACTOR), [zoomBy]);

  const panBy = useCallback((dx: number, dy: number) => {
    const el = lastStage.current;
    const w = el?.clientWidth ?? 0;
    const h = el?.clientHeight ?? 0;
    setT((prev) => ({
      scale: prev.scale,
      ...clampTranslate({ tx: prev.tx + dx, ty: prev.ty + dy }, prev.scale, { w, h }),
    }));
  }, []);

  const reset = useCallback(() => setT(INITIAL), []);

  const layerStyle: React.CSSProperties = {
    transform: `translate(${t.tx}px, ${t.ty}px) scale(${t.scale})`,
    transformOrigin: "0 0",
  };

  return {
    scale: t.scale,
    canPan: t.scale > MIN_SCALE,
    layerStyle,
    stageHandlers: { ref: registerStage, onPointerDown, onPointerMove, onPointerUp },
    zoomIn,
    zoomOut,
    panBy,
    reset,
  };
}
