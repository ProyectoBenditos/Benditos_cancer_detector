import React from "react";
import { EyeOff } from "lucide-react";
import { BLIND_PENDING_LABEL } from "@/lib/blindReading";

/** Ocupa el lugar del riesgo y el score de un estudio pendiente de lectura ciega. */
export function BlindPendingBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold border bg-slate-100 text-slate-600 border-slate-200 whitespace-nowrap">
      <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
      {BLIND_PENDING_LABEL}
    </span>
  );
}
