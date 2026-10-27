"use client";

import React, { useId, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { BeforeAfterViewer, type ViewerSummary, type ViewerAnnotations } from "@/components/ui/BeforeAfterViewer";
import { SourceLink } from "@/components/referencias/SourceLink";
import type { PixelGeometry } from "@/lib/pixelGeometry";
import { Layers, Eye, Box } from "lucide-react";
import { explainabilityReference, isVolumeFileType, volume3dEnabled } from "./studyViewer";

const VolumeViewer3D = dynamic(
  () => import("./VolumeViewer3D"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[560px] bg-[#020610] rounded-2xl border border-slate-800 animate-pulse flex flex-col items-center justify-center gap-3 text-slate-400">
        <Box className="w-10 h-10 text-sky-300 animate-bounce" aria-hidden="true" />
        <span className="text-sm font-semibold tracking-wide" role="status">
          Preparando el volumen…
        </span>
      </div>
    ),
  }
);

type TabId = "2d" | "3d";
const TAB_ORDER: TabId[] = ["2d", "3d"];

interface StudyViewerTabsProps {
  uploadId: string;
  beforeUrl: string | null;
  heatmapBase64: string;
  summary: ViewerSummary;
  annotations: ViewerAnnotations;
  fileType?: string | null;
  lobarLocation?: string | null;
  sourceSlice?: { index: number; total: number } | null;
  modelVersion?: string | null;
  /** Calibración del corte 2D para Medir (null en PNG/JPG o estudios sin PixelSpacing). */
  pixelGeometry?: PixelGeometry | null;
}

export function StudyViewerTabs({
  uploadId,
  beforeUrl,
  heatmapBase64,
  summary,
  annotations,
  fileType,
  lobarLocation,
  sourceSlice,
  modelVersion,
  pixelGeometry,
}: StudyViewerTabsProps) {
  const baseId = useId();
  const [activeTab, setActiveTab] = useState<TabId>("2d");
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({ "2d": null, "3d": null });

  const hasTabs = isVolumeFileType(fileType) && volume3dEnabled();
  const reference = explainabilityReference(modelVersion);
  const tabId = (id: TabId) => `${baseId}-tab-${id}`;
  const panelId = (id: TabId) => `${baseId}-panel-${id}`;

  const selectTab = (id: TabId) => {
    setActiveTab(id);
    tabRefs.current[id]?.focus();
  };

  const onTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, current: TabId) => {
    const index = TAB_ORDER.indexOf(current);
    let next: TabId | null = null;
    if (event.key === "ArrowRight") next = TAB_ORDER[(index + 1) % TAB_ORDER.length];
    else if (event.key === "ArrowLeft") next = TAB_ORDER[(index - 1 + TAB_ORDER.length) % TAB_ORDER.length];
    else if (event.key === "Home") next = TAB_ORDER[0];
    else if (event.key === "End") next = TAB_ORDER[TAB_ORDER.length - 1];
    if (next) {
      event.preventDefault();
      selectTab(next);
    }
  };

  const tabClass = (id: TabId) =>
    `px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
      activeTab === id ? "bg-brand-primary text-white shadow-xs" : "text-slate-700 hover:text-slate-900 bg-slate-50"
    }`;

  const view2d = (
    <div>
      <BeforeAfterViewer
        beforeUrl={beforeUrl}
        heatmapBase64={heatmapBase64}
        summary={summary}
        annotations={annotations}
        pixelGeometry={pixelGeometry}
      />
      <p className="text-xs text-slate-500 mt-2 px-1">
        Mapa generado con <SourceLink href={reference.url}>{reference.short}</SourceLink>: indica las regiones que más
        pesaron en el score; no delimita el nódulo ni su tamaño.
        {sourceSlice ? ` Análisis sobre el corte ${sourceSlice.index + 1} de ${sourceSlice.total}.` : null}
      </p>
    </div>
  );

  const lobeBadge = lobarLocation ? (
    <span className="px-2.5 py-1 rounded-lg bg-slate-50 text-slate-800 border border-slate-200 font-bold flex items-center gap-1 text-xs">
      <Layers className="w-3.5 h-3.5 text-brand-primary" aria-hidden="true" />
      Lóbulo: {lobarLocation}
    </span>
  ) : null;

  if (!hasTabs) {
    return (
      <div className="w-full flex flex-col gap-3">
        {lobeBadge && <div className="flex flex-wrap items-center gap-2">{lobeBadge}</div>}
        {view2d}
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-100 border border-slate-200">
        <div
          role="tablist"
          aria-label="Vista del estudio"
          className="p-1 bg-white rounded-lg border border-slate-200 flex items-center shadow-2xs"
        >
          <button
            type="button"
            role="tab"
            id={tabId("2d")}
            ref={(el) => {
              tabRefs.current["2d"] = el;
            }}
            aria-selected={activeTab === "2d"}
            aria-controls={panelId("2d")}
            tabIndex={activeTab === "2d" ? 0 : -1}
            onClick={() => setActiveTab("2d")}
            onKeyDown={(e) => onTabKeyDown(e, "2d")}
            className={tabClass("2d")}
          >
            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
            Corte axial
          </button>
          <button
            type="button"
            role="tab"
            id={tabId("3d")}
            ref={(el) => {
              tabRefs.current["3d"] = el;
            }}
            aria-selected={activeTab === "3d"}
            aria-controls={panelId("3d")}
            tabIndex={activeTab === "3d" ? 0 : -1}
            onClick={() => setActiveTab("3d")}
            onKeyDown={(e) => onTabKeyDown(e, "3d")}
            className={tabClass("3d")}
          >
            <Box className="w-3.5 h-3.5" aria-hidden="true" />
            Volumen 3D
          </button>
        </div>

        {lobeBadge && <div className="flex flex-wrap items-center gap-2">{lobeBadge}</div>}
      </div>

      {activeTab === "2d" ? (
        <div role="tabpanel" id={panelId("2d")} aria-labelledby={tabId("2d")}>
          {view2d}
        </div>
      ) : (
        <div role="tabpanel" id={panelId("3d")} aria-labelledby={tabId("3d")}>
          <VolumeViewer3D uploadId={uploadId} />
          <p className="text-xs text-slate-500 mt-2 px-1">
            El mapa de calor se calcula por corte y se visualiza en el volumen; no representa una segmentación de tumor.
          </p>
        </div>
      )}
    </div>
  );
}
