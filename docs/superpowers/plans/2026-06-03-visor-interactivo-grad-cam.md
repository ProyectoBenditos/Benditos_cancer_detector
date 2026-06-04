# Visor interactivo Grad-CAM — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir `BeforeAfterViewer` (hoy dos `<img>` estáticas) en un visor interactivo con zoom hacia el cursor, pan, toggle overlay/lado-a-lado sincronizado, control de opacidad del heatmap y fullscreen — sin dependencias nuevas y sin cambiar el contrato de props.

**Architecture:** Tres unidades pequeñas: (1) `panZoomMath.ts` con funciones puras (zoom-al-cursor, clamp) cubiertas por tests; (2) `usePanZoom.ts`, hook cliente que mantiene el estado de transform (`scale`, `tx`, `ty`) y conecta rueda/puntero/teclado usando esas funciones; (3) `BeforeAfterViewer.tsx` reescrito como Client Component que orquesta modo, opacidad, fullscreen y render, reutilizando una sola instancia del hook para mantener sincronizados los paneles en modo lado-a-lado.

**Tech Stack:** Next.js 16, React 19 (ref-callbacks con cleanup), TypeScript, Tailwind 4, lucide-react (ya instalado), vitest + @testing-library (ya instalado).

**Convenciones del repo (respetar):**
- Mensajes de commit en **español**, formato `tipo: descripción`. **Sin** `Co-Authored-By` ni menciones de IA/asistente (el trabajo se firma como del equipo).
- Prohibido `console.*` en `apps/web/src` (excepto `error.tsx` con `error.digest`).
- Rojo `brand-danger` (#EE005A) **reservado a alertas clínicas**: los controles usan `brand-primary`/`slate`. El rojo del heatmap es dato del modelo (imagen), no UI.
- Solo iconos de `lucide-react`.

---

## Task 1: Funciones puras de zoom/pan (`panZoomMath.ts`)

**Files:**
- Create: `apps/web/src/components/ui/panZoomMath.ts`
- Test: `apps/web/src/components/ui/panZoomMath.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Crear `apps/web/src/components/ui/panZoomMath.test.ts`:

```ts
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
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd apps/web && npx vitest run src/components/ui/panZoomMath.test.ts`
Expected: FAIL — "Cannot find module './panZoomMath'".

- [ ] **Step 3: Implementar las funciones puras**

Crear `apps/web/src/components/ui/panZoomMath.ts`:

```ts
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
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `cd apps/web && npx vitest run src/components/ui/panZoomMath.test.ts`
Expected: PASS (todos los `it` en verde).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/ui/panZoomMath.ts apps/web/src/components/ui/panZoomMath.test.ts
git commit -m "feat: matematica pura de zoom y pan para el visor"
```

---

## Task 2: Hook `usePanZoom`

**Files:**
- Create: `apps/web/src/components/ui/usePanZoom.ts`

No lleva test unitario propio (depende del DOM/eventos); se verifica vía type-check y la verificación manual de Task 4. Toda la lógica numérica ya está cubierta por `panZoomMath.test.ts`.

- [ ] **Step 1: Implementar el hook**

Crear `apps/web/src/components/ui/usePanZoom.ts`:

```ts
"use client";

import { useCallback, useRef, useState } from "react";
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
  const tRef = useRef(t);
  tRef.current = t;

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
```

- [ ] **Step 2: Verificar tipos**

Run: `cd apps/web && npx tsc --noEmit`
Expected: sin errores en `usePanZoom.ts`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/usePanZoom.ts
git commit -m "feat: hook usePanZoom para estado de zoom y desplazamiento"
```

---

## Task 3: Reescribir `BeforeAfterViewer` como visor interactivo

**Files:**
- Modify (reescritura completa): `apps/web/src/components/ui/BeforeAfterViewer.tsx`

Las props públicas **no cambian** (`beforeUrl`, `heatmapBase64`), por lo que los 3 call sites
(`upload`, `analyze/[id]`, `uploads/[id]`) siguen funcionando sin tocarse.

- [ ] **Step 1: Reescribir el componente**

Reemplazar **todo** el contenido de `apps/web/src/components/ui/BeforeAfterViewer.tsx`:

```tsx
"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  Columns2,
  Layers,
  Maximize2,
  Minimize2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { usePanZoom } from "./usePanZoom";

type BeforeAfterViewerProps = {
  beforeUrl: string | null;
  heatmapBase64: string | null;
};

type Mode = "overlay" | "side";

const PAN_STEP = 40;

type StageHandlers = ReturnType<typeof usePanZoom>["stageHandlers"];

function Placeholder({ message }: { message: string }) {
  return (
    <div className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400">
      {message}
    </div>
  );
}

/** Contenedor interactivo (escucha rueda/puntero) con la capa transformada dentro. */
function Stage({
  handlers,
  canPan,
  ariaLabel,
  layerStyle,
  children,
}: {
  handlers: StageHandlers;
  canPan: boolean;
  ariaLabel: string;
  layerStyle: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <div
      ref={handlers.ref}
      onPointerDown={handlers.onPointerDown}
      onPointerMove={handlers.onPointerMove}
      onPointerUp={handlers.onPointerUp}
      role="img"
      aria-label={ariaLabel}
      className={`relative aspect-square w-full touch-none overflow-hidden rounded-xl border border-slate-200 bg-black ${
        canPan ? "cursor-grab active:cursor-grabbing" : "cursor-default"
      }`}
    >
      <div className="absolute inset-0" style={layerStyle}>
        {children}
      </div>
    </div>
  );
}

function ToolbarButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
    >
      {children}
    </button>
  );
}

export function BeforeAfterViewer({ beforeUrl, heatmapBase64 }: BeforeAfterViewerProps) {
  const [mode, setMode] = useState<Mode>("overlay");
  const [opacity, setOpacity] = useState(0.6);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const opacityId = useId();
  const { canPan, layerStyle, stageHandlers, zoomIn, zoomOut, panBy, reset } = usePanZoom();

  const heatmapSrc = heatmapBase64 ? `data:image/png;base64,${heatmapBase64}` : null;

  useEffect(() => {
    const onChange = () =>
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void containerRef.current?.requestFullscreen();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case "+":
      case "=":
        zoomIn();
        break;
      case "-":
        zoomOut();
        break;
      case "0":
        reset();
        break;
      case "f":
      case "F":
        toggleFullscreen();
        break;
      case "ArrowUp":
        e.preventDefault();
        panBy(0, PAN_STEP);
        break;
      case "ArrowDown":
        e.preventDefault();
        panBy(0, -PAN_STEP);
        break;
      case "ArrowLeft":
        e.preventDefault();
        panBy(PAN_STEP, 0);
        break;
      case "ArrowRight":
        e.preventDefault();
        panBy(-PAN_STEP, 0);
        break;
      default:
        break;
    }
  };

  const segBase =
    "px-3 py-1.5 text-sm font-medium rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary";
  const segActive = "bg-brand-primary text-white";
  const segIdle = "text-slate-600 hover:text-brand-primary";

  return (
    <Card>
      <CardContent className="p-6">
        <div
          ref={containerRef}
          role="group"
          aria-label="Visor interactivo de imagen médica: imagen original y mapa de calor Grad-CAM"
          tabIndex={0}
          onKeyDown={onKeyDown}
          className="rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary data-[fullscreen=true]:flex data-[fullscreen=true]:h-full data-[fullscreen=true]:flex-col data-[fullscreen=true]:justify-center data-[fullscreen=true]:bg-white data-[fullscreen=true]:p-6"
          data-fullscreen={isFullscreen}
        >
          {/* Barra de herramientas */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div
              role="radiogroup"
              aria-label="Modo de visualización"
              className="inline-flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1"
            >
              <button
                type="button"
                role="radio"
                aria-checked={mode === "overlay"}
                onClick={() => setMode("overlay")}
                className={`${segBase} ${mode === "overlay" ? segActive : segIdle} inline-flex items-center gap-1.5`}
              >
                <Layers className="h-4 w-4" aria-hidden="true" />
                Superpuesto
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={mode === "side"}
                onClick={() => setMode("side")}
                className={`${segBase} ${mode === "side" ? segActive : segIdle} inline-flex items-center gap-1.5`}
              >
                <Columns2 className="h-4 w-4" aria-hidden="true" />
                Lado a lado
              </button>
            </div>

            <div className="flex items-center gap-2">
              <ToolbarButton onClick={zoomIn} label="Acercar">
                <ZoomIn className="h-4 w-4" aria-hidden="true" />
              </ToolbarButton>
              <ToolbarButton onClick={zoomOut} label="Alejar">
                <ZoomOut className="h-4 w-4" aria-hidden="true" />
              </ToolbarButton>
              <ToolbarButton onClick={reset} label="Restablecer vista">
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
              </ToolbarButton>
              <ToolbarButton
                onClick={toggleFullscreen}
                label={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Maximize2 className="h-4 w-4" aria-hidden="true" />
                )}
              </ToolbarButton>
            </div>
          </div>

          {/* Render según modo */}
          {mode === "overlay" ? (
            beforeUrl ? (
              <Stage
                handlers={stageHandlers}
                canPan={canPan}
                ariaLabel="Imagen original con el mapa de calor Grad-CAM superpuesto"
                layerStyle={layerStyle}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={beforeUrl}
                  alt="Imagen original del estudio subido por el usuario"
                  draggable={false}
                  className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                />
                {heatmapSrc && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={heatmapSrc}
                    alt="Mapa de calor Grad-CAM que resalta las zonas de mayor activación del modelo"
                    draggable={false}
                    style={{ opacity }}
                    className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                  />
                )}
              </Stage>
            ) : (
              <Placeholder message="Vista previa no disponible" />
            )
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {beforeUrl ? (
                <Stage
                  handlers={stageHandlers}
                  canPan={canPan}
                  ariaLabel="Imagen original del estudio"
                  layerStyle={layerStyle}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={beforeUrl}
                    alt="Imagen original del estudio subido por el usuario"
                    draggable={false}
                    className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                  />
                </Stage>
              ) : (
                <Placeholder message="Vista previa no disponible" />
              )}
              {heatmapSrc ? (
                <Stage
                  handlers={stageHandlers}
                  canPan={canPan}
                  ariaLabel="Mapa de calor Grad-CAM"
                  layerStyle={layerStyle}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={heatmapSrc}
                    alt="Mapa de calor Grad-CAM que resalta las zonas de mayor activación del modelo"
                    draggable={false}
                    className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                  />
                </Stage>
              ) : (
                <Placeholder message="Mapa de calor no disponible" />
              )}
            </div>
          )}

          {/* Control de opacidad (solo overlay) */}
          {mode === "overlay" && heatmapSrc && (
            <div className="mt-4 flex items-center gap-3">
              <label htmlFor={opacityId} className="text-sm font-medium text-slate-700">
                Opacidad del mapa de calor
              </label>
              <input
                id={opacityId}
                type="range"
                min={0}
                max={100}
                value={Math.round(opacity * 100)}
                onChange={(e) => setOpacity(Number(e.target.value) / 100)}
                className="h-2 flex-1 cursor-pointer accent-brand-primary"
                aria-valuetext={`${Math.round(opacity * 100)} por ciento`}
              />
              <span className="w-10 text-right text-xs tabular-nums text-slate-500">
                {Math.round(opacity * 100)}%
              </span>
            </div>
          )}

          <p className="mt-4 text-xs text-slate-500">
            En el mapa de calor, las zonas en rojo indican mayor activación del modelo
            (regiones que más influyeron en la predicción). Usa la rueda del mouse para acercar,
            arrastra para desplazarte y las teclas + / − / 0 / F y las flechas para navegar. Es una
            visualización de apoyo y no constituye un diagnóstico.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Verificar tipos y lint**

Run: `cd apps/web && npx tsc --noEmit && npx eslint src/components/ui/BeforeAfterViewer.tsx src/components/ui/usePanZoom.ts src/components/ui/panZoomMath.ts`
Expected: sin errores. (Las `<img>` llevan su `eslint-disable-next-line @next/next/no-img-element` como en el componente original.)

- [ ] **Step 3: Verificar que no se introdujo `console.*`**

Run: `git grep -n "console\." apps/web/src`
Expected: solo la línea esperada en `apps/web/src/app/platform/error.tsx` con `error.digest`. Si aparece otra, eliminarla.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/ui/BeforeAfterViewer.tsx
git commit -m "feat: visor interactivo con zoom, pan, overlay y pantalla completa"
```

---

## Task 4: Verificación de integración

**Files:** ninguno (solo verificación).

- [ ] **Step 1: Build de producción**

Run: `cd apps/web && npm run build`
Expected: build exitoso, sin errores de tipos ni de Server/Client boundary. Confirma que importar el Client Component desde el Server Component `uploads/[id]/page.tsx` compila correctamente.

- [ ] **Step 2: Correr toda la suite de tests**

Run: `cd apps/web && npm test`
Expected: PASS, incluyendo `panZoomMath.test.ts`.

- [ ] **Step 3: Verificación manual en las 3 rutas**

Run: `cd apps/web && npm run dev` y abrir cada ruta con un estudio analizado:
- `/platform/upload` (resultado inline tras analizar)
- `/platform/analyze/[id]`
- `/platform/uploads/[id]`

Verificar en cada una:
- [ ] Rueda del mouse hace zoom hacia el cursor; no baja de 1x ni sube de 8x.
- [ ] Arrastrar desplaza la imagen (cursor `grab`/`grabbing`); a 1x no hay pan.
- [ ] Toggle Superpuesto ↔ Lado a lado funciona; en lado a lado ambos paneles quedan sincronizados.
- [ ] Slider de opacidad solo aparece en modo Superpuesto y mezcla el heatmap.
- [ ] Botón de pantalla completa entra/sale; icono cambia Maximize/Minimize.
- [ ] Con el visor enfocado: `+`/`−` zoom, `0` reset, `F` fullscreen, flechas desplazan.
- [ ] Foco visible (outline `brand-primary`) en controles y contenedor al navegar con Tab.
- [ ] Placeholders se muestran si falta `beforeUrl` o el heatmap.

- [ ] **Step 4: Auditoría de accesibilidad**

Ejecutar el slash command del proyecto: `/oncoscan-a11y apps/web/src/components/ui/BeforeAfterViewer.tsx`
Corregir cualquier hallazgo bloqueante (contraste, labels, foco, navegación por teclado).

- [ ] **Step 5: Marcar la spec como implementada**

Editar `docs/superpowers/specs/2026-06-03-visor-interactivo-grad-cam-design.md`:
cambiar `**Estado**: \`Aprobado\`` por `**Estado**: \`Implementado\``.

```bash
git add docs/superpowers/specs/2026-06-03-visor-interactivo-grad-cam-design.md
git commit -m "docs: marcar spec del visor interactivo como implementada"
```

---

## Notas de cierre

- Sin dependencias nuevas: todo se apoya en React 19, Tailwind y `lucide-react` (ya instalados).
- Contrato de props intacto → los 3 call sites no se modifican.
- La única lógica con riesgo de bug (matemática de zoom/clamp) está aislada y testeada en `panZoomMath.ts`.
