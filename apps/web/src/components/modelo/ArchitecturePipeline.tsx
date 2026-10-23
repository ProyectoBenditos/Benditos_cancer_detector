"use client";

import React from "react";
import {
  Brain,
  Layers,
  List,
  GitMerge,
  Cpu,
  Target,
  Microscope,
  Eye,
  CheckCircle2,
} from "lucide-react";

export default function ArchitecturePipeline() {
  return (
    <div className="w-full flex flex-col gap-6">
      {/* ── Modelo 1: Detección Multimodal y Riesgo Maligno ────────────────── */}
      <div className="flex flex-col gap-4 p-5 sm:p-6 rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                Modelo 1 • Inferencia Multimodal Primaria
              </span>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                95.07% Sensibilidad
              </span>
            </div>
            <h4 className="text-lg font-bold text-slate-900 mt-1">
              DenseNet-121 + LIDC Domain Encoder + Clinical MLP + XGBoost Head
            </h4>
            <p className="text-xs text-slate-500">
              Arquitectura multimodal híbrida con 1120 dimensiones combinadas y mapa de explicabilidad HiResCAM.
            </p>
          </div>
        </div>

        {/* Pipeline Diagram */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-stretch pt-2">
          {/* Columna 1: 3 Ramas de Entrada */}
          <div className="flex flex-col gap-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              1. Extracción Multimodal
            </span>

            {/* Rama A */}
            <div className="p-3 rounded-xl border border-blue-100 bg-blue-50/70 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs">
                  <Brain className="w-4 h-4 text-blue-700" />
                  Rama A: Tomografía CT
                </div>
                <span className="text-[10px] font-mono bg-blue-200/60 text-blue-900 px-1.5 py-0.5 rounded">
                  1024D
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-snug">
                <strong>DenseNet-121</strong> con conexiones densas que reutilizan gradientes y preservan patrones sutiles en ventana de parénquima (-600/1500 HU).
              </p>
              <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-brand-primary">
                <Eye className="w-3 h-3" />
                HiResCAM a nivel de elemento
              </div>
            </div>

            {/* Rama B */}
            <div className="p-3 rounded-xl border border-violet-100 bg-violet-50/70 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-violet-900 font-bold text-xs">
                  <Layers className="w-4 h-4 text-violet-700" />
                  Rama B: LIDC Domain
                </div>
                <span className="text-[10px] font-mono bg-violet-200/60 text-violet-900 px-1.5 py-0.5 rounded">
                  64D
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-snug">
                <strong>Encoder preentrenado</strong> con autoencoder contrastivo sobre 1,018 casos pulmonares completos de LIDC-IDRI.
              </p>
            </div>

            {/* Rama C */}
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-900 font-bold text-xs">
                  <List className="w-4 h-4 text-slate-700" />
                  Rama C: Prior Clínico
                </div>
                <span className="text-[10px] font-mono bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded">
                  32D
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-snug">
                <strong>MLP de 2 capas</strong> para las 8 características semánticas de consenso radiológico (espiculación, margen, calcificación, etc.).
              </p>
            </div>
          </div>

          {/* Columna 2: Fusión Vectorial */}
          <div className="flex flex-col gap-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              2. Fusión Vectorial
            </span>
            <div className="h-full flex flex-col justify-center items-center p-4 rounded-xl border border-slate-200 bg-slate-50/80 text-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-slate-700">
                <GitMerge className="w-6 h-6 text-brand-primary" />
              </div>
              <div>
                <h5 className="font-bold text-sm text-slate-800">
                  Concatenación Espacial
                </h5>
                <span className="inline-block mt-1 font-mono font-bold text-xs text-brand-primary bg-brand-primary/10 px-2.5 py-1 rounded-full">
                  Vector Latente 1120D
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed max-w-[200px]">
                Integra representación visual profunda, invariancia del parénquima y semiología clínica sin pérdida de señal.
              </p>
            </div>
          </div>

          {/* Columna 3: Head Predictor XGBoost */}
          <div className="flex flex-col gap-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              3. Inferencia y Calibración
            </span>
            <div className="h-full flex flex-col justify-center items-center p-4 rounded-xl border border-slate-200 bg-slate-50/80 text-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-slate-700">
                <Cpu className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h5 className="font-bold text-sm text-slate-800">
                  XGBoost Head Calibrado
                </h5>
                <span className="inline-block mt-1 font-mono font-bold text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  Platt Scaling + TTA 4x
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed max-w-[220px]">
                Ensamble de gradiente con regularización L1/L2 que previene sobreajuste en límites no lineales y optimiza el umbral de seguridad clínica.
              </p>
            </div>
          </div>

          {/* Columna 4: Score y Punto de Operación */}
          <div className="flex flex-col gap-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              4. Decisión Clínica
            </span>
            <div className="h-full flex flex-col justify-between p-4 rounded-xl border-2 border-brand-primary/30 bg-gradient-to-b from-white to-brand-primary/5 shadow-xs">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-brand-primary shrink-0" />
                <h5 className="font-bold text-sm text-slate-900">
                  Score de Malignidad
                </h5>
              </div>

              <div className="my-2 space-y-2">
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-500 font-semibold block uppercase">
                    Umbral Clínico de Seguridad (τ)
                  </span>
                  <span className="text-xl font-extrabold text-brand-primary font-mono">
                    τ = 0.35
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Sensibilidad:</span>
                    <strong className="text-emerald-700">95.07%</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Especificidad:</span>
                    <strong className="text-slate-800">85.71%</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>AUC-ROC:</span>
                    <strong className="text-blue-700 font-mono">0.9684</strong>
                  </div>
                </div>
              </div>

              <span className="text-[10px] text-slate-500 text-center block">
                Separación a nivel paciente (357 muestras de 56 pacientes)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modelo 2: Clasificación de Subtipo Histológico (CLID) ─────────── */}
      <div className="flex flex-col gap-4 p-5 sm:p-6 rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50/50 via-white to-pink-50/30 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-violet-100">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-violet-100 text-violet-800 border border-violet-200">
              Modelo 2 • Caracterización Histológica
            </span>
            <span className="text-xs font-semibold text-violet-700 bg-white border border-violet-200 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Microscope className="w-3 h-3 text-violet-600" />
              CLID DenseNet-121 (4 Clases)
            </span>
          </div>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
            99.39% Sensibilidad Detección Cáncer vs Normal
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-1">
          <div className="p-3 rounded-xl bg-white border border-rose-200 shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-xs text-rose-700">Adenocarcinoma (ADC)</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-50 text-rose-600 border border-rose-200">
                ~40% casos
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-snug">
              Neoplasia glandular de localización preferentemente periférica. Marcadores: TTF-1 (+), Napsina A (+).
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white border border-amber-200 shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-xs text-amber-700">Carcinoma Epidermoide (SCC)</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-50 text-amber-600 border border-amber-200">
                ~25–30% casos
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-snug">
              Lesión predominantemente central/endobronquial con queratinización o cavitación. Marcadores: p40 (+), CK5/6 (+).
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white border border-purple-200 shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-xs text-purple-700">Células Grandes (LCC)</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-50 text-purple-600 border border-purple-200">
                ~10% casos
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-snug">
              Cáncer pobremente diferenciado sin morfología glandular ni escamosa, de curso clínico agresivo.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white border border-emerald-200 shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-xs text-emerald-700">Tejido Normal / Sano</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-600 border border-emerald-200">
                Control
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-snug">
              Parénquima pulmonar alveolar intacto sin atipias citológicas ni desmoplasia estromal (42/43 detectados correctamente).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
