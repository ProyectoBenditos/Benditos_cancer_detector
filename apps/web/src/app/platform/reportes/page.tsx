import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { buttonVariants } from "@/components/ui/Button";
import Link from "next/link";
import { FileText, Download, BarChart3, ShieldAlert, ClipboardList } from "lucide-react";

export default async function ReportesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                <Card>
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center">
                            <ClipboardList className="w-5 h-5 text-brand-primary" aria-hidden="true" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total estudios</p>
                            <p className="text-2xl font-bold text-slate-800">{totalUploads ?? 0}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                            <BarChart3 className="w-5 h-5 text-emerald-600" aria-hidden="true" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Analizados</p>
                            <p className="text-2xl font-bold text-slate-800">{analizados ?? 0}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-brand-danger/20 bg-brand-danger/5">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-10 h-10 bg-brand-danger/10 rounded-xl flex items-center justify-center">
                            <ShieldAlert className="w-5 h-5 text-brand-danger" aria-hidden="true" />
                        </div>
                        <div>
                            <p className="text-xs text-brand-danger font-semibold uppercase tracking-wider">Riesgo Alto</p>
                            <p className="text-2xl font-bold text-brand-danger">{altosRiesgo ?? 0}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Tipos de reporte disponibles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <ReportCard
                    icon={<FileText className="w-5 h-5 text-brand-primary" aria-hidden="true" />}
                    iconBg="bg-brand-primary/10"
                    badge="REPORTE COMPLETO"
                    badgeStyle="bg-brand-primary/10 text-brand-primary border-brand-primary/20"
                    title="Reporte Completo"
                    description="Todos los estudios con resultados IA, score, nivel de riesgo y recomendación clínica."
                    href="/platform/reportes/download?tipo=completo"
                />
                <ReportCard
                    icon={<ShieldAlert className="w-5 h-5 text-brand-danger" aria-hidden="true" />}
                    iconBg="bg-brand-danger/10"
                    badge="ALERTAS CRÍTICAS"
                    badgeStyle="bg-brand-danger/10 text-brand-danger border-brand-danger/20"
                    title="Casos de Riesgo Alto"
                    description="Filtrado exclusivo de estudios con nivel de riesgo ALTO. Ideal para revisión urgente."
                    href="/platform/reportes/download?tipo=alto_riesgo"
                    danger
                />
                <ReportCard
                    icon={<BarChart3 className="w-5 h-5 text-emerald-600" aria-hidden="true" />}
                    iconBg="bg-emerald-50"
                    badge="ESTADÍSTICO"
                    badgeStyle="bg-emerald-50 text-emerald-700 border-emerald-200"
                    title="Resumen Estadístico"
                    description="Distribución de niveles de riesgo, scores promedio y métricas de uso del modelo IA."
                    href="/platform/reportes/download?tipo=estadistico"
                />
                <ReportCard
                    icon={<ClipboardList className="w-5 h-5 text-brand-primary" aria-hidden="true" />}
                    iconBg="bg-brand-primary/10"
                    badge="POR REFERENCIA"
                    badgeStyle="bg-brand-primary/10 text-brand-primary border-brand-primary/20"
                    title="Estudios con Referencia"
                    description="Solo estudios que tienen una referencia de caso asignada (campo case_ref)."
                    href="/platform/reportes/download?tipo=con_referencia"
                />
            </div>

            <p className="text-xs text-slate-400 mt-8 text-center">
                Los reportes generados son de uso clínico interno. No compartir fuera del sistema sin autorización.
            </p>
        </PageContainer>
    );
}

function ReportCard({
    icon, iconBg, badge, badgeStyle, title, description, href, danger = false,
}: {
    icon: React.ReactNode;
    iconBg: string;
    badge: string;
    badgeStyle: string;
    title: string;
    description: string;
    href: string;
    danger?: boolean;
}) {
    return (
        <Card>
            <CardContent className="p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
                        {icon}
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${badgeStyle}`}>
                        {badge}
                    </span>
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-800">{title}</h3>
                    <p className="text-sm text-slate-500 mt-1">{description}</p>
                </div>
                <Link
                    href={href}
                    className={`${buttonVariants({ variant: danger ? "danger" : "primary", size: "md" })} mt-2 w-full`}
                >
                    <Download className="w-4 h-4" aria-hidden="true" />
                    Descargar CSV
                </Link>
            </CardContent>
        </Card>
    );
}
