import React from "react";

export type RiskLevel = "ALTO" | "MEDIO" | "BAJO";

export interface RiskBadgeProps {
  level: RiskLevel | null;
}

const STYLES: Record<RiskLevel, { classes: string; label: string }> = {
  ALTO: {
    classes: "bg-brand-danger/10 text-brand-danger border-brand-danger/20",
    label: "Riesgo alto",
  },
  MEDIO: {
    classes: "bg-amber-100 text-amber-700 border-amber-200",
    label: "Riesgo medio",
  },
  BAJO: {
    classes: "bg-emerald-100 text-emerald-700 border-emerald-200",
    label: "Riesgo bajo",
  },
};

export function RiskBadge({ level }: RiskBadgeProps) {
  if (!level) {
    return (
      <span className="text-slate-400 text-xs" aria-label="Sin análisis">
        Sin análisis
      </span>
    );
  }

  const style = STYLES[level];

  return (
    <span
      className={`px-2.5 py-1 rounded-md text-xs font-bold border ${style.classes}`}
      aria-label={style.label}
    >
      {level}
    </span>
  );
}
