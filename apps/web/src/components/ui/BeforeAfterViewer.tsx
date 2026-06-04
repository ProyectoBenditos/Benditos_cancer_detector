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
    <div className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
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
      {...handlers}
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
