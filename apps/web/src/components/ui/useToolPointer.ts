"use client";

import { useRef } from "react";
import type { usePanZoom } from "./usePanZoom";
import { ADJUST_DEFAULT, adjustFromDrag, isClick, type Adjust, type ViewerTool } from "./viewerTools";

type StageHandlers = ReturnType<typeof usePanZoom>["stageHandlers"];
type PointerHandler = (e: React.PointerEvent<HTMLDivElement>) => void;

/**
 * Reparte los gestos del puntero sobre el lienzo según la herramienta activa.
 * - pan: arrastrar desplaza (delegado en usePanZoom).
 * - marker: un clic llama a onClickAt; un arrastre desplaza.
 * - adjust: arrastre horizontal = contraste, vertical = brillo; doble clic restablece.
 * La rueda (registrada en `ref`) hace zoom con cualquier herramienta.
 */
export function useToolPointer(opts: {
  tool: ViewerTool;
  pan: StageHandlers;
  adjust: Adjust;
  onAdjust: (a: Adjust) => void;
  onClickAt: (p: { x: number; y: number }, stage: { w: number; h: number }) => void;
}): StageHandlers & { onDoubleClick: () => void } {
  const { tool, pan, adjust, onAdjust, onClickAt } = opts;
  const start = useRef<{ x: number; y: number; base: Adjust } | null>(null);

  const onPointerDown: PointerHandler = (e) => {
    start.current = { x: e.clientX, y: e.clientY, base: adjust };
    if (tool === "adjust") {
      e.currentTarget.setPointerCapture?.(e.pointerId);
      return;
    }
    pan.onPointerDown(e);
  };

  const onPointerMove: PointerHandler = (e) => {
    const s = start.current;
    if (tool === "adjust") {
      if (s) onAdjust(adjustFromDrag(s.base, e.clientX - s.x, e.clientY - s.y));
      return;
    }
    pan.onPointerMove(e);
  };

  const onPointerUp: PointerHandler = (e) => {
    const s = start.current;
    start.current = null;
    if (tool === "adjust") {
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      return;
    }
    pan.onPointerUp(e);
    if (tool === "marker" && s && isClick(e.clientX - s.x, e.clientY - s.y)) {
      const el = e.currentTarget;
      const rect = el.getBoundingClientRect();
      onClickAt({ x: e.clientX - rect.left, y: e.clientY - rect.top }, { w: el.clientWidth, h: el.clientHeight });
    }
  };

  const onDoubleClick = () => {
    if (tool === "adjust") onAdjust(ADJUST_DEFAULT);
  };

  return { ref: pan.ref, onPointerDown, onPointerMove, onPointerUp, onDoubleClick };
}
