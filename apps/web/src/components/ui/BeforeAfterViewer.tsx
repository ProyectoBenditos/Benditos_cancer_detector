"use client";

import { useEffect, useId, useMemo, useRef, useState, useCallback } from "react";
import {
  Columns2,
  Download,
  Eye,
  EyeOff,
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

type BeforeAfterViewerProps = {
  beforeUrl: string | null;
  heatmapBase64: string | null;
};

type Mode = "curtain" | "side" | "overlay";

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
      className={`relative aspect-square w-full touch-none overflow-hidden rounded-xl border border-slate-200 bg-black select-none ${
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
      className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary cursor-pointer ${
        active
          ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-brand-primary"
      }`}
    >
      {children}
    </button>
  );
}

export function BeforeAfterViewer({ beforeUrl, heatmapBase64 }: BeforeAfterViewerProps) {
  const [mode, setMode] = useState<Mode>("curtain");
  const [opacity, setOpacity] = useState(0.7);
  // splitPosition representa el % de Detección IA revelado de izquierda a derecha (0% = TAC Original, 100% = IA pura)
  const [splitPosition, setSplitPosition] = useState(50);
  const [cleanNoise, setCleanNoise] = useState(true);
  const [showAi, setShowAi] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [filteredHeatmapUrl, setFilteredHeatmapUrl] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const opacityId = useId();
  const splitId = useId();

  const { scale, canPan, layerStyle, stageHandlers, zoomIn, zoomOut, panBy, reset } =
    usePanZoom();

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

  // Interacción de parpadeo global con tecla Espacio (Spacebar)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        setShowAi((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

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
    "px-3 py-1.5 text-xs font-semibold rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary cursor-pointer";
  const segActive = "bg-brand-primary text-white shadow-sm";
  const segIdle = "text-slate-600 hover:text-brand-primary";

  return (
    <Card>
      <CardContent className="p-6">
        <div
          ref={containerRef}
          role="group"
          aria-label="Visor de tomografía y mapa de calor Grad-CAM"
          tabIndex={0}
          onKeyDown={onKeyDown}
          className="rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary data-[fullscreen=true]:flex data-[fullscreen=true]:h-full data-[fullscreen=true]:flex-col data-[fullscreen=true]:justify-center data-[fullscreen=true]:bg-white data-[fullscreen=true]:p-6"
          data-fullscreen={isFullscreen}
        >
          {/* Barra de herramientas superior */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            {/* Selector de modo simple */}
            <div
              role="radiogroup"
              aria-label="Modo de visualización"
              className="inline-flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1"
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
              <span className="text-xs font-semibold px-2 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200 tabular-nums">
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
                className={`flex h-9 items-center gap-1.5 px-2.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                  !showAi
                    ? "border-amber-400 bg-amber-50 text-amber-800 shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-brand-primary"
                }`}
              >
                {!showAi ? (
                  <>
                    <EyeOff className="h-4 w-4 text-amber-600" aria-hidden="true" />
                    <span>TAC Pura</span>
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5 text-brand-primary" aria-hidden="true" />
                    <span>Parpadeo</span>
                  </>
                )}
              </button>

              <ToolbarButton
                onClick={handleExport}
                label="Descargar imagen"
              >
                <Download className="h-4 w-4 text-emerald-600" aria-hidden="true" />
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
          {mode === "curtain" ? (
            beforeUrl ? (
              <div className="relative">
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

                  {/* Indicador visual de la línea divisoria de la cortina */}
                  {showAi && (
                    <div
                      className="pointer-events-none absolute top-0 bottom-0 z-20 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.8)]"
                      style={{ left: `${splitPosition}%` }}
                    >
                      <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex items-center justify-center w-6 h-6 rounded-full bg-brand-primary text-white border border-white shadow-md text-[9px] font-bold">
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
                      <EyeOff className="w-3.5 h-3.5" />
                      Parpadeo Activo: Mostrando TAC Pura (Presiona Espacio para ver IA)
                    </div>
                  )}
                </Stage>

                {/* Deslizador de la cortina (0% = TAC Original, 100% = Detección IA) */}
                <div className="mt-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1.5 px-1">
                    <span className={splitPosition === 0 ? "text-brand-primary font-bold" : ""}>
                      ← TAC Original (0%)
                    </span>
                    <span className="text-brand-primary font-bold">
                      IA Revelada: {splitPosition}%
                    </span>
                    <span className={splitPosition === 100 ? "text-brand-primary font-bold" : ""}>
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
                    className="h-2.5 w-full cursor-pointer accent-brand-primary"
                    aria-valuetext={`${splitPosition} por ciento de IA revelada`}
                  />
                </div>
              </div>
            ) : (
              <Placeholder message="Vista previa de la tomografía no disponible" />
            )
          ) : mode === "side" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="mb-2 text-xs font-bold text-slate-700 uppercase tracking-wider text-center">
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
              <div>
                <div className="mb-2 text-xs font-bold text-brand-primary uppercase tracking-wider text-center">
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
                        <EyeOff className="w-3 h-3" />
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
              <div className="relative">
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
                      <EyeOff className="w-3.5 h-3.5" />
                      Parpadeo Activo: TAC Pura (Presiona Espacio para ver IA)
                    </div>
                  )}
                </Stage>

                {/* Control de opacidad */}
                <div className="mt-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                      Intensidad del mapa de calor
                    </span>
                    <span className="font-bold tabular-nums text-brand-primary">
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
                    className="h-2.5 w-full cursor-pointer accent-brand-primary"
                    aria-valuetext={`${Math.round(opacity * 100)} por ciento`}
                  />
                </div>
              </div>
            ) : (
              <Placeholder message="Vista previa no disponible" />
            )
          )}

          {/* ── Opciones Sencillas Inferiores ── */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            {/* Switch simple para limpiar ruido de fondo */}
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={cleanNoise}
                onChange={(e) => setCleanNoise(e.target.checked)}
                className="w-4 h-4 rounded text-brand-primary focus:ring-brand-primary accent-brand-primary cursor-pointer"
              />
              <span className="flex items-center gap-1 font-medium text-slate-700">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Enfocar nódulo (eliminar ruido de esquinas)
              </span>
            </label>

            <span className="text-slate-500 text-[11px] flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[10px] font-bold">Espacio</kbd>
              <span>Alterna parpadeo al instante entre TAC limpia e IA.</span>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
