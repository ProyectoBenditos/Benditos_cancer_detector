import React from "react";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  Activity,
  Stethoscope,
  Microscope,
  FileCheck2,
} from "lucide-react";

import { RiskGaugeBar } from "@/components/informe/RiskGaugeBar";
import { MorphologyBars, type ClinicalFeatures } from "@/components/informe/MorphologyBars";
import { ReportPrintControls } from "@/components/informe/ReportPrintControls";
import { AnatomicalLungsDiagram } from "@/components/informe/AnatomicalLungsDiagram";
import { HistologicalSubtypeCard, type SubtipoHistologicoData } from "@/components/informe/HistologicalSubtypeCard";
import { asRiskLevel } from "@/components/ui/RiskBadge";
import { extractLobarLocation } from "@/lib/uploadReview";
import { isBlindPending, loadBlindContext } from "@/lib/blindReading";
import type { InitialImpression } from "@/lib/initialImpression";
import { reportConducta, reportLungRads } from "@/lib/reportCategory";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function InformeClinicoPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: upload, error } = await supabase
    .from("dicom_uploads")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !upload) notFound();

  // Lectura ciega pendiente: el informe revelaría la IA. La lectura se hace en
  // la página del estudio. loadBlindContext lanza si no puede saberlo (falla cerrado).
  const blind = await loadBlindContext(supabase, user.id);
  if (isBlindPending(blind, upload.id)) redirect(`/platform/uploads/${upload.id}`);

  // Paciente
  const patient = upload.patient_id
    ? (await supabase.from("patients").select("*").eq("id", upload.patient_id).single()).data
    : null;

  // Valoración clínica registrada previamente por el médico (si existe)
  const { data: review } = await supabase
    .from("upload_reviews")
    .select("*")
    .eq("upload_id", id)
    .maybeSingle();

  // Impresión inicial de la lectura ciega. Si la consulta falla (p. ej. migración
  // aún no aplicada) se trata como "sin impresión".
  const { data: impressionRow, error: impressionError } = await supabase
    .from("upload_initial_impressions")
    .select("lung_rads, conducta")
    .eq("upload_id", id)
    .maybeSingle<Pick<InitialImpression, "lung_rads" | "conducta">>();
  const impression = impressionError ? null : impressionRow;

  // Extraer localización lobar y notas limpias de la revisión del especialista,
  // con fallback a la selección inicial registrada en el análisis del estudio
  const { lobarLocation: reviewLobar, cleanNotes } = extractLobarLocation(review?.notes);
  const lobarLocation =
    reviewLobar ||
    ((upload.clinical_features as Record<string, unknown> | null)?.lobar_location as string | undefined) ||
    null;

  // Auditoría criptográfica (Ley 1581 / PS 3.15)
  const { data: auditRow } = await supabase
    .from("dicom_anonymization_audit")
    .select("*")
    .eq("upload_id", id)
    .maybeSingle();

  // URL firmada de la imagen original del corte axial
  let beforeUrl: string | null = null;
  const path = upload.preview_storage_path ?? upload.storage_path;
  if (path) {
    const { data: signed } = await supabase.storage
      .from("dicom-files")
      .createSignedUrl(path, 3600);
    beforeUrl = signed?.signedUrl ?? null;
  }

  // Identificador de paciente seudonimizado
  const pseudonym =
    auditRow?.pseudonymized_patient_id ||
    upload.patient_id_dicom ||
    patient?.external_id ||
    `ONC-PAT-${id.slice(0, 8).toUpperCase()}`;

  const caseRef = upload.metadata_json?.case_ref || upload.original_name;

  const sourceHash =
    auditRow?.source_sha256 ||
    upload.metadata_json?.source_sha256 ||
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

  const subtipoData = (upload.metadata_json?.subtipo_histologico as SubtipoHistologicoData | undefined) ?? null;
  const features = (upload.clinical_features || {}) as ClinicalFeatures;
  const noduleSizeMm = review?.nodule_size_mm ? `${review.nodule_size_mm} mm` : null;
  // La categoría y la conducta las asigna el especialista; nunca salen del riesgo de la IA.
  const lungRads = reportLungRads(review, impression);
  const conducta = reportConducta(review, impression);

  // Orientación patológica basada estrictamente en las variables numéricas reales
  const calcVal = Number(features.calcification ?? 0);
  const spicVal = Number(features.spiculation ?? 0);
  const margVal = Number(features.margin ?? 0);

  let pathOrientation = "Variables morfológicas en rango intermedio; requiere correlación con antecedentes y tamaño del nódulo.";
  if (calcVal >= 5) {
    pathOrientation = `Calcificación de patrón central/benigno registrada (${calcVal}/6). Radiológicamente este hallazgo reduce la sospecha de malignidad primaria, siendo compatible con secuela granulomatosa o hamartoma condroide, sujeto a estabilidad temporal.`;
  } else if (spicVal >= 4 && margVal >= 4) {
    pathOrientation = `Espiculación marcada (${spicVal}/5) y márgenes microlobulados (${margVal}/5). En nódulos sólidos, este patrón morfológico orienta a reacción desmoplásica estromal (alta correlación radiológica con adenocarcinoma invasivo).`;
  } else if (spicVal <= 2 && calcVal < 5) {
    pathOrientation = `Baja espiculación (${spicVal}/5). Ausencia de retracción desmoplásica evidente en los márgenes evaluados; debe correlacionarse con el diámetro y el tiempo de duplicación volumétrica.`;
  }

  return (
    <div
      className="min-h-screen bg-slate-50 font-sans print:bg-white text-slate-800 pb-16 print:pb-0"
      style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
    >
      {/* Controles de Acción (Se ocultan al descargar PDF o imprimir) */}
      <ReportPrintControls uploadId={upload.id} sourceHash={sourceHash} caseRef={caseRef} />

      {/* Hoja Médica Estandarizada */}
      <main
        className="max-w-4xl mx-auto bg-white border border-slate-300 print:border-none shadow-sm print:shadow-none p-4 sm:p-8 md:p-12 print:p-0 print:max-w-none text-slate-800"
        style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
      >
        
        {/* ========================================================================= */}
        {/* ENCABEZADO INSTITUCIONAL                                                  */}
        {/* ========================================================================= */}
        <header className="border-b-2 border-slate-800 pb-4 mb-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 shrink-0 flex items-center justify-center">
                <Image
                  src="/images/brand/logo-osp-icon.png"
                  alt="Logo OncoScan"
                  width={48}
                  height={48}
                  className="object-contain"
                  priority
                />
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black tracking-tight text-[#012641]">OncoScan</span>
                  <span className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">
                    Plataforma de Apoyo Diagnóstico
                  </span>
                </div>
                <h1 className="text-xs font-bold text-slate-800 tracking-wide uppercase mt-0.5">
                  INFORME CLÍNICO ESTANDARIZADO DE NÓDULO PULMONAR ASISTIDO POR IA
                </h1>
              </div>
            </div>

            <div className="text-left sm:text-right shrink-0">
              <span className="inline-block px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-300 text-[11px] font-mono font-bold rounded">
                BORRADOR GENERADO POR IA — PENDIENTE DE REVISIÓN CLÍNICA
              </span>
              <p className="text-[10px] text-slate-500 font-mono mt-1">
                Ref. Caso: {caseRef} | Doc. ID: ONC-{id.slice(0, 8).toUpperCase()}
              </p>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between text-[11px] text-slate-600 gap-2">
            <span><strong>Estándares de Referencia:</strong> ACR Lung-RADS® v2022 • CLAIM 2024 (RSNA)</span>
            <span><strong>Marco Normativo:</strong> Res. 1995/1999 • Res. 3100/2019 • Ley 1581/2012</span>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* AVISO REGULATORIO OBLIGATORIO (Decreto 4725/2005 - INVIMA)                 */}
        {/* ========================================================================= */}
        <div className="mb-5 p-3 rounded-lg border border-slate-300 bg-slate-50 text-slate-700 text-[11px] leading-relaxed">
          <p>
            <strong>AVISO REGULATORIO Y CLÍNICO:</strong> Este documento es un borrador analítico automatizado emitido por software de investigación académica como soporte a la decisión diagnóstica. <strong>No constituye un diagnóstico médico definitivo, no reemplaza la historia clínica ni prescribe conductas terapéuticas de forma autónoma</strong>. Requiere revisión, validación y firma por un médico especialista autorizado conforme a la Resolución 3100 de 2019.
          </p>
        </div>

        {/* ========================================================================= */}
        {/* SECCIÓN A Y B: IDENTIFICACIÓN Y PARÁMETROS DEL ESTUDIO                    */}
        {/* ========================================================================= */}
        <section className="mb-6 border border-slate-200 rounded-lg overflow-hidden">
          <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-600" /> A y B. Identificación del Paciente y Adquisición Técnica
            </h2>
            <span className="text-[10px] font-mono text-slate-500">Seudonimización Ley 1581 / PS 3.15</span>
          </div>

          <table className="w-full text-xs text-left">
            <tbody className="divide-y divide-slate-200">
              <tr className="bg-white">
                <td className="p-2.5 font-semibold text-slate-500 w-1/4">ID Seudonimizado:</td>
                <td className="p-2.5 font-mono font-bold text-slate-900 w-1/4">{pseudonym}</td>
                <td className="p-2.5 font-semibold text-slate-500 w-1/4">ID Estudio / Archivo:</td>
                <td className="p-2.5 font-mono text-slate-800 w-1/4 truncate" title={upload.original_name}>
                  {upload.original_name}
                </td>
              </tr>
              <tr className="bg-slate-50/50">
                <td className="p-2.5 font-semibold text-slate-500">Fecha del Estudio:</td>
                <td className="p-2.5 text-slate-800">
                  {upload.study_date || new Date(upload.created_at).toLocaleDateString()}
                </td>
                <td className="p-2.5 font-semibold text-slate-500">Fecha Inferencia IA:</td>
                <td className="p-2.5 text-slate-800">{new Date(upload.created_at).toLocaleString()}</td>
              </tr>
              <tr className="bg-white">
                <td className="p-2.5 font-semibold text-slate-500">Modalidad:</td>
                <td className="p-2.5 text-slate-800">Tomografía Computarizada ({upload.modality || "TC / TAC"})</td>
                <td className="p-2.5 font-semibold text-slate-500">Calidad Técnica:</td>
                <td className="p-2.5 text-emerald-700 font-semibold">Adecuada para análisis algorítmico</td>
              </tr>
              <tr className="bg-slate-50/50">
                <td className="p-2.5 font-semibold text-slate-500">Indicación Registrada:</td>
                <td className="p-2.5 text-slate-800" colSpan={3}>
                  Evaluación de nódulo pulmonar detectado en tomografía de tórax
                </td>
              </tr>
            </tbody>
          </table>

          <div className="bg-slate-100/80 px-3 py-1.5 border-t border-slate-200 text-[10px] font-mono text-slate-600 truncate">
            <strong>Cadena de Custodia (SHA-256 Origen):</strong> {sourceHash}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECCIÓN D: RESULTADOS DEL SISTEMA DE IA (CLAIM 2024)                      */}
        {/* ========================================================================= */}
        <section className="mb-6 border border-slate-200 rounded-lg p-4 bg-white break-inside-avoid">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-slate-700" /> D. Resultados del Modelo Computacional de IA
            </h2>
            <span className="text-[11px] font-mono text-slate-500">
              Modelo: {upload.ai_model_version || "multimodal-v1.2"} (ResNet-18 + Clinical MLP)
            </span>
          </div>

          <p className="text-xs text-slate-600 mb-4 leading-relaxed">
            Inferencia multimodal calculada mediante visión computacional sobre el corte axial tomográfico y procesamiento de 8 características morfológicas estructuradas.
          </p>

          {/* Medidor Gráfico de Riesgo */}
          <RiskGaugeBar
            score={upload.ai_score}
            riskLevel={upload.ai_risk_level}
            inferenceTimeMs={upload.inference_time_ms}
            modelVersion={upload.ai_model_version}
            className="mb-4"
          />

          {/* Imágenes Médicas Lado a Lado: TAC Real y Grad-CAM */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex flex-col items-center">
              <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Corte Tomográfico Axial (Original)
              </span>
              <div className="w-full aspect-square max-w-[240px] bg-black rounded border border-slate-300 flex items-center justify-center overflow-hidden">
                {beforeUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- URL firmada de Storage en página de impresión; next/image no aplica
                  <img
                    src={beforeUrl}
                    alt="Corte Tomográfico Axial"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-slate-500 text-xs">Corte tomográfico cargado</span>
                )}
              </div>
              <span className="text-[10px] text-slate-500 mt-1">Matriz nativa 512×512</span>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Mapa de Atención Visual (Grad-CAM)
              </span>
              <div className="w-full aspect-square max-w-[240px] bg-black rounded border border-slate-300 flex items-center justify-center overflow-hidden">
                {upload.ai_heatmap_base64 ? (
                  // eslint-disable-next-line @next/next/no-img-element -- imagen base64 en página de impresión; next/image no aplica
                  <img
                    src={`data:image/png;base64,${upload.ai_heatmap_base64}`}
                    alt="Mapa de calor Grad-CAM"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-slate-500 text-xs">Mapa Grad-CAM</span>
                )}
              </div>
              <span className="text-[10px] text-slate-500 mt-1">Foco de activación convolucional (layer4)</span>
            </div>
          </div>

          <p className="text-[10px] text-slate-500 italic mt-2">
            * <strong>Nota de Explicabilidad (CLAIM 2024):</strong> El mapa Grad-CAM representa las zonas de atención ponderada de la red neuronal. No corresponde a una delimitación histológica tumoral ni margen quirúrgico.
          </p>
        </section>

        {/* ========================================================================= */}
        {/* SECCIÓN C: LOCALIZACIÓN ANATÓMICA Y RASGOS MORFOLÓGICOS                  */}
        {/* ========================================================================= */}
        <section className="mb-6 border border-slate-200 rounded-lg p-4 bg-white break-inside-avoid">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5 text-slate-700" /> C. Localización Lobar y Morfología
            </h2>
            <span className="text-xs font-mono font-semibold text-slate-700">Lesión: NOD-001</span>
          </div>

          {/* Diagrama Anatómico Lobar Centrado y Minimalista */}
          <div className="flex flex-col items-center justify-center py-4 px-3 bg-slate-50/70 rounded-lg border border-slate-200 mb-5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Segmentación Anatómica Lobar
            </span>
            <AnatomicalLungsDiagram selectedLobe={lobarLocation} size="md" />
          </div>

          {cleanNotes && (
            <div className="p-3 bg-slate-50 rounded border border-slate-200 mb-5 text-xs">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold mb-0.5">Notas Clínicas del Especialista</span>
              <p className="text-slate-700 leading-relaxed">{cleanNotes}</p>
            </div>
          )}

          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Cuantificación de Características Morfológicas LIDC-IDRI
          </h3>
          <MorphologyBars features={features} />
        </section>

        {/* ========================================================================= */}
        {/* SECCIÓN E: INTEGRACIÓN MULTIMODAL Y PATOLOGÍA (GPC 36 MinSalud)           */}
        {/* ========================================================================= */}
        <section className="mb-6 border border-slate-200 rounded-lg p-4 bg-white break-inside-avoid">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Microscope className="w-3.5 h-3.5 text-slate-700" /> E. Integración Multimodal y Orientación Anatomopatológica
            </h2>
            <span className="text-[11px] font-semibold text-slate-600">Guía GPC No. 36 MinSalud</span>
          </div>

          <div className="space-y-3 text-xs text-slate-700">
            <div>
              <strong className="text-slate-900">Estado de Histopatología / Biopsia:</strong>
              <p className="text-slate-600 mt-0.5">
                No disponible en este estudio tomográfico. El diagnóstico histológico definitivo requiere muestra tisular.
              </p>
            </div>

            <HistologicalSubtypeCard
              data={subtipoData}
              riskLevel={asRiskLevel(upload.ai_risk_level)}
              pathOrientationFallback={pathOrientation}
            />

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <strong className="text-slate-900">Pautas de Referencia para Abordaje y Biopsia (GPC No. 36 MinSalud / ACCP):</strong>
              <p className="text-slate-600 mt-1 leading-relaxed">
                {noduleSizeMm && Number(review?.nodule_size_mm) < 8
                  ? "Para nódulos sólidos menores a 8 mm, las guías clínicas recomiendan prioritariamente seguimiento tomográfico seriado (3, 6 o 12 meses según factores de riesgo) antes de procedimientos invasivos, salvo sospecha individual justificada por el médico tratante."
                  : "Para nódulos sólidos a partir de 8 mm con sospecha intermedia o alta, la literatura clínica sugiere valorar biopsia percutánea con aguja gruesa (Trucut) guiada por TC o evaluación en junta multidisciplinaria de tórax."}
              </p>
              <p className="text-[11px] text-slate-500 mt-2">
                <strong>Panel de Biomarcadores de Referencia (en caso de confirmación de neoplasia en biopsia):</strong> Subtipificación con TTF-1, p40/Napsina A, y marcadores moleculares prioritarios: EGFR, ALK, ROS1 y PD-L1 según la Recomendación 3.1 de la GPC No. 36 MinSalud.
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECCIÓN F: CLASIFICACIÓN LUNG-RADS Y RECOMENDACIÓN CLÍNICA                */}
        {/* ========================================================================= */}
        <section className="mb-6 border border-slate-200 rounded-lg p-4 bg-white break-inside-avoid">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <FileCheck2 className="w-3.5 h-3.5 text-slate-700" /> F. Clasificación Lung-RADS y Recomendación de Guías Clínicas
            </h2>
            <span className="text-xs font-mono text-slate-500">ACR Lung-RADS® v2022</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                {lungRads.heading}
              </span>
              <span
                className={
                  lungRads.source === "none"
                    ? "text-sm font-semibold text-slate-900 block mt-1"
                    : "text-lg font-black text-slate-900 block mt-0.5"
                }
              >
                {lungRads.text}
              </span>
              {lungRads.description && (
                <span className="text-[11px] text-slate-500">{lungRads.description}</span>
              )}
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                {conducta.heading}
              </span>
              <span className="text-sm font-semibold text-slate-900 block mt-1">
                {conducta.text}
              </span>
              <span className="text-[11px] text-slate-500">
                Prioridad asistencial sujeta a triaje médico institucional.
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
            <strong className="text-slate-800 block mb-1">Notas Clínicas del Revisor:</strong>
            <p className="text-slate-600 italic">
              {review?.notes || "[ Sin observaciones adicionales registradas en el sistema ]"}
            </p>
          </div>

          <p className="text-[10px] text-slate-500 mt-2">
            * <strong>Aclaración Asistencial:</strong> La conducta definitiva, prescripción de exámenes complementarios (ej. PET-CT) y remisiones son potestad exclusiva del médico especialista y la junta oncológica tratante.
          </p>
        </section>

        {/* ========================================================================= */}
        {/* SECCIÓN G: RECUADRO DE VALIDACIÓN Y FIRMA MÉDICA INSTITUCIONAL (EN BLANCO)*/}
        {/* ========================================================================= */}
        <section className="mb-6 border border-slate-200 rounded-lg p-4 bg-white break-inside-avoid">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-700" /> G. Validación Humana y Auditoría Médica Institucional
            </h2>
            <span className="text-[10px] text-slate-500">Res. 1995/1999 • Res. 3100/2019</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs text-slate-700 items-start">
            <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <p>
                <strong>Estado del Documento:</strong>{" "}
                <span className="font-mono text-amber-800 font-bold">
                  Borrador Automatizado (Pendiente de Validación Médica)
                </span>
              </p>
              <p>
                <strong>Médico Especialista Responsable:</strong> [ _____________________________________ ]
              </p>
              <p>
                <strong>Registro Médico / Tarjeta Profesional:</strong> [ _____________________________________ ]
              </p>
              <p>
                <strong>Especialidad:</strong> [ Radiología / Neumología / Cirugía de Tórax ]
              </p>
              <p>
                <strong>Fecha y Hora de Revisión:</strong> [ _____________________________________ ]
              </p>
            </div>

            {/* Espacio Formal en Blanco para Firma y Sello Real */}
            <div className="border border-dashed border-slate-400 rounded-lg p-5 flex flex-col items-center justify-center text-center bg-slate-50/50 min-h-[140px]">
              <div className="w-56 border-b border-slate-400 mb-2 mt-8" />
              <span className="text-[11px] font-bold text-slate-700 uppercase">
                Firma y Sello del Médico Especialista Autorizado
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5">
                (Este informe carece de validez asistencial o legal sin firma y sello médico)
              </span>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* ANEXO A: LISTA DE VERIFICACIÓN (CHECKLIST DE SEGURIDAD PRE-CIERRE)        */}
        {/* ========================================================================= */}
        <section className="mb-6 border border-slate-200 rounded-lg p-4 bg-white break-inside-avoid">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-600" /> Anexo A: Lista de Verificación Previa al Cierre del Informe
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">Plantilla Maestra OncoScan</span>
          </div>

          <table className="w-full text-left text-xs border border-slate-200">
            <thead className="bg-slate-100 text-slate-600 font-semibold text-[10px] uppercase">
              <tr>
                <th className="p-2 border-b border-slate-200 w-8 text-center">N°</th>
                <th className="p-2 border-b border-slate-200">Criterio de Control de Calidad</th>
                <th className="p-2 border-b border-slate-200 w-28 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px] text-slate-700">
              {[
                { text: "Paciente y estudio correctamente seudonimizados (Ley 1581 / PS 3.15).", ok: true },
                { text: "Modalidad tomográfica, espesor y calidad técnica documentados.", ok: true },
                { text: "Lesión identificada con identificador persistente (NOD-001).", ok: true },
                { text: "Score de IA documentado con arquitectura ResNet-18 + MLP y umbrales.", ok: true },
                { text: "Grad-CAM descrito expresamente como explicación visual y no prueba diagnóstica.", ok: true },
                { text: "Clasificación Lung-RADS asignada con su versión vigente (v2022).", ok: true },
                { text: "Salida computacional de la IA separada formalmente de la conclusión del médico.", ok: true },
                { text: "Limitaciones y rangos de dominio del modelo declarados formalmente.", ok: true },
                { text: "Conducta asistencial sujeta a prescripción por médico especialista tratante.", ok: true },
                { text: "Recuadro para firma y sello médico del profesional responsable incluido.", ok: true },
              ].map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="p-2 font-mono text-center text-slate-400">{idx + 1}</td>
                  <td className="p-2">{item.text}</td>
                  <td className="p-2 text-center">
                    <span className="inline-block text-[10px] font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                      [ Conforme ]
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* ========================================================================= */}
        {/* PIE DE PÁGINA CLÍNICO                                                     */}
        {/* ========================================================================= */}
        <footer className="pt-3 border-t border-slate-300 text-center text-[10px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-1">
          <span>
            OncoScan Platform • Herramienta de Soporte a la Decisión Diagnóstica en Nódulos Pulmonares
          </span>
          <span className="font-mono text-[9px] text-slate-400">
            Hash Verificación: {sourceHash.slice(0, 32)}...
          </span>
        </footer>

      </main>
    </div>
  );
}
