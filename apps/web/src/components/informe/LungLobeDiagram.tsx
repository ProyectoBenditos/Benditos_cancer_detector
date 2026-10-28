"use client";

import React from "react";

export type LungLobe = "RUL" | "RML" | "RLL" | "LUL" | "LLL" | "LINGULA" | "UNKNOWN";

interface Props {
  activeLobe?: LungLobe;
  lesionId?: string;
  className?: string;
}

export function LungLobeDiagram({
  activeLobe = "RUL",
  lesionId = "NOD-001",
  className = "",
}: Props) {
  const isLobe = (lobe: LungLobe) => activeLobe === lobe;

  const lobeNames: Record<LungLobe, string> = {
    RUL: "Lóbulo Superior Derecho (LSD)",
    RML: "Lóbulo Medio (LM)",
    RLL: "Lóbulo Inferior Derecho (LID)",
    LUL: "Lóbulo Superior Izquierdo (LSI)",
    LINGULA: "Língula (Pulmón Izq.)",
    LLL: "Lóbulo Inferior Izquierdo (LII)",
    UNKNOWN: "Lóbulo no especificado",
  };

  return (
    <div className={`flex flex-col items-center p-4 bg-slate-50 border border-slate-200 rounded-2xl ${className}`}>
      <div className="flex items-center justify-between w-full mb-3 px-1 text-xs text-slate-500 font-semibold uppercase tracking-wider">
        <span>Pulmón Derecho</span>
        <span className="text-[11px] font-mono text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded border border-brand-primary/20">
          Lesión: {lesionId}
        </span>
        <span>Pulmón Izquierdo</span>
      </div>

      {/* Diagrama Anatómico SVG Vectorial de Lóbulos Pulmonares */}
      <div className="relative w-full max-w-[280px] h-[220px]">
        <svg
          viewBox="0 0 280 220"
          className="w-full h-full drop-shadow-xs"
          aria-label="Diagrama de anatomía lobar pulmonar"
        >
          {/* Tráquea y Bronquios Principales */}
          <path
            d="M 134 10 L 134 60 C 134 75, 110 82, 90 92 M 146 10 L 146 60 C 146 75, 170 82, 190 92"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="5"
            strokeLinecap="round"
          />
          {/* Anillos traqueales sutiles */}
          <line x1="130" y1="20" x2="150" y2="20" stroke="#cbd5e1" strokeWidth="2" />
          <line x1="130" y1="32" x2="150" y2="32" stroke="#cbd5e1" strokeWidth="2" />
          <line x1="130" y1="44" x2="150" y2="44" stroke="#cbd5e1" strokeWidth="2" />

          {/* ================= PULMÓN DERECHO ================= */}
          {/* 1. Lóbulo Superior Derecho (RUL / LSD) */}
          <path
            d="M 125 55 C 120 28, 85 20, 50 38 C 28 52, 22 85, 25 110 C 50 115, 95 105, 120 85 Z"
            fill={isLobe("RUL") ? "#ef4444" : "#e2e8f0"}
            fillOpacity={isLobe("RUL") ? 0.35 : 0.8}
            stroke={isLobe("RUL") ? "#dc2626" : "#94a3b8"}
            strokeWidth={isLobe("RUL") ? "2.5" : "1.5"}
            className="transition-colors duration-300"
          />

          {/* 2. Lóbulo Medio Derecho (RML / LM) */}
          <path
            d="M 25 110 C 26 128, 35 145, 55 152 C 80 148, 105 130, 118 115 C 119 100, 115 92, 110 88 C 85 100, 50 110, 25 110 Z"
            fill={isLobe("RML") ? "#ef4444" : "#e2e8f0"}
            fillOpacity={isLobe("RML") ? 0.35 : 0.8}
            stroke={isLobe("RML") ? "#dc2626" : "#94a3b8"}
            strokeWidth={isLobe("RML") ? "2.5" : "1.5"}
            className="transition-colors duration-300"
          />

          {/* 3. Lóbulo Inferior Derecho (RLL / LID) */}
          <path
            d="M 55 152 C 70 178, 105 192, 125 188 C 128 160, 125 135, 118 115 C 105 130, 80 148, 55 152 Z"
            fill={isLobe("RLL") ? "#ef4444" : "#e2e8f0"}
            fillOpacity={isLobe("RLL") ? 0.35 : 0.8}
            stroke={isLobe("RLL") ? "#dc2626" : "#94a3b8"}
            strokeWidth={isLobe("RLL") ? "2.5" : "1.5"}
            className="transition-colors duration-300"
          />

          {/* ================= PULMÓN IZQUIERDO ================= */}
          {/* 4. Lóbulo Superior Izquierdo (LUL / LSI) */}
          <path
            d="M 155 55 C 160 28, 195 20, 230 38 C 252 52, 258 85, 255 115 C 235 125, 190 125, 160 90 Z"
            fill={isLobe("LUL") ? "#ef4444" : "#e2e8f0"}
            fillOpacity={isLobe("LUL") ? 0.35 : 0.8}
            stroke={isLobe("LUL") ? "#dc2626" : "#94a3b8"}
            strokeWidth={isLobe("LUL") ? "2.5" : "1.5"}
            className="transition-colors duration-300"
          />

          {/* 5. Língula / Zona Media Izquierda */}
          <path
            d="M 255 115 C 253 140, 240 155, 225 160 C 205 150, 175 140, 160 120 C 160 105, 160 95, 160 90 C 190 125, 235 125, 255 115 Z"
            fill={isLobe("LINGULA") ? "#ef4444" : "#e2e8f0"}
            fillOpacity={isLobe("LINGULA") ? 0.35 : 0.8}
            stroke={isLobe("LINGULA") ? "#dc2626" : "#94a3b8"}
            strokeWidth={isLobe("LINGULA") ? "2.5" : "1.5"}
            className="transition-colors duration-300"
          />

          {/* 6. Lóbulo Inferior Izquierdo (LLL / LII) */}
          <path
            d="M 225 160 C 210 178, 175 192, 155 188 C 152 160, 155 135, 160 120 C 175 140, 205 150, 225 160 Z"
            fill={isLobe("LLL") ? "#ef4444" : "#e2e8f0"}
            fillOpacity={isLobe("LLL") ? 0.35 : 0.8}
            stroke={isLobe("LLL") ? "#dc2626" : "#94a3b8"}
            strokeWidth={isLobe("LLL") ? "2.5" : "1.5"}
            className="transition-colors duration-300"
          />

          {/* Marcador Dinámico de la Lesión en el Lóbulo Activo */}
          {isLobe("RUL") && (
            <g className="animate-pulse">
              <circle cx="65" cy="62" r="11" fill="#ef4444" fillOpacity="0.25" />
              <circle cx="65" cy="62" r="6" fill="#dc2626" />
              <circle cx="65" cy="62" r="2.5" fill="#ffffff" />
            </g>
          )}

          {isLobe("RML") && (
            <g className="animate-pulse">
              <circle cx="70" cy="120" r="11" fill="#ef4444" fillOpacity="0.25" />
              <circle cx="70" cy="120" r="6" fill="#dc2626" />
              <circle cx="70" cy="120" r="2.5" fill="#ffffff" />
            </g>
          )}

          {isLobe("RLL") && (
            <g className="animate-pulse">
              <circle cx="95" cy="160" r="11" fill="#ef4444" fillOpacity="0.25" />
              <circle cx="95" cy="160" r="6" fill="#dc2626" />
              <circle cx="95" cy="160" r="2.5" fill="#ffffff" />
            </g>
          )}

          {isLobe("LUL") && (
            <g className="animate-pulse">
              <circle cx="215" cy="62" r="11" fill="#ef4444" fillOpacity="0.25" />
              <circle cx="215" cy="62" r="6" fill="#dc2626" />
              <circle cx="215" cy="62" r="2.5" fill="#ffffff" />
            </g>
          )}

          {isLobe("LINGULA") && (
            <g className="animate-pulse">
              <circle cx="210" cy="130" r="11" fill="#ef4444" fillOpacity="0.25" />
              <circle cx="210" cy="130" r="6" fill="#dc2626" />
              <circle cx="210" cy="130" r="2.5" fill="#ffffff" />
            </g>
          )}

          {isLobe("LLL") && (
            <g className="animate-pulse">
              <circle cx="185" cy="160" r="11" fill="#ef4444" fillOpacity="0.25" />
              <circle cx="185" cy="160" r="6" fill="#dc2626" />
              <circle cx="185" cy="160" r="2.5" fill="#ffffff" />
            </g>
          )}
        </svg>
      </div>

      <div className="mt-2 text-center">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <span className="w-2 h-2 rounded-full bg-rose-500 motion-safe:animate-ping inline-block" />
          {lobeNames[activeLobe]}
        </span>
      </div>
    </div>
  );
}

