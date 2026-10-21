"use client";

import { normalizedToStage, nudge, NUDGE_STEP, type Size } from "./markerMath";
import { markerAriaLabel, type Marker } from "./markerState";

const PERCENT_STAGE = { w: 100, h: 100 };
const round2 = (v: number) => Math.round(v * 100) / 100;

const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-NUDGE_STEP, 0],
  ArrowRight: [NUDGE_STEP, 0],
  ArrowUp: [0, -NUDGE_STEP],
  ArrowDown: [0, NUDGE_STEP],
};

/**
 * Pins numerados de los marcadores. Va dentro de la capa transformada del
 * lienzo, así que sigue a la imagen con zoom, pan y pantalla completa; la
 * escala inversa mantiene el tamaño del pin en pantalla. Los colores son
 * brand-primary (sky en tema oscuro), nunca brand-danger.
 */
export function MarkerLayer({
  markers,
  selectedId,
  natural,
  scale,
  focusable,
  onSelect,
  onMove,
}: {
  markers: Marker[];
  selectedId: string | null;
  /** Tamaño natural del PNG; { w: 1, h: 1 } mientras no cargue. */
  natural: Size;
  scale: number;
  /** false en el segundo panel de Lado a lado: duplicado solo visual. */
  focusable: boolean;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30" aria-hidden={focusable ? undefined : true}>
      {markers.map((m) => {
        const pos = normalizedToStage(m, PERCENT_STAGE, natural);
        const selected = m.id === selectedId;
        return (
          <button
            key={m.id}
            type="button"
            aria-label={markerAriaLabel(m)}
            aria-pressed={selected}
            tabIndex={focusable ? 0 : -1}
            onPointerDown={(e) => e.stopPropagation()} // ni pan ni marcador nuevo
            onPointerUp={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            onClick={() => onSelect(m.id)}
            onKeyDown={(e) => {
              const d = ARROWS[e.key];
              if (!d) return;
              e.preventDefault();
              e.stopPropagation();
              const next = nudge(m, d[0], d[1]);
              onMove(m.id, next.x, next.y);
            }}
            style={{
              left: `${round2(pos.x)}%`,
              top: `${round2(pos.y)}%`,
              transform: `translate(-50%, -50%) scale(${1 / scale})`,
            }}
            className={`pointer-events-auto absolute flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-brand-primary text-[11px] font-bold text-white shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white viewer-full:bg-sky-300 viewer-full:text-slate-950 ${
              selected ? "ring-2 ring-white ring-offset-2 ring-offset-brand-primary viewer-full:ring-offset-sky-300" : ""
            }`}
          >
            {m.seq}
          </button>
        );
      })}
    </div>
  );
}
