"use client";

import React from "react";

export interface ClinicalFeatures {
  subtlety?: number;
  calcification?: number;
  sphericity?: number;
  margin?: number;
  lobulation?: number;
  spiculation?: number;
  texture?: number;
  malignancy?: number;
  [key: string]: number | undefined;
}

interface Props {
  features?: ClinicalFeatures | null;
  className?: string;
}

interface FeatureDef {
  key: string;
  label: string;
  max: number;
  desc: string;
  getTone: (val: number) => { bar: string; text: string; bg: string; hex: string };
}

const FEATURE_DEFINITIONS: FeatureDef[] = [
  {
    key: "spiculation",
    label: "Espiculación",
    max: 5,
    desc: "Bordes en espícula / reacción desmoplásica",
    getTone: (v) =>
      v >= 4
        ? { bar: "bg-rose-500", text: "text-rose-700", bg: "bg-rose-50", hex: "#f43f5e" }
        : v >= 3
        ? { bar: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50", hex: "#f59e0b" }
        : { bar: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", hex: "#10b981" },
  },
  {
    key: "margin",
    label: "Margen / Bordes",
    max: 5,
    desc: "Definición del contorno tumoral",
    getTone: (v) =>
      v >= 4
        ? { bar: "bg-rose-500", text: "text-rose-700", bg: "bg-rose-50", hex: "#f43f5e" }
        : v >= 3
        ? { bar: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50", hex: "#f59e0b" }
        : { bar: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", hex: "#10b981" },
  },
  {
    key: "lobulation",
    label: "Lobulación",
    max: 5,
    desc: "Presencia de lóbulos periféricos",
    getTone: (v) =>
      v >= 4
        ? { bar: "bg-rose-500", text: "text-rose-700", bg: "bg-rose-50", hex: "#f43f5e" }
        : v >= 3
        ? { bar: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50", hex: "#f59e0b" }
        : { bar: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", hex: "#10b981" },
  },
  {
    key: "texture",
    label: "Textura / Atenuación",
    max: 5,
    desc: "1=Vidrio esmerilado, 5=Completamente sólido",
    getTone: (v) =>
      v >= 4
        ? { bar: "bg-brand-primary", text: "text-brand-primary", bg: "bg-brand-primary/10", hex: "#012641" }
        : { bar: "bg-sky-500", text: "text-sky-700", bg: "bg-sky-50", hex: "#0ea5e9" },
  },
  {
    key: "calcification",
    label: "Calcificación",
    max: 6,
    desc: "1=Sin calcio, 2=Punteada, 6=Benigna central",
    getTone: (v) =>
      v === 1
        ? { bar: "bg-rose-500", text: "text-rose-700", bg: "bg-rose-50", hex: "#f43f5e" }
        : v >= 5
        ? { bar: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", hex: "#10b981" }
        : { bar: "bg-slate-400", text: "text-slate-700", bg: "bg-slate-50", hex: "#94a3b8" },
  },
  {
    key: "sphericity",
    label: "Esfericidad",
    max: 5,
    desc: "Grado de simetría tridimensional",
    getTone: (v) =>
      v <= 2
        ? { bar: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50", hex: "#f59e0b" }
        : { bar: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", hex: "#10b981" },
  },
  {
    key: "subtlety",
    label: "Sutileza / Contraste",
    max: 5,
    desc: "Visibilidad respecto al parénquima sano",
    getTone: () => ({ bar: "bg-slate-500", text: "text-slate-700", bg: "bg-slate-50", hex: "#64748b" }),
  },
  {
    key: "malignancy",
    label: "Sospecha Radiológica",
    max: 5,
    desc: "Puntuación clínica de sospecha inicial LIDC",
    getTone: (v) =>
      v >= 4
        ? { bar: "bg-rose-500", text: "text-rose-700", bg: "bg-rose-50", hex: "#f43f5e" }
        : v >= 3
        ? { bar: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50", hex: "#f59e0b" }
        : { bar: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", hex: "#10b981" },
  },
];

export function MorphologyBars({ features, className = "" }: Props) {
  if (!features || Object.keys(features).length === 0) {
    return (
      <div className={`p-4 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-500 ${className}`}>
        No se registraron parámetros morfológicos detallados para esta lesión.
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${className}`}>
      {FEATURE_DEFINITIONS.map((def) => {
        const val = Number(features[def.key] ?? 0);
        const percentage = Math.min(100, Math.max(0, (val / def.max) * 100));
        const tone = def.getTone(val);

        return (
          <div
            key={def.key}
            className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-xs font-bold text-slate-800">{def.label}</span>
              <span
                className={`text-xs font-mono font-extrabold px-1.5 py-0.5 rounded ${tone.bg} ${tone.text}`}
                style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
              >
                {val > 0 ? `${val} / ${def.max}` : "N/D"}
              </span>
            </div>

            {/* Barra Visual de Progreso con Soporte Total de Impresión PDF */}
            <div
              className="w-full h-2.5 bg-slate-100 border border-slate-200 rounded-full overflow-hidden my-1 relative"
              style={{
                backgroundColor: "#f1f5f9",
                WebkitPrintColorAdjust: "exact",
                printColorAdjust: "exact",
              }}
            >
              <div
                className={`h-full rounded-full transition-all duration-300 ${tone.bar}`}
                style={{
                  width: `${percentage}%`,
                  minWidth: val > 0 ? "8px" : "0",
                  backgroundColor: tone.hex,
                  WebkitPrintColorAdjust: "exact",
                  printColorAdjust: "exact",
                }}
              />
            </div>

            <p className="text-[10px] text-slate-400 mt-1 truncate" title={def.desc}>
              {def.desc}
            </p>
          </div>
        );
      })}
    </div>
  );
}

