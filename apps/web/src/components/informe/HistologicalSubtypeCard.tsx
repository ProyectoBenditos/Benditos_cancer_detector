import React from "react";
import { Microscope, Dna, AlertCircle } from "lucide-react";

export interface SubtipoHistologicoData {
  prediccion: string;
  confianza: number;
  sensibilidad_referencial?: number;
  probabilidades?: Record<string, number>;
  biomarcadores_recomendados?: string[];
}

interface HistologicalSubtypeCardProps {
  data?: SubtipoHistologicoData | null;
  pathOrientationFallback?: string;
}

export function HistologicalSubtypeCard({
  data,
  pathOrientationFallback,
}: HistologicalSubtypeCardProps) {
  if (!data) {
    return (
      <div className="space-y-3">
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
          <strong className="text-slate-900 block text-xs mb-1">
            Orientación Morfopatológica Preliminar:
          </strong>
          <p className="text-slate-700 text-xs leading-relaxed">
            {pathOrientationFallback ||
              "Variables morfológicas en rango intermedio; requiere correlación con antecedentes y tamaño del nódulo."}
          </p>
        </div>
      </div>
    );
  }

  const probabilidades = data.probabilidades || {
    [data.prediccion]: data.confianza,
  };

  const subtipos = Object.entries(probabilidades).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-3">
      {/* Tarjeta Principal de Predicción */}
      <div className="p-3.5 bg-slate-50/80 rounded-lg border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5 mb-3">
          <div className="flex items-center gap-2">
            <Microscope className="w-4 h-4 text-brand-primary shrink-0" />
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Predicción Radiopatológica Estimada
              </span>
              <span className="text-sm font-bold text-slate-900">
                {data.prediccion}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
              {(data.confianza * 100).toFixed(1)}% Confianza
            </span>
            {data.sensibilidad_referencial != null && Number.isFinite(data.sensibilidad_referencial) && <span className="text-[10px] font-mono text-slate-500">
              Sensibilidad: {(data.sensibilidad_referencial * 100).toFixed(2)}%
            </span>}
          </div>
        </div>

        {/* Distribución de Probabilidades por Subtipo */}
        <div className="space-y-2 mb-3">
          <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider block">
            Distribución Multiclase (Modelo CLID):
          </span>
          <div className="grid grid-cols-1 gap-1.5">
            {subtipos.map(([nombre, prob]) => {
              const pct = Math.round(prob * 100);
              const isTop = nombre === data.prediccion;
              return (
                <div key={nombre} className="flex items-center text-[11px] gap-2">
                  <span
                    className={`w-44 truncate ${
                      isTop ? "font-semibold text-slate-900" : "text-slate-600"
                    }`}
                  >
                    {nombre}
                  </span>
                  <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isTop ? "bg-brand-primary" : "bg-slate-400"
                      }`}
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                  <span className="font-mono text-[10px] text-slate-700 w-10 text-right">
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Biomarcadores Inmunohistoquímicos y Moleculares */}
        {data.biomarcadores_recomendados && data.biomarcadores_recomendados.length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-slate-200/70">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Dna className="w-3.5 h-3.5 text-brand-primary" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                Panel Sugerido de Inmunohistoquímica y Biomarcadores (GPC 36 MinSalud):
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {data.biomarcadores_recomendados.map((bio) => (
                <span
                  key={bio}
                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-slate-800 border border-slate-200 shadow-2xs"
                >
                  {bio}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Nota de Correlación Morfológica */}
      {pathOrientationFallback && (
        <div className="p-2.5 bg-slate-50/60 rounded-md border border-slate-200 text-[11px] text-slate-600">
          <strong className="text-slate-800 font-semibold block mb-0.5">
            Correlación con Signos Tomográficos LIDC-IDRI:
          </strong>
          {pathOrientationFallback}
        </div>
      )}

      {/* Disclaimer Médico */}
      <p className="text-[10px] text-slate-500 italic flex items-center gap-1">
        <AlertCircle className="w-3 h-3 text-amber-600 shrink-0 inline" />
        La subtipificación por imagen es una herramienta computacional de apoyo probabilístico. No sustituye la confirmación histopatológica ni el análisis molecular de biopsia tisular.
      </p>
    </div>
  );
}
