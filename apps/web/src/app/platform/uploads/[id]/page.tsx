import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

type PageProps = {
    params: Promise<{ id: string }>;
};

function RiskBadge({ level }: { level: string | null }) {
    if (!level) return null;
    const styles: Record<string, string> = {
        ALTO:  "bg-red-500/20 text-red-400 border-red-500/30",
        MEDIO: "bg-amber-500/20 text-amber-400 border-amber-500/30",
        BAJO:  "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    };
    return (
        <span className={`px-3 py-1 rounded-lg text-sm font-bold border ${styles[level] ?? "bg-slate-700 text-slate-300"}`}>
            {level}
        </span>
    );
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
            <span className="text-sm font-medium text-slate-200">{value ?? "N/D"}</span>
        </div>
    );
}

export default async function UploadDetailPage({ params }: PageProps) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: upload, error } = await supabase
        .from("dicom_uploads")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !upload) notFound();

    const isAnalyzed = upload.upload_status === "analyzed";
    const hasError   = upload.upload_status === "error";

    return (
        <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
            <div className="mx-auto max-w-4xl space-y-6">

                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-sky-400 mb-1">
                            Detalle de carga
                        </p>
                        <h1 className="text-3xl font-bold text-white">{upload.original_name}</h1>
                        <p className="mt-2 text-slate-400 text-sm">
                            Registro completo del estudio y resultado del análisis IA.
                        </p>
                    </div>
                    <Link
                        href="/platform/uploads"
                        className="shrink-0 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
                    >
                        ← Volver al historial
                    </Link>
                </div>

                {/* Resultado IA — solo si fue analizado */}
                {isAnalyzed && (
                    <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                        <h2 className="text-base font-bold text-white mb-5 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-sky-400 inline-block"></span>
                            Resultado del análisis IA
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                            {/* Nivel de riesgo */}
                            <div className={`rounded-xl border p-5 text-center ${
                                upload.ai_risk_level === "ALTO"  ? "bg-red-500/10 border-red-500/30" :
                                upload.ai_risk_level === "MEDIO" ? "bg-amber-500/10 border-amber-500/30" :
                                "bg-emerald-500/10 border-emerald-500/30"
                            }`}>
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                                    Nivel de riesgo
                                </p>
                                <p className={`text-3xl font-bold ${
                                    upload.ai_risk_level === "ALTO"  ? "text-red-400" :
                                    upload.ai_risk_level === "MEDIO" ? "text-amber-400" :
                                    "text-emerald-400"
                                }`}>
                                    {upload.ai_risk_level}
                                </p>
                            </div>

                            {/* Score */}
                            <div className="rounded-xl border border-slate-700 bg-slate-800 p-5 text-center">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                                    Score IA
                                </p>
                                <p className="text-3xl font-bold text-white">
                                    {upload.ai_score != null
                                        ? `${(upload.ai_score * 100).toFixed(1)}%`
                                        : "N/D"}
                                </p>
                            </div>

                            {/* Modelo */}
                            <div className="rounded-xl border border-slate-700 bg-slate-800 p-5 text-center">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                                    Modelo
                                </p>
                                <p className="text-sm font-semibold text-sky-300 mt-2">
                                    {upload.ai_model_version ?? "N/D"}
                                </p>
                            </div>
                        </div>

                        {/* Recomendación */}
                        <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                                Recomendación clínica
                            </p>
                            <p className="text-slate-200 font-medium">{upload.ai_recommendation ?? "N/D"}</p>
                        </div>

                        {/* Procesado */}
                        {upload.ai_processed_at && (
                            <p className="text-xs text-slate-600 mt-3">
                                Analizado el {new Date(upload.ai_processed_at).toLocaleString()}
                            </p>
                        )}

                        <p className="text-xs text-slate-600 mt-2">
                            ⚠️ Resultado de apoyo diagnóstico — no reemplaza el criterio del especialista.
                        </p>
                    </div>
                )}

                {/* Error de análisis */}
                {hasError && upload.ai_error && (
                    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
                        <h2 className="text-sm font-bold text-red-400 mb-2">Error en el análisis IA</h2>
                        <p className="text-xs text-red-300 font-mono">{upload.ai_error}</p>
                    </div>
                )}

                {/* Sin análisis */}
                {!isAnalyzed && !hasError && (
                    <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6 text-center">
                        <p className="text-slate-400 text-sm mb-4">Este archivo aún no ha sido analizado con IA.</p>
                        <Link
                            href="/platform/upload"
                            className="inline-flex items-center rounded-xl bg-sky-600 hover:bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors"
                        >
                            Ir a subir y analizar
                        </Link>
                    </div>
                )}

                {/* Info del archivo */}
                <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                    <h2 className="text-base font-bold text-white mb-5 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-400 inline-block"></span>
                        Información del archivo
                    </h2>
                    // DESPUÉS — agrega la línea de Referencia justo después de "Estado":
<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
    <InfoItem label="ID"           value={<span className="font-mono text-xs text-slate-400">{upload.id}</span>} />
    <InfoItem label="Estado"       value={upload.upload_status} />
    <InfoItem
        label="Referencia del caso"
        value={
            upload.metadata_json?.case_ref
                ? <span className="bg-blue-900/40 text-sky-300 border border-sky-700/40 px-2 py-0.5 rounded-md text-xs font-medium">{String(upload.metadata_json.case_ref)}</span>
                : <span className="text-slate-500 text-xs italic">Sin referencia asignada</span>
        }
    />
    <InfoItem label="Archivo"      value={upload.original_name} />
    <InfoItem label="Tamaño"       value={upload.file_size ? `${(upload.file_size / 1024).toFixed(1)} KB` : null} />
    <InfoItem label="Modalidad"    value={upload.modality} />
    <InfoItem label="Fecha estudio" value={upload.study_date} />
    <InfoItem label="Patient ID"   value={upload.patient_id_dicom} />
    <InfoItem label="Creado"       value={new Date(upload.created_at).toLocaleString()} />
    <InfoItem label="Ruta storage" value={<span className="font-mono text-xs text-slate-500 break-all">{upload.storage_path}</span>} />
</div>
                </div>

                {/* Features clínicas si existen */}
                {upload.clinical_features && (
                    <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                        <h2 className="text-base font-bold text-white mb-5 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-slate-400 inline-block"></span>
                            Parámetros radiológicos ingresados
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {Object.entries(upload.clinical_features).map(([key, value]) => (
                                <div key={key} className="rounded-xl bg-slate-800 border border-slate-700 p-3 text-center">
                                    <p className="text-xs text-slate-500 capitalize mb-1">{key}</p>
                                    <p className="text-xl font-bold text-white">{String(value)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </main>
    );
}