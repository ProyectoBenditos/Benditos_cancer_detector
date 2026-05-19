import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Brain, Database, BarChart3, ShieldCheck, AlertTriangle, Layers } from "lucide-react";

export default function ModeloPage() {
    return (
        <PageContainer>
            <SectionHeader
                title="Modelo IA — Información Técnica"
                description="Cómo funciona el sistema de detección, con qué datos fue entrenado y cuáles son sus limitaciones."
            />

            {/* Identificación del modelo */}
            <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6 mb-6 flex flex-col md:flex-row gap-6 items-start">
                <div className="w-12 h-12 bg-sky-500/20 border border-sky-500/30 rounded-xl flex items-center justify-center shrink-0">
                    <Brain className="w-6 h-6 text-sky-400" />
                </div>
                <div>
                    <p className="text-xs text-sky-400 font-bold uppercase tracking-widest mb-1">Versión activa</p>
                    <h2 className="text-2xl font-extrabold text-white">multimodal-v1.0</h2>
                    <p className="text-slate-400 text-sm mt-2 max-w-2xl">
                        Modelo de clasificación binaria desplegado en Hugging Face Spaces. Combina features clínicas estructuradas con inferencia sobre imágenes médicas (PNG/DICOM) para estimar la probabilidad de malignidad de una lesión.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">

                {/* Datos de entrenamiento */}
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 bg-brand-primary/10 rounded-lg flex items-center justify-center">
                                <Database className="w-4 h-4 text-brand-primary" />
                            </div>
                            <h3 className="font-bold text-slate-800">Datos de Entrenamiento</h3>
                        </div>
                        <ul className="space-y-2.5 text-sm text-slate-600">
                            <li className="flex gap-2"><span className="text-brand-primary font-bold shrink-0">•</span> Dataset público <strong>ISIC Archive</strong> (International Skin Imaging Collaboration) — imágenes dermatoscópicas etiquetadas</li>
                            <li className="flex gap-2"><span className="text-brand-primary font-bold shrink-0">•</span> Features clínicas estructuradas: diámetro, asimetría, bordes, color, evolución (modelo ABCDe)</li>
                            <li className="flex gap-2"><span className="text-brand-primary font-bold shrink-0">•</span> Split de entrenamiento/validación: 80% / 20%</li>
                            <li className="flex gap-2"><span className="text-brand-primary font-bold shrink-0">•</span> Balanceo de clases con oversampling en casos positivos (malignos)</li>
                        </ul>
                    </CardContent>
                </Card>

                {/* Arquitectura */}
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 bg-brand-primary/10 rounded-lg flex items-center justify-center">
                                <Layers className="w-4 h-4 text-brand-primary" />
                            </div>
                            <h3 className="font-bold text-slate-800">Arquitectura del Modelo</h3>
                        </div>
                        <ul className="space-y-2.5 text-sm text-slate-600">
                            <li className="flex gap-2"><span className="text-brand-primary font-bold shrink-0">•</span> <strong>Rama visual:</strong> EfficientNet-B0 fine-tuneada para clasificación de imágenes médicas</li>
                            <li className="flex gap-2"><span className="text-brand-primary font-bold shrink-0">•</span> <strong>Rama clínica:</strong> Red densa (MLP) sobre features numéricas normalizadas</li>
                            <li className="flex gap-2"><span className="text-brand-primary font-bold shrink-0">•</span> <strong>Fusión:</strong> Concatenación de embeddings + capa de clasificación final (sigmoid)</li>
                            <li className="flex gap-2"><span className="text-brand-primary font-bold shrink-0">•</span> Framework: PyTorch — desplegado en Hugging Face Spaces (CPU)</li>
                        </ul>
                    </CardContent>
                </Card>

                {/* Métricas */}
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                                <BarChart3 className="w-4 h-4 text-emerald-600" />
                            </div>
                            <h3 className="font-bold text-slate-800">Métricas de Validación</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { label: "Accuracy", value: "94.2%" },
                                { label: "AUC-ROC", value: "0.97" },
                                { label: "Sensibilidad", value: "91.8%" },
                                { label: "Especificidad", value: "96.1%" },
                            ].map(({ label, value }) => (
                                <div key={label} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{label}</p>
                                    <p className="text-xl font-extrabold text-slate-800 mt-1">{value}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Interpretación del Score */}
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 bg-brand-primary/10 rounded-lg flex items-center justify-center">
                                <ShieldCheck className="w-4 h-4 text-brand-primary" />
                            </div>
                            <h3 className="font-bold text-slate-800">Interpretación del Score</h3>
                        </div>
                        <div className="space-y-2.5">
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider w-16 shrink-0">BAJO</span>
                                <div className="h-2 flex-1 rounded-full bg-emerald-200 overflow-hidden"><div className="h-full bg-emerald-500 w-[30%]"/></div>
                                <span className="text-xs text-emerald-700 font-semibold shrink-0">0% – 30%</span>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                                <span className="text-xs font-bold text-amber-700 uppercase tracking-wider w-16 shrink-0">MEDIO</span>
                                <div className="h-2 flex-1 rounded-full bg-amber-200 overflow-hidden"><div className="h-full bg-amber-500 w-[65%]"/></div>
                                <span className="text-xs text-amber-700 font-semibold shrink-0">30% – 70%</span>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 border border-red-200">
                                <span className="text-xs font-bold text-brand-danger uppercase tracking-wider w-16 shrink-0">ALTO</span>
                                <div className="h-2 flex-1 rounded-full bg-red-200 overflow-hidden"><div className="h-full bg-brand-danger w-[90%]"/></div>
                                <span className="text-xs text-brand-danger font-semibold shrink-0">70% – 100%</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Aviso clínico */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 flex gap-4">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-bold text-amber-800 mb-1">Aviso Clínico Importante</p>
                    <p className="text-sm text-amber-700">
                        Este sistema es exclusivamente una <strong>herramienta de apoyo diagnóstico</strong>. Los resultados del modelo IA no constituyen diagnóstico médico definitivo y no deben reemplazar el juicio clínico del especialista. Todo resultado debe ser validado por un profesional de salud calificado antes de tomar decisiones terapéuticas.
                    </p>
                </div>
            </div>
        </PageContainer>
    );
}