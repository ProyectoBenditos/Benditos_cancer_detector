"use client";

import { useState } from "react";
import { CONFUSION_MATRIX } from "./modelData";
import { CheckCircle2, AlertTriangle, ShieldAlert, HeartPulse, Info } from "lucide-react";

type QuadrantKey = "TN" | "FP" | "FN" | "TP";

interface QuadrantDetail {
  key: QuadrantKey;
  sigla: string;
  name: string;
  count: number;
  pct: string;
  category: "Éxito diagnóstico" | "Sobrediagnóstico" | "Riesgo de subdiagnóstico";
  badgeColor: string;
  badgeBg: string;
  badgeBorder: string;
  icon: typeof CheckCircle2;
  implication: string;
  protocol: string;
}

const DETAILS: Record<QuadrantKey, QuadrantDetail> = {
  TN: {
    key: "TN",
    sigla: "VN",
    name: "Verdaderos Negativos",
    count: CONFUSION_MATRIX.tn,
    pct: ((CONFUSION_MATRIX.tn / 738) * 100).toFixed(1) + "%",
    category: "Éxito diagnóstico",
    badgeColor: "text-emerald-700",
    badgeBg: "bg-emerald-50",
    badgeBorder: "border-emerald-200",
    icon: CheckCircle2,
    implication:
      "El modelo clasificó correctamente la ausencia de nódulo en concordancia con el consenso radiológico de 4 especialistas. Evita biopsias innecesarias, estrés al paciente y costos al sistema de salud.",
    protocol:
      "Control de rutina según directrices de tamizaje (evaluación preventiva estándar en pacientes de riesgo).",
  },
  FP: {
    key: "FP",
    sigla: "FP",
    name: "Falsos Positivos",
    count: CONFUSION_MATRIX.fp,
    pct: ((CONFUSION_MATRIX.fp / 738) * 100).toFixed(1) + "%",
    category: "Sobrediagnóstico",
    badgeColor: "text-amber-700",
    badgeBg: "bg-amber-50",
    badgeBorder: "border-amber-200",
    icon: AlertTriangle,
    implication:
      "La IA alertó sospecha de nódulo en un paciente sin lesión real (confusión por artefactos vasculares o atelectasias). No compromete la vida del paciente, pero puede inducir pruebas complementarias no requeridas.",
    protocol:
      "Revisión humana en ventana de parénquima pulmonar para descartar falsas alarmas antes de emitir orden de seguimiento invasivo.",
  },
  FN: {
    key: "FN",
    sigla: "FN",
    name: "Falsos Negativos",
    count: CONFUSION_MATRIX.fn,
    pct: ((CONFUSION_MATRIX.fn / 738) * 100).toFixed(1) + "%",
    category: "Riesgo de subdiagnóstico",
    badgeColor: "text-rose-700",
    badgeBg: "bg-rose-50",
    badgeBorder: "border-rose-200",
    icon: ShieldAlert,
    implication:
      "El caso contenía un nódulo real confirmado que el modelo no detectó. Es el cuadrante de mayor riesgo clínico en oncología, pues un retraso en la detección impacta el pronóstico del paciente.",
    protocol:
      "Pilar ético del sistema: la IA es exclusivamente un apoyo. Jamás debe sustituir la inspección exhaustiva de todo el volumen tomográfico por el médico radiólogo.",
  },
  TP: {
    key: "TP",
    sigla: "VP",
    name: "Verdaderos Positivos",
    count: CONFUSION_MATRIX.tp,
    pct: ((CONFUSION_MATRIX.tp / 738) * 100).toFixed(1) + "%",
    category: "Éxito diagnóstico",
    badgeColor: "text-blue-700",
    badgeBg: "bg-blue-50",
    badgeBorder: "border-blue-200",
    icon: HeartPulse,
    implication:
      "El modelo detectó de forma oportuna la presencia del nódulo pulmonar verificado. Facilita la priorización inmediata de pacientes con sospecha de malignidad en listas de espera hospitalarias.",
    protocol:
      "Priorización en cola de lectura, análisis cuantitativo con Grad-CAM y derivación a comité de patología torácica según criterios Lung-RADS 4A/4B.",
  },
};

export default function ConfusionMatrix() {
  const { tn, fp, fn, tp } = CONFUSION_MATRIX;
  const [selectedQuadrant, setSelectedQuadrant] = useState<QuadrantKey | null>("FN");

  const precision = ((tp / (tp + fp)) * 100).toFixed(1);
  const recall = ((tp / (tp + fn)) * 100).toFixed(1);
  const specificity = ((tn / (tn + fp)) * 100).toFixed(1);
  const f1 = ((2 * tp / (2 * tp + fp + fn)) * 100).toFixed(1);

  const activeDetail = selectedQuadrant ? DETAILS[selectedQuadrant] : null;

  return (
    <div className="w-full flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">
            Matriz de Confusión
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Haz clic en cualquier cuadrante para explorar su impacto clínico
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
          738 casos de prueba
        </span>
      </div>

      <div className="flex flex-col items-center my-2">
        {/* Column header */}
        <div className="text-center font-medium text-xs text-slate-500 mb-2 ml-20 uppercase tracking-wider">
          Resultado Predicho por IA
        </div>

        <div className="flex">
          {/* Row header */}
          <div className="flex flex-col items-center justify-center mr-2 w-14">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider [writing-mode:vertical-lr] rotate-180">
              Diagnóstico Real
            </span>
          </div>

          <div className="flex flex-col">
            {/* Column labels */}
            <div className="grid grid-cols-[80px_1fr_1fr] gap-2 mb-2">
              <div />
              <div className="text-center text-xs font-semibold text-slate-600">
                Sin nódulo
              </div>
              <div className="text-center text-xs font-semibold text-slate-600">
                Nódulo
              </div>
            </div>

            {/* Row 1: Real = Sin nódulo */}
            <div className="grid grid-cols-[80px_1fr_1fr] gap-2 mb-2">
              <div className="flex items-center justify-end pr-2 text-xs font-semibold text-slate-600">
                Sin nódulo
              </div>

              {/* Botón VN */}
              <button
                type="button"
                onClick={() => setSelectedQuadrant("TN")}
                aria-pressed={selectedQuadrant === "TN"}
                className={`flex flex-col items-center justify-center rounded-xl p-3 min-w-[110px] min-h-[96px] cursor-pointer transition-all duration-150 text-white ${
                  selectedQuadrant === "TN"
                    ? "bg-blue-900 ring-3 ring-blue-500 shadow-md scale-102"
                    : "bg-blue-800 hover:bg-blue-850 hover:shadow-sm"
                }`}
              >
                <span className="text-3xl font-extrabold tracking-tight">{tn}</span>
                <span className="text-xs font-medium opacity-85 mt-1 flex items-center gap-1">
                  VN · {DETAILS.TN.pct}
                </span>
              </button>

              {/* Botón FP */}
              <button
                type="button"
                onClick={() => setSelectedQuadrant("FP")}
                aria-pressed={selectedQuadrant === "FP"}
                className={`flex flex-col items-center justify-center rounded-xl p-3 min-w-[110px] min-h-[96px] cursor-pointer transition-all duration-150 ${
                  selectedQuadrant === "FP"
                    ? "bg-blue-200 text-slate-900 ring-3 ring-amber-500 shadow-md scale-102"
                    : "bg-blue-100/70 text-slate-800 hover:bg-blue-200/80 hover:shadow-sm"
                }`}
              >
                <span className="text-3xl font-extrabold tracking-tight">{fp}</span>
                <span className="text-xs font-medium text-slate-600 mt-1 flex items-center gap-1">
                  FP · {DETAILS.FP.pct}
                </span>
              </button>
            </div>

            {/* Row 2: Real = Nódulo */}
            <div className="grid grid-cols-[80px_1fr_1fr] gap-2">
              <div className="flex items-center justify-end pr-2 text-xs font-semibold text-slate-600">
                Nódulo
              </div>

              {/* Botón FN */}
              <button
                type="button"
                onClick={() => setSelectedQuadrant("FN")}
                aria-pressed={selectedQuadrant === "FN"}
                className={`flex flex-col items-center justify-center rounded-xl p-3 min-w-[110px] min-h-[96px] cursor-pointer transition-all duration-150 ${
                  selectedQuadrant === "FN"
                    ? "bg-blue-200 text-slate-900 ring-3 ring-rose-500 shadow-md scale-102"
                    : "bg-blue-100/70 text-slate-800 hover:bg-blue-200/80 hover:shadow-sm"
                }`}
              >
                <span className="text-3xl font-extrabold tracking-tight">{fn}</span>
                <span className="text-xs font-medium text-slate-600 mt-1 flex items-center gap-1">
                  FN · {DETAILS.FN.pct}
                </span>
              </button>

              {/* Botón VP */}
              <button
                type="button"
                onClick={() => setSelectedQuadrant("TP")}
                aria-pressed={selectedQuadrant === "TP"}
                className={`flex flex-col items-center justify-center rounded-xl p-3 min-w-[110px] min-h-[96px] cursor-pointer transition-all duration-150 text-white ${
                  selectedQuadrant === "TP"
                    ? "bg-blue-700 ring-3 ring-blue-400 shadow-md scale-102"
                    : "bg-blue-600 hover:bg-blue-650 hover:shadow-sm"
                }`}
              >
                <span className="text-3xl font-extrabold tracking-tight">{tp}</span>
                <span className="text-xs font-medium opacity-85 mt-1 flex items-center gap-1">
                  VP · {DETAILS.TP.pct}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Panel de detalle clínico del cuadrante activo ── */}
      {activeDetail ? (
        <div
          className={`mt-5 p-4 rounded-xl border transition-all duration-200 ${activeDetail.badgeBg} ${activeDetail.badgeBorder}`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-2 border-b border-black/5">
            <div className="flex items-center gap-2">
              <activeDetail.icon className={`w-5 h-5 shrink-0 ${activeDetail.badgeColor}`} />
              <h4 className="font-bold text-sm text-slate-900">
                {activeDetail.name} ({activeDetail.sigla})
              </h4>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-700">
                {activeDetail.count} casos ({activeDetail.pct})
              </span>
              <span
                className={`px-2 py-0.5 rounded-full font-semibold border ${activeDetail.badgeBg} ${activeDetail.badgeColor} ${activeDetail.badgeBorder}`}
              >
                {activeDetail.category}
              </span>
            </div>
          </div>

          <div className="space-y-2 text-xs text-slate-700 mt-2">
            <p>
              <strong className="text-slate-900">Implicación clínica: </strong>
              {activeDetail.implication}
            </p>
            <p>
              <strong className="text-slate-900">Protocolo recomendado: </strong>
              {activeDetail.protocol}
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-5 p-3 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
          <Info className="w-4 h-4 text-slate-400" />
          Haz clic en uno de los 4 cuadrantes arriba para conocer su implicación clínica.
        </div>
      )}

      {/* Derived metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100">
        {[
          { label: "Precisión", value: `${precision}%`, sub: "TP / (TP + FP)" },
          { label: "Sensibilidad", value: `${recall}%`, sub: "TP / (TP + FN)" },
          { label: "Especificidad", value: `${specificity}%`, sub: "TN / (TN + FP)" },
          { label: "F1-Score", value: `${f1}%`, sub: "Balance P-S" },
        ].map(({ label, value, sub }) => (
          <div key={label} className="flex flex-col items-center text-center p-2 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
              {label}
            </span>
            <span className="text-lg font-extrabold text-slate-800 mt-0.5">
              {value}
            </span>
            <span className="text-[10px] text-slate-400 font-mono mt-0.5">
              {sub}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
