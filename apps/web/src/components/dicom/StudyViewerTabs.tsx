"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { BeforeAfterViewer, type ViewerSummary, type ViewerAnnotations } from "@/components/ui/BeforeAfterViewer";
import { Layers, Eye, Box, Microscope } from "lucide-react";
import type { SubtipoHistologicoData } from "@/components/informe/HistologicalSubtypeCard";

const VolumeViewer3D = dynamic(
  () => import("./VolumeViewer3D"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[560px] bg-[#020610] rounded-2xl border border-slate-800 animate-pulse flex flex-col items-center justify-center gap-3 text-slate-400">
        <Box className="w-10 h-10 text-brand-primary animate-bounce" />
        <span className="text-sm font-semibold tracking-wide">
          Cargando motor de Raymarching 3D (WebGL)...
        </span>
      </div>
    ),
  }
);

interface StudyViewerTabsProps {
  uploadId: string;
  beforeUrl: string | null;
  heatmapBase64: string;
  summary: ViewerSummary;
  annotations: ViewerAnnotations;
  fileType?: string;
  numSlices?: number;
  lobarLocation?: string | null;
  subtipoHistologico?: SubtipoHistologicoData | null;
}

export function StudyViewerTabs({
  uploadId,
  beforeUrl,
  heatmapBase64,
  summary,
  annotations,
  fileType,
  numSlices = 1,
  lobarLocation,
  subtipoHistologico,
}: StudyViewerTabsProps) {
  const isVolume = fileType === "dicom_series" || fileType === "nifti_volume" || (numSlices && numSlices > 1);
  const [activeTab, setActiveTab] = useState<"2d" | "3d">(isVolume ? "3d" : "2d");

  return (
    <div className="w-full flex flex-col gap-3">
      {/* ── Barra de Selección de Visor Clínico ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-100 border border-slate-200">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-white rounded-lg border border-slate-200 flex items-center shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab("2d")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === "2d"
                  ? "bg-brand-primary text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Corte axial y activación
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("3d")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === "3d"
                  ? "bg-brand-primary text-white shadow-xs"
                  : "text-slate-700 hover:text-slate-900 bg-slate-50"
              }`}
            >
              <Box className="w-3.5 h-3.5 text-brand-danger" />
              Gemelo Digital 3D (Volumétrico)
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === "3d" ? "bg-white/20 text-white" : "bg-brand-danger/10 text-brand-danger font-bold"
              }`}>
                Raymarching 3D
              </span>
            </button>
          </div>
        </div>

        {/* Badges de Información Contextual */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {subtipoHistologico && (
            <span className="px-2.5 py-1 rounded-lg bg-violet-50 text-violet-800 border border-violet-200 font-bold flex items-center gap-1">
              <Microscope className="w-3.5 h-3.5 text-violet-600" />
              {subtipoHistologico.prediccion} ({Math.round(subtipoHistologico.confianza * 100)}%)
            </span>
          )}

          {lobarLocation && (
            <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 font-bold flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              Lóbulo: {lobarLocation}
            </span>
          )}
        </div>
      </div>

      {/* ── Contenido de la Pestaña Activa ── */}
      {activeTab === "2d" ? (
        <div>
          <BeforeAfterViewer
            beforeUrl={beforeUrl}
            heatmapBase64={heatmapBase64}
            summary={summary}
            annotations={annotations}
          />
          <p className="text-xs text-slate-500 mt-2 px-1">
            El mapa de activación apoya la revisión del corte; no representa el contorno ni el tamaño de una lesión.
          </p>
        </div>
      ) : (
        <div>
          <VolumeViewer3D
            uploadId={uploadId}
          />
          <p className="text-xs text-slate-500 mt-2 px-1">
            TC, segmentación lobar MONAI y activación HiResCAM comparten la misma rejilla física. El mapa de calor se calcula por corte y se visualiza en el volumen; no representa una segmentación de tumor.
          </p>
        </div>
      )}
    </div>
  );
}
