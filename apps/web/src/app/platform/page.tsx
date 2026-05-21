import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import {
    Upload, FileStack, Brain, FileText, CheckCircle2, ShieldAlert
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { PageContainer } from "@/components/ui/PageContainer";
import { RiskBadge, type RiskLevel } from "@/components/ui/RiskBadge";

type RecentUpload = {
    id: string;
    original_name: string;
    ai_risk_level: string | null;
    ai_score: number | null;
    upload_status: string;
    created_at: string;
    file_type: string;
    metadata_json: Record<string, unknown> | null;
};

function asRiskLevel(level: string | null): RiskLevel | null {
    if (level === "ALTO" || level === "MEDIO" || level === "BAJO") return level;
    return null;
}

export default async function PlatformPage() {
    const supabase = await createClient();

    const { count: totalUploads } = await supabase
        .from("dicom_uploads")
        .select("*", { count: "exact", head: true });

    const { count: altosRiesgo } = await supabase
        .from("dicom_uploads")
        .select("*", { count: "exact", head: true })
        .eq("ai_risk_level", "ALTO");

    const { count: analizados } = await supabase
        .from("dicom_uploads")
        .select("*", { count: "exact", head: true })
        .eq("upload_status", "analyzed");

    const { data: recientes } = await supabase
        .from("dicom_uploads")
        .select("id, original_name, ai_risk_level, ai_score, upload_status, created_at, file_type, metadata_json")
        .order("created_at", { ascending: false })
        .limit(5)
        .returns<RecentUpload[]>();

    return (
        <PageContainer>
            {/* Hero banner */}
            <div className="bg-brand-primary text-white px-8 py-8 mb-8 rounded-2xl">
                <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-1">OncoScan AI — MVP v1.0</p>
                <h1 className="text-2xl md:text-3xl font-extrabold text-white leading-tight">
                    Dashboard General
                </h1>
                <p className="text-white/80 text-sm mt-2 max-w-xl">
                    Plataforma de apoyo diagnóstico oncológico mediante inteligencia artificial. Los resultados son referenciales y no sustituyen el criterio médico.
                </p>
            </div>

            <div className="space-y-8">
                {/* KPIs reales */}
                <div>
                    <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Métricas Operativas</h2>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card>
                            <CardContent className="p-5 flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Estudios</p>
                                    <FileStack className="w-4 h-4 text-slate-400" aria-hidden="true" />
                                </div>
                                <p className="text-3xl font-extrabold text-slate-800">{totalUploads ?? 0}</p>
                                <Link href="/platform/uploads" className="text-xs text-brand-primary font-medium hover:underline">Ver historial →</Link>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-5 flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Analizados</p>
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" aria-hidden="true" />
                                </div>
                                <p className="text-3xl font-extrabold text-emerald-600">{analizados ?? 0}</p>
                                <p className="text-xs text-slate-400 font-medium">Con resultado IA</p>
                            </CardContent>
                        </Card>

                        <Card className="border-brand-danger/20 bg-brand-danger/5">
                            <CardContent className="p-5 flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold text-brand-danger uppercase tracking-wider">Riesgo Alto</p>
                                    <ShieldAlert className="w-4 h-4 text-brand-danger" aria-hidden="true" />
                                </div>
                                <p className="text-3xl font-extrabold text-brand-danger">{altosRiesgo ?? 0}</p>
                                <Link href="/platform/alertas" className="text-xs text-brand-danger font-medium hover:underline">Ver alertas →</Link>
                            </CardContent>
                        </Card>

                        <Card className="bg-brand-primary text-white border-brand-primary-hover">
                            <CardContent className="p-5 flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">Modelo Activo</p>
                                    <Brain className="w-4 h-4 text-white/80" aria-hidden="true" />
                                </div>
                                <p className="text-base font-bold text-white mt-1">multimodal-v1.0</p>
                                <Link href="/platform/modelo" className="text-xs text-white/80 font-medium hover:underline">Ver detalles →</Link>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Acciones rápidas */}
                <div>
                    <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Acciones Rápidas</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Link
                            href="/platform/upload"
                            className="group bg-brand-primary hover:bg-brand-primary-hover text-white rounded-2xl p-6 flex flex-col gap-3 transition-colors shadow-sm hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
                        >
                            <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
                                <Upload className="w-5 h-5" aria-hidden="true" />
                            </div>
                            <div>
                                <p className="font-bold text-base">Subir Estudio DICOM</p>
                                <p className="text-white/80 text-xs mt-1">Carga archivos .dcm o imágenes para análisis IA</p>
                            </div>
                        </Link>

                        <Link
                            href="/platform/uploads"
                            className="group bg-brand-surface border border-slate-200 hover:border-brand-primary text-slate-800 rounded-2xl p-6 flex flex-col gap-3 transition-colors shadow-sm hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
                        >
                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center group-hover:bg-brand-primary/10">
                                <FileStack className="w-5 h-5 text-slate-600 group-hover:text-brand-primary" aria-hidden="true" />
                            </div>
                            <div>
                                <p className="font-bold text-base">Historial DICOM</p>
                                <p className="text-slate-500 text-xs mt-1">Revisa y filtra todos los estudios analizados</p>
                            </div>
                        </Link>

                        <Link
                            href="/platform/reportes"
                            className="group bg-brand-surface border border-slate-200 hover:border-brand-primary text-slate-800 rounded-2xl p-6 flex flex-col gap-3 transition-colors shadow-sm hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
                        >
                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center group-hover:bg-brand-primary/10">
                                <FileText className="w-5 h-5 text-slate-600 group-hover:text-brand-primary" aria-hidden="true" />
                            </div>
                            <div>
                                <p className="font-bold text-base">Exportar Reportes</p>
                                <p className="text-slate-500 text-xs mt-1">Descarga reportes CSV clínicos en varios formatos</p>
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Actividad reciente */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">Actividad Reciente</h2>
                        <Link href="/platform/uploads" className="text-xs text-brand-primary font-semibold hover:underline">Ver todo →</Link>
                    </div>
                    <Card>
                        <CardContent className="p-0">
                            {!recientes || recientes.length === 0 ? (
                                <div className="p-10 text-center text-slate-400 text-sm">
                                    No hay estudios aún. <Link href="/platform/upload" className="text-brand-primary underline">Sube el primero</Link>.
                                </div>
                            ) : (
                                <ul className="divide-y divide-slate-100">
                                    {recientes.map((u) => {
                                        const isAnalysis = u.file_type === "png_analysis";
                                        const href = isAnalysis ? `/platform/analyze/${u.id}` : `/platform/uploads/${u.id}`;
                                        return (
                                            <li key={u.id}>
                                                <Link
                                                    href={href}
                                                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-inset"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                                        {isAnalysis
                                                            ? <Brain className="w-4 h-4 text-brand-primary" aria-hidden="true" />
                                                            : <FileStack className="w-4 h-4 text-slate-500" aria-hidden="true" />
                                                        }
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-slate-800 truncate">{u.original_name}</p>
                                                        <p className="text-xs text-slate-500">{new Date(u.created_at).toLocaleString()}</p>
                                                    </div>
                                                    <RiskBadge level={asRiskLevel(u.ai_risk_level)} />
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </PageContainer>
    );
}
