import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { Upload, FileStack, AlertCircle, Activity } from "lucide-react";
import { PhantomButton } from "@/components/ui/PhantomButton";

export default async function PlatformPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    return (
        <div className="mx-auto max-w-6xl">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-800">Dashboard General</h1>
                <p className="mt-1 text-slate-500">Resumen y accesos rápidos a módulos clínicos</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
                {/* Phantom Dashboard Widgets */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow cursor-default">
                    <p className="text-sm font-medium text-slate-500 mb-1">Pacientes Activos</p>
                    <h3 className="text-2xl font-bold text-slate-800">142</h3>
                    <p className="text-xs text-emerald-600 mt-2 font-medium bg-emerald-50 inline-block px-2 py-0.5 rounded">+12% este mes</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow cursor-default">
                    <p className="text-sm font-medium text-slate-500 mb-1">Análisis Completados</p>
                    <h3 className="text-2xl font-bold text-slate-800">89</h3>
                    <p className="text-xs text-emerald-600 mt-2 font-medium bg-emerald-50 inline-block px-2 py-0.5 rounded">Operatividad Normal</p>
                </div>
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-sm hover:shadow-md transition-shadow cursor-default">
                    <p className="text-sm font-medium text-rose-600 mb-1 flex items-center gap-1.5"><AlertCircle className="w-4 h-4"/> Alertas Críticas</p>
                    <h3 className="text-2xl font-bold text-rose-800">3</h3>
                    <p className="text-xs text-rose-600 mt-2 font-medium bg-white border border-rose-100 inline-block px-2 py-0.5 rounded shadow-sm">Requieren revisión</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow cursor-default">
                    <p className="text-sm font-medium text-slate-500 mb-1">Precisión IA (Actual)</p>
                    <h3 className="text-2xl font-bold text-slate-800">94.2%</h3>
                    <p className="text-xs text-slate-500 mt-2 font-medium bg-slate-100 inline-block px-2 py-0.5 rounded">Modelo v1.0.4</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col items-start border-t-4 border-t-rose-500">
                    <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center mb-4">
                        <Upload className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-800">Nueva Carga DICOM</h2>
                    <p className="mt-2 text-sm text-slate-500 flex-1">
                        Inicia un nuevo flujo de trabajo subiendo imágenes médicas para validación y registro de metadatos.
                    </p>
                    <Link
                        href="/platform/upload"
                        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-rose-500 transition-colors shadow-sm"
                    >
                        Comenzar carga
                    </Link>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col items-start">
                    <div className="w-10 h-10 bg-sky-100 text-sky-600 rounded-lg flex items-center justify-center mb-4">
                        <FileStack className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-800">Historial de Cargas</h2>
                    <p className="mt-2 text-sm text-slate-500 flex-1">
                        Consulta y audita los archivos DICOM previamente cargados en la plataforma, revisa sus estados y metadatos.
                    </p>
                    <Link
                        href="/platform/uploads"
                        className="mt-6 inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
                    >
                        Ver historial completo
                    </Link>
                </div>
                
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col items-start opacity-70">
                    <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center mb-4">
                        <Activity className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-800">Predicción de Riesgo IA</h2>
                    <p className="mt-2 text-sm text-slate-500 flex-1">
                        Módulo de análisis automatizado para marcación de módulos de riesgo en imágenes procesadas.
                    </p>
                    <PhantomButton featureName="El módulo de análisis IA" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 transition-colors shadow-sm">
                        Ejecutar Análisis
                    </PhantomButton>
                </div>
            </div>
        </div>
    );
}