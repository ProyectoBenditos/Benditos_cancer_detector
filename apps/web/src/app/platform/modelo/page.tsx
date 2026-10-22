"use client";

import dynamic from "next/dynamic";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { Card, CardContent } from "@/components/ui/Card";
import {
    Brain,
    Database,
    BarChart3,
    ShieldCheck,
    Layers,
    BookOpen,
    Microscope,
    Eye,
    Activity,
    CheckCircle2,
    Cpu,
    Sparkles,
} from "lucide-react";
import { SourceLink } from "@/components/referencias/SourceLink";
import { ReferenceList } from "@/components/referencias/ReferenceList";
import { REFERENCES } from "@/lib/references";
import { HISTOLOGICAL_SUBTYPES, CLID_METRICS, MODEL_METRICS } from "@/components/modelo/modelData";

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

/* ─── KPI Metric data (OncoScan 2.0 Verified GPU Results) ─────────────── */
const KPI_METRICS = [
    { label: "Sensibilidad", value: MODEL_METRICS.sensitivity, icon: ShieldCheck, accent: "text-emerald-600", bg: "bg-emerald-50", sub: "193/203 nódulos capturados" },
    { label: "AUC-ROC", value: MODEL_METRICS.aucRoc, icon: BarChart3, accent: "text-blue-600", bg: "bg-blue-50", sub: "AUPRC = 0.9784" },
    { label: "Casos Test (Zero-Leak)", value: MODEL_METRICS.testCases, icon: Database, accent: "text-violet-600", bg: "bg-violet-50", sub: "Separación estricta por paciente" },
    { label: "Especificidad", value: MODEL_METRICS.specificity, icon: Activity, accent: "text-brand-primary", bg: "bg-pink-50", sub: "132/154 controles confirmados" },
] as const;

/* ─── Page ───────────────────────────────────────────────────────────── */
export default function ModeloPage() {
    return (
        <PageContainer>
            <SectionHeader
                title="Detalles del Sistema"
                description="Arquitectura de IA multimodal de 2da generación, benchmark de validación sin fuga de datos y marco normativo."
            />

            <AlertBanner
                variant="warning"
                title="Herramienta de apoyo diagnóstico"
                description="Este sistema es una herramienta de apoyo clínico. Los resultados no constituyen diagnóstico médico definitivo y deben ser validados por un profesional de salud calificado."
                className="mb-6"
            />

            {/* ── Hero: Model ID ─────────────────────────────────────────── */}
            <div className="bg-brand-primary rounded-2xl border border-brand-primary-hover p-6 mb-6 flex flex-col md:flex-row gap-6 items-start">
                <div className="w-12 h-12 bg-white/15 border border-white/20 rounded-xl flex items-center justify-center shrink-0">
                    <Brain className="w-6 h-6 text-white" aria-hidden="true" />
                </div>
                <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="text-xs text-white/80 font-bold uppercase tracking-widest">Versión activa</p>
                        <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-bold">
                            CALIBRADO A NIVEL PACIENTE
                        </span>
                    </div>
                    <h2 className="text-2xl font-extrabold text-white">OncoScan 2.0 • Multimodal DenseNet-121 + CLID</h2>
                    <p className="text-white/80 text-sm mt-2 max-w-3xl leading-relaxed">
                        Arquitectura multimodal híbrida de segunda generación entrenada sobre consenso de 4 radiólogos (LIDC-IDRI) y validada bajo protocolo estricto <em>Patient-Level Zero-Leakage</em>.
                        Combina extracción profunda de características visuales en parénquima pulmonar (1024D), encoder contrastivo de dominio (64D) y prior clínico estructurado (32D) mediante un cabezal XGBoost calibrado (1120D).
                        Incorpora mapas de calor de alta resolución <strong>HiResCAM 128×128</strong> y clasificación simultánea de <strong>4 subtipos histopatológicos</strong> (CLID) con 99.39% de sensibilidad oncológica.
                    </p>
                </div>
            </div>

            {/* ── KPI Cards ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {KPI_METRICS.map(({ label, value, icon: Icon, accent, bg, sub }) => (
                    <Card key={label}>
                        <CardContent className="p-4 flex flex-col items-center text-center gap-1.5">
                            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center`}>
                                <Icon className={`w-5 h-5 ${accent}`} aria-hidden="true" />
                            </div>
                            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{label}</p>
                            <p className="text-2xl font-extrabold text-slate-800">{value}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{sub}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* ── Section: Training Results ───────────────────────────────── */}
            <SectionDivider title="Resultados del Entrenamiento y Validación" icon={<BarChart3 className="w-5 h-5" />} />

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
                            <h3 className="font-bold text-slate-800">Protocolo de Datos y Rigor Metodológico</h3>
                        </div>
                        <ul className="space-y-3 text-sm text-slate-600">
                            <li className="flex gap-2">
                                <span className="text-brand-primary font-bold shrink-0">•</span>
                                <span>
                                    <strong>Separación Estricta a Nivel Paciente (Zero-Leakage):</strong> Los 357 casos del conjunto de prueba independiente pertenecen a pacientes cuyos cortes tomográficos nunca fueron vistos durante el entrenamiento ni validación interna, garantizando generalización real en clínica.
                                </span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-brand-primary font-bold shrink-0">•</span>
                                <span>
                                    Dataset público{" "}
                                    <SourceLink href={REFERENCES.lidcData.url}><strong>LIDC-IDRI</strong></SourceLink>{" "}
                                    (1,018 tomografías torácicas multicéntricas) filtradas por consenso radiológico de 4 especialistas (
                                    <SourceLink href={REFERENCES.lidcPaper.url}>Armato et al., 2011</SourceLink>).
                                </span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-brand-primary font-bold shrink-0">•</span>
                                <span>
                                    <strong>Preprocesamiento Físico HU:</strong> Normalización a ventana pulmonar estándar (Centro: -600 HU, Ancho: 1500 HU) con corrección matemática de <code>RescaleSlope</code> e <code>Intercept</code>.
                                </span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-brand-primary font-bold shrink-0">•</span>
                                <span>
                                    <strong>Umbral Clínico Optimizado (τ = 0.35):</strong> Seleccionado para maximizar sensibilidad oncológica (95.07%), minimizando los falsos negativos a tan solo 10 casos en la cohorte de prueba.
                                </span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-brand-primary font-bold shrink-0">•</span>
                                <span>
                                    Entrenado y validado en <strong>2× GPU NVIDIA Tesla T4</strong> con Test-Time Augmentation (TTA 4x).
                                </span>
                            </li>
                        </ul>
                    </CardContent>
                </Card>
            </div>

            {/* ── Section: Risk Classification ────────────────────────────── */}
            <SectionDivider title="Estratificación de Riesgo Oncológico" icon={<ShieldCheck className="w-5 h-5" />} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                <RiskDistributionChart />
                <ScoreDistribution />
            </div>

            {/* Score interpretation card */}
            <Card id="interpretacion-score" className="mb-8 scroll-mt-24">
                <CardContent className="p-6">
                    <h3 className="font-bold text-slate-800 mb-4">Interpretación del Score y Umbrales Clínicos</h3>
                    <div className="space-y-2.5">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider w-16 shrink-0">BAJO</span>
                            <div className="h-2 flex-1 rounded-full bg-emerald-200 overflow-hidden">
                                <div className="h-full bg-emerald-500 w-[35%]"/>
                            </div>
                            <span className="text-xs text-emerald-700 font-semibold shrink-0">0 – 0.35</span>
                        </div>
                        <p className="text-xs text-slate-500 px-1 -mt-1">
                            Baja sospecha (&lt; 0.35). Control tomográfico rutinario según guías de tamizaje.
                        </p>

                        <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider w-16 shrink-0">MEDIO</span>
                            <div className="h-2 flex-1 rounded-full bg-amber-200 overflow-hidden">
                                <div className="h-full bg-amber-500 w-[65%]"/>
                            </div>
                            <span className="text-xs text-amber-700 font-semibold shrink-0">0.35 – 0.65</span>
                        </div>
                        <p className="text-xs text-slate-500 px-1 -mt-1">
                            Sospecha intermedia. Seguimiento tomográfico estrecho a corto plazo (3–6 meses).
                        </p>

                        <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 border border-red-200">
                            <span className="text-xs font-bold text-red-700 uppercase tracking-wider w-16 shrink-0">ALTO</span>
                            <div className="h-2 flex-1 rounded-full bg-red-200 overflow-hidden">
                                <div className="h-full bg-red-500 w-[95%]"/>
                            </div>
                            <span className="text-xs text-red-700 font-semibold shrink-0">0.65 – 1.0</span>
                        </div>
                        <p className="text-xs text-slate-500 px-1 -mt-1">
                            Alta sospecha de malignidad. Priorización urgente para comité de tórax y biopsia diagnóstica.
                        </p>
                    </div>

                    <div className="mt-6 pt-5 border-t border-slate-100 space-y-3 text-sm text-slate-600">
                        <h4 className="text-sm font-semibold text-slate-800">Calibración y Correlación con Guías Médicas</h4>
                        <p>
                            El score de OncoScan 2.0 es emitido por un cabezal <strong>XGBoost calibrado con escalamiento de Platt</strong>, de modo que el valor numérico refleja una probabilidad empírica continua. Al calibrar el umbral operativo a <strong>τ = 0.35</strong>, se asegura una sensibilidad diagnóstica del <strong>95.07%</strong>, alineándose con las recomendaciones internacionales de tamizaje que exigen tasas de falsos negativos mínimas.
                        </p>
                        <p>
                            En concordancia con la{" "}
                            <SourceLink href={REFERENCES.gpc36.url}>GPC No. 36 del Ministerio de Salud (2014)</SourceLink> y la{" "}
                            <SourceLink href={REFERENCES.accp2013.url}>ACCP 2013</SourceLink>, los nódulos clasificados con score ≥ 0.65 corresponden a la categoría de alta probabilidad (&gt;65%), activando de inmediato el protocolo de evaluación interdisciplinaria.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* ── Section: Model Architecture ─────────────────────────────── */}
            <SectionDivider title="Arquitectura Multimodal y Fusión Profunda" icon={<Layers className="w-5 h-5" />} />

            <div className="mb-6">
                <ArchitecturePipeline />
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mt-3 px-1 text-xs text-slate-500">
                    <p>
                        Extracción convolucional: <strong>DenseNet-121 (Huang et al.)</strong> con skip connections densas.
                    </p>
                    <p className="flex items-center gap-1 text-brand-primary font-semibold">
                        <Eye className="w-3.5 h-3.5" />
                        Explicabilidad: HiResCAM (Draelos & Carin, NeurIPS) sin pérdida de resolución espacial
                    </p>
                </div>
            </div>

            {/* ── Section: Histological Subtypes (CLID Model) ──────────────── */}
            <SectionDivider title="Clasificador Histopatológico CLID (4 Clases)" icon={<Microscope className="w-5 h-5" />} />

            <Card className="mb-8">
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-5">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-violet-100 text-violet-800 border border-violet-200">
                                    Modelo 2 de Cascada
                                </span>
                                <h3 className="font-bold text-slate-900 text-base">
                                    Diferenciación Histológica de Nódulos Sospechosos
                                </h3>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                                Entrenado sobre el <em>Comprehensive Lung Cancer Imaging Dataset</em> ({CLID_METRICS.dataset}) con {CLID_METRICS.testCases} casos de prueba independientes.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <strong>99.39%</strong> Sensibilidad Cáncer vs Normal (164/165)
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {HISTOLOGICAL_SUBTYPES.map((st) => (
                            <div
                                key={st.id}
                                className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:shadow-xs transition-all flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex items-center justify-between gap-1 mb-2">
                                        <span className="text-xs font-bold text-slate-900">{st.name}</span>
                                        <span
                                            className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full text-white"
                                            style={{ backgroundColor: st.color }}
                                        >
                                            {st.code}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 font-semibold mb-2">{st.frequency}</p>
                                    <p className="text-xs text-slate-600 leading-relaxed mb-3">{st.description}</p>
                                </div>
                                <div className="pt-2 border-t border-slate-200/80 text-[11px]">
                                    <span className="text-slate-400 font-medium block">Biomarcadores:</span>
                                    <span className="text-slate-700 font-semibold">{st.biomarkers}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                <div className="md:col-span-2">
                    <FeaturesTable />
                </div>
            </div>

            {/* ── Endpoint de la API ──────────────────────────────────────── */}
            <Card className="mb-6">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <h3 className="font-bold text-slate-800 text-base">Endpoints del Microservicio de Inferencia</h3>
                            <p className="text-xs text-slate-500">
                                Despliegue dual: Microservicio local para desarrollo/pruebas y servidor dedicado de alta disponibilidad.
                            </p>
                        </div>
                        <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                            FastAPI + PyTorch
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        {/* Entorno Local */}
                        <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs text-slate-300 space-y-2">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                <span className="text-emerald-400 font-bold">ENTORNO LOCAL (Dev & Test)</span>
                                <span className="text-[10px] text-slate-400">Puerto 8001</span>
                            </div>
                            <p className="text-slate-400">POST http://localhost:8001/predict</p>
                            <p className="text-slate-500 text-[11px]">
                                Carga directa de pesos: DenseNet-121 + LIDC Domain + XGBoost Head + CLID Subtype.
                            </p>
                        </div>

                        {/* Entorno Servidor */}
                        <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs text-slate-300 space-y-2">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                <span className="text-blue-400 font-bold">ENTORNO PRODUCCIÓN</span>
                                <span className="text-[10px] text-slate-400">Oracle Cloud Dedicated</span>
                            </div>
                            <p className="text-white">POST https://oncoscan-ai.duckdns.org/predict</p>
                            <p className="text-slate-500 text-[11px]">
                                Respuesta enriquecida: <code>{"{ score, nivel_riesgo, subtipo_histologico, hirescam_grid }"}</code>
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ── Hoja de Ruta: Gemelo Digital 3D ──────────────────────────── */}
            <Card className="mb-6 border-brand-primary/20 bg-gradient-to-br from-slate-50 via-white to-brand-primary/5">
                <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-brand-primary bg-brand-primary/10 px-2.5 py-1 rounded-full">
                                Hoja de Ruta • Fase 3 (En Implementación)
                            </span>
                            <h3 className="text-lg font-bold text-slate-900 mt-2">
                                Gemelo Digital Pulmonar 3D & Simulación Respiratoria
                            </h3>
                            <p className="text-xs text-slate-600 mt-0.5">
                                Reconstrucción volumétrica continua por raymarching en WebGL (Three.js) combinada con segmentación lobar de NVIDIA MONAI.
                            </p>
                        </div>
                        <span className="text-xs font-mono font-semibold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                            Roadmap Fase 3
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                            <p className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
                                1. Raymarching Volumétrico (160 Cortes)
                            </p>
                            <p className="text-xs text-slate-600 leading-relaxed">
                                Renderizado en tiempo real a 60 FPS mediante Texture Atlas 2D / Data3DTexture con funciones de transferencia en ventana de parénquima (-600/1500 HU) y planos de corte ortogonales (Axial, Sagital, Coronal).
                            </p>
                        </div>

                        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                            <p className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
                                2. Segmentación Lobar 3D (MONAI)
                            </p>
                            <p className="text-xs text-slate-600 leading-relaxed">
                                Aislamiento anatómico de los 5 lóbulos pulmonares (LSD, LMD, LID, LSI, LII) para ubicar el nódulo y medir la distancia a la pleura parietal y cisuras interlobares.
                            </p>
                        </div>

                        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                            <p className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
                                3. Simulación Respiratoria (MONAI Physio)
                            </p>
                            <p className="text-xs text-slate-600 leading-relaxed">
                                Modelo dinámico de excursión diafragmática (Δz en mm) para proyectar el desplazamiento fisiológico del nódulo durante el ciclo ventilatorio del paciente.
                            </p>
                        </div>
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
                                El microservicio de inferencia procesa la pasada hacia adelante de DenseNet-121 y genera el mapa HiResCAM exclusivamente en memoria RAM. No retiene copias del estudio en disco ni bases de datos de terceros, garantizando que el cómputo sea efímero y seguro.
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
