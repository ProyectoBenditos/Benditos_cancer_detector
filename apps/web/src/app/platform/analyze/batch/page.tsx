"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Button, buttonVariants } from "@/components/ui/Button";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { RiskBadge, type RiskLevel } from "@/components/ui/RiskBadge";
import { toast } from "sonner";
import {
  Upload,
  X,
  ImagePlus,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Layers,
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
  ai_error: string | null;
  created_at: string;
};

type BatchJob = {
  id: string;
  status: string;
  total_items: number;
  completed_items: number;
  failed_items: number;
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
      return <CheckCircle2 className="w-4 h-4 text-emerald-500" aria-hidden="true" />;
    case "ai_failed":
      return <XCircle className="w-4 h-4 text-slate-400" aria-hidden="true" />;
    case "processing":
      return <Loader2 className="w-4 h-4 text-brand-primary animate-spin" aria-hidden="true" />;
    case "queued":
      return <Clock className="w-4 h-4 text-slate-300" aria-hidden="true" />;
    default:
      return <Clock className="w-4 h-4 text-slate-300" aria-hidden="true" />;
  }
};

const statusLabel = (status: string) => {
  switch (status) {
    case "ai_completed": return "Completado";
    case "ai_failed": return "Fallido";
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
  const [features, setFeatures] = useState<ClinicalFeatures>(DEFAULT_FEATURES);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Polling state
  const [batchId, setBatchId] = useState<string | null>(null);
  const [batchData, setBatchData] = useState<BatchResponse | null>(null);
  const [polling, setPolling] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartRef = useRef<number>(0);

  // ── Handlers ──────────────────────────────────────────

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length + files.length > MAX_FILES) {
      toast.error(`Máximo ${MAX_FILES} imágenes por lote.`);
      return;
    }
    setFiles((prev) => [...prev, ...selected]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).filter((f) =>
      /\.(png|jpe?g)$/i.test(f.name)
    );
    if (dropped.length + files.length > MAX_FILES) {
      toast.error(`Máximo ${MAX_FILES} imágenes por lote.`);
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

      // Detener polling si ya terminó
      if (["completed", "failed", "partial"].includes(result.batch.status)) {
        stopPolling();
      }
    } catch {
      // Silent — el polling reintentará
    }
  }, []);

  const startPolling = useCallback((id: string) => {
    setPolling(true);
    pollStartRef.current = Date.now();

    // Fetch inmediato
    fetchBatchStatus(id);

    pollRef.current = setInterval(() => {
      if (Date.now() - pollStartRef.current > POLL_TIMEOUT_MS) {
        stopPolling();
        toast.error("El análisis del lote tomó demasiado tiempo. Recarga la página para verificar el estado.");
        return;
      }
      fetchBatchStatus(id);
    }, POLL_INTERVAL_MS);
  }, [fetchBatchStatus]);

  const stopPolling = () => {
    setPolling(false);
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleSubmit = async () => {
    if (files.length === 0) {
      setErrorMsg("Selecciona al menos una imagen.");
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

      // Append features
      Object.entries(features).forEach(([key, val]) => {
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
      toast.success(`Lote creado: ${result.total_items} imágenes en cola.`);
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

  // ── Render ────────────────────────────────────────────

  return (
    <PageContainer maxWidth="4xl">
      <SectionHeader
        title="Análisis por lote"
        description="Sube hasta 20 imágenes CT para analizar con el modelo IA. Las features clínicas se aplican a todo el lote."
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
          {/* Drop zone */}
          <Card>
            <CardContent className="p-8">
              <h2 className="text-lg font-bold text-slate-800 mb-1">
                Imágenes CT
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                Arrastra o selecciona hasta {MAX_FILES} imágenes PNG/JPG de tomografías de tórax.
              </p>

              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:border-brand-primary/50 transition-colors cursor-pointer"
              >
                <ImagePlus className="w-10 h-10 text-slate-300 mx-auto mb-3" aria-hidden="true" />
                <p className="text-sm text-slate-500 mb-3">
                  Arrastra imágenes aquí o haz clic para seleccionar
                </p>
                <label className="inline-block">
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg"
                    multiple
                    onChange={handleFilesChange}
                    className="sr-only"
                  />
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-primary/10 text-brand-primary text-sm font-semibold hover:bg-brand-primary/20 transition-colors cursor-pointer">
                    <Upload className="w-4 h-4" aria-hidden="true" />
                    Seleccionar archivos
                  </span>
                </label>
              </div>

              {/* File list */}
              {files.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-slate-700">
                      {files.length} imagen{files.length !== 1 ? "es" : ""} seleccionada{files.length !== 1 ? "s" : ""}
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
                        <span className="truncate text-slate-700 font-medium max-w-[70%]">
                          {file.name}
                        </span>
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

          {/* Features clínicas */}
          <Card className="mt-6">
            <CardContent className="p-8">
              <h2 className="text-lg font-bold text-slate-800 mb-1">
                Parámetros radiológicos
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                Estas features se aplicarán a <strong>todas</strong> las imágenes del lote.
                Ideales cuando son cortes del mismo nódulo/paciente.
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
              : `Analizar ${files.length} imagen${files.length !== 1 ? "es" : ""} con IA`}
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
                    Lote en progreso
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
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {batchData.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-4 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {statusIcon(item.upload_status)}
                      <span className="text-sm font-medium text-slate-700 truncate max-w-[200px]">
                        {item.original_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      {item.upload_status === "ai_completed" && item.ai_score !== null && (
                        <span className="text-sm font-bold text-slate-700">
                          {(item.ai_score * 100).toFixed(1)}%
                        </span>
                      )}
                      {item.upload_status === "ai_completed" && (
                        <RiskBadge level={item.ai_risk_level as RiskLevel | null} />
                      )}
                      {item.upload_status === "ai_failed" && (
                        <span className="text-xs text-slate-400">
                          {statusLabel(item.upload_status)}
                        </span>
                      )}
                      {(item.upload_status === "processing" || item.upload_status === "queued") && (
                        <span className="text-xs text-slate-400">
                          {statusLabel(item.upload_status)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
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
    </PageContainer>
  );
}
