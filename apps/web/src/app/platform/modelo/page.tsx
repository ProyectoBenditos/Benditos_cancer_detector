import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { Card, CardContent } from "@/components/ui/Card";
import { Brain, Database, BarChart3, ShieldCheck, Layers } from "lucide-react";

export default function ModeloPage() {
    return (
        <PageContainer>
            <SectionHeader
                title="Modelo IA — Información Técnica"
                description="Cómo funciona el sistema de detección de nódulos pulmonares, con qué datos fue entrenado y cuáles son sus limitaciones."
            />

            <AlertBanner
                variant="warning"
                title="Herramienta de apoyo diagnóstico"
                description="Este sistema es una herramienta de apoyo. Los resultados no constituyen diagnóstico médico definitivo y deben ser validados por un profesional de salud calificado."
                className="mb-6"
            />

            {/* Identificación del modelo */}
            <div className="bg-brand-primary rounded-2xl border border-brand-primary-hover p-6 mb-6 flex flex-col md:flex-row gap-6 items-start">
                <div className="w-12 h-12 bg-white/15 border border-white/20 rounded-xl flex items-center justify-center shrink-0">
                    <Brain className="w-6 h-6 text-white" aria-hidden="true" />
                </div>
                <div>
                    <p className="text-xs text-white/80 font-bold uppercase tracking-widest mb-1">Versión activa</p>
                    <h2 className="text-2xl font-extrabold text-white">multimodal-v1.1</h2>
                    <p className="text-white/80 text-sm mt-2 max-w-2xl">
                        Modelo de clasificación de nódulos pulmonares desplegado en Hugging Face Spaces.
                        Combina análisis de imagen CT con features clínicas radiológicas estructuradas
                        para estimar la probabilidad de malignidad de un nódulo pulmonar.
                        Soporta imágenes PNG, JPG y archivos DICOM (.dcm) nativos.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">

                {/* Datos de entrenamiento */}
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 bg-brand-primary/10 rounded-lg flex items-center justify-center">
                                <Database className="w-4 h-4 text-brand-primary" aria-hidden="true" />
                            </div>
                            <h3 className="font-bold text-slate-800">Datos de Entrenamiento</h3>
                        </div>
                        <ul className="space-y-2.5 text-sm text-slate-600">
                            <li className="flex gap-2">
                                <span className="text-brand-primary font-bold shrink-0">•</span>
                                Dataset público <strong>LIDC-IDRI</strong> (Lung Image Database Consortium) —
                                1,018 CT pulmonares del Instituto Nacional del Cáncer de EE.UU.
                            </li>
                            <li className="flex gap-2">
                                <span className="text-brand-primary font-bold shrink-0">•</span>
                                <strong>4,918 imágenes</strong> filtradas por consenso de 4 radiólogos independientes —
                                solo casos con acuerdo clínico claro
                            </li>
                            <li className="flex gap-2">
                                <span className="text-brand-primary font-bold shrink-0">•</span>
                                Features clínicas reales: sutileza, calcificación, esfericidad, margen,
                                lobulación, espiculación, textura y malignidad visual
                            </li>
                            <li className="flex gap-2">
                                <span className="text-brand-primary font-bold shrink-0">•</span>
                                Split: 70% entrenamiento / 15% validación / 15% test
                            </li>
                            <li className="flex gap-2">
                                <span className="text-brand-primary font-bold shrink-0">•</span>
                                Entrenado con <strong>45 épocas</strong> en GPU NVIDIA Tesla T4 (Kaggle)
                            </li>
                        </ul>
                    </CardContent>
                </Card>

                {/* Arquitectura */}
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 bg-brand-primary/10 rounded-lg flex items-center justify-center">
                                <Layers className="w-4 h-4 text-brand-primary" aria-hidden="true" />
                            </div>
                            <h3 className="font-bold text-slate-800">Arquitectura del Modelo</h3>
                        </div>
                        <ul className="space-y-2.5 text-sm text-slate-600">
                            <li className="flex gap-2">
                                <span className="text-brand-primary font-bold shrink-0">•</span>
                                <strong>Rama visual:</strong> ResNet18 con transfer learning desde
                                ImageNet (1.2M imágenes). Solo se re-entrenaron las capas finales
                            </li>
                            <li className="flex gap-2">
                                <span className="text-brand-primary font-bold shrink-0">•</span>
                                <strong>Rama clínica:</strong> MLP de 2 capas sobre 8 features
                                radiológicas normalizadas (escala 1–5 según criterios Lung-RADS)
                            </li>
                            <li className="flex gap-2">
                                <span className="text-brand-primary font-bold shrink-0">•</span>
                                <strong>Fusión:</strong> Concatenación de embeddings (512D imagen +
                                32D clínico) + capas densas + activación sigmoid
                            </li>
                            <li className="flex gap-2">
                                <span className="text-brand-primary font-bold shrink-0">•</span>
                                <strong>Estrategia 2.5D:</strong> cortes axiales centrales como
                                canales 2D — viable en hardware de consumo
                            </li>
                            <li className="flex gap-2">
                                <span className="text-brand-primary font-bold shrink-0">•</span>
                                Framework: <strong>PyTorch + MONAI</strong> — desplegado en
                                Hugging Face Spaces (CPU)
                            </li>
                        </ul>
                    </CardContent>
                </Card>

                {/* Métricas */}
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                                <BarChart3 className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                            </div>
                            <h3 className="font-bold text-slate-800">Métricas de Validación</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { label: "Accuracy", value: "85.2%" },
                                { label: "AUC-ROC", value: "0.916" },
                                { label: "Casos test", value: "738" },
                                { label: "Épocas", value: "45" },
                            ].map(({ label, value }) => (
                                <div key={label} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{label}</p>
                                    <p className="text-xl font-extrabold text-slate-800 mt-1">{value}</p>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-slate-500 mt-4">
                            AUC-ROC de 0.5 = modelo aleatorio · 1.0 = modelo perfecto.
                            Nuestro 0.916 es comparable con literatura académica publicada
                            usando el mismo dataset LIDC-IDRI.
                        </p>
                    </CardContent>
                </Card>

                {/* Interpretación del Score */}
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 bg-brand-primary/10 rounded-lg flex items-center justify-center">
                                <ShieldCheck className="w-4 h-4 text-brand-primary" aria-hidden="true" />
                            </div>
                            <h3 className="font-bold text-slate-800">Interpretación del Score</h3>
                        </div>
                        <div className="space-y-2.5">
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider w-16 shrink-0">BAJO</span>
                                <div className="h-2 flex-1 rounded-full bg-emerald-200 overflow-hidden">
                                    <div className="h-full bg-emerald-500 w-[33%]"/>
                                </div>
                                <span className="text-xs text-emerald-700 font-semibold shrink-0">0 – 0.33</span>
                            </div>
                            <p className="text-xs text-slate-500 px-1 -mt-1">Control rutinario recomendado</p>

                            <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                                <span className="text-xs font-bold text-amber-700 uppercase tracking-wider w-16 shrink-0">MEDIO</span>
                                <div className="h-2 flex-1 rounded-full bg-amber-200 overflow-hidden">
                                    <div className="h-full bg-amber-500 w-[66%]"/>
                                </div>
                                <span className="text-xs text-amber-700 font-semibold shrink-0">0.33 – 0.66</span>
                            </div>
                            <p className="text-xs text-slate-500 px-1 -mt-1">Seguimiento recomendado</p>

                            <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 border border-red-200">
                                <span className="text-xs font-bold text-red-700 uppercase tracking-wider w-16 shrink-0">ALTO</span>
                                <div className="h-2 flex-1 rounded-full bg-red-200 overflow-hidden">
                                    <div className="h-full bg-red-500 w-[90%]"/>
                                </div>
                                <span className="text-xs text-red-700 font-semibold shrink-0">0.66 – 1.0</span>
                            </div>
                            <p className="text-xs text-slate-500 px-1 -mt-1">Evaluación urgente recomendada</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Endpoint de la API */}
            <Card className="mb-6">
                <CardContent className="p-6">
                    <h3 className="font-bold text-slate-800 mb-3">Endpoint del Microservicio IA</h3>
                    <div className="bg-slate-900 rounded-xl p-4 font-mono text-sm text-slate-300">
                        <p className="text-emerald-400">POST</p>
                        <p className="text-white mt-1">https://luisdam-oncoscan-ai.hf.space/predict</p>
                        <p className="text-slate-500 mt-3 text-xs">Parámetros (form-data):</p>
                        <p className="text-slate-400 text-xs">imagen · subtlety · calcification · sphericity</p>
                        <p className="text-slate-400 text-xs">margin · lobulation · spiculation · texture · malignancy</p>
                        <p className="text-slate-500 mt-3 text-xs">Respuesta:</p>
                        <p className="text-amber-400 text-xs">{"{ score, nivel_riesgo, recomendacion, modelo_version }"}</p>
                    </div>
                </CardContent>
            </Card>

            {/* Aviso clínico */}
            <AlertBanner
                variant="warning"
                title="Aviso Clínico Importante"
                description="Este sistema es exclusivamente una herramienta de apoyo diagnóstico. Los resultados del modelo IA no constituyen diagnóstico médico definitivo y no deben reemplazar el juicio clínico del especialista. Todo resultado debe ser validado por un profesional de salud calificado antes de tomar decisiones terapéuticas."
            />
        </PageContainer>
    );
}