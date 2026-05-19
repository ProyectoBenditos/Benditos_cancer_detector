import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardContent } from "@/components/ui/Card";
import Link from "next/link";
import { FileText, Download, BarChart3, ShieldAlert, ClipboardList } from "lucide-react";

export default async function ReportesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    // Métricas reales para los reportes
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

    return (
        <PageContainer>
            <SectionHeader
                title="Exportar Reportes"
                description="Genera y descarga reportes clínicos del historial de análisis IA."
            />

            {/* Resumen de datos disponibles */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 flex items-center gap-4 shadow-sm">
                    <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center">
                        <ClipboardList className="w-5 h-5 text-brand-primary" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total estudios</p>
                        <p className="text-2xl font-bold text-slate-800">{totalUploads ?? 0}</p>
                    </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 flex items-center gap-4 shadow-sm">
                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Analizados</p>
                        <p className="text-2xl font-bold text-slate-800">{analizados ?? 0}</p>
                    </div>
                </div>
                <div className="rounded-2xl border border-red-100 bg-red-50 p-5 flex items-center gap-4 shadow-sm">
                    <div className="w-10 h-10 bg-brand-danger/10 rounded-xl flex items-center justify-center">
                        <ShieldAlert className="w-5 h-5 text-brand-danger" />
                    </div>
                    <div>
                        <p className="text-xs text-brand-danger font-semibold uppercase tracking-wider">Riesgo Alto</p>
                        <p className="text-2xl font-bold text-brand-danger">{altosRiesgo ?? 0}</p>
                    </div>
                </div>
            </div>

            {/* Opciones de reporte */}
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Tipos de reporte disponibles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* Reporte Completo — Tema Oscuro */}
                <Card className="border-slate-800 bg-slate-900 text-white overflow-hidden">
                    <CardContent className="p-6 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div className="w-10 h-10 bg-sky-500/20 border border-sky-500/30 rounded-xl flex items-center justify-center">
                                <FileText className="w-5 h-5 text-sky-400" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest bg-sky-500/20 text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded-full">TEMA OSCURO</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Reporte Completo</h3>
                            <p className="text-sm text-slate-400 mt-1">Todos los estudios con resultados IA, score, nivel de riesgo y recomendación clínica.</p>
                        </div>
                        <ReportDownloadButton
                            label="Descargar CSV — Reporte Completo"
                            href="/platform/reportes/download?tipo=completo"
                            dark
                        />
                    </CardContent>
                </Card>

                {/* Reporte de Riesgo Alto — Tema Claro */}
                <Card className="border-red-200 bg-white overflow-hidden">
                    <CardContent className="p-6 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div className="w-10 h-10 bg-red-50 border border-red-200 rounded-xl flex items-center justify-center">
                                <ShieldAlert className="w-5 h-5 text-brand-danger" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest bg-red-50 text-brand-danger border border-red-200 px-2 py-0.5 rounded-full">ALERTAS CRÍTICAS</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Casos de Riesgo Alto</h3>
                            <p className="text-sm text-slate-500 mt-1">Filtrado exclusivo de estudios con nivel de riesgo ALTO. Ideal para revisión urgente.</p>
                        </div>
                        <ReportDownloadButton
                            label="Descargar CSV — Solo Riesgo Alto"
                            href="/platform/reportes/download?tipo=alto_riesgo"
                            danger
                        />
                    </CardContent>
                </Card>

                {/* Reporte Estadístico — Tema Oscuro */}
                <Card className="border-slate-700 bg-slate-800 text-white overflow-hidden">
                    <CardContent className="p-6 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div className="w-10 h-10 bg-emerald-500/20 border border-emerald-500/30 rounded-xl flex items-center justify-center">
                                <BarChart3 className="w-5 h-5 text-emerald-400" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">ESTADÍSTICO</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Resumen Estadístico</h3>
                            <p className="text-sm text-slate-400 mt-1">Distribución de niveles de riesgo, scores promedio y métricas de uso del modelo IA.</p>
                        </div>
                        <ReportDownloadButton
                            label="Descargar CSV — Estadísticas"
                            href="/platform/reportes/download?tipo=estadistico"
                            dark
                        />
                    </CardContent>
                </Card>

                {/* Reporte por Referencia — Tema Claro */}
                <Card className="border-blue-200 bg-blue-50 overflow-hidden">
                    <CardContent className="p-6 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div className="w-10 h-10 bg-blue-100 border border-blue-200 rounded-xl flex items-center justify-center">
                                <ClipboardList className="w-5 h-5 text-blue-700" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">POR REFERENCIA</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Estudios con Referencia</h3>
                            <p className="text-sm text-slate-600 mt-1">Solo estudios que tienen una referencia de caso asignada (campo case_ref).</p>
                        </div>
                        <ReportDownloadButton
                            label="Descargar CSV — Con Referencia"
                            href="/platform/reportes/download?tipo=con_referencia"
                        />
                    </CardContent>
                </Card>
            </div>

            <p className="text-xs text-slate-400 mt-8 text-center">
                ⚠️ Los reportes generados son de uso clínico interno. No compartir fuera del sistema sin autorización.
            </p>
        </PageContainer>
    );
}

function ReportDownloadButton({
    label,
    href,
    dark = false,
    danger = false,
}: {
    label: string;
    href: string;
    dark?: boolean;
    danger?: boolean;
}) {
    const base = "mt-2 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all w-full";
    const style = danger
        ? `${base} bg-brand-danger text-white hover:bg-brand-danger-hover`
        : dark
        ? `${base} bg-white/10 text-white border border-white/20 hover:bg-white/20`
        : `${base} bg-brand-primary text-white hover:bg-brand-primary-hover`;

    return (
        <Link href={href} className={style}>
            <Download className="w-4 h-4" />
            {label}
        </Link>
    );
}