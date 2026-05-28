"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Button, buttonVariants } from "@/components/ui/Button";
import { AlertBanner } from "@/components/ui/AlertBanner";

type UploadResponse = {
    message: string;
    dicom_id: string;
    user_id: string;
    filename: string;
    storage_path: string;
    modality: string | null;
    study_date: string | null;
    patient_id_dicom: string | null;
};

type AnalysisResult = {
    dicom_id: string;
    score: number;
    nivel_riesgo: string;
    recomendacion: string;
    modelo_version: string;
};

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

const FEATURE_LABELS: { key: keyof ClinicalFeatures; label: string; description: string }[] = [
    { key: "subtlety",      label: "Sutileza",       description: "Qué tan evidente es el nódulo (1=muy sutil, 5=obvio)" },
    { key: "calcification", label: "Calcificación",  description: "Patrón de calcificación (1=popcorn, 6=ausente)" },
    { key: "sphericity",    label: "Esfericidad",    description: "Forma del nódulo (1=lineal, 5=esférico)" },
    { key: "margin",        label: "Margen",         description: "Definición del borde (1=mal definido, 5=bien definido)" },
    { key: "lobulation",    label: "Lobulación",     description: "Irregularidad del contorno (1=ninguna, 5=marcada)" },
    { key: "spiculation",   label: "Espiculación",   description: "Proyecciones en el borde (1=ninguna, 5=marcada)" },
    { key: "texture",       label: "Textura",        description: "Densidad interna (1=vidrio esmerilado, 5=sólido)" },
    { key: "malignancy",    label: "Malignidad",     description: "Sospecha clínica (1=benigno, 5=maligno)" },
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

const riskColor = (nivel: string) => {
    if (nivel === "ALTO")  return "text-brand-danger bg-brand-danger/10 border-brand-danger/20";
    if (nivel === "MEDIO") return "text-amber-700 bg-amber-50 border-amber-200";
    return "text-emerald-700 bg-emerald-50 border-emerald-200";
};

export default function UploadDicomPage() {
    const supabase = createClient();

    const [file, setFile]               = useState<File | null>(null);
    const [caseRef, setCaseRef]         = useState("");
    const [patientId, setPatientId]     = useState("");
    const [patients, setPatients]       = useState<{ id: string; external_id: string; display_alias: string | null }[]>([]);
    const [loading, setLoading]         = useState(false);
    const [analyzing, setAnalyzing]     = useState(false);
    const [errorMsg, setErrorMsg]       = useState("");
    const [successData, setSuccessData] = useState<UploadResponse | null>(null);
    const [features, setFeatures]       = useState<ClinicalFeatures>(DEFAULT_FEATURES);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

    useEffect(() => {
        supabase.from("patients").select("id, external_id, display_alias").order("created_at", { ascending: false })
            .then(({ data }) => { if (data) setPatients(data); });
    }, []);

    const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs: number) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            return await fetch(url, { ...options, signal: controller.signal });
        } finally {
            clearTimeout(timer);
        }
    };

    const parseErrorResponse = async (response: Response, fallback: string): Promise<string> => {
        try {
            const data = await response.json();
            return typeof data?.detail === "string" ? data.detail : fallback;
        } catch {
            return fallback;
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg("");
        setSuccessData(null);
        setAnalysisResult(null);

        if (!file) {
            setErrorMsg("Debes seleccionar un archivo.");
            return;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        if (!apiUrl) {
            setErrorMsg("La URL del backend no está configurada. Contacta al equipo de operaciones.");
            return;
        }

        setLoading(true);

        try {
            const { data, error } = await supabase.auth.getSession();
            if (error || !data.session?.access_token) {
                setErrorMsg("No se pudo obtener la sesión. Por favor recarga la página.");
                return;
            }

            const formData = new FormData();
            formData.append("file", file);
            if (caseRef.trim()) {
                formData.append("case_ref", caseRef.trim());
            }
            if (patientId) {
                formData.append("patient_id", patientId);
            }

            const response = await fetchWithTimeout(
                `${apiUrl}/api/v1/dicom/upload`,
                {
                    method: "POST",
                    headers: { Authorization: `Bearer ${data.session.access_token}` },
                    body: formData,
                },
                60_000,
            );

            if (!response.ok) {
                setErrorMsg(await parseErrorResponse(response, `Error ${response.status} subiendo el archivo.`));
                return;
            }

            const result = await response.json();
            setSuccessData(result);
            setFile(null);
        } catch (err) {
            if (err instanceof DOMException && err.name === "AbortError") {
                setErrorMsg("El servidor no respondió a tiempo. Verifica tu conexión o intenta más tarde.");
            } else {
                setErrorMsg("No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleAnalyze = async () => {
        if (!successData?.dicom_id) return;

        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        if (!apiUrl) {
            setErrorMsg("La URL del backend no está configurada. Contacta al equipo de operaciones.");
            return;
        }

        setAnalyzing(true);
        setErrorMsg("");

        try {
            const { data } = await supabase.auth.getSession();
            if (!data.session?.access_token) {
                setErrorMsg("Sesión expirada. Por favor recarga la página.");
                return;
            }

            const response = await fetchWithTimeout(
                `${apiUrl}/api/v1/dicom/analyze/${successData.dicom_id}`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${data.session.access_token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(features),
                },
                150_000,
            );

            if (!response.ok) {
                setErrorMsg(await parseErrorResponse(response, `Error ${response.status} al analizar el DICOM.`));
                return;
            }

            const result = await response.json();
            setAnalysisResult(result);
        } catch (err) {
            if (err instanceof DOMException && err.name === "AbortError") {
                setErrorMsg("El análisis tomó demasiado tiempo. El modelo puede estar en cold-start, intenta de nuevo en un minuto.");
            } else {
                setErrorMsg("Error de conexión al analizar. Intenta de nuevo.");
            }
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <PageContainer maxWidth="4xl">
            <SectionHeader
                title="Subir estudio para análisis IA"
                description="Carga un archivo DICOM (.dcm) o imagen (.png/.jpg). El modelo evaluará el estudio y devolverá score y nivel de riesgo oncológico."
                action={
                    <Link
                        href="/platform"
                        className={buttonVariants({ variant: "secondary", size: "md" })}
                    >
                        Cancelar y Volver
                    </Link>
                }
            />

            <AlertBanner
                variant="warning"
                title="OncoScan es una herramienta académica de apoyo."
                description="No es un dispositivo médico certificado y su resultado no reemplaza el juicio del especialista."
                className="mb-6"
            />

            {/* PASO 1: Upload */}
            <Card>
                <CardContent className="p-8">
                    <form onSubmit={handleUpload} className="space-y-6">

                        {/* Paciente asociado */}
                        {patients.length > 0 && (
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    Paciente <span className="text-slate-400 font-normal">(opcional)</span>
                                </label>
                                <select
                                    value={patientId}
                                    onChange={(e) => setPatientId(e.target.value)}
                                    className="block w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all"
                                >
                                    <option value="">Sin paciente asociado</option>
                                    {patients.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.display_alias ? `${p.display_alias} (${p.external_id})` : p.external_id}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-slate-400 mt-1">
                                    Asociar el estudio a un paciente para agrupar sus análisis.
                                </p>
                            </div>
                        )}

                        {/* Referencia del caso */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                Referencia del caso <span className="text-slate-400 font-normal">(opcional)</span>
                            </label>
                            <input
                                type="text"
                                value={caseRef}
                                onChange={(e) => setCaseRef(e.target.value)}
                                placeholder="Ej: Caso-001, Paciente-Juan, Estudio-Tórax-2026..."
                                className="block w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all"
                            />
                            <p className="text-xs text-slate-400 mt-1">
                                Referencia interna para identificar el caso en el historial.
                            </p>
                        </div>

                        {/* Archivo */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                Archivo DICOM o imagen
                            </label>
                            <input
                                type="file"
                                accept=".dcm,.png,.jpg,.jpeg,application/dicom,image/png,image/jpeg"
                                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                                className="block w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-brand-primary/10 file:text-brand-primary hover:file:bg-brand-primary/20 transition-all font-medium focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none"
                            />
                            <p className="text-xs text-slate-500 mt-2">
                                Formatos compatibles: DICOM (.dcm), PNG y JPG. Tamaño máximo: 50MB.
                            </p>
                            <p className="text-xs text-amber-600 mt-1 font-medium">
                                ⚠️ Solo compatible con tomografías de tórax (Modality: CT). Otros tipos (OT, MR, CR, etc.) producirán resultados no válidos.
                            </p>
                        </div>

                        <Button
                            type="submit"
                            variant="primary"
                            size="lg"
                            loading={loading}
                            disabled={!!successData}
                        >
                            {loading ? "Procesando archivo..." : "Subir DICOM"}
                        </Button>
                    </form>

                    {errorMsg && (
                        <div className="mt-6">
                            <AlertBanner
                                variant="error"
                                title="No pudimos procesar el archivo"
                                description={errorMsg}
                            />
                        </div>
                    )}

                    {/* Confirmación upload */}
                    {successData && !analysisResult && (
                        <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
                            <h2 className="text-lg font-bold text-emerald-800 border-b border-emerald-200 pb-3 mb-4">
                                Carga procesada exitosamente
                            </h2>
                            <div className="grid gap-4 text-sm text-slate-700 md:grid-cols-2">
                                {caseRef && (
                                    <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm md:col-span-2">
                                        <span className="block text-xs font-bold text-emerald-600 mb-1 uppercase tracking-wider">Referencia del caso</span>
                                        <span className="font-medium">{caseRef}</span>
                                    </div>
                                )}
                                <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm">
                                    <span className="block text-xs font-bold text-emerald-600 mb-1 uppercase tracking-wider">Archivo</span>
                                    <span className="font-medium truncate">{successData.filename}</span>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm">
                                    <span className="block text-xs font-bold text-emerald-600 mb-1 uppercase tracking-wider">Modalidad</span>
                                    <span className="font-medium">{successData.modality ?? "N/D"}</span>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm">
                                    <span className="block text-xs font-bold text-emerald-600 mb-1 uppercase tracking-wider">Fecha de estudio</span>
                                    <span className="font-medium">{successData.study_date ?? "N/D"}</span>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm">
                                    <span className="block text-xs font-bold text-emerald-600 mb-1 uppercase tracking-wider">Patient ID</span>
                                    <span className="font-medium">{successData.patient_id_dicom ?? "N/D"}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* PASO 2: Formulario features clínicas */}
            {successData && !analysisResult && (
                <Card className="mt-6">
                    <CardContent className="p-8">
                        <h2 className="text-lg font-bold text-slate-800 mb-1">
                            Parámetros radiológicos
                        </h2>
                        <p className="text-sm text-slate-500 mb-6">
                            Ingresa las 8 características clínicas del nódulo para el análisis IA.
                        </p>

                        <div className="grid gap-6 md:grid-cols-2">
                            {FEATURE_LABELS.map(({ key, label, description }) => (
                                <div key={key}>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        {label}
                                        <span className="ml-2 text-xs font-normal text-slate-400">
                                            (valor actual: {features[key]})
                                        </span>
                                    </label>
                                    <input
                                        type="range"
                                        min={1}
                                        max={key === "calcification" ? 6 : 5}
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

                        <Button
                            onClick={handleAnalyze}
                            variant="primary"
                            size="lg"
                            loading={analyzing}
                            className="mt-8 w-full"
                        >
                            {analyzing ? "Analizando con IA... (puede tardar hasta 2 min)" : "Analizar con IA"}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* PASO 3: Resultado */}
            {analysisResult && (
                <Card className="mt-6">
                    <CardContent className="p-8">
                        <h2 className="text-lg font-bold text-slate-800 mb-6">
                            Resultado del análisis IA
                        </h2>

                        <div className="grid gap-4 md:grid-cols-3 mb-6">
                            <div className={`rounded-xl border p-5 text-center ${riskColor(analysisResult.nivel_riesgo)}`}>
                                <p className="text-xs font-bold uppercase tracking-wider mb-1">Nivel de riesgo</p>
                                <p className="text-3xl font-bold">{analysisResult.nivel_riesgo}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Score IA</p>
                                <p className="text-3xl font-bold text-slate-800">
                                    {(analysisResult.score * 100).toFixed(1)}%
                                </p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Modelo</p>
                                <p className="text-sm font-semibold text-slate-700 mt-2">
                                    {analysisResult.modelo_version}
                                </p>
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                                Recomendación clínica
                            </p>
                            <p className="text-slate-700 font-medium">{analysisResult.recomendacion}</p>
                        </div>

                        <p className="mt-4 text-xs text-slate-400">
                            ⚠️ Este resultado es de apoyo diagnóstico y no reemplaza el criterio del especialista.
                        </p>

                        <Button
                            onClick={() => {
                                setSuccessData(null);
                                setAnalysisResult(null);
                                setFeatures(DEFAULT_FEATURES);
                                setCaseRef("");
                                setPatientId("");
                                setErrorMsg("");
                            }}
                            variant="secondary"
                            size="md"
                            className="mt-6"
                        >
                            Subir otro DICOM
                        </Button>
                    </CardContent>
                </Card>
            )}
        </PageContainer>
    );
}