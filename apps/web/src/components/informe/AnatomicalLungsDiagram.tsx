"use client";

import React from "react";
import { LOBAR_LOCATIONS, type LobarLocation } from "@/lib/uploadReview";

interface Props {
  selectedLobe?: LobarLocation | string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function AnatomicalLungsDiagram({ selectedLobe, className = "", size = "md" }: Props) {
  const normLobe = selectedLobe?.toLowerCase().trim() || null;
  const activeDef = LOBAR_LOCATIONS.find((l) => l.value === normLobe) || null;

  // Dimensiones según tamaño
  const dimensions = {
    sm: "w-44 max-w-full",
    md: "w-60 max-w-full",
    lg: "w-72 max-w-full",
  }[size];

  // Helper para estilos de cada lóbulo (Garantizados para pantalla y PDF)
  const getLobeStyle = (lobeId: string) => {
    const isSelected = normLobe === lobeId;
    return {
      fill: isSelected ? "#e0f2fe" : "#f8fafc",
      stroke: isSelected ? "#012641" : "#94a3b8",
      strokeWidth: isSelected ? 2.5 : 1.25,
      filter: isSelected ? "drop-shadow(0 2px 4px rgba(1, 38, 65, 0.18))" : "none",
      transition: "all 0.3s ease",
      WebkitPrintColorAdjust: "exact" as const,
      printColorAdjust: "exact" as const,
    };
  };

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      {/* Contenedor del Diagrama Anatómico SVG */}
      <div className={`relative ${dimensions} aspect-[260/215] flex items-center justify-center`}>
        <svg
          viewBox="0 0 260 215"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Diagrama anatómico de lóbulos pulmonares"
        >
          <defs>
            {/* Patrón sutil para lóbulo resaltado */}
            <pattern id="highlightHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="8" stroke="#012641" strokeWidth="1.5" strokeOpacity="0.25" />
            </pattern>
          </defs>

          {/* ── Tráquea y Árbol Bronquial ────────────────────────────── */}
          <g opacity="0.85">
            {/* Tráquea central */}
            <path
              d="M 124,10 L 136,10 L 136,50 L 124,50 Z"
              fill="#e2e8f0"
              stroke="#64748b"
              strokeWidth="1.5"
            />
            {/* Anillos traqueales horizontales */}
            <line x1="124" y1="18" x2="136" y2="18" stroke="#94a3b8" strokeWidth="1" />
            <line x1="124" y1="26" x2="136" y2="26" stroke="#94a3b8" strokeWidth="1" />
            <line x1="124" y1="34" x2="136" y2="34" stroke="#94a3b8" strokeWidth="1" />
            <line x1="124" y1="42" x2="136" y2="42" stroke="#94a3b8" strokeWidth="1" />

            {/* Bifurcación en carina y bronquios principales */}
            <path
              d="M 124,50 Q 112,62 100,72 L 94,66 Q 110,54 124,46"
              fill="#e2e8f0"
              stroke="#64748b"
              strokeWidth="1.5"
            />
            <path
              d="M 136,50 Q 148,62 160,72 L 166,66 Q 150,54 136,46"
              fill="#e2e8f0"
              stroke="#64748b"
              strokeWidth="1.5"
            />
          </g>

          {/* ── Pulmón Derecho (Anatómico Derecho, a la izquierda del observador) ── */}
          <g id="pulmon-derecho">
            {/* 1. Lóbulo Superior Derecho (LSD) */}
            <path
              id="lobe-lsd"
              d="M 92,26 C 74,27 54,46 38,74 C 33,83 31,94 31,96 C 49,95 74,93 94,90 C 93,76 92,58 92,26 Z"
              style={getLobeStyle("lsd")}
            />
            {normLobe === "lsd" && (
              <path
                d="M 92,26 C 74,27 54,46 38,74 C 33,83 31,94 31,96 C 49,95 74,93 94,90 C 93,76 92,58 92,26 Z"
                fill="url(#highlightHatch)"
                pointerEvents="none"
              />
            )}

            {/* 2. Lóbulo Medio Derecho (LMD) */}
            <path
              id="lobe-lmd"
              d="M 31,96 C 30,110 33,126 38,140 C 58,134 78,127 97,118 C 96,108 95,97 94,90 C 74,93 49,95 31,96 Z"
              style={getLobeStyle("lmd")}
            />
            {normLobe === "lmd" && (
              <path
                d="M 31,96 C 30,110 33,126 38,140 C 58,134 78,127 97,118 C 96,108 95,97 94,90 C 74,93 49,95 31,96 Z"
                fill="url(#highlightHatch)"
                pointerEvents="none"
              />
            )}

            {/* 3. Lóbulo Inferior Derecho (LID) */}
            <path
              id="lobe-lid"
              d="M 38,140 C 40,158 44,178 48,192 C 66,196 90,194 108,185 C 104,163 100,139 97,118 C 78,127 58,134 38,140 Z"
              style={getLobeStyle("lid")}
            />
            {normLobe === "lid" && (
              <path
                d="M 38,140 C 40,158 44,178 48,192 C 66,196 90,194 108,185 C 104,163 100,139 97,118 C 78,127 58,134 38,140 Z"
                fill="url(#highlightHatch)"
                pointerEvents="none"
              />
            )}
          </g>

          {/* ── Pulmón Izquierdo (Anatómico Izquierdo, a la derecha del observador) ── */}
          <g id="pulmon-izquierdo">
            {/* 4. Lóbulo Superior Izquierdo (LSI) */}
            <path
              id="lobe-lsi"
              d="M 168,26 C 186,27 206,46 222,74 C 227,86 229,102 229,112 C 206,130 182,148 160,166 C 165,144 165,124 163,94 C 165,68 166,46 168,26 Z"
              style={getLobeStyle("lsi")}
            />
            {normLobe === "lsi" && (
              <path
                d="M 168,26 C 186,27 206,46 222,74 C 227,86 229,102 229,112 C 206,130 182,148 160,166 C 165,144 165,124 163,94 C 165,68 166,46 168,26 Z"
                fill="url(#highlightHatch)"
                pointerEvents="none"
              />
            )}

            {/* 5. Lóbulo Inferior Izquierdo (LII) */}
            <path
              id="lobe-lii"
              d="M 229,112 C 228,140 224,170 212,192 C 194,196 170,194 152,185 C 156,176 159,170 160,166 C 182,148 206,130 229,112 Z"
              style={getLobeStyle("lii")}
            />
            {normLobe === "lii" && (
              <path
                d="M 229,112 C 228,140 224,170 212,192 C 194,196 170,194 152,185 C 156,176 159,170 160,166 C 182,148 206,130 229,112 Z"
                fill="url(#highlightHatch)"
                pointerEvents="none"
              />
            )}
          </g>

          {/* ── Etiquetas de Lóbulo en el SVG ────────────────────────── */}
          <g fontSize="8" fontFamily="monospace" fontWeight="bold" opacity="0.75">
            <text x="60" y="60" textAnchor="middle" fill={normLobe === "lsd" ? "#012641" : "#64748b"}>LSD</text>
            <text x="56" y="118" textAnchor="middle" fill={normLobe === "lmd" ? "#012641" : "#64748b"}>LMD</text>
            <text x="70" y="165" textAnchor="middle" fill={normLobe === "lid" ? "#012641" : "#64748b"}>LID</text>

            <text x="200" y="85" textAnchor="middle" fill={normLobe === "lsi" ? "#012641" : "#64748b"}>LSI</text>
            <text x="190" y="160" textAnchor="middle" fill={normLobe === "lii" ? "#012641" : "#64748b"}>LII</text>
          </g>

          {/* Líneas marcadoras si hay un lóbulo activo */}
          {normLobe === "lsd" && <circle cx="60" cy="58" r="4" fill="#012641" stroke="#ffffff" strokeWidth="1.5" />}
          {normLobe === "lmd" && <circle cx="56" cy="116" r="4" fill="#012641" stroke="#ffffff" strokeWidth="1.5" />}
          {normLobe === "lid" && <circle cx="70" cy="163" r="4" fill="#012641" stroke="#ffffff" strokeWidth="1.5" />}
          {normLobe === "lsi" && <circle cx="200" cy="83" r="4" fill="#012641" stroke="#ffffff" strokeWidth="1.5" />}
          {normLobe === "lii" && <circle cx="190" cy="158" r="4" fill="#012641" stroke="#ffffff" strokeWidth="1.5" />}
        </svg>
      </div>

      {/* ── Leyenda Descriptiva Inferior (Lóbulo Asignado) ─────────── */}
      <div className="mt-2 text-center">
        {activeDef ? (
          <span className="inline-block px-3 py-1 rounded-md bg-slate-100 border border-slate-300 text-slate-800 text-xs font-semibold">
            {activeDef.label}
          </span>
        ) : (
          <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-mono text-slate-400 bg-slate-50 border border-slate-200">
            -- (Localización lobar no asignada)
          </span>
        )}
      </div>
    </div>
  );
}

