"use client";

import { useState, useEffect, useCallback, useRef, useActionState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Button, buttonVariants } from "@/components/ui/Button";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { RiskBadge, type RiskLevel } from "@/components/ui/RiskBadge";
import { Modal } from "@/components/ui/Modal";
import { BeforeAfterViewer } from "@/components/ui/BeforeAfterViewer";
import { createPatientInline, type PatientInlineState } from "../../pacientes/actions";
import { toast } from "sonner";
import {
  Upload,
  X,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Layers,
  User,
  Users,
  Eye,
  Plus,
} from "lucide-react";

type ClinicalFeatures = {
  subtlety: number;
  calcification: number;
  sphericity: number;
  margin: number;
  lobulation: number;
  spiculation: number;
  texture: number;
  malignancy: number;
};

const FEATURE_LABELS: {
  key: keyof ClinicalFeatures;
  label: string;
  description: string;
  max: number;
}[] = [
  { key: "subtlety", label: "Sutileza", description: "Qué tan evidente es el nódulo (1=muy sutil, 5=obvio)", max: 5 },
  { key: "calcification", label: "Calcificación", description: "Patrón de calcificación (1=popcorn, 6=ausente)", max: 6 },
  { key: "sphericity", label: "Esfericidad", description: "Forma del nódulo (1=lineal, 5=esférico)", max: 5 },
  { key: "margin", label: "Margen", description: "Definición del borde (1=mal definido, 5=bien definido)", max: 5 },
  { key: "lobulation", label: "Lobulación", description: "Irregularidad del contorno (1=ninguna, 5=marcada)", max: 5 },
  { key: "spiculation", label: "Espiculación", description: "Proyecciones en el borde (1=ninguna, 5=marcada)", max: 5 },
  { key: "texture", label: "Textura", description: "Densidad interna (1=vidrio esmerilado, 5=sólido)", max: 5 },
  { key: "malignancy", label: "Malignidad", description: "Sospecha clínica (1=benigno, 5=maligno)", max: 5 },
];

const DEFAULT_FEATURES: ClinicalFeatures = {
  subtlety: 3,
  calcification: 6,
  sphericity: 4,
  margin: 4,
  lobulation: 1,
  spiculation: 1,
  texture: 5,
  malignancy: 3,
};

const MAX_FILES = 20;
const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 600_000; // 10 min

type BatchItem = {
  id: string;
  original_name: string;
  upload_status: string;
  ai_score: number | null;
  ai_risk_level: string | null;
  ai_recommendation: string | null;
  ai_heatmap_base64?: string | null;
  original_signed_url?: string | null;
  ai_error: string | null;
  modality?: string | null;
  study_date?: string | null;
  patient_id_dicom?: string | null;
  created_at: string;
};

type BatchJob = {
  id: string;
  status: string;
  total_items: number;
  completed_items: number;
  failed_items: number;
  patient_mode?: string;
  batch_sequence?: number;
  created_at: string;
  completed_at: string | null;
};

type BatchResponse = {
  batch: BatchJob;
  items: BatchItem[];
};

const statusIcon = (status: string) => {
  switch (status) {
    case "ai_completed":
    case "analyzed":
      return <CheckCircle2 className="w-4 h-4 text-emerald-500" aria-hidden="true" />;
    case "ai_failed":
    case "error":
      return <XCircle className="w-4 h-4 text-slate-400" aria-hidden="true" />;
    case "processing":
      return <Loader2 className="w-4 h-4 text-brand-primary animate-spin" aria-hidden="true" />;
    case "queued":
    default:
      return <Clock className="w-4 h-4 text-slate-300" aria-hidden="true" />;
  }
};

const statusLabel = (status: string) => {
  switch (status) {
    case "ai_completed":
    case "analyzed": return "Completado";
    case "ai_failed":
    case "error": return "Fallido";
    case "processing": return "Analizando...";
    case "queued": return "En cola";
    default: return status;
  }
};

const batchStatusLabel = (status: string) => {
  switch (status) {
    case "pending": return "Pendiente";
    case "processing": return "Procesando";
    case "completed": return "Completado";
    case "partial": return "Parcial";
    case "failed": return "Fallido";
    default: return status;
  }
};

const batchStatusColor = (status: string) => {
  switch (status) {
    case "completed": return "text-emerald-700 bg-emerald-50 border-emerald-200";
    case "processing":
    case "pending": return "text-brand-primary bg-brand-primary/5 border-brand-primary/20";
    case "partial": return "text-amber-700 bg-amber-50 border-amber-200";
    case "failed": return "text-slate-600 bg-slate-50 border-slate-200";
    default: return "text-slate-600 bg-slate-50 border-slate-200";
  }
};

export default function BatchUploadPage() {
  const supabase = createClient();

  // ── State ───────────────────────────────────────────
  const [files, setFiles] = useState<File[]>([]);
  const [patientMode, setPatientMode] = useState<"single" | "multi">("single");
  const [patientId, setPatientId] = useState<string>("");
  const [caseRef, setCaseRef] = useState<string>("");
  const [patients, setPatients] = useState<{ id: string; external_id: string; display_alias: string | null }[]>([]);
  const [features, setFeatures] = useState<ClinicalFeatures>(DEFAULT_FEATURES);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Modal para nuevo paciente
  const [newPatientModalOpen, setNewPatientModalOpen] = useState(false);
  const processedPatientId = useRef<string | null>(null);
  const [modalState, modalAction, modalPending] = useActionState<PatientInlineState, FormData>(
    createPatientInline,
    {}
  );

  // Detail modal state
  const [selectedItemDetail, setSelectedItemDetail] = useState<BatchItem | null>(null);

  // Polling state
  const [batchId, setBatchId] = useState<string | null>(null);
  const [batchData, setBatchData] = useState<BatchResponse | null>(null);
  const [polling, setPolling] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartRef = useRef<number>(0);

  // ── Cargar Pacientes ──────────────────────────────────
  useEffect(() => {
    supabase
      .from("patients")
      .select("id, external_id, display_alias")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setPatients(data);
      });
  }, []);

  // ── Efecto Paciente Creado ────────────────────────────
  useEffect(() => {
    if (!modalState.patient) return;
    if (processedPatientId.current === modalState.patient.id) return;
    processedPatientId.current = modalState.patient.id;
    const p = modalState.patient;
    setPatients((prev) => (prev.some((x) => x.id === p.id) ? prev : [p, ...prev]));
    setPatientId(p.id);
    setNewPatientModalOpen(false);
    toast.success("Paciente registrado y seleccionado.");
  }, [modalState.patient]);

  // ── Handlers ──────────────────────────────────────────

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length + files.length > MAX_FILES) {
      toast.error(`Máximo ${MAX_FILES} archivos por lote.`);
      return;
    }
    setFiles((prev) => [...prev, ...selected]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).filter((f) =>
      /\.(dcm|png|jpe?g)$/i.test(f.name)
    );
    if (dropped.length + files.length > MAX_FILES) {
      toast.error(`Máximo ${MAX_FILES} archivos por lote.`);
      return;
    }
    setFiles((prev) => [...prev, ...dropped]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const fetchBatchStatus = useCallback(async (id: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) return;

    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.access_token) return;

      const resp = await fetch(`${apiUrl}/api/v1/analysis/batch/${id}`, {
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      });

      if (!resp.ok) return;
      const result: BatchResponse = await resp.json();
      setBatchData(result);

      if (["completed", "failed", "partial"].includes(result.batch.status)) {
        stopPolling();
      }
    } catch {
      // Silent retry
    }
  }, []);

  const startPolling = useCallback(
    (id: string) => {
      setPolling(true);
      pollStartRef.current = Date.now();
      fetchBatchStatus(id);

      pollRef.current = setInterval(() => {
        if (Date.now() - pollStartRef.current > POLL_TIMEOUT_MS) {
          stopPolling();
          toast.error("El análisis del lote tomó demasiado tiempo.");
          return;
        }
        fetchBatchStatus(id);
      }, POLL_INTERVAL_MS);
    },
    [fetchBatchStatus]
  );

  const stopPolling = () => {
    setPolling(false);
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleSubmit = async () => {
    if (files.length === 0) {
      setErrorMsg("Selecciona al menos un archivo.");
      return;
    }

    if (patientMode === "single" && !patientId) {
      setErrorMsg("Selecciona o registra un paciente para el lote.");
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      setErrorMsg("La URL del backend no está configurada.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session?.access_token) {
        setErrorMsg("No se pudo obtener la sesión. Recarga la página.");
        return;
      }

      const formData = new FormData();
      files.forEach((file) => formData.append("imagenes", file));
      formData.append("patient_mode", patientMode);
      if (patientMode === "single" && patientId) {
        formData.append("patient_id", patientId);
      }
      if (caseRef.trim()) {
        formData.append("case_ref", caseRef.trim());
      }

      // En modo multi se envían las features estándar por defecto
      const activeFeatures = patientMode === "multi" ? DEFAULT_FEATURES : features;
      Object.entries(activeFeatures).forEach(([key, val]) => {
        formData.append(key, String(val));
      });

      const resp = await fetch(`${apiUrl}/api/v1/analysis/batch`, {
        method: "POST",
        headers: { Authorization: `Bearer ${data.session.access_token}` },
        body: formData,
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => null);
        setErrorMsg(errData?.detail || `Error ${resp.status} creando el lote.`);
        return;
      }

      const result = await resp.json();
      setBatchId(result.batch_id);
      toast.success(`Lote creado: ${result.total_items} archivos en cola.`);
      startPolling(result.batch_id);
    } catch {
      setErrorMsg("Error de conexión con el servidor.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    stopPolling();
    setFiles([]);
    setCaseRef("");
    setFeatures(DEFAULT_FEATURES);
    setBatchId(null);
    setBatchData(null);
    setErrorMsg("");
    setSubmitting(false);
  };

  // ── Computed ─────────────────────────────────────────
  const isFinished = batchData?.batch
    ? ["completed", "failed", "partial"].includes(batchData.batch.status)
    : false;
  const progressPct = batchData?.batch
    ? Math.round(
        ((batchData.batch.completed_items + batchData.batch.failed_items) /
          batchData.batch.total_items) *
          100
      )
    : 0;

  return (
    <PageContainer maxWidth="4xl">
      <SectionHeader
        title="Análisis por lote"
        description="Sube hasta 20 tomografías (.dcm, .png, .jpg) para procesar secuencialmente con la IA."
        action={
          <Link
            href="/platform"
            className={buttonVariants({ variant: "secondary", size: "md" })}
          >
            Volver al Dashboard
          </Link>
        }
      />

      <AlertBanner
        variant="warning"
        title="OncoScan es una herramienta académica de apoyo."
        description="No es un dispositivo médico certificado y su resultado no reemplaza el juicio del especialista."
        className="mb-6"
      />

      {/* ── Formulario de subida ── */}
      {!batchId && (
        <>
          {/* Estrategia de Paciente */}
          <Card className="mb-6">
            <CardContent className="p-8">
              <h2 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
                <User className="w-5 h-5 text-brand-primary" />
                Atribución de Pacientes
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                Selecciona si los cortes del lote corresponden a un único paciente o a pacientes múltiples.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <button
                  type="button"
                  onClick={() => setPatientMode("single")}
                  className={`p-4 rounded-xl border-2 text-left transition-all flex items-start gap-3 ${
                    patientMode === "single"
                      ? "border-brand-primary bg-brand-primary/5 text-slate-800"
                      : "border-slate-200 bg-white hover:border-slate-300 text-slate-600"
                  }`}
                >
                  <User className={`w-5 h-5 mt-0.5 ${patientMode === "single" ? "text-brand-primary" : "text-slate-400"}`} />
                  <div>
                    <p className="font-bold text-sm">Un solo paciente</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Todas las imágenes pertenecen al mismo paciente/estudio.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPatientMode("multi")}
                  className={`p-4 rounded-xl border-2 text-left transition-all flex items-start gap-3 ${
                    patientMode === "multi"
                      ? "border-brand-primary bg-brand-primary/5 text-slate-800"
                      : "border-slate-200 bg-white hover:border-slate-300 text-slate-600"
                  }`}
                >
                  <Users className={`w-5 h-5 mt-0.5 ${patientMode === "multi" ? "text-brand-primary" : "text-slate-400"}`} />
                  <div>
                    <p className="font-bold text-sm">Pacientes Múltiples</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Se asignará un código secuencial (ej. <code>batch_001_1</code>, <code>batch_001_2</code>).
                    </p>
                  </div>
                </button>
              </div>

              {/* Selector de Paciente si es Single Mode */}
              {patientMode === "single" && (
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl mb-4">
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-semibold text-slate-700">
                      Seleccionar Paciente <span className="text-brand-danger">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        processedPatientId.current = null;
                        setNewPatientModalOpen(true);
                      }}
                      className="text-xs font-semibold text-brand-primary hover:text-brand-primary-hover hover:underline transition-colors"
                    >
                      + Registrar paciente
                    </button>
                  </div>
                  <select
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 focus:border-brand-primary outline-none"
                  >
                    <option value="">-- Selecciona un paciente --</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.display_alias ? `${p.display_alias} (${p.external_id})` : p.external_id}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Referencia del caso */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Referencia del caso <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={caseRef}
                  onChange={(e) => setCaseRef(e.target.value)}
                  placeholder="Ej. Lote-Tórax-2026, Caso-Screening-01..."
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:border-brand-primary outline-none transition-all"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Referencia interna para identificar el lote en el historial.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Modal para Registrar Paciente */}
          <Modal
            open={newPatientModalOpen}
            onClose={() => setNewPatientModalOpen(false)}
            title="Registrar paciente"
            description="Crea un nuevo paciente para asociarlo a este estudio."
          >
            <form key={String(newPatientModalOpen)} action={modalAction} className="space-y-4">
              <div>
                <label htmlFor="batch-modal-external-id" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Código de paciente <span className="text-brand-danger">*</span>
                </label>
                <input
                  id="batch-modal-external-id"
                  name="external_id"
                  type="text"
                  required
                  maxLength={100}
                  placeholder="Ej: CT-001, PAC-2026-001"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Código interno único para identificar a este paciente.
                </p>
              </div>
              <div>
                <label htmlFor="batch-modal-display-alias" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Alias o descripción <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <input
                  id="batch-modal-display-alias"
                  name="display_alias"
                  type="text"
                  maxLength={200}
                  placeholder="Ej: Paciente Tórax Estudio 2026"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all"
                />
              </div>
              <div>
                <label htmlFor="batch-modal-notes" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Notas clínicas <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <textarea
                  id="batch-modal-notes"
                  name="notes"
                  rows={3}
                  maxLength={1000}
                  placeholder="Notas adicionales sobre el caso..."
                  className="w-full resize-none rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all"
                />
              </div>

              {modalState.error && (
                <AlertBanner
                  variant="error"
                  title="No se pudo registrar el paciente"
                  description={modalState.error}
                />
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setNewPatientModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={modalPending}
                >
                  {modalPending ? "Registrando..." : "Registrar"}
                </Button>
              </div>
            </form>
          </Modal>

          {/* Drop zone */}
          <Card>
            <CardContent className="p-8">
              <h2 className="text-lg font-bold text-slate-800 mb-1">
                Archivos DICOM / Imágenes CT
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                Arrastra o selecciona hasta {MAX_FILES} archivos DICOM (<code>.dcm</code>) o imágenes (<code>.png</code>, <code>.jpg</code>).
              </p>

              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:border-brand-primary/50 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto mb-3" aria-hidden="true" />
                <p className="text-sm text-slate-500 mb-3">
                  Arrastra archivos DICOM o imágenes aquí
                </p>
                <label className="inline-block">
                  <input
                    type="file"
                    accept=".dcm,.png,.jpg,.jpeg"
                    multiple
                    onChange={handleFilesChange}
                    className="sr-only"
                  />
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-primary/10 text-brand-primary text-sm font-semibold hover:bg-brand-primary/20 transition-colors cursor-pointer">
                    <Upload className="w-4 h-4" aria-hidden="true" />
                    Seleccionar archivos (.dcm, .png, .jpg)
                  </span>
                </label>
              </div>

              {/* File list */}
              {files.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-slate-700">
                      {files.length} archivo{files.length !== 1 ? "s" : ""} seleccionado{files.length !== 1 ? "s" : ""}
                    </p>
                    <button
                      type="button"
                      onClick={() => setFiles([])}
                      className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      Limpiar todo
                    </button>
                  </div>
                  <div className="grid gap-2 max-h-48 overflow-y-auto pr-1">
                    {files.map((file, i) => (
                      <div
                        key={`${file.name}-${i}`}
                        className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-4 py-2.5 text-sm"
                      >
                        <div className="flex items-center gap-2 truncate max-w-[70%]">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase border bg-slate-200 text-slate-700">
                            {file.name.endsWith(".dcm") ? "DICOM" : "IMG"}
                          </span>
                          <span className="truncate text-slate-700 font-medium">
                            {file.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-400">
                            {(file.size / 1024).toFixed(0)} KB
                          </span>
                          <button
                            type="button"
                            onClick={() => removeFile(i)}
                            className="text-slate-300 hover:text-slate-500 transition-colors"
                            aria-label={`Quitar ${file.name}`}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-amber-600 mt-4 font-medium">
                ⚠️ Solo compatible con tomografías de tórax (CT). Otros tipos producirán resultados no válidos.
              </p>
            </CardContent>
          </Card>

          {/* Features clínicas (Solo para Un solo paciente) */}
          {patientMode === "single" ? (
            <Card className="mt-6">
              <CardContent className="p-8">
                <h2 className="text-lg font-bold text-slate-800 mb-1">
                  Parámetros radiológicos
                </h2>
                <p className="text-sm text-slate-500 mb-6">
                  Estas features se aplicarán a <strong>todas</strong> las imágenes del lote.
                </p>

                <div className="grid gap-6 md:grid-cols-2">
                  {FEATURE_LABELS.map(({ key, label, description, max }) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        {label}
                        <span className="ml-2 text-xs font-normal text-slate-400">
                          (valor: {features[key]})
                        </span>
                      </label>
                      <input
                        type="range"
                        min={1}
                        max={max}
                        step={1}
                        value={features[key]}
                        onChange={(e) =>
                          setFeatures((prev) => ({
                            ...prev,
                            [key]: Number(e.target.value),
                          }))
                        }
                        className="w-full accent-brand-primary"
                      />
                      <p className="text-xs text-slate-400 mt-1">{description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-600 text-xs flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-700 text-sm mb-1">
                  Parámetros Radiológicos Estándar
                </p>
                <p>
                  En modo <strong>Pacientes Múltiples</strong> se aplican automáticamente los valores estándar de referencia clínica (LIDC-IDRI baseline) para cada estudio.
                </p>
              </div>
              <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[11px] font-semibold text-slate-600">
                Baseline LIDC-IDRI
              </span>
            </div>
          )}

          {/* Errors + Submit */}
          {errorMsg && (
            <div className="mt-6">
              <AlertBanner
                variant="error"
                title="Error al crear el lote"
                description={errorMsg}
              />
            </div>
          )}

          <Button
            onClick={handleSubmit}
            variant="primary"
            size="lg"
            loading={submitting}
            disabled={files.length === 0}
            className="mt-6 w-full"
          >
            {submitting
              ? "Creando lote..."
              : `Analizar ${files.length} archivo${files.length !== 1 ? "s" : ""} con IA`}
          </Button>
        </>
      )}

      {/* ── Progreso del lote ── */}
      {batchId && (
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Layers className="w-6 h-6 text-brand-primary" aria-hidden="true" />
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    Lote {batchData?.batch.batch_sequence ? `batch_${String(batchData.batch.batch_sequence).padStart(3, "0")}` : ""} en progreso
                  </h2>
                  {batchData?.batch && (
                    <p className="text-sm text-slate-500">
                      {batchData.batch.completed_items + batchData.batch.failed_items} / {batchData.batch.total_items} procesadas
                    </p>
                  )}
                </div>
              </div>
              {batchData?.batch && (
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${batchStatusColor(
                    batchData.batch.status
                  )}`}
                >
                  {batchStatusLabel(batchData.batch.status)}
                </span>
              )}
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-100 rounded-full h-3 mb-6 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${progressPct}%`,
                  background:
                    batchData?.batch.status === "failed"
                      ? "#94a3b8"
                      : batchData?.batch.status === "partial"
                      ? "#f59e0b"
                      : "#012641",
                }}
              />
            </div>

            {/* Items list */}
            {batchData?.items && batchData.items.length > 0 && (
              <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                {batchData.items.map((item) => {
                  const isCompleted = item.upload_status === "ai_completed" || item.upload_status === "analyzed";
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-4 py-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {statusIcon(item.upload_status)}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate max-w-[200px]">
                            {item.original_name}
                          </p>
                          {item.patient_id_dicom && (
                            <p className="text-xs text-slate-400 font-mono">
                              {item.patient_id_dicom}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {isCompleted && item.ai_score !== null && (
                          <span className="text-sm font-bold text-slate-700">
                            {(item.ai_score * 100).toFixed(1)}%
                          </span>
                        )}
                        {isCompleted && (
                          <RiskBadge level={item.ai_risk_level as RiskLevel | null} />
                        )}
                        {isCompleted && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setSelectedItemDetail(item)}
                            className="flex items-center gap-1 py-1 px-2.5 text-xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Ver detalle
                          </Button>
                        )}
                        {!isCompleted && (
                          <span className="text-xs text-slate-400">
                            {statusLabel(item.upload_status)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Summary for completed batches */}
            {isFinished && batchData?.batch && (
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">
                    Completadas
                  </p>
                  <p className="text-2xl font-bold text-emerald-700">
                    {batchData.batch.completed_items}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Fallidas
                  </p>
                  <p className="text-2xl font-bold text-slate-700">
                    {batchData.batch.failed_items}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Total
                  </p>
                  <p className="text-2xl font-bold text-slate-700">
                    {batchData.batch.total_items}
                  </p>
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <p className="mt-6 text-xs text-slate-400">
              ⚠️ Estos resultados son de apoyo diagnóstico y no reemplazan el criterio del especialista.
            </p>

            {isFinished && (
              <Button
                onClick={handleReset}
                variant="secondary"
                size="md"
                className="mt-6"
              >
                Crear otro lote
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Modal de Detalle por Ítem ── */}
      {selectedItemDetail && (
        <Modal
          open={!!selectedItemDetail}
          onClose={() => setSelectedItemDetail(null)}
          title={`Detalle de Análisis — ${selectedItemDetail.original_name}`}
        >
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <p className="text-xs text-slate-400">Paciente / Ref</p>
                <p className="text-sm font-bold text-slate-700 font-mono">
                  {selectedItemDetail.patient_id_dicom || "N/A"}
                </p>
              </div>
              <RiskBadge level={selectedItemDetail.ai_risk_level as RiskLevel | null} />
            </div>

            {selectedItemDetail.ai_score !== null && (
              <div className="bg-slate-50 border p-3 rounded-xl flex items-center justify-between">
                <span className="text-sm text-slate-600 font-medium">Probabilidad de Sospecha:</span>
                <span className="text-lg font-bold text-slate-800">
                  {(selectedItemDetail.ai_score * 100).toFixed(1)}%
                </span>
              </div>
            )}

            {selectedItemDetail.ai_recommendation && (
              <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-xl text-xs text-blue-900">
                <p className="font-bold mb-0.5">Recomendación Clínica:</p>
                <p>{selectedItemDetail.ai_recommendation}</p>
              </div>
            )}

            {selectedItemDetail.ai_heatmap_base64 && selectedItemDetail.original_signed_url && (
              <div className="pt-2">
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Mapa Térmico (Grad-CAM) vs Original
                </p>
                <BeforeAfterViewer
                  beforeUrl={selectedItemDetail.original_signed_url}
                  heatmapBase64={selectedItemDetail.ai_heatmap_base64}
                />
              </div>
            )}

            <div className="flex justify-end pt-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedItemDetail(null)}
              >
                Cerrar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </PageContainer>
  );
}
