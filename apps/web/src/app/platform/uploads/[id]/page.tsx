import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { buttonVariants } from "@/components/ui/Button";
import { RiskBadge, type RiskLevel } from "@/components/ui/RiskBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { BeforeAfterViewer } from "@/components/ui/BeforeAfterViewer";

type PageProps = {
    params: Promise<{ id: string }>;
};

function asRiskLevel(level: string | null | undefined): RiskLevel | null {
    if (level === "ALTO" || level === "MEDIO" || level === "BAJO") return level;
    return null;
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1">
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</dt>
            <dd className="text-sm font-medium text-slate-800">{value ?? "N/D"}</dd>
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

    const patient = upload.patient_id
        ? (await supabase.from("patients").select("external_id, display_alias").eq("id", upload.patient_id).single()).data
        : null;

    const isAnalyzed = upload.upload_status === "analyzed" || upload.upload_status === "ai_completed";
    const hasError = upload.upload_status === "error" || upload.upload_status === "ai_failed";
    const caseRef = upload.metadata_json?.case_ref;

    // Firmar server-side la imagen "antes" (preview PNG para DICOM, original para
    // PNG/JPG). Requiere policy SELECT en storage.objects para el dueño del archivo.
    let beforeUrl: string | null = null;
    if (isAnalyzed && upload.ai_heatmap_base64) {
        const path = upload.preview_storage_path ?? upload.storage_path;
        const { data: signed } = await supabase.storage
            .from("dicom-files")
            .createSignedUrl(path, 3600);
        beforeUrl = signed?.signedUrl ?? null;
    }

    return (
        <PageContainer maxWidth="4xl">
            <SectionHeader
                title={upload.original_name}
                description="Registro completo del estudio y resultado del análisis IA."
                action={
                    <Link
                        href="/platform/uploads"
                        className={buttonVariants({ variant: "secondary", size: "md" })}
                    >
                        ← Volver al historial
                    </Link>
                }
            />

            <AlertBanner
                variant="warning"
                title="OncoScan es una herramienta académica de apoyo."
                description="No es un dispositivo médico certificado y su resultado no reemplaza el juicio del especialista."
                className="mb-6"
            />

            {/* Resultado IA */}
            {isAnalyzed && (
                <Card className="mb-6">
                    <CardContent className="p-6">
                        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-5">
                            Resultado del análisis IA
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center">
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                                    Nivel de riesgo
                                </p>
                                <div className="flex justify-center">
                                    <RiskBadge level={asRiskLevel(upload.ai_risk_level)} />
                                </div>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center">
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                                    Score IA
                                </p>
                                <p className="text-3xl font-bold text-slate-800 tabular-nums">
                                    {upload.ai_score != null
                                        ? `${(upload.ai_score * 100).toFixed(1)}%`
                                        : "N/D"}
                                </p>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center">
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                                    Modelo
                                </p>
                                <p className="text-sm font-semibold text-brand-primary mt-2">
                                    {upload.ai_model_version ?? "N/D"}
                                </p>
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 mb-3">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                                Recomendación clínica
                            </p>
                            <p className="text-slate-800 font-medium">{upload.ai_recommendation ?? "N/D"}</p>
                        </div>

                        {upload.ai_processed_at && (
                            <p className="text-xs text-slate-500">
                                Analizado el {new Date(upload.ai_processed_at).toLocaleString()}
                            </p>
                        )}

                        <p className="text-xs text-slate-400 mt-2">
                            Resultado de apoyo diagnóstico — no reemplaza el criterio del especialista.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Visualizador antes / después (Grad-CAM) */}
            {isAnalyzed && upload.ai_heatmap_base64 && (
                <div className="mb-6">
                    <BeforeAfterViewer beforeUrl={beforeUrl} heatmapBase64={upload.ai_heatmap_base64} />
                </div>
            )}

            {/* Metadata de inferencia */}
            {isAnalyzed && (upload.model_version || upload.inference_time_ms != null || upload.predicted_at) && (
                <Card className="mb-6">
                    <CardContent className="p-6">
                        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-5">
                            Metadata de inferencia
                        </h2>
                        <dl className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <InfoItem label="Versión del modelo" value={upload.model_version} />
                            <InfoItem
                                label="Tiempo de inferencia"
                                value={upload.inference_time_ms != null ? `${upload.inference_time_ms} ms` : null}
                            />
                            <InfoItem
                                label="Ejecutado en"
                                value={upload.predicted_at ? new Date(upload.predicted_at).toLocaleString() : null}
                            />
                        </dl>
                    </CardContent>
                </Card>
            )}

            {/* Error de análisis */}
            {hasError && upload.ai_error && (
                <AlertBanner
                    variant="error"
                    title="Error en el análisis IA"
                    description={upload.ai_error}
                    className="mb-6"
                />
            )}

            {/* Sin análisis */}
            {!isAnalyzed && !hasError && (
                <Card className="mb-6">
                    <CardContent className="p-8 text-center">
                        <p className="text-slate-600 text-sm mb-4">Este archivo aún no ha sido analizado con IA.</p>
                        <Link
                            href="/platform/upload"
                            className={buttonVariants({ variant: "primary", size: "md" })}
                        >
                            Ir a subir y analizar
                        </Link>
                    </CardContent>
                </Card>
            )}

            {/* Info del archivo */}
            <Card className="mb-6">
                <CardContent className="p-6">
                    <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-5">
                        Información del archivo
                    </h2>
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <InfoItem
                            label="ID"
                            value={<span className="font-mono text-xs text-slate-600">{upload.id}</span>}
                        />
                        <InfoItem
                            label="Estado"
                            value={<StatusBadge status={upload.upload_status} />}
                        />
                        <InfoItem
                            label="Referencia del caso"
                            value={
                                caseRef
                                    ? <span className="inline-block bg-brand-primary/10 text-brand-primary border border-brand-primary/20 px-2 py-0.5 rounded-md text-xs font-medium">{String(caseRef)}</span>
                                    : <span className="text-slate-400 text-xs italic">Sin referencia asignada</span>
                            }
                        />
                        <InfoItem label="Archivo" value={upload.original_name} />
                        <InfoItem
                            label="Tamaño"
                            value={upload.file_size ? `${(upload.file_size / 1024).toFixed(1)} KB` : null}
                        />
                        <InfoItem label="Modalidad" value={upload.modality} />
                        <InfoItem label="Fecha estudio" value={upload.study_date} />
                        <InfoItem label="Patient ID DICOM" value={upload.patient_id_dicom} />
                        <InfoItem
                            label="Paciente registrado"
                            value={
                                patient
                                    ? <Link href={`/platform/pacientes/${upload.patient_id}`} className="text-brand-primary hover:underline font-medium">
                                        {patient.display_alias ?? patient.external_id}
                                      </Link>
                                    : <span className="text-slate-400 text-xs italic">No asociado</span>
                            }
                        />
                        <InfoItem
                            label="Creado"
                            value={new Date(upload.created_at).toLocaleString()}
                        />
                        <InfoItem
                            label="Ruta storage"
                            value={<span className="font-mono text-xs text-slate-500 break-all">{upload.storage_path}</span>}
                        />
                    </dl>
                </CardContent>
            </Card>

            {/* Features clínicas */}
            {upload.clinical_features && (
                <Card>
                    <CardContent className="p-6">
                        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-5">
                            Parámetros radiológicos ingresados
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {Object.entries(upload.clinical_features).map(([key, value]) => (
                                <div key={key} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                                    <p className="text-xs text-slate-500 capitalize mb-1">{key}</p>
                                    <p className="text-xl font-bold text-slate-800">{String(value)}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </PageContainer>
    );
}
