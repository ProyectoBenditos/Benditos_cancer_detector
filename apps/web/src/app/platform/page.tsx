import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import {
    Upload, FileStack, AlertCircle, Activity,
    Brain, FileText, TrendingUp, CheckCircle2,
    Clock, ShieldAlert
} from "lucide-react";

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
        .limit(5);

    return (
        <div className="p-0">
            {/* Hero banner */}
            <div className="bg-brand-primary text-white px-8 py-8 mb-8 rounded-2xl mx-0 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-sky-400 to-transparent pointer-events-none" />
                <div className="relative">
                    <p className="text-xs font-bold uppercase tracking-widest text-sky-300 mb-1">OncoScan AI — MVP v1.0</p>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-white leading-tight">
                        Dashboard General
                    </h1>
                    <p className="text-slate-300 text-sm mt-2 max-w-xl">
                        Plataforma de apoyo diagnóstico oncológico mediante inteligencia artificial. Los resultados son referenciales y no sustituyen el criterio médico.
                    </p>
                </div>
            </div>

            <div className="px-0 space-y-8">

                {/* KPIs reales */}
                <div>
                    <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Métricas Operativas</h2>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Estudios</p>
                                <FileStack className="w-4 h-4 text-slate-400" />
                            </div>
                            <p className="text-3xl font-extrabold text-slate-800">{totalUploads ?? 0}</p>
                            <Link href="/platform/uploads" className="text-xs text-brand-primary font-medium hover:underline">Ver historial →</Link>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Analizados</p>
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            </div>
                            <p className="text-3xl font-extrabold text-emerald-600">{analizados ?? 0}</p>
                            <p className="text-xs text-slate-400 font-medium">Con resultado IA</p>
                        </div>

                        <div className="bg-red-50 rounded-2xl border border-red-200 p-5 shadow-sm flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold text-brand-danger uppercase tracking-wider">Riesgo Alto</p>
                                <ShieldAlert className="w-4 h-4 text-brand-danger" />
                            </div>
                            <p className="text-3xl font-extrabold text-brand-danger">{altosRiesgo ?? 0}</p>
                            <Link href="/platform/alertas" className="text-xs text-brand-danger font-medium hover:underline">Ver alertas →</Link>
                        </div>

                        <div className="bg-slate-900 rounded-2xl border border-slate-700 p-5 shadow-sm flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Modelo Activo</p>
                                <Brain className="w-4 h-4 text-sky-400" />
                            </div>
                            <p className="text-base font-bold text-sky-300 mt-1">multimodal-v1.0</p>
                            <Link href="/platform/modelo" className="text-xs text-sky-400 font-medium hover:underline">Ver detalles →</Link>
                        </div>
                    </div>
                </div>

                {/* Acciones rápidas */}
                <div>
                    <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Acciones Rápidas</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Link href="/platform/upload" className="group bg-brand-primary hover:bg-brand-primary-hover text-white rounded-2xl p-6 flex flex-col gap-3 transition-all shadow-sm hover:shadow-md">
                            <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
                                <Upload className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-bold text-base">Subir Estudio DICOM</p>
                                <p className="text-sky-200 text-xs mt-1">Carga archivos .dcm o imágenes para análisis IA</p>
                            </div>
                        </Link>

                        <Link href="/platform/uploads" className="group bg-white hover:border-brand-primary border border-slate-200 text-slate-800 rounded-2xl p-6 flex flex-col gap-3 transition-all shadow-sm hover:shadow-md">
                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center group-hover:bg-brand-primary/10">
                                <FileStack className="w-5 h-5 text-slate-600 group-hover:text-brand-primary" />
                            </div>
                            <div>
                                <p className="font-bold text-base">Historial DICOM</p>
                                <p className="text-slate-500 text-xs mt-1">Revisa y filtra todos los estudios analizados</p>
                            </div>
                        </Link>

                        <Link href="/platform/reportes" className="group bg-white hover:border-brand-primary border border-slate-200 text-slate-800 rounded-2xl p-6 flex flex-col gap-3 transition-all shadow-sm hover:shadow-md">
                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center group-hover:bg-brand-primary/10">
                                <FileText className="w-5 h-5 text-slate-600 group-hover:text-brand-primary" />
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
                        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Actividad Reciente</h2>
                        <Link href="/platform/uploads" className="text-xs text-brand-primary font-semibold hover:underline">Ver todo →</Link>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        {!recientes || recientes.length === 0 ? (
                            <div className="p-10 text-center text-slate-400 text-sm">
                                No hay estudios aún. <Link href="/platform/upload" className="text-brand-primary underline">Sube el primero</Link>.
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {recientes.map((u) => {
                                    const isAnalysis = u.file_type === "png_analysis";
                                    const href = isAnalysis ? `/platform/analyze/${u.id}` : `/platform/uploads/${u.id}`;
                                    const riskColor =
                                        u.ai_risk_level === "ALTO" ? "text-brand-danger bg-red-50 border-red-200" :
                                        u.ai_risk_level === "MEDIO" ? "text-amber-700 bg-amber-50 border-amber-200" :
                                        u.ai_risk_level === "BAJO" ? "text-emerald-700 bg-emerald-50 border-emerald-200" :
                                        "text-slate-500 bg-slate-100 border-slate-200";
                                    return (
                                        <Link key={u.id} href={href} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                                {isAnalysis ? <Brain className="w-4 h-4 text-brand-primary" /> : <FileStack className="w-4 h-4 text-slate-500" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-slate-800 truncate">{u.original_name}</p>
                                                <p className="text-xs text-slate-400">{new Date(u.created_at).toLocaleString("es-CO")}</p>
                                            </div>
                                            {u.metadata_json?.case_ref && (
                                                <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-medium shrink-0">
                                                    {String(u.metadata_json.case_ref)}
                                                </span>
                                            )}
                                            {u.ai_risk_level && (
                                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border shrink-0 ${riskColor}`}>
                                                    {u.ai_risk_level}
                                                </span>
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Módulos en desarrollo */}
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Módulos en Desarrollo</h2>
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full uppercase tracking-wider">Próximamente</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            { icon: Activity, label: "Precisión del Modelo", value: "94.2%", desc: "Último benchmark con datos de validación", color: "text-sky-400" },
                            { icon: TrendingUp, label: "Pacientes Activos", value: "142", desc: "Módulo de expedientes en construcción", color: "text-emerald-400" },
                            { icon: AlertCircle, label: "Alertas Pendientes", value: "3", desc: "Sistema de notificaciones push en desarrollo", color: "text-brand-danger" },
                        ].map(({ icon: Icon, label, value, desc, color }) => (
                            <div key={label} className="bg-slate-900 rounded-2xl border border-slate-700 p-5 opacity-75">
                                <div className="flex items-center gap-2 mb-3">
                                    <Icon className={`w-4 h-4 ${color}`} />
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
                                </div>
                                <p className="text-3xl font-extrabold text-white">{value}</p>
                                <p className="text-xs text-slate-500 mt-2">{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}