"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, Check, Download } from "lucide-react";

interface Props {
  uploadId: string;
  sourceHash?: string | null;
  caseRef?: string | null;
}

export function ReportPrintControls({ uploadId, sourceHash, caseRef }: Props) {
  const [copied, setCopied] = useState(false);

  const handlePrint = () => {
    const originalTitle = document.title;
    const cleanRef = (caseRef || uploadId.slice(0, 8)).replace(/[^a-zA-Z0-9_-]/g, "_");
    document.title = `Informe_Clinico_OncoScan_Caso_${cleanRef}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1500);
  };

  const handleCopyHash = () => {
    if (!sourceHash) return;
    navigator.clipboard.writeText(sourceHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="print:hidden sticky top-16 z-10 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3.5 mb-6 shadow-xs">
      <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-4">
        <Link
          href={`/platform/uploads/${uploadId}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded-lg px-2 py-1"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al estudio
        </Link>

        <div className="flex items-center gap-3">
          {sourceHash && (
            <button
              type="button"
              onClick={handleCopyHash}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer border border-slate-200"
              title="Copiar Hash SHA-256 de cadena de custodia"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              {copied ? "Hash Copiado" : "Copiar Hash SHA-256"}
            </button>
          )}

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white text-sm font-bold rounded-xl shadow-xs transition active:scale-[0.98] cursor-pointer"
          >
            <Download className="w-4 h-4" /> Descargar Informe PDF
          </button>
        </div>
      </div>
    </div>
  );
}

