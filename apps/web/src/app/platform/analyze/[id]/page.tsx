"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardContent } from "@/components/ui/Card";

type RiskLevel = "BAJO" | "MEDIO" | "ALTO";

type AnalysisRow = {
    id: string;
    user_id: string;
    original_name: string;
    storage_path: string;
    file_size: number | null;
    file_type: "dicom" | "png_analysis";
    upload_status: "uploaded" | "processing" | "ai_completed" | "ai_failed";
    clinical_features: Record<string, number> | null;
    ai_score: number | null;
    ai_risk_level: RiskLevel | string | null;
    ai_recommendation: string | null;
    ai_model_version: string | null;
    ai_processed_at: string | null;
    ai_error: string | null;
    metadata_json: Record<string, unknown> | null;
    created_at: string;
};

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 3 * 60 * 1000;

function riskBadgeClasses(level: string | null | undefined): string {
    const normalized = (level ?? "").toUpperCase();
    if (normalized === "ALTO") return "bg-brand-danger/10 text-brand-danger border-brand-danger/30";
    if (normalized === "MEDIO") return "bg-amber-50 text-amber-700 border-amber-200";
    if (normalized === "BAJO") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    return "bg-slate-100 text-slate-700 border-slate-200";
}

export default function AnalysisResultPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const supabase = createClient();

    const [row, setRow] = useState<AnalysisRow | null>(null);
    const [error, setError] = useState("");
    const [timedOut, setTimedOut] = useState(false);
    const startedAtRef = useRef<number>(0);

    const fetchRow = useCallback(async () => {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !data.session?.access_token) {
            setError("No se pudo obtener la sesion del usuario. Recarga la pagina.");
            return null;
        }

        const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/v1/analysis/${id}`,
            {
                headers: { Authorization: `Bearer ${data.session.access_token}` },
            }
        );

        if (!response.ok) {
            const body = await response.json().catch(() => null);
            setError(body?.detail || `Error consultando el analisis (HTTP ${response.status}).`);
            return null;
        }

        const payload = (await response.json()) as AnalysisRow;
        setRow(payload);
        setError("");
        return payload;
    }, [id, supabase]);

    useEffect(() => {
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | null = null;
        startedAtRef.current = Date.now();

        const tick = async () => {
            if (cancelled) return;
            const fresh = await fetchRow();
            if (cancelled) return;

            const shouldKeepPolling =
                !!fresh && fresh.upload_status === "processing";

            if (!shouldKeepPolling) return;

            if (Date.now() - startedAtRef.current > POLL_TIMEOUT_MS) {
                setTimedOut(true);
                return;
            }

            timer = setTimeout(tick, POLL_INTERVAL_MS);
        };

        tick();

        return () => {
            cancelled = true;
            if (timer) clearTimeout(timer);
        };
    }, [fetchRow]);

    const isProcessing = row?.upload_status === "processing" && !timedOut;
    const isCompleted = row?.upload_status === "ai_completed";
    const isFailed = row?.upload_status === "ai_failed";

    return (
        <PageContainer maxWidth="4xl">
            <SectionHeader
                title="Resultado de analisis IA"
                description="Inferencia ejecutada por el modelo OncaScan AI desplegado en Hugging Face Spaces."
                action={
                    <Link
                        href="/platform/analyze"
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors shadow-sm font-medium"
                    >
                        Nuevo analisis
                    </Link>
                }
            />

            {error && (
                <div className="mb-6 rounded-xl border border-brand-danger/30 bg-brand-danger/5 p-4 text-sm text-brand-danger font-medium">
                    {error}
                </div>
            )}

            {!row && !error && (
                <Card>
                    <CardContent className="p-8 text-sm text-slate-500">Cargando registro...</CardContent>
                </Card>
            )}

            {row && (
                <div className="space-y-6">
                    <Card>
                        <CardContent className="p-6">
                            <div className="grid gap-4 md:grid-cols-3 text-sm">
                                <div>
                                    <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Archivo</p>
                                    <p className="text-slate-800 font-medium truncate" title={row.original_name}>{row.original_name}</p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Tipo</p>
                                    <p className="text-slate-800 font-medium">{row.file_type}</p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Ingresado</p>
                                    <p className="text-slate-800 font-medium">{new Date(row.created_at).toLocaleString()}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {isProcessing && (
                        <Card>
                            <CardContent className="p-8 flex flex-col items-center text-center gap-3">
                                <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-brand-primary animate-spin" />
                                <h3 className="text-lg font-semibold text-slate-800">Analizando con OncaScan AI...</h3>
                                <p className="text-sm text-slate-500 max-w-md">
                                    El Space de Hugging Face puede tardar 30-60s en su primer despertar (cold-start).
                                    Esta pagina se actualiza automaticamente.
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {timedOut && row.upload_status === "processing" && (
                        <Card>
                            <CardContent className="p-8 text-center space-y-3">
                                <h3 className="text-lg font-semibold text-amber-700">El analisis esta tomando mas de lo esperado</h3>
                                <p className="text-sm text-slate-500">
                                    Puedes refrescar manualmente la pagina. La inferencia sigue ejecutandose en el backend.
                                </p>
                                <button
                                    onClick={() => { setTimedOut(false); startedAtRef.current = Date.now(); fetchRow(); }}
                                    className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary-hover transition-colors shadow-sm"
                                >
                                    Reintentar consulta
                                </button>
                            </CardContent>
                        </Card>
                    )}

                    {isCompleted && (
                        <Card>
                            <CardContent className="p-8">
                                <div className="flex items-start justify-between gap-6 flex-wrap">
                                    <div>
                                        <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Nivel de riesgo</p>
                                        <span className={`inline-block px-4 py-2 rounded-full text-base font-bold border ${riskBadgeClasses(row.ai_risk_level)}`}>
                                            {row.ai_risk_level ?? "N/D"}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Score</p>
                                        <p className="text-3xl font-bold text-slate-800 tabular-nums">
                                            {row.ai_score !== null ? row.ai_score.toFixed(4) : "N/D"}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Modelo</p>
                                        <p className="text-sm font-mono text-slate-700">{row.ai_model_version ?? "N/D"}</p>
                                    </div>
                                </div>

                                <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Recomendacion</p>
                                    <p className="text-slate-800">{row.ai_recommendation ?? "N/D"}</p>
                                </div>

                                {row.clinical_features && (
                                    <div className="mt-6">
                                        <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">Features clinicas usadas</p>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                                            {Object.entries(row.clinical_features).map(([k, v]) => (
                                                <div key={k} className="rounded-lg bg-white border border-slate-200 px-3 py-2">
                                                    <p className="text-[10px] uppercase tracking-wider text-slate-500">{k}</p>
                                                    <p className="text-slate-800 font-semibold">{String(v)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <p className="text-xs text-slate-400 mt-6">
                                    Procesado el {row.ai_processed_at ? new Date(row.ai_processed_at).toLocaleString() : "N/D"}.
                                    Este resultado es referencial y no sustituye criterio medico profesional.
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {isFailed && (
                        <Card>
                            <CardContent className="p-8">
                                <h3 className="text-lg font-semibold text-brand-danger mb-2">El analisis fallo</h3>
                                <p className="text-sm text-slate-600 mb-4 break-words">
                                    {row.ai_error ?? "Error desconocido"}
                                </p>
                                <Link
                                    href="/platform/analyze"
                                    className="inline-flex rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary-hover transition-colors shadow-sm"
                                >
                                    Reintentar
                                </Link>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </PageContainer>
    );
}
