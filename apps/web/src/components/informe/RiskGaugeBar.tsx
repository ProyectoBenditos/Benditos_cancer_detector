"use client";

import React from "react";
import { AlertTriangle, CheckCircle, ShieldAlert } from "lucide-react";

interface Props {
  score: number | null | undefined; // 0.0 to 1.0 (or percentage if > 1)
  riskLevel?: string | null;
  inferenceTimeMs?: number | null;
  modelVersion?: string | null;
  className?: string;
}

export function RiskGaugeBar({
  score,
  riskLevel,
  inferenceTimeMs,
  modelVersion = "multimodal-v1.2",
  className = "",
}: Props) {
  // Normalizar score a porcentaje 0 - 100
  const normalizedPercentage =
    score == null
      ? 0
      : score > 1
      ? Math.min(100, Math.max(0, score))
      : Math.min(100, Math.max(0, score * 100));

  const level =
    riskLevel?.toUpperCase() ||
    (normalizedPercentage > 65
      ? "ALTO"
      : normalizedPercentage >= 33
      ? "MEDIO"
      : "BAJO");

  const badgeConfig = {
    BAJO: {
      color: "text-emerald-700 bg-emerald-50 border-emerald-300",
      icon: CheckCircle,
      label: "Riesgo Bajo (< 33%)",
    },
    MEDIO: {
      color: "text-amber-700 bg-amber-50 border-amber-300",
      icon: AlertTriangle,
      label: "Riesgo Moderado (33% – 65%)",
    },
    ALTO: {
      color: "text-rose-700 bg-rose-50 border-rose-300",
      icon: ShieldAlert,
      label: "Riesgo Alto (> 65%)",
    },
  }[level] || {
    color: "text-slate-700 bg-slate-50 border-slate-300",
    icon: AlertTriangle,
    label: "Indeterminado",
  };

  const Icon = badgeConfig.icon;

  return (
    <div className={`p-5 bg-white border border-slate-200 rounded-2xl shadow-xs ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Probabilidad Computacional de Malignidad (Score IA)
          </span>
          <p className="text-xs text-slate-400 mt-0.5">
            Salida de red neuronal ResNet-18 + Clinical MLP ({modelVersion})
          </p>
        </div>
        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${badgeConfig.color}`}
          style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
        >
          <Icon className="w-3.5 h-3.5" />
          {badgeConfig.label}
        </div>
      </div>

      {/* Número de Score Principal */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-mono tracking-tight">
          {score != null ? `${normalizedPercentage.toFixed(1)}%` : "N/D"}
        </span>
        <span className="text-xs text-slate-500 font-medium">
          de probabilidad estimada de malignidad
        </span>
      </div>

      {/* Barra de Gauge Continua con Marcador */}
      <div className="relative pt-6 pb-2">
        {/* Marcador Flotante (Aguja / Pin) */}
        <div
          className="absolute top-0 transition-all duration-500 -translate-x-1/2 flex flex-col items-center z-10"
          style={{ left: `${normalizedPercentage}%` }}
        >
          <span
            className="bg-slate-900 text-white text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shadow-sm"
            style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
          >
            {normalizedPercentage.toFixed(1)}%
          </span>
          <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-slate-900" />
        </div>

        {/* Pista Gradiente de Riesgo */}
        <div
          className="h-4 w-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 shadow-inner relative overflow-hidden border border-slate-300"
          style={{
            WebkitPrintColorAdjust: "exact",
            printColorAdjust: "exact",
          }}
        >
          {/* Líneas de Corte Clínico (33% y 65%) */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white shadow-xs"
            style={{ left: "33%" }}
            title="Corte Riesgo Moderado (33%)"
          />
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white shadow-xs"
            style={{ left: "65%" }}
            title="Corte Riesgo Alto (65%)"
          />
        </div>

        {/* Etiquetas de Rangos Clínicos */}
        <div className="flex justify-between text-[11px] font-semibold text-slate-500 mt-2 px-1">
          <span className="text-emerald-700">0% (Bajo)</span>
          <span className="text-amber-700">33% (Moderado)</span>
          <span className="text-rose-700">65% (Alto)</span>
          <span className="text-rose-800">100%</span>
        </div>
      </div>

      {/* Metadatos Técnicos */}
      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-100 mt-3 gap-2">
        <span>Inferencia calculada en CPU ARM64 de alta disponibilidad</span>
        {inferenceTimeMs != null && (
          <span className="font-mono text-slate-500">Tiempo: {inferenceTimeMs} ms</span>
        )}
      </div>
    </div>
  );
}

