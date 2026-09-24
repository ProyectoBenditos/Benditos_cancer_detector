"use client";

import { useEffect, useId, useMemo, useRef, useState, useCallback } from "react";
import {
  Columns2,
  Download,
  Layers,
  Maximize2,
  Minimize2,
  RotateCcw,
  SlidersHorizontal,
  Split,
  SunMedium,
  ZoomIn,
  ZoomOut,
  Filter,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { usePanZoom } from "./usePanZoom";

type BeforeAfterViewerProps = {
  beforeUrl: string | null;
  heatmapBase64: string | null;
};

type Mode = "overlay" | "curtain" | "side";
type WindowPreset = "standard" | "lung" | "mediastinum" | "invert";

const PAN_STEP = 40;

const WINDOW_PRESETS: Record<
  WindowPreset,
  { name: string; filter: string; description: string }
> = {
  standard: {
    name: "Estándar",
    filter: "contrast(100%) brightness(100%)",
    description: "Corte tomográfico sin modificaciones",
  },
  lung: {
    name: "Ventana Pulmonar",
    filter: "contrast(175%) brightness(115%)",
    description: "Realza parénquima alveolar y nódulos subpleurales",
  },
  mediastinum: {
    name: "Ventana Mediastino",
    filter: "contrast(140%) brightness(80%)",
    description: "Optimizado para tejidos blandos y ganglios",
  },
  invert: {
    name: "Negativo",
    filter: "invert(100%) contrast(125%)",
    description: "Inversión para microcalcificaciones",
  },
};

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
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary cursor-pointer"
    >
      {children}
    </button>
  );
}

export function BeforeAfterViewer({ beforeUrl, heatmapBase64 }: BeforeAfterViewerProps) {
  const [mode, setMode] = useState<Mode>("curtain");
  const [opacity, setOpacity] = useState(0.65);
  const [splitPosition, setSplitPosition] = useState(50);
  const [threshold, setThreshold] = useState(35);
  const [windowPreset, setWindowPreset] = useState<WindowPreset>("standard");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [filteredHeatmapUrl, setFilteredHeatmapUrl] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const opacityId = useId();
  const splitId = useId();
  const thresholdId = useId();

  const { scale, canPan, layerStyle, stageHandlers, zoomIn, zoomOut, panBy, reset } =
    usePanZoom();

  // Filtrado de umbral reactivo en Canvas: apaga el ruido residual (< threshold) de las esquinas
  useEffect(() => {
    if (!heatmapBase64 || threshold === 0) {
      return;
    }

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

      const cutoff = (threshold / 100) * 255;

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
  }, [heatmapBase64, threshold]);

  const rawHeatmapSrc = useMemo(
    () => (heatmapBase64 ? `data:image/png;base64,${heatmapBase64}` : null),
    [heatmapBase64]
  );

  const activeHeatmapSrc = threshold > 0 && filteredHeatmapUrl ? filteredHeatmapUrl : rawHeatmapSrc;

  const activeFilterStyle = WINDOW_PRESETS[windowPreset].filter;

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

  // Exportar captura con membrete clínico en alta resolución
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
      ctx.filter = activeFilterStyle;
      ctx.drawImage(baseImg, 0, 0, 800, 800);
      ctx.filter = "none";

      if (activeHeatmapSrc) {
        const heatImg = new Image();
        heatImg.src = activeHeatmapSrc;
        heatImg.onload = () => {
          ctx.globalAlpha = opacity;
          ctx.drawImage(heatImg, 0, 0, 800, 800);
          ctx.globalAlpha = 1.0;

          // Membrete clínico inferior
          ctx.fillStyle = "rgba(1, 38, 65, 0.88)";
          ctx.fillRect(0, 735, 800, 65);

          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 15px sans-serif";
          ctx.fillText("OncaScan AI • Explicabilidad Grad-CAM", 20, 760);

          ctx.font = "12px sans-serif";
          ctx.fillStyle = "#94a3b8";
          ctx.fillText(
            `Modo: ${mode} | Ventana: ${WINDOW_PRESETS[windowPreset].name} | Umbral: ${threshold}% | ${new Date().toLocaleDateString()}`,
            20,
            782
          );

          const a = document.createElement("a");
          a.download = `oncascan_gradcam_${Date.now()}.png`;
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
  }, [beforeUrl, activeFilterStyle, activeHeatmapSrc, opacity, mode, windowPreset, threshold]);

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
          aria-label="Visor interactivo de tomografía médica con explicabilidad Grad-CAM"
          tabIndex={0}
          onKeyDown={onKeyDown}
          className="rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary data-[fullscreen=true]:flex data-[fullscreen=true]:h-full data-[fullscreen=true]:flex-col data-[fullscreen=true]:justify-center data-[fullscreen=true]:bg-white data-[fullscreen=true]:p-6"
          data-fullscreen={isFullscreen}
        >
          {/* Barra de herramientas superior */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            {/* Selector de modo (3 modos) */}
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
                aria-checked={mode === "overlay"}
                onClick={() => setMode("overlay")}
                className={`${segBase} ${mode === "overlay" ? segActive : segIdle} inline-flex items-center gap-1.5`}
              >
                <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                Superpuesto
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
            </div>

            {/* HUD de Zoom y Acciones */}
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
              <ToolbarButton
                onClick={handleExport}
                label="Exportar captura para historia clínica"
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

          {/* ── Render del Escenario según el modo ── */}
          {mode === "curtain" ? (
            beforeUrl ? (
              <div className="relative">
                <Stage
                  handlers={stageHandlers}
                  canPan={canPan}
                  ariaLabel="Comparativa en modo cortina entre corte tomográfico puro y activación Grad-CAM"
                  layerStyle={layerStyle}
                >
                  {/* Capa Base: Tomografía limpia */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={beforeUrl}
                    alt="Estudio tomográfico original del paciente"
                    draggable={false}
                    style={{ filter: activeFilterStyle }}
                    className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                  />

                  {/* Capa Superior Cortada: Tomografía + Activación Grad-CAM */}
                  <div
                    className="pointer-events-none absolute inset-0 h-full w-full overflow-hidden"
                    style={{
                      clipPath: `inset(0 0 0 ${splitPosition}%)`,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={beforeUrl}
                      alt=""
                      aria-hidden="true"
                      draggable={false}
                      style={{ filter: activeFilterStyle }}
                      className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                    />
                    {activeHeatmapSrc && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={activeHeatmapSrc}
                        alt="Activación Grad-CAM superpuesta"
                        draggable={false}
                        style={{ opacity }}
                        className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                      />
                    )}
                  </div>

                  {/* Indicador visual de la línea divisoria */}
                  <div
                    className="pointer-events-none absolute top-0 bottom-0 z-20 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.8)]"
                    style={{ left: `${splitPosition}%` }}
                  >
                    <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex items-center justify-center w-6 h-6 rounded-full bg-brand-primary text-white border border-white shadow-md text-[9px] font-bold">
                      ◀▶
                    </div>
                  </div>
                </Stage>

                {/* Etiquetas de ayuda sobre la cortina */}
                <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-1">
                  <span>← TAC Pura (Anatomía)</span>
                  <span className="text-brand-primary font-bold">Posición: {splitPosition}%</span>
                  <span>Activación IA (Grad-CAM) →</span>
                </div>

                {/* Control deslizable de la cortina */}
                <div className="mt-1 flex items-center gap-3">
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
                    className="h-2 flex-1 cursor-pointer accent-brand-primary"
                    aria-valuetext={`${splitPosition} por ciento`}
                  />
                </div>
              </div>
            ) : (
              <Placeholder message="Vista previa tomográfica no disponible" />
            )
          ) : mode === "overlay" ? (
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
                  alt="Imagen original del estudio"
                  draggable={false}
                  style={{ filter: activeFilterStyle }}
                  className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                />
                {activeHeatmapSrc && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activeHeatmapSrc}
                    alt="Mapa de calor Grad-CAM"
                    draggable={false}
                    style={{ opacity }}
                    className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                  />
                )}
              </Stage>
            ) : (
              <Placeholder message="Vista previa tomográfica no disponible" />
            )
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {beforeUrl ? (
                <Stage
                  handlers={stageHandlers}
                  canPan={canPan}
                  ariaLabel="Imagen original del estudio tomográfico"
                  layerStyle={layerStyle}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={beforeUrl}
                    alt="Imagen original del estudio subido por el usuario"
                    draggable={false}
                    style={{ filter: activeFilterStyle }}
                    className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                  />
                </Stage>
              ) : (
                <Placeholder message="Vista previa tomográfica no disponible" />
              )}
              {activeHeatmapSrc ? (
                <Stage
                  handlers={stageHandlers}
                  canPan={canPan}
                  ariaLabel="Mapa de calor Grad-CAM de atención del modelo"
                  layerStyle={layerStyle}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeHeatmapSrc}
                    alt="Mapa de calor Grad-CAM que resalta las zonas de mayor activación del modelo"
                    draggable={false}
                    className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                  />
                </Stage>
              ) : (
                <Placeholder message="Mapa de calor Grad-CAM no disponible" />
              )}
            </div>
          )}

          {/* ── Controles Clínicos Inferiores ── */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col gap-4">
            {/* Presets de Ventana Radiológica (Window/Level) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <SunMedium className="w-4 h-4 text-slate-500" />
                Ventana Tomográfica:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(WINDOW_PRESETS) as WindowPreset[]).map((presetKey) => {
                  const preset = WINDOW_PRESETS[presetKey];
                  const isActive = windowPreset === presetKey;
                  return (
                    <button
                      key={presetKey}
                      type="button"
                      onClick={() => setWindowPreset(presetKey)}
                      title={preset.description}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        isActive
                          ? "bg-slate-800 text-white border-slate-800"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {preset.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sliders de Umbral y Opacidad */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              {/* Filtro de Umbral (Elimina ruido y esquinas) */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                  <span className="flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5 text-blue-600" />
                    Filtro de Umbral (Limpia esquinas)
                  </span>
                  <span className="font-bold tabular-nums text-blue-700">{threshold}%</span>
                </div>
                <input
                  id={thresholdId}
                  type="range"
                  min={0}
                  max={85}
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="h-2 cursor-pointer accent-blue-600"
                  aria-valuetext={`${threshold} por ciento`}
                />
                <span className="text-[10px] text-slate-500">
                  {threshold > 45
                    ? "Filtrando activaciones débiles para mostrar solo el foco de mayor sospecha."
                    : "Atenúa artefactos de borde y activa foco tumoral."}
                </span>
              </div>

              {/* Slider de Opacidad */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                  <span className="flex items-center gap-1">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                    Opacidad de Mapa IA
                  </span>
                  <span className="font-bold tabular-nums text-slate-700">
                    {Math.round(opacity * 100)}%
                  </span>
                </div>
                <input
                  id={opacityId}
                  type="range"
                  min={10}
                  max={100}
                  value={Math.round(opacity * 100)}
                  onChange={(e) => setOpacity(Number(e.target.value) / 100)}
                  className="h-2 cursor-pointer accent-brand-primary"
                  aria-valuetext={`${Math.round(opacity * 100)} por ciento`}
                />
                <span className="text-[10px] text-slate-500">
                  Ajusta la intensidad de color sobre la imagen tomográfica.
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              <strong>Guía de navegación clínica:</strong> Usa la rueda del mouse o los botones para hacer zoom hacia cualquier región pulmonar, arrastra para desplazarte y alterna entre ventana pulmonar y de mediastino para verificar densidad tisular. La herramienta es de apoyo investigativo y no sustituye la lectura integral del especialista.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
