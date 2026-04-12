import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { Upload, FileStack, AlertCircle, Activity, Users, FileText } from "lucide-react";
import { PhantomButton } from "@/components/ui/PhantomButton";
import { Card, CardContent } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { PageContainer } from "@/components/ui/PageContainer";

export default async function PlatformPage() {
    const supabase = await createClient();
    
    // Fetch real metrics: Count total uploads
    const { count: uploadsCount } = await supabase
        .from('dicom_uploads')
        .select('*', { count: 'exact', head: true });

    return (
        <PageContainer>
            <SectionHeader 
                title="Dashboard General" 
                description="Resumen operativo y acceso directo a módulos clínicos integrados."
            />

            {/* SECCIÓN DUMMY VISUAL */}
            <div className="mb-8">
                 <div className="flex items-center justify-between mb-4">
                     <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Módulos Inteligentes (Próximamente)</h2>
                     <span className="text-xs font-semibold bg-slate-200 text-slate-600 px-2 py-0.5 rounded shadow-inner">VISTA PREVIA</span>
                 </div>
                 <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="cursor-default hover:shadow-md transition-all border-l-4 border-l-brand-primary">
                        <CardContent className="p-5">
                            <p className="text-sm font-medium text-slate-500 mb-1 flex items-center gap-2"><Users className="w-4 h-4"/> Pacientes Activos</p>
                            <h3 className="text-2xl font-bold text-slate-800 mt-2">142</h3>
                            <p className="text-xs text-brand-primary mt-2 font-medium bg-brand-primary/10 inline-block px-2 py-0.5 rounded shadow-sm opacity-80">+12% vs mes anterior</p>
                        </CardContent>
                    </Card>

                    <Card className="cursor-default hover:shadow-md transition-all border-l-4 border-l-brand-primary/60">
                        <CardContent className="p-5">
                            <p className="text-sm font-medium text-slate-500 mb-1 flex items-center gap-2"><Activity className="w-4 h-4"/>Precisión IA</p>
                            <h3 className="text-2xl font-bold text-slate-800 mt-2">94.2%</h3>
                            <p className="text-xs text-slate-600 mt-2 font-medium bg-slate-100/50 border border-slate-200 inline-block px-2 py-0.5 rounded opacity-80">Modelo v1.0.4</p>
                        </CardContent>
                    </Card>

                    {/* RED USADO ESTRICTAMENTE PARA CLÍNICA Y ALERTAS */}
                    <Card className="cursor-default hover:shadow-md transition-all border-l-4 border-l-brand-danger bg-brand-danger/5">
                        <CardContent className="p-5">
                            <p className="text-sm font-medium text-brand-danger mb-1 flex items-center gap-2"><AlertCircle className="w-4 h-4"/> Alertas Críticas</p>
                            <h3 className="text-2xl font-bold text-brand-danger mt-2">3</h3>
                            <p className="text-xs text-brand-danger mt-2 font-semibold bg-white border border-brand-danger/20 inline-block px-2 py-0.5 rounded shadow-sm opacity-90">Requieren revisión</p>
                        </CardContent>
                    </Card>
                    
                    <Card className="flex flex-col justify-center items-center p-5 opacity-80 border-dashed hover:opacity-100 transition-opacity bg-transparent">
                         <FileText className="w-6 h-6 text-slate-400 mb-2"/>
                         <PhantomButton featureName="Exportación de reportes clínicos" className="text-sm font-medium text-brand-primary/80 hover:text-brand-primary hover:underline transition-colors">
                             Configurar Reportes
                         </PhantomButton>
                    </Card>
                 </div>
            </div>

            {/* SECCIÓN REAL OPERATIVA */}
            <div>
                 <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-4 mt-10 border-b border-slate-200 pb-2">Acceso Inmediato a DICOM</h2>
                 <div className="grid gap-6 md:grid-cols-2">
                    <Card className="flex flex-col items-start hover:border-brand-primary/40 focus-within:ring-2 focus-within:ring-brand-primary/20 transition-all">
                        <CardContent className="w-full flex-1 flex flex-col pt-6 pb-6 shadow-sm">
                            <div className="flex justify-between items-start w-full">
                                <div className="w-12 h-12 bg-indigo-50 text-brand-primary border border-brand-primary/10 rounded-xl flex items-center justify-center mb-4">
                                    <Upload className="w-6 h-6" />
                                </div>
                                <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded inline-flex">FUNCIONAL</span>
                            </div>
                            
                            <h2 className="text-xl font-bold text-slate-800">Carga Segura de Estudios</h2>
                            <p className="mt-2 text-sm text-slate-500 flex-1">
                                Inicia un nuevo flujo subiendo de estudios en formato `.dcm`. El Backend de FastAPI procesará los metadatos y protegerá la data.
                            </p>
                            <Link
                                href="/platform/upload"
                                className="mt-6 w-full text-center rounded-xl bg-brand-primary px-5 py-3 text-sm font-semibold text-white hover:bg-brand-primary-hover hover:shadow-md transition-all"
                            >
                                Seleccionar archivo y subir
                            </Link>
                        </CardContent>
                    </Card>

                    <Card className="flex flex-col items-start hover:border-slate-300 transition-all">
                        <CardContent className="w-full flex-1 flex flex-col pt-6 pb-6">
                            <div className="flex justify-between items-start w-full mb-4">
                                <div className="w-12 h-12 bg-slate-100 text-slate-600 border border-slate-200 rounded-xl flex items-center justify-center">
                                    <FileStack className="w-6 h-6" />
                                </div>
                                <div className="flex flex-col items-end">
                                   <span className="text-3xl font-extrabold text-slate-300 leading-none">{uploadsCount ?? 0}</span>
                                   <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Registros</span>
                                </div>
                            </div>
                            <h2 className="text-xl font-bold text-slate-800">Historial Procesado</h2>
                            <p className="mt-2 text-sm text-slate-500 flex-1">
                                Revisa los metadatos de las imágenes ya extraídas y resguardadas con seguridad.
                            </p>
                            <Link
                                href="/platform/uploads"
                                className="mt-6 w-full text-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:shadow-sm transition-all"
                            >
                                Auditar historial completo
                            </Link>
                        </CardContent>
                    </Card>
                 </div>
            </div>
        </PageContainer>
    );
}