"use client";

import { useEffect, useId, useMemo, useReducer, useRef, useState, useCallback } from "react";
import { EyeOff, SlidersHorizontal, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { usePanZoom } from "./usePanZoom";
import { useViewerFullscreen } from "./useViewerFullscreen";
import { ViewerHelpDialog } from "./ViewerHelpDialog";
import { ViewerExportDialog } from "./ViewerExportDialog";
import { EXPORT_SIZE, exportLegendLines, exportPinPositions, hasNotes } from "./viewerExport";
import { isFormControlTarget, resolveViewerKey } from "./viewerKeys";
import { useToolPointer } from "./useToolPointer";
import { useFocusTrap } from "./useFocusTrap";
import { MarkerLayer } from "./MarkerLayer";
import { normalizedToStage, stageToNormalized, visibleCenter, type Size } from "./markerMath";
import { markersReducer, markersStateFrom, type Marker } from "./markerState";
import { useMarkerAutosave } from "./useMarkerAutosave";
import type { AnnotationInput, AnnotationResult } from "@/lib/uploadAnnotations";
import { MarkerPanel } from "./MarkerPanel";
import type { RiskLevel } from "./RiskBadge";
import type { UploadReview } from "@/lib/uploadReview";
import { ADJUST_DEFAULT, adjustFilter, isDefaultAdjust, type Adjust, type ViewerTool } from "./viewerTools";
import { DARK_PANEL, MEASURE_UNAVAILABLE, TOOL_LABELS, ViewerToolbar, type ViewMode } from "./ViewerToolbar";

/** Datos del caso que muestra el panel lateral (score, riesgo y valoración resumida). */
export type ViewerSummary = {
  /** Score de la IA entre 0 y 1. */
  score: number | null;
  riskLevel: RiskLevel | null;
  review: Pick<UploadReview, "concordancia" | "lung_rads" | "conducta"> | null;
  /** id del formulario completo de valoración en la página. */
  reviewAnchorId?: string;
};

/**
 * Persistencia de los marcadores (Fase C). La página pasa los guardados y las
 * server actions; sin esta prop el visor funciona como en la Fase B (sin guardar).
 */
export type ViewerAnnotations = {
  uploadId: string;
  initial: Marker[];
  /** La carga de los guardados falló: no se guarda nada para no sobrescribirlos. */
  loadFailed?: boolean;
  save: (input: AnnotationInput) => Promise<AnnotationResult>;
  remove: (uploadId: string, seq: number) => Promise<AnnotationResult>;
};

type BeforeAfterViewerProps = {
  beforeUrl: string | null;
  heatmapBase64: string | null;
  summary?: ViewerSummary;
  annotations?: ViewerAnnotations;
  initialMode?: ViewMode;
  initialSplit?: number;
  initialShowAi?: boolean;
};

const PAN_STEP = 40;
/** Zoom al centrar un marcador desde el panel. */
const CENTER_ZOOM = 3;

type StageHandlers = ReturnType<typeof useToolPointer>;

function Placeholder({ message }: { message: string }) {
  return (
    <div className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500 viewer-full:border-slate-700 viewer-full:bg-slate-900 viewer-full:text-slate-400">
      {message}
    </div>
  );
}

/**
 * Contenedor interactivo (escucha rueda/puntero) con la capa transformada dentro.
 * Es un `group` y no un `img`: un `img` ocultaría a los lectores de pantalla los
 * pins (botones) que viven dentro. `footer` se dibuja fuera de la capa, fijo.
 */
function Stage({
  handlers,
  cursorClass,
  ariaLabel,
  layerStyle,
  footer,
  children,
}: {
  handlers: StageHandlers;
  cursorClass: string;
  ariaLabel: string;
  layerStyle: React.CSSProperties;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  // En pantalla completa el envoltorio ocupa el alto libre y el lienzo cuadrado
  // se dimensiona por esa altura (no por el ancho), para no salirse de la pantalla.
  return (
    <div className="viewer-full:flex viewer-full:min-h-0 viewer-full:flex-1 viewer-full:items-center viewer-full:justify-center">
      <div
        {...handlers}
        role="group"
        aria-label={ariaLabel}
        className={`relative aspect-square w-full touch-none overflow-hidden rounded-xl border border-slate-200 bg-black select-none viewer-full:h-full viewer-full:w-auto viewer-full:max-w-full viewer-full:border-slate-800 ${cursorClass}`}
      >
        <div className="absolute inset-0" style={layerStyle}>
          {children}
        </div>
        {footer}
      </div>
    </div>
  );
}

export function BeforeAfterViewer({
  beforeUrl,
  heatmapBase64,
  summary,
  annotations,
  initialMode = "curtain",
  initialSplit = 50,
  initialShowAi = true,
}: BeforeAfterViewerProps) {
  const [mode, setMode] = useState<ViewMode>(initialMode);
  const [tool, setTool] = useState<ViewerTool>("pan");
  // Región aria-live: anuncia cambios que no se ven sin mirar la pantalla.
  // Nunca lleva el texto de las notas (PHI).
  const [announcement, setAnnouncement] = useState("");
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
  useFocusTrap(containerRef, isFullscreen);
  // Hoja inferior del panel (pantalla completa en móvil): se abre al agregar o
  // seleccionar un marcador para que su editor se vea.
  const [sheetOpen, setSheetOpen] = useState(false);
  const opacityId = useId();
  const splitId = useId();

  const {
    scale,
    canPan,
    layerStyle,
    stageHandlers: panHandlers,
    zoomIn,
    zoomOut,
    panBy,
    reset,
    getTransform,
    getStageSize,
    centerOn,
  } = usePanZoom();

  // Marcadores (solo en el navegador en la Fase B). El tamaño natural del PNG
  // hace falta para ubicar los pins sobre el rectángulo real de la imagen.
  const [markersState, dispatchMarkers] = useReducer(
    markersReducer,
    annotations?.initial ?? [],
    markersStateFrom
  );

  // Guardado automático. Si la carga de los guardados falló, no se guarda:
  // un marcador nuevo con el mismo número sobrescribiría uno guardado.
  const persist = annotations && !annotations.loadFailed ? annotations : null;
  const { status: saveStatus, retry: retrySave } = useMarkerAutosave({
    markers: markersState.markers,
    enabled: persist !== null,
    save: async (m) => {
      if (!persist) return false;
      const { seq, kind, x, y, x2, y2, findingType, aiAgreement, note, sizeMm } = m;
      const result = await persist.save({ uploadId: persist.uploadId, seq, kind, x, y, x2, y2, findingType, aiAgreement, note, sizeMm });
      return result.ok;
    },
    remove: async (seq) => {
      if (!persist) return false;
      return (await persist.remove(persist.uploadId, seq)).ok;
    },
  });
  const [natural, setNatural] = useState<Size>({ w: 1, h: 1 });
  const onCtLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
    if (w > 0 && h > 0) setNatural({ w, h });
  };
  const addMarkerAt = (n: { x: number; y: number }) => {
    setAnnouncement(`Marcador ${markersState.nextSeq} agregado`);
    dispatchMarkers({ type: "add", x: n.x, y: n.y });
    setSheetOpen(true);
  };
  const centerOnMarker = (m: Marker) => {
    centerOn(normalizedToStage(m, getStageSize(), natural), CENTER_ZOOM);
  };

  // Sale de pantalla completa y lleva al formulario completo de valoración.
  const goToReview = () => {
    exitFullscreen();
    requestAnimationFrame(() => {
      const el = document.getElementById(summary?.reviewAnchorId ?? "valoracion");
      el?.scrollIntoView?.({ block: "start" });
      el?.focus();
    });
  };

  const markerLayer = (focusable: boolean) => (
    <MarkerLayer
      markers={markersState.markers}
      selectedId={markersState.selectedId}
      natural={natural}
      scale={scale}
      focusable={focusable}
      onSelect={(id) => {
        dispatchMarkers({ type: "select", id });
        setSheetOpen(true);
      }}
      onMove={(id, x, y) => dispatchMarkers({ type: "move", id, x, y })}
    />
  );

  const [adjust, setAdjust] = useState<Adjust>(ADJUST_DEFAULT);
  // El filtro de brillo/contraste se aplica solo a la TAC, nunca al mapa de calor.
  const ctStyle: React.CSSProperties = { filter: adjustFilter(adjust) };

  const stageHandlers = useToolPointer({
    tool,
    pan: panHandlers,
    adjust,
    onAdjust: setAdjust,
    // Un clic en una franja negra (fuera de la imagen) no crea marcador.
    onClickAt: (p, stage) => {
      const n = stageToNormalized(p, getTransform(), stage, natural);
      if (n) addMarkerAt(n);
    },
  });

  const resetView = () => {
    reset();
    setAdjust(ADJUST_DEFAULT);
  };

  const cursorClass =
    tool === "adjust"
      ? "cursor-ns-resize"
      : tool === "marker"
        ? "cursor-crosshair"
        : canPan
          ? "cursor-grab active:cursor-grabbing"
          : "cursor-default";

  const stageFooter = (
    <span className="pointer-events-none absolute bottom-2 left-2 z-30 rounded bg-slate-900/80 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-white">
      {`Zoom ${Math.round(scale * 100)}%`}
      {!isDefaultAdjust(adjust) &&
        ` · Brillo ${Math.round(adjust.brightness * 100)}% · Contraste ${Math.round(adjust.contrast * 100)}%`}
    </span>
  );

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

  const toggleAi = () => {
    const next = !showAi;
    setShowAi(next);
    setAnnouncement(next ? "IA visible" : "IA oculta");
  };

  // Medir queda desactivado: sin PixelSpacing no hay mm reales que mostrar.
  const selectTool = (t: ViewerTool) => {
    if (t === "measure") {
      setAnnouncement(MEASURE_UNAVAILABLE);
      return;
    }
    setTool(t);
    setAnnouncement(`Herramienta: ${TOOL_LABELS[t]}`);
  };

  // Los atajos se escuchan solo dentro del visor (no en window): fuera de él,
  // Espacio y las flechas conservan su comportamiento normal.
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Con la ayuda abierta el teclado es del modal (Esc lo cierra a él, no la
    // pantalla completa).
    if (helpOpen || exportOpen) return;
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
        resetView();
        break;
      case "toggleFullscreen":
        toggleFullscreen();
        break;
      case "exitFullscreen":
        exitFullscreen();
        break;
      case "toggleAi":
        e.preventDefault();
        toggleAi();
        break;
      case "toolPan":
        selectTool("pan");
        break;
      case "toolAdjust":
        selectTool("adjust");
        break;
      case "toolMarker":
        selectTool("marker");
        break;
      case "toolMeasure":
        selectTool("measure");
        break;
      case "addMarker":
        if (tool !== "marker") break;
        e.preventDefault();
        addMarkerAt(visibleCenter(getTransform(), getStageSize(), natural));
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

  // Exportar imagen comparativa con los pins numerados. El texto de las notas
  // (PHI) solo entra en la leyenda si el médico lo consiente en el diálogo.
  const exportImage = useCallback(
    (includeNotes: boolean) => {
      if (!beforeUrl) return;

      const S = EXPORT_SIZE;
      const legend = exportLegendLines(markersState.markers, includeNotes);
      const legendHeight = legend.length > 0 ? 24 + 18 * legend.length : 0;

      const canvas = document.createElement("canvas");
      canvas.width = S;
      canvas.height = S + legendHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, S, S + legendHeight);

      const download = (name: string) => {
        const a = document.createElement("a");
        a.download = `${name}_${Date.now()}.png`;
        a.href = canvas.toDataURL("image/png");
        a.click();
      };

      const drawPinsAndLegend = () => {
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "bold 13px sans-serif";
        for (const p of exportPinPositions(markersState.markers, S)) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
          ctx.fillStyle = "#012641";
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = "#ffffff";
          ctx.stroke();
          ctx.fillStyle = "#ffffff";
          ctx.fillText(String(p.seq), p.x, p.y);
        }
        ctx.textAlign = "start";
        ctx.textBaseline = "alphabetic";

        if (legend.length > 0) {
          ctx.fillStyle = "#0f172a";
          ctx.fillRect(0, S, S, legendHeight);
          ctx.fillStyle = "#e2e8f0";
          ctx.font = "13px sans-serif";
          legend.forEach((line, i) => ctx.fillText(line, 20, S + 24 + 18 * i));
        }
      };

      const baseImg = new Image();
      baseImg.crossOrigin = "anonymous";
      baseImg.src = beforeUrl;
      baseImg.onload = () => {
        // Brillo/contraste solo sobre la TAC, igual que en pantalla.
        ctx.filter = adjustFilter(adjust);
        ctx.drawImage(baseImg, 0, 0, S, S);
        ctx.filter = "none";

        if (activeHeatmapSrc && showAi) {
          const heatImg = new Image();
          heatImg.src = activeHeatmapSrc;
          heatImg.onload = () => {
            ctx.globalAlpha = opacity;
            ctx.drawImage(heatImg, 0, 0, S, S);
            ctx.globalAlpha = 1.0;

            // Membrete inferior informativo
            ctx.fillStyle = "rgba(1, 38, 65, 0.9)";
            ctx.fillRect(0, S - 60, S, 60);

            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 15px sans-serif";
            ctx.fillText("OncoScan AI • Explicabilidad Grad-CAM", 20, S - 35);

            ctx.font = "12px sans-serif";
            ctx.fillStyle = "#cbd5e1";
            ctx.fillText(`Modo: ${mode} | Fecha: ${new Date().toLocaleDateString()}`, 20, S - 15);

            drawPinsAndLegend();
            download("oncoscan_analisis");
          };
        } else {
          drawPinsAndLegend();
          download("oncoscan_estudio");
        }
      };
    },
    [beforeUrl, activeHeatmapSrc, opacity, mode, showAi, adjust, markersState.markers],
  );

  const [exportOpen, setExportOpen] = useState(false);
  const handleExport = () => {
    if (hasNotes(markersState.markers)) setExportOpen(true);
    else exportImage(false);
  };

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div
          ref={containerRef}
          role="group"
          aria-label="Visor de tomografía y mapa de calor Grad-CAM"
          tabIndex={0}
          onKeyDown={onKeyDown}
          className={`rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary viewer-full:flex viewer-full:h-dvh viewer-full:flex-col viewer-full:overflow-y-auto viewer-full:bg-slate-950 viewer-full:p-4 viewer-full:text-slate-100 viewer-full:focus-visible:outline-sky-300 ${
            fullscreenMode === "expanded" ? "fixed inset-0 z-50 overflow-auto rounded-none" : ""
          }`}
          data-fullscreen={isFullscreen}
          data-fullscreen-mode={fullscreenMode}
        >
          {/* Imagen a la izquierda y panel del caso a la derecha (debajo en móvil). */}
          <div className="flex flex-col gap-4 lg:flex-row lg:gap-6 viewer-full:min-h-0 viewer-full:flex-1">
          <div className="min-w-0 flex-1 viewer-full:flex viewer-full:min-h-0 viewer-full:flex-col">
          {/* Barra de herramientas superior */}
          <ViewerToolbar
            mode={mode}
            onModeChange={setMode}
            tool={tool}
            onToolChange={selectTool}
            showAi={showAi}
            onToggleAi={toggleAi}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            onReset={resetView}
            onExport={handleExport}
            onHelp={() => setHelpOpen(true)}
          />

          {/* ── Visualizador Principal ── */}
          <div className="viewer-full:flex viewer-full:min-h-0 viewer-full:flex-1 viewer-full:flex-col">
          {mode === "curtain" ? (
            beforeUrl ? (
              <div className="relative viewer-full:flex viewer-full:min-h-0 viewer-full:flex-1 viewer-full:flex-col">
                <Stage
                  handlers={stageHandlers}
                  cursorClass={cursorClass}
                  footer={stageFooter}
                  ariaLabel="Comparativa en cortina: imagen original vs detección IA"
                  layerStyle={layerStyle}
                >
                  {/* Capa Base: TAC Original */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={beforeUrl}
                    style={ctStyle}
                    alt="Estudio tomográfico original"
                    onLoad={onCtLoad}
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
                        style={ctStyle}
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
                  {markerLayer(true)}
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
                    cursorClass={cursorClass}
                  footer={stageFooter}
                    ariaLabel="TAC original"
                    layerStyle={layerStyle}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={beforeUrl}
                      style={ctStyle}
                      alt="TAC original"
                      onLoad={onCtLoad}
                      draggable={false}
                      className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                    />
                    {markerLayer(true)}
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
                    cursorClass={cursorClass}
                  footer={stageFooter}
                    ariaLabel="Mapa de calor Grad-CAM"
                    layerStyle={layerStyle}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={beforeUrl || activeHeatmapSrc}
                      style={beforeUrl ? ctStyle : undefined}
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
                    {markerLayer(false)}
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
                  cursorClass={cursorClass}
                  footer={stageFooter}
                  ariaLabel="Imagen con mapa de calor superpuesto"
                  layerStyle={layerStyle}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={beforeUrl}
                    style={ctStyle}
                    alt="TAC original"
                    onLoad={onCtLoad}
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
                  {markerLayer(true)}
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

            <span className="text-slate-500 text-[11px] hidden sm:flex items-center gap-1.5 viewer-full:text-slate-400">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[10px] font-bold viewer-full:bg-slate-700 viewer-full:text-slate-100">Espacio</kbd>
              <span>Con el visor enfocado, alterna entre TAC limpia e IA.</span>
            </span>
          </div>
          </div>

          {/* ── Panel del caso (también en pantalla completa) ──
              En pantalla completa por debajo de lg es una hoja inferior que flota
              sobre la imagen: así abrirla no le quita altura al lienzo. */}
          <div className="hidden h-14 shrink-0 max-lg:viewer-full:block" aria-hidden="true" />
          <div className="lg:w-72 lg:shrink-0 viewer-full:min-h-0 lg:viewer-full:w-80 lg:viewer-full:overflow-y-auto max-lg:viewer-full:fixed max-lg:viewer-full:inset-x-0 max-lg:viewer-full:bottom-0 max-lg:viewer-full:z-40 max-lg:viewer-full:p-2">
            <MarkerPanel
              summary={summary}
              markers={markersState.markers}
              selectedId={markersState.selectedId}
              dispatch={dispatchMarkers}
              onCenter={centerOnMarker}
              onGoToReview={goToReview}
              onAnnounce={setAnnouncement}
              isFullscreen={isFullscreen}
              sheetOpen={sheetOpen}
              onSheetOpenChange={setSheetOpen}
              saveState={
                annotations
                  ? { status: saveStatus, loadFailed: annotations.loadFailed === true, onRetry: retrySave }
                  : undefined
              }
            />
          </div>
          </div>

          <p role="status" aria-live="polite" className="sr-only">
            {announcement}
          </p>

          <ViewerHelpDialog open={helpOpen} onClose={closeHelp} />
          <ViewerExportDialog
            open={exportOpen}
            onClose={() => setExportOpen(false)}
            onConfirm={(includeNotes) => {
              setExportOpen(false);
              exportImage(includeNotes);
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
