import React from "react";

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase();
  
  let styles = "bg-slate-100 text-slate-700 border-slate-200"; // fallback

  if (normalizedStatus === "completed" || normalizedStatus === "completado" || normalizedStatus === "success") {
    styles = "bg-emerald-50 text-emerald-700 border-emerald-200";
  } else if (normalizedStatus === "pending" || normalizedStatus === "pendiente" || normalizedStatus === "processing") {
    styles = "bg-amber-50 text-amber-700 border-amber-200";
  } else if (normalizedStatus === "failed" || normalizedStatus === "error" || normalizedStatus === "critical") {
    styles = "bg-brand-danger/10 text-brand-danger border-brand-danger/20";
  }

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${styles}`}>
      {status}
    </span>
  );
}
