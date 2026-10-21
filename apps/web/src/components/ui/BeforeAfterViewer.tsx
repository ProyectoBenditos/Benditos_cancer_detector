"use client";

import { useEffect, useId, useMemo, useRef, useState, useCallback } from "react";
import {
  Columns2,
  Download,
  Eye,
  EyeOff,
  Keyboard,
  Layers,
  Maximize2,
  Minimize2,
  RotateCcw,
  SlidersHorizontal,
  Split,
  Sparkles,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { usePanZoom } from "./usePanZoom";
import { useViewerFullscreen } from "./useViewerFullscreen";
import { ViewerHelpDialog } from "./ViewerHelpDialog";
import { isFormControlTarget, resolveViewerKey } from "./viewerKeys";

type BeforeAfterViewerProps = {
  beforeUrl: string | null;
  heatmapBase64: string | null;
  initialMode?: Mode;
  initialSplit?: number;
  initialShowAi?: boolean;
};

type Mode = "curtain" | "side" | "overlay";

const PAN_STEP = 40;

// Controles en reposo dentro de la pantalla completa oscura. brand-primary no
// tiene contraste sobre fondo oscuro, por eso los acentos usan sky.
const DARK_CONTROL =
  "viewer-full:border-slate-700 viewer-full:bg-slate-800 viewer-full:text-slate-200 viewer-full:hover:bg-slate-700 viewer-full:hover:text-white";
const DARK_PANEL = "viewer-full:border-slate-700 viewer-full:bg-slate-900 viewer-full:text-slate-300";

type StageHandlers = ReturnType<typeof usePanZoom>["stageHandlers"];

function Placeholder({ message }: { message: string }) {
  return (
    <div className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500 viewer-full:border-slate-700 viewer-full:bg-slate-900 viewer-full:text-slate-400">
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
  // En pantalla completa el envoltorio ocupa el alto libre y el lienzo cuadrado
  // se dimensiona por esa altura (no por el ancho), para no salirse de la pantalla.
  return (
    <div className="viewer-full:flex viewer-full:min-h-0 viewer-full:flex-1 viewer-full:items-center viewer-full:justify-center">
      <div
        {...handlers}
        role="img"
        aria-label={ariaLabel}
        className={`relative aspect-square w-full touch-none overflow-hidden rounded-xl border border-slate-200 bg-black select-none viewer-full:h-full viewer-full:w-auto viewer-full:max-w-full viewer-full:border-slate-800 ${
          canPan ? "cursor-grab active:cursor-grabbing" : "cursor-default"
        }`}
      >
        <div className="absolute inset-0" style={layerStyle}>
          {children}
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({
  onClick,
  label,
  children,
  active,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary viewer-full:focus-visible:outline-sky-300 cursor-pointer ${
        active
          ? "border-brand-primary bg-brand-primary/10 text-brand-primary viewer-full:border-sky-300 viewer-full:bg-sky-300/15 viewer-full:text-sky-200"
          : `border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-brand-primary ${DARK_CONTROL}`
      }`}
    >
      {children}
    </button>
  );
}

export function BeforeAfterViewer({
  beforeUrl,
  heatmapBase64,
  initialMode = "curtain",
  initialSplit = 50,
  initialShowAi = true,
}: BeforeAfterViewerProps) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [opacity, setOpacity] = useState(0.7);
  // splitPosition representa el % de Detección IA revelado de izquierda a derecha (0% = TAC Original, 100% = IA pura)
  const [splitPosition, setSplitPosition] = useState(initialSplit);
  const [cleanNoise, setCleanNoise] = useState(true);
  const [showAi, setShowAi] = useState(initialShowAi);
  const [filteredHeatmapUrl, setFilteredHeatmapUrl] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const closeHelp = useCallback(() => setHelpOpen(false), []);

  const containerRef = useRef<HTMLDivElement>(null);
  const {
    mode: fullscreenMode,
    isFullscreen,
    toggle: toggleFullscreen,
    exit: exitFullscreen,
  } = useViewerFullscreen(containerRef);
  const opacityId = useId();
  const splitId = useId();

  const { scale, canPan, layerStyle, stageHandlers, zoomIn, zoomOut, panBy, reset } =
    usePanZoom();

  // Arrastre del tirador de la cortina. Se mide contra la capa transformada (padre
  // del tirador), así la línea sigue al cursor también con zoom/pan aplicados.
  const draggingSplit = useRef(false);
  const updateSplitFromPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const layer = e.currentTarget.parentElement;
    if (!layer) return;
    const rect = layer.getBoundingClientRect();
    if (rect.width === 0) return;
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    setSplitPosition(Math.round(Math.min(100, Math.max(0, pct))));
  };
  const splitHandlers = {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation(); // no iniciar el pan del stage
      e.currentTarget.setPointerCapture(e.pointerId);
      draggingSplit.current = true;
      updateSplitFromPointer(e);
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      if (draggingSplit.current) updateSplitFromPointer(e);
    },
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      draggingSplit.current = false;
    },
  };

  // Filtrado inteligente automático: atenúa el ruido difuso de esquinas para resaltar el foco principal
  useEffect(() => {
    if (!heatmapBase64 || !cleanNoise) return;

    let active = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = `data:image/png;base64,${heatmapBase64}`;

    img.onload = () => {
      if (!active) return;
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      // Umbral óptimo del 35% para eliminar difusión en bordes sin perder el nódulo
      const cutoff = 0.35 * 255;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const a = data[i + 3];
        if (a === 0) continue;

        if (r < cutoff) {
          const factor = r / (cutoff || 1);
          data[i + 3] = Math.round(a * Math.pow(factor, 2.5));
        }
      }

      ctx.putImageData(imgData, 0, 0);
      if (active) {
        setFilteredHeatmapUrl(canvas.toDataURL("image/png"));
      }
    };

    return () => {
      active = false;
    };
  }, [heatmapBase64, cleanNoise]);

  const rawHeatmapSrc = useMemo(
    () => (heatmapBase64 ? `data:image/png;base64,${heatmapBase64}` : null),
    [heatmapBase64]
  );

  const activeHeatmapSrc = cleanNoise && filteredHeatmapUrl ? filteredHeatmapUrl : rawHeatmapSrc;

  // Los atajos se escuchan solo dentro del visor (no en window): fuera de él,
  // Espacio y las flechas conservan su comportamiento normal.
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Con la ayuda abierta el teclado es del modal (Esc lo cierra a él, no la
    // pantalla completa).
    if (helpOpen) return;
    const action = resolveViewerKey(e, {
      isContainer: e.target === e.currentTarget,
      isFormControl: isFormControlTarget(e.target),
    });
    switch (action) {
      case "zoomIn":
        zoomIn();
        break;
      case "zoomOut":
        zoomOut();
        break;
      case "reset":
        reset();
        break;
      case "toggleFullscreen":
        toggleFullscreen();
        break;
      case "exitFullscreen":
        exitFullscreen();
        break;
      case "toggleAi":
        e.preventDefault();
        setShowAi((prev) => !prev);
        break;
      case "openHelp":
        e.preventDefault();
        setHelpOpen(true);
        break;
      case "panUp":
        e.preventDefault();
        panBy(0, PAN_STEP);
        break;
      case "panDown":
        e.preventDefault();
        panBy(0, -PAN_STEP);
        break;
      case "panLeft":
        e.preventDefault();
        panBy(PAN_STEP, 0);
        break;
      case "panRight":
        e.preventDefault();
        panBy(-PAN_STEP, 0);
        break;
      default:
        break;
    }
  };

  // Exportar imagen comparativa limpia
  const handleExport = useCallback(() => {
    if (!beforeUrl) return;

    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 800;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, 800, 800);

    const baseImg = new Image();
    baseImg.crossOrigin = "anonymous";
    baseImg.src = beforeUrl;
    baseImg.onload = () => {
      ctx.drawImage(baseImg, 0, 0, 800, 800);

      if (activeHeatmapSrc && showAi) {
        const heatImg = new Image();
        heatImg.src = activeHeatmapSrc;
        heatImg.onload = () => {
          ctx.globalAlpha = opacity;
          ctx.drawImage(heatImg, 0, 0, 800, 800);
          ctx.globalAlpha = 1.0;

          // Membrete inferior informativo
          ctx.fillStyle = "rgba(1, 38, 65, 0.9)";
          ctx.fillRect(0, 740, 800, 60);

          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 15px sans-serif";
          ctx.fillText("OncaScan AI • Explicabilidad Grad-CAM", 20, 765);

          ctx.font = "12px sans-serif";
          ctx.fillStyle = "#cbd5e1";
          ctx.fillText(
            `Modo: ${mode} | Fecha: ${new Date().toLocaleDateString()}`,
            20,
            785
          );

          const a = document.createElement("a");
          a.download = `oncascan_analisis_${Date.now()}.png`;
          a.href = canvas.toDataURL("image/png");
          a.click();
        };
      } else {
        const a = document.createElement("a");
        a.download = `oncascan_estudio_${Date.now()}.png`;
        a.href = canvas.toDataURL("image/png");
        a.click();
      }
    };
  }, [beforeUrl, activeHeatmapSrc, opacity, mode, showAi]);

  const segBase =
    "px-3 py-1.5 text-xs font-semibold rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary viewer-full:focus-visible:outline-sky-300 cursor-pointer";
  const segActive = "bg-brand-primary text-white shadow-sm viewer-full:bg-sky-300 viewer-full:text-slate-950";
  const segIdle = "text-slate-600 hover:text-brand-primary viewer-full:text-slate-300 viewer-full:hover:text-white";

  return (
    <Card>
      <CardContent className="p-6">
        <div
          ref={containerRef}
          role="group"
          aria-label="Visor de tomografía y mapa de calor Grad-CAM"
          tabIndex={0}
          onKeyDown={onKeyDown}
          className={`rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary viewer-full:flex viewer-full:h-dvh viewer-full:flex-col viewer-full:bg-slate-950 viewer-full:p-4 viewer-full:text-slate-100 viewer-full:focus-visible:outline-sky-300 ${
            fullscreenMode === "expanded" ? "fixed inset-0 z-50 overflow-auto rounded-none" : ""
          }`}
          data-fullscreen={isFullscreen}
          data-fullscreen-mode={fullscreenMode}
        >
          {/* Barra de herramientas superior */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            {/* Selector de modo simple */}
            <div
              role="radiogroup"
              aria-label="Modo de visualización"
              className={`inline-flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 ${DARK_PANEL}`}
            >
              <button
                type="button"
                role="radio"
                aria-checked={mode === "curtain"}
                onClick={() => setMode("curtain")}
                className={`${segBase} ${mode === "curtain" ? segActive : segIdle} inline-flex items-center gap-1.5`}
              >
                <Split className="h-3.5 w-3.5" aria-hidden="true" />
                Cortina
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={mode === "side"}
                onClick={() => setMode("side")}
                className={`${segBase} ${mode === "side" ? segActive : segIdle} inline-flex items-center gap-1.5`}
              >
                <Columns2 className="h-3.5 w-3.5" aria-hidden="true" />
                Lado a lado
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={mode === "overlay"}
                onClick={() => setMode("overlay")}
                className={`${segBase} ${mode === "overlay" ? segActive : segIdle} inline-flex items-center gap-1.5`}
              >
                <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                Superpuesto
              </button>
            </div>

            {/* Controles de Zoom, Parpadeo, Pantalla Completa y Descarga */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200 tabular-nums viewer-full:border-slate-700 viewer-full:bg-slate-800 viewer-full:text-slate-200">
                {Math.round(scale * 100)}%
              </span>
              <ToolbarButton onClick={zoomIn} label="Acercar (+)">
                <ZoomIn className="h-4 w-4" aria-hidden="true" />
              </ToolbarButton>
              <ToolbarButton onClick={zoomOut} label="Alejar (-)">
                <ZoomOut className="h-4 w-4" aria-hidden="true" />
              </ToolbarButton>
              <ToolbarButton onClick={reset} label="Restablecer vista (0)">
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
              </ToolbarButton>

              {/* Botón Parpadeo (con Espacio) */}
              <button
                type="button"
                onClick={() => setShowAi((prev) => !prev)}
                title={showAi ? "Parpadeo: Ocultar IA (Barra Espaciadora)" : "Parpadeo: Mostrar IA (Barra Espaciadora)"}
                className={`flex h-9 items-center gap-1.5 px-2.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary viewer-full:focus-visible:outline-sky-300 ${
                  !showAi
                    ? "border-amber-400 bg-amber-50 text-amber-800 shadow-sm"
                    : `border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-brand-primary ${DARK_CONTROL}`
                }`}
              >
                {!showAi ? (
                  <>
                    <EyeOff className="h-4 w-4 text-amber-600" aria-hidden="true" />
                    <span>TAC Pura</span>
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5 text-brand-primary viewer-full:text-sky-200" aria-hidden="true" />
                    <span>Parpadeo</span>
                  </>
                )}
              </button>

              <ToolbarButton
                onClick={handleExport}
                label="Descargar imagen"
              >
                <Download className="h-4 w-4 text-emerald-600 viewer-full:text-emerald-400" aria-hidden="true" />
              </ToolbarButton>
              <ToolbarButton onClick={() => setHelpOpen(true)} label="Atajos de teclado (?)">
                <Keyboard className="h-4 w-4" aria-hidden="true" />
              </ToolbarButton>
              <ToolbarButton
                onClick={toggleFullscreen}
                label={isFullscreen ? "Salir de pantalla completa (F)" : "Pantalla completa (F)"}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Maximize2 className="h-4 w-4" aria-hidden="true" />
                )}
              </ToolbarButton>
            </div>
          </div>

          {/* ── Visualizador Principal ── */}
          <div className="viewer-full:flex viewer-full:min-h-0 viewer-full:flex-1 viewer-full:flex-col">
          {mode === "curtain" ? (
            beforeUrl ? (
              <div className="relative viewer-full:flex viewer-full:min-h-0 viewer-full:flex-1 viewer-full:flex-col">
                <Stage
                  handlers={stageHandlers}
                  canPan={canPan}
                  ariaLabel="Comparativa en cortina: imagen original vs detección IA"
                  layerStyle={layerStyle}
                >
                  {/* Capa Base: TAC Original */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={beforeUrl}
                    alt="Estudio tomográfico original"
                    draggable={false}
                    className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                  />

                  {/* Capa Revelada (Grad-CAM sobre TAC): Se descubre de izquierda a derecha al mover la barra a la derecha */}
                  {showAi && activeHeatmapSrc && (
                    <div
                      className="pointer-events-none absolute inset-0 h-full w-full overflow-hidden"
                      style={{
                        clipPath: `inset(0 ${100 - splitPosition}% 0 0)`,
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={beforeUrl}
                        alt=""
                        aria-hidden="true"
                        draggable={false}
                        className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                      />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={activeHeatmapSrc}
                        alt="Detección IA superpuesta"
                        draggable={false}
                        style={{ opacity }}
                        className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                      />
                    </div>
                  )}

                  {/* Tirador de la cortina: arrastrable desde la línea o el símbolo ◀▶.
                      Para teclado y lectores de pantalla está el range de abajo. */}
                  {showAi && (
                    <div
                      {...splitHandlers}
                      onPointerCancel={splitHandlers.onPointerUp}
                      aria-hidden="true"
                      className="absolute top-0 bottom-0 z-20 w-6 -translate-x-1/2 cursor-ew-resize touch-none group"
                      style={{ left: `${splitPosition}%` }}
                    >
                      <div className="pointer-events-none absolute top-0 bottom-0 left-1/2 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_8px_rgba(0,0,0,0.8)]" />
                      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full bg-brand-primary text-white border border-white shadow-md text-[9px] font-bold transition-transform group-hover:scale-125 group-active:scale-125">
                        ◀▶
                      </div>
                    </div>
                  )}

                  {/* Badges de orientación en las esquinas */}
                  {showAi && (
                    <>
                      <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded text-[10px] font-bold bg-brand-primary/80 text-white backdrop-blur-sm pointer-events-none">
                        Detección IA
                      </span>
                      <span className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900/80 text-white backdrop-blur-sm pointer-events-none">
                        TAC Original
                      </span>
                    </>
                  )}

                  {/* Cartel de modo Parpadeo activo */}
                  {!showAi && (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-600/90 text-white text-xs font-bold shadow-lg backdrop-blur-sm pointer-events-none">
                      <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                      Parpadeo Activo: Mostrando TAC Pura (Presiona Espacio para ver IA)
                    </div>
                  )}
                </Stage>

                {/* Deslizador de la cortina (0% = TAC Original, 100% = Detección IA) */}
                <div className={`mt-3 bg-slate-50 p-3 rounded-xl border border-slate-200 ${DARK_PANEL}`}>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1.5 px-1 viewer-full:text-slate-300">
                    <span className={splitPosition === 0 ? "text-brand-primary font-bold viewer-full:text-sky-200" : ""}>
                      ← TAC Original (0%)
                    </span>
                    <span className="text-brand-primary font-bold viewer-full:text-sky-200">
                      IA Revelada: {splitPosition}%
                    </span>
                    <span className={splitPosition === 100 ? "text-brand-primary font-bold viewer-full:text-sky-200" : ""}>
                      Detección IA (100%) →
                    </span>
                  </div>
                  <label htmlFor={splitId} className="sr-only">
                    Posición de la cortina
                  </label>
                  <input
                    id={splitId}
                    type="range"
                    min={0}
                    max={100}
                    value={splitPosition}
                    onChange={(e) => setSplitPosition(Number(e.target.value))}
                    className="h-2.5 w-full cursor-pointer accent-brand-primary viewer-full:accent-sky-300"
                    aria-valuetext={`${splitPosition} por ciento de IA revelada`}
                  />
                </div>
              </div>
            ) : (
              <Placeholder message="Vista previa de la tomografía no disponible" />
            )
          ) : mode === "side" ? (
            <div className="grid gap-4 md:grid-cols-2 viewer-full:min-h-0 viewer-full:flex-1">
              <div className="viewer-full:flex viewer-full:min-h-0 viewer-full:flex-col">
                <div className="mb-2 text-xs font-bold text-slate-700 uppercase tracking-wider text-center viewer-full:text-slate-300">
                  TAC Original
                </div>
                {beforeUrl ? (
                  <Stage
                    handlers={stageHandlers}
                    canPan={canPan}
                    ariaLabel="TAC original"
                    layerStyle={layerStyle}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={beforeUrl}
                      alt="TAC original"
                      draggable={false}
                      className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                    />
                  </Stage>
                ) : (
                  <Placeholder message="TAC original no disponible" />
                )}
              </div>
              <div className="viewer-full:flex viewer-full:min-h-0 viewer-full:flex-col">
                <div className="mb-2 text-xs font-bold text-brand-primary uppercase tracking-wider text-center viewer-full:text-sky-200">
                  Detección IA (Grad-CAM)
                </div>
                {activeHeatmapSrc ? (
                  <Stage
                    handlers={stageHandlers}
                    canPan={canPan}
                    ariaLabel="Mapa de calor Grad-CAM"
                    layerStyle={layerStyle}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={beforeUrl || activeHeatmapSrc}
                      alt="Base de tomografía"
                      draggable={false}
                      className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                    />
                    {showAi && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={activeHeatmapSrc}
                        alt="Mapa de calor Grad-CAM"
                        draggable={false}
                        className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                      />
                    )}
                    {!showAi && (
                      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-600/90 text-white text-[11px] font-bold shadow-md">
                        <EyeOff className="w-3 h-3" aria-hidden="true" />
                        IA en pausa (Espacio)
                      </div>
                    )}
                  </Stage>
                ) : (
                  <Placeholder message="Mapa Grad-CAM no disponible" />
                )}
              </div>
            </div>
          ) : (
            beforeUrl ? (
              <div className="relative viewer-full:flex viewer-full:min-h-0 viewer-full:flex-1 viewer-full:flex-col">
                <Stage
                  handlers={stageHandlers}
                  canPan={canPan}
                  ariaLabel="Imagen con mapa de calor superpuesto"
                  layerStyle={layerStyle}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={beforeUrl}
                    alt="TAC original"
                    draggable={false}
                    className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                  />
                  {showAi && activeHeatmapSrc && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={activeHeatmapSrc}
                      alt="Mapa Grad-CAM"
                      draggable={false}
                      style={{ opacity }}
                      className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                    />
                  )}
                  {!showAi && (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-600/90 text-white text-xs font-bold shadow-lg backdrop-blur-sm pointer-events-none">
                      <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                      Parpadeo Activo: TAC Pura (Presiona Espacio para ver IA)
                    </div>
                  )}
                </Stage>

                {/* Control de opacidad */}
                <div className={`mt-3 bg-slate-50 p-3 rounded-xl border border-slate-200 ${DARK_PANEL}`}>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5 viewer-full:text-slate-300">
                    <label htmlFor={opacityId} className="flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 viewer-full:text-slate-400" aria-hidden="true" />
                      Intensidad del mapa de calor
                    </label>
                    <span className="font-bold tabular-nums text-brand-primary viewer-full:text-sky-200">
                      {Math.round(opacity * 100)}%
                    </span>
                  </div>
                  <input
                    id={opacityId}
                    type="range"
                    min={20}
                    max={100}
                    value={Math.round(opacity * 100)}
                    onChange={(e) => setOpacity(Number(e.target.value) / 100)}
                    className="h-2.5 w-full cursor-pointer accent-brand-primary viewer-full:accent-sky-300"
                    aria-valuetext={`${Math.round(opacity * 100)} por ciento`}
                  />
                </div>
              </div>
            ) : (
              <Placeholder message="Vista previa no disponible" />
            )
          )}
          </div>

          {/* ── Opciones Sencillas Inferiores ── */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs viewer-full:border-slate-800">
            {/* Switch simple para limpiar ruido de fondo */}
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={cleanNoise}
                onChange={(e) => setCleanNoise(e.target.checked)}
                className="w-4 h-4 rounded text-brand-primary focus:ring-brand-primary accent-brand-primary cursor-pointer viewer-full:accent-sky-300"
              />
              <span className="flex items-center gap-1 font-medium text-slate-700 viewer-full:text-slate-200">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
                Enfocar nódulo (eliminar ruido de esquinas)
              </span>
            </label>

            <span className="text-slate-500 text-[11px] flex items-center gap-1.5 viewer-full:text-slate-400">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[10px] font-bold viewer-full:bg-slate-700 viewer-full:text-slate-100">Espacio</kbd>
              <span>Con el visor enfocado, alterna entre TAC limpia e IA.</span>
            </span>
          </div>

          <ViewerHelpDialog open={helpOpen} onClose={closeHelp} />
        </div>
      </CardContent>
    </Card>
  );
}
