"use client";

import dynamic from "next/dynamic";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { Card, CardContent } from "@/components/ui/Card";
import { Brain, Database, BarChart3, ShieldCheck, Layers, BookOpen } from "lucide-react";
import { SourceLink } from "@/components/referencias/SourceLink";
import { ReferenceList } from "@/components/referencias/ReferenceList";
import { REFERENCES } from "@/lib/references";

/* ─── Dynamic imports (client components, no SSR) ────────────────────── */
const AccuracyChart = dynamic(
    () => import("@/components/modelo/AccuracyChart"),
    { ssr: false, loading: () => <ChartSkeleton /> },
);
const ROCCurve = dynamic(
    () => import("@/components/modelo/ROCCurve"),
    { ssr: false, loading: () => <ChartSkeleton /> },
);
const ConfusionMatrix = dynamic(
    () => import("@/components/modelo/ConfusionMatrix"),
    { ssr: false, loading: () => <ChartSkeleton /> },
);
const RiskDistributionChart = dynamic(
    () => import("@/components/modelo/RiskDistributionChart"),
    { ssr: false, loading: () => <ChartSkeleton /> },
);
const ScoreDistribution = dynamic(
    () => import("@/components/modelo/ScoreDistribution"),
    { ssr: false, loading: () => <ChartSkeleton /> },
);
const FeaturesTable = dynamic(
    () => import("@/components/modelo/FeaturesTable"),
    { ssr: false, loading: () => <ChartSkeleton /> },
);
const ArchitecturePipeline = dynamic(
    () => import("@/components/modelo/ArchitecturePipeline"),
    { ssr: false, loading: () => <ChartSkeleton /> },
);

/* ─── Skeleton for lazy-loaded charts ────────────────────────────────── */
function ChartSkeleton() {
    return (
        <div className="w-full h-[340px] bg-slate-50 rounded-2xl border border-slate-200 animate-pulse flex items-center justify-center">
            <BarChart3 className="w-8 h-8 text-slate-300" />
        </div>
    );
}

/* ─── KPI Metric data ────────────────────────────────────────────────── */
const KPI_METRICS = [
    { label: "Accuracy", value: "89.8%", icon: BarChart3, accent: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "AUC-ROC", value: "0.950", icon: BarChart3, accent: "text-blue-600", bg: "bg-blue-50" },
    { label: "Casos test", value: "687", icon: Database, accent: "text-violet-600", bg: "bg-violet-50" },
    { label: "Épocas", value: "45", icon: Layers, accent: "text-amber-600", bg: "bg-amber-50" },
] as const;

/* ─── Page ───────────────────────────────────────────────────────────── */
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

            {/* ── Hero: Model ID ─────────────────────────────────────────── */}
            <div className="bg-brand-primary rounded-2xl border border-brand-primary-hover p-6 mb-6 flex flex-col md:flex-row gap-6 items-start">
                <div className="w-12 h-12 bg-white/15 border border-white/20 rounded-xl flex items-center justify-center shrink-0">
                    <Brain className="w-6 h-6 text-white" aria-hidden="true" />
                </div>
                <div>
                    <p className="text-xs text-white/80 font-bold uppercase tracking-widest mb-1">Versión activa</p>
                    <h2 className="text-2xl font-extrabold text-white">multimodal-v1.1</h2>
                    <p className="text-white/80 text-sm mt-2 max-w-2xl">
                        Modelo de clasificación de nódulos pulmonares desplegado en{" "}
                        <SourceLink href={REFERENCES.inferenceService.url} tone="onDark">Hugging Face Spaces</SourceLink>.
                        Combina análisis de imagen CT con features clínicas radiológicas estructuradas
                        para estimar la probabilidad de malignidad de un nódulo pulmonar.
                        Soporta imágenes PNG, JPG y archivos DICOM (.dcm) nativos.
                    </p>
                </div>
            </div>

            {/* ── KPI Cards ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {KPI_METRICS.map(({ label, value, icon: Icon, accent, bg }) => (
                    <Card key={label}>
                        <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center`}>
                                <Icon className={`w-5 h-5 ${accent}`} aria-hidden="true" />
                            </div>
                            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{label}</p>
                            <p className="text-2xl font-extrabold text-slate-800">{value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* ── Section: Training Results ───────────────────────────────── */}
            <SectionDivider title="Resultados del Entrenamiento" icon={<BarChart3 className="w-5 h-5" />} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                <AccuracyChart />
                <ROCCurve />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                <ConfusionMatrix />
                {/* Datos de entrenamiento info card */}
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
                                <span>
                                    Dataset público{" "}
                                    <SourceLink href={REFERENCES.lidcData.url}><strong>LIDC-IDRI</strong></SourceLink>{" "}
                                    (Lung Image Database Consortium, The Cancer Imaging Archive) — 1,018 casos de TC
                                    torácica de 7 centros académicos, iniciativa financiada por el Instituto Nacional del
                                    Cáncer de EE.UU. Licencia CC BY 3.0.
                                </span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-brand-primary font-bold shrink-0">•</span>
                                <span>
                                    <strong>4,918 imágenes</strong> filtradas por el equipo según el acuerdo entre los 4
                                    radiólogos torácicos que anotaron cada caso (
                                    <SourceLink href={REFERENCES.lidcPaper.url}>Armato et al., 2011</SourceLink>)
                                </span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-brand-primary font-bold shrink-0">•</span>
                                Features clínicas reales: sutileza, calcificación, esfericidad, margen,
                                lobulación, espiculación, textura y malignidad visual (anotaciones LIDC)
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
            </div>

            {/* ── Section: Risk Classification ────────────────────────────── */}
            <SectionDivider title="Clasificación de Riesgo" icon={<ShieldCheck className="w-5 h-5" />} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                <RiskDistributionChart />
                <ScoreDistribution />
            </div>

            {/* Score interpretation card */}
            <Card id="interpretacion-score" className="mb-8 scroll-mt-24">
                <CardContent className="p-6">
                    <h3 className="font-bold text-slate-800 mb-4">Interpretación del Score</h3>
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

                    <div className="mt-6 pt-5 border-t border-slate-100 space-y-3 text-sm text-slate-600">
                        <h4 className="text-sm font-semibold text-slate-800">¿De dónde salen estos cortes?</h4>
                        <p>
                            El score es la salida (0–1) de la red multimodal. Los cortes <strong>0.33</strong> y{" "}
                            <strong>0.66</strong> y los textos de recomendación están definidos en la función{" "}
                            <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">nivel_riesgo()</code> del{" "}
                            <SourceLink href={REFERENCES.inferenceService.url}>servicio de inferencia</SourceLink>: dividen el
                            rango en tercios. <strong>No provienen de una norma colombiana</strong> — la regulación nacional
                            no fija umbrales para scores de IA — y el score no ha sido calibrado como probabilidad clínica
                            de malignidad.
                        </p>
                        <p>
                            La referencia clínica más cercana es la{" "}
                            <SourceLink href={REFERENCES.gpc36.url}>GPC No. 36 del Ministerio de Salud (2014)</SourceLink>,
                            que adopta los criterios de la ACCP para nódulos pulmonares. La{" "}
                            <SourceLink href={REFERENCES.accp2013.url}>ACCP 2013</SourceLink> clasifica la probabilidad de
                            malignidad en muy baja (&lt;5%), baja–moderada (5–65%) y alta (&gt;65%). El corte ALTO del modelo
                            (≥ 0.66) queda cerca del umbral de alta probabilidad de la ACCP; el rango BAJO (&lt; 0.33) es mucho
                            más amplio que el &lt;5% de la ACCP, así que un resultado BAJO <strong>no</strong> equivale a
                            “muy baja probabilidad”.
                        </p>
                        <p>
                            La categoría de reporte la asigna el radiólogo con{" "}
                            <SourceLink href={REFERENCES.lungRads.url}>ACR Lung-RADS v2022</SourceLink> (tamización) o con la{" "}
                            <SourceLink href={REFERENCES.fleischner2017.url}>Fleischner Society 2017</SourceLink> (hallazgo
                            incidental). El modelo no asigna estas categorías.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Seguimiento normativo por tamaño — GPC No. 36, Rec. 2.1 */}
            <Card id="seguimiento-gpc" className="mb-8 scroll-mt-24">
                <CardContent className="p-6">
                    <h3 className="font-bold text-slate-800 mb-1">Seguimiento de nódulos sólidos según la GPC No. 36</h3>
                    <p className="text-sm text-slate-600 mb-4">
                        Recomendación 2.1 de la{" "}
                        <SourceLink href={REFERENCES.gpc36.url}>Guía de Práctica Clínica de cáncer de pulmón (MinSalud, 2014)</SourceLink>,
                        págs. 31–33. Controles con TAC según el diámetro del nódulo.
                    </p>
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-sm text-left min-w-[560px]">
                            <caption className="sr-only">Intervalos de seguimiento por TAC según tamaño del nódulo y factores de riesgo</caption>
                            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                                <tr>
                                    <th scope="col" className="py-2.5 px-4 font-semibold">Diámetro</th>
                                    <th scope="col" className="py-2.5 px-4 font-semibold">Sin factores de riesgo</th>
                                    <th scope="col" className="py-2.5 px-4 font-semibold">Con factores de riesgo</th>
                                </tr>
                            </thead>
                            <tbody className="text-slate-700">
                                <tr className="border-t border-slate-100">
                                    <th scope="row" className="py-2.5 px-4 font-medium">≤ 4 mm</th>
                                    <td className="py-2.5 px-4">Sin seguimiento (informar al paciente)</td>
                                    <td className="py-2.5 px-4">Control a 12 meses</td>
                                </tr>
                                <tr className="border-t border-slate-100">
                                    <th scope="row" className="py-2.5 px-4 font-medium">&gt; 4 – 6 mm</th>
                                    <td className="py-2.5 px-4">Control a 12 meses</td>
                                    <td className="py-2.5 px-4">6 y 12 meses; si no cambia, 18 y 24 meses</td>
                                </tr>
                                <tr className="border-t border-slate-100">
                                    <th scope="row" className="py-2.5 px-4 font-medium">&gt; 6 – 8 mm</th>
                                    <td className="py-2.5 px-4">6 y 12 meses; si no cambia, 18 y 24 meses</td>
                                    <td className="py-2.5 px-4">3, 6, 9 y 12 meses; si no cambia, 24 meses</td>
                                </tr>
                                <tr className="border-t border-slate-100">
                                    <th scope="row" className="py-2.5 px-4 font-medium">&gt; 8 mm</th>
                                    <td className="py-2.5 px-4" colSpan={2}>Sugestivo de malignidad: requiere confirmación histológica</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <p className="text-xs text-slate-500 mt-3">
                        Nódulos no sólidos (vidrio esmerilado) &gt; 5 mm: control anual hasta 3 años. Subsólidos ≤ 8 mm: 6, 12
                        y 24 meses, luego anual hasta 3 años. Factores de riesgo: edad &gt; 55 años, tabaquismo, exposición a
                        asbesto, antecedentes familiares.
                    </p>
                </CardContent>
            </Card>

            {/* ── Section: Model Architecture ─────────────────────────────── */}
            <SectionDivider title="Arquitectura y Features" icon={<Layers className="w-5 h-5" />} />

            <div className="mb-6">
                <ArchitecturePipeline />
                <p className="text-xs text-slate-500 mt-3 px-1">
                    Rama de imagen:{" "}
                    <SourceLink href={REFERENCES.resnet.url}>ResNet-18 (He et al., 2016)</SourceLink> con transfer learning.
                    Explicabilidad: <SourceLink href={REFERENCES.gradcam.url}>Grad-CAM (Selvaraju et al., 2017)</SourceLink>.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                <div className="md:col-span-2">
                    <FeaturesTable />
                </div>
            </div>

            {/* ── Endpoint de la API ──────────────────────────────────────── */}
            <Card className="mb-6">
                <CardContent className="p-6">
                    <h3 className="font-bold text-slate-800 mb-1">Endpoint del Microservicio IA</h3>
                    <p className="text-xs text-slate-500 mb-3">
                        Código fuente: <SourceLink href={REFERENCES.inferenceService.url}>service.py en Hugging Face</SourceLink>
                    </p>
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

            {/* ── Section: Privacidad y Desidentificación de Datos ─────────── */}
            <div id="privacidad-datos" className="scroll-mt-24 mb-6">
                <SectionDivider title="Privacidad y Desidentificación de Datos" icon={<ShieldCheck className="w-5 h-5" />} />
                <Card>
                    <CardContent className="p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                            <div>
                                <h3 className="font-bold text-slate-800 text-base">Protocolo de Desidentificación en Origen</h3>
                                <p className="text-xs text-slate-500">
                                    Conforme a la <SourceLink href={REFERENCES.ley1581.url}>Ley 1581 de 2012</SourceLink> (Habeas Data) y el estándar internacional <SourceLink href={REFERENCES.dicomPs315.url}>DICOM PS 3.15 (Anexo E)</SourceLink>.
                                </p>
                            </div>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                Activo en ingestión
                            </span>
                        </div>

                        <p className="text-sm text-slate-600 leading-relaxed">
                            Para proteger los datos sensibles de salud, todo archivo tomográfico DICOM (<code>.dcm</code>) subido a OncoScan es procesado en memoria volátil por el motor de desidentificación antes de persistir en almacenamiento o enviarse al microservicio de inferencia:
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                                    1. Purgado de Identificadores (PHI)
                                </p>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    Se eliminan nombres propios (<code>PatientName</code> reemplazado por <code>ONCOSCAN-ANON</code>), nombres de clínicas (<code>InstitutionName</code>), médicos tratantes y etiquetas privadas propietarias de fabricantes.
                                </p>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                                    2. Seudonimización Criptográfica
                                </p>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    El documento de identidad (<code>PatientID</code>) se transforma mediante <code>HMAC-SHA256</code> con salt del servidor en un código irreversible (<code>ONC-PAT-xxxx</code>). Permite comparar estudios de control del mismo paciente a lo largo del tiempo sin exponer su cédula.
                                </p>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                                    3. Preservación Física Radiológica
                                </p>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    Se preservan intactos los parámetros indispensables para la red neuronal: unidades Hounsfield (<code>RescaleSlope</code>, <code>RescaleIntercept</code>), ventana pulmonar, espaciamiento milimétrico (<code>PixelSpacing</code>), grosor de corte y fecha del estudio.
                                </p>
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 space-y-2">
                            <p className="font-semibold text-slate-800">Inferencia con Retención Cero (Zero Data Retention):</p>
                            <p>
                                El microservicio de inferencia en Hugging Face Spaces procesa la pasada hacia adelante de ResNet-18 y genera el mapa Grad-CAM exclusivamente en la memoria RAM del contenedor. No retiene copias del estudio en disco ni bases de datos de terceros, garantizando que el cómputo sea efímero y seguro.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ── Fuentes y marco normativo ───────────────────────────────── */}

            <div id="referencias" className="scroll-mt-24">
                <SectionDivider title="Fuentes y marco normativo" icon={<BookOpen className="w-5 h-5" />} />
                <Card className="mb-6">
                    <CardContent className="p-6">
                        <ReferenceList />
                    </CardContent>
                </Card>
            </div>

            {/* ── Clinical disclaimer ─────────────────────────────────────── */}
            <AlertBanner
                variant="warning"
                title="Aviso Clínico Importante"
                description="Este sistema es exclusivamente una herramienta de apoyo diagnóstico. Los resultados del modelo IA no constituyen diagnóstico médico definitivo y no deben reemplazar el juicio clínico del especialista. Todo resultado debe ser validado por un profesional de salud calificado antes de tomar decisiones terapéuticas."
            />
        </PageContainer>
    );
}

/* ─── Section divider component ──────────────────────────────────────── */
function SectionDivider({ title, icon }: { title: string; icon: React.ReactNode }) {
    return (
        <div className="flex items-center gap-3 mb-6 mt-2">
            <div className="w-9 h-9 bg-brand-primary/10 rounded-lg flex items-center justify-center text-brand-primary">
                {icon}
            </div>
            <h2 className="text-xl font-bold text-slate-800">{title}</h2>
            <div className="flex-1 h-px bg-slate-200" />
        </div>
    );
}