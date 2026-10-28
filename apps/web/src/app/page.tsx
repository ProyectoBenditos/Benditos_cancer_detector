import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Upload,
  Activity,
  FileText,
  ShieldCheck,
  Stethoscope,
  ArrowRight,
  CheckCircle2,
  BriefcaseMedical,
  Code,
  User,
  ExternalLink,
  Eye,
  Box,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { HeroDemoViewer } from "@/components/landing/HeroDemoViewer";
import { SourceLink } from "@/components/referencias/SourceLink";
import { REFERENCES } from "@/lib/references";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-brand-bg text-slate-900 selection:bg-brand-danger/20 font-sans">

      {/* 1. NAVBAR */}
      <nav
        aria-label="Navegación principal"
        className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200"
      >
        <div className="max-w-6xl mx-auto px-6 h-18 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded-lg"
          >
            <div className="relative w-8 h-8 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-lg p-0.5 shadow-2xs">
              <Image
                src="/images/brand/logo-isotype.png"
                alt="Isotipo OncoScan"
                width={32}
                height={32}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className="font-bold text-xl tracking-tight text-brand-primary">
                Onco<span className="text-brand-danger">Scan</span>
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a
              href="#about"
              className="hover:text-brand-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded px-1 py-0.5"
            >
              Acerca de
            </a>
            <a
              href="#validation"
              className="hover:text-brand-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded px-1 py-0.5"
            >
              Validación
            </a>
            <a
              href="#features"
              className="hover:text-brand-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded px-1 py-0.5"
            >
              Capacidades
            </a>
            <a
              href="#team"
              className="hover:text-brand-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded px-1 py-0.5"
            >
              Equipo
            </a>
          </div>

          <div>
            <Link
              href="/login"
              className="px-5 py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white text-sm font-semibold rounded-lg shadow-2xs hover:shadow-xs transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
            >
              Ingresar
            </Link>
          </div>
        </div>
      </nav>

      <main>
        {/* 2. HERO SECTION */}
        <header className="relative px-6 pt-12 pb-20 md:pt-16 md:pb-24 border-b border-slate-200">
          <div className="max-w-6xl mx-auto flex flex-col items-center text-center">
            
            <div className="mb-5 inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs">
              <BriefcaseMedical className="w-3.5 h-3.5 mr-2 text-brand-danger" aria-hidden="true" />
              Proyecto de Investigación Académica
            </div>

            <h1 className="max-w-4xl text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-900 mb-5 leading-[1.15]">
              Inteligencia Artificial para la{" "}
              <span className="text-brand-danger">
                Estratificación de Riesgo
              </span>{" "}
              en Nódulos Pulmonares
            </h1>

            <p className="max-w-2xl text-base sm:text-lg text-slate-600 mb-5 leading-relaxed">
              Herramienta de soporte a la decisión clínica que procesa tomografías computarizadas de tórax y variables morfológicas estructuradas para asistir en la clasificación y evaluación de nódulos pulmonares sospechosos.
            </p>

            <p className="max-w-2xl text-xs sm:text-sm text-slate-600 mb-8 px-4 py-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <strong>Aviso Clínico:</strong> Esta solución es una herramienta de apoyo analítico e investigativo. No constituye un diagnóstico médico definitivo y no reemplaza el juicio clínico del especialista.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 mb-3">
              <Link
                href="/login"
                className="flex items-center px-6 py-3 bg-brand-danger hover:bg-brand-danger-hover text-white font-semibold text-sm rounded-xl shadow-xs transition active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-danger focus-visible:ring-offset-2"
              >
                Acceder a la Plataforma <ArrowRight className="ml-2 w-4 h-4" aria-hidden="true" />
              </Link>
              <a
                href="#about"
                className="flex items-center px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-xl border border-slate-300 shadow-2xs transition"
              >
                Conoce más
              </a>
              <Link
                href="/demo/pulmon-3d"
                className="flex items-center px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-xl border border-slate-300 shadow-2xs transition"
              >
                <Box className="mr-2 w-4 h-4" aria-hidden="true" />
                Ver demostración 3D
              </Link>
            </div>
            <p className="text-xs text-slate-500 mb-14">
              Demostración con una TC pública; no procesa estudios de pacientes.
            </p>

            {/* Visor Clínico Interactivo con Grad-CAM */}
            <div className="w-full max-w-xl">
              <HeroDemoViewer />
            </div>

          </div>
        </header>

        {/* 3. VALIDACIÓN DEL MODELO */}
        <section id="validation" className="scroll-mt-20 py-14 bg-brand-primary text-white">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="text-xs font-mono uppercase tracking-widest text-slate-300 font-semibold bg-white/10 px-3 py-1 rounded-full border border-white/15">
                Validación Científica
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mt-3 text-white">
                Rendimiento del Modelo Multimodal
              </h2>
              <p className="text-slate-300 text-sm mt-2">
                Arquitectura híbrida (ResNet-18 para la tomografía + MLP para 8 características clínicas estructuradas), evaluada sobre el benchmark internacional{" "}
                <SourceLink href={REFERENCES.lidcData.url} tone="onDark">LIDC-IDRI</SourceLink>{" "}
                con partición estricta a nivel de paciente.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-center">
                <div className="text-3xl sm:text-4xl font-mono font-bold text-white mb-1">
                  89.8%
                </div>
                <div className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                  Exactitud Global
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  ResNet-18 + MLP
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-center">
                <div className="text-3xl sm:text-4xl font-mono font-bold text-white mb-1">
                  0.950
                </div>
                <div className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                  AUC-ROC
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Poder discriminativo
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-center">
                <div className="text-3xl sm:text-4xl font-mono font-bold text-white mb-1">
                  687
                </div>
                <div className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                  Casos de Prueba
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Partición por paciente
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-center">
                <div className="text-3xl sm:text-4xl font-mono font-bold text-white mb-1">
                  &lt; 3.0s
                </div>
                <div className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                  Inferencia
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Grad-CAM en tiempo real
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. ACERCA DE */}
        <section id="about" className="scroll-mt-20 px-6 py-20 bg-white border-b border-slate-200">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-12 items-center">
            <div className="md:w-1/2">
              <h2 className="text-3xl font-bold text-slate-900 mb-5">
                Soporte a la Decisión Clínica en Nódulos Pulmonares
              </h2>
              <p className="text-slate-600 text-base mb-4 leading-relaxed">
                La evaluación de nódulos pulmonares indeterminados en tomografías computarizadas presenta una marcada variabilidad inter-observador. La alta carga asistencial en los servicios de radiología dificulta la priorización ágil de estudios de alta sospecha.
              </p>
              <p className="text-slate-600 text-base mb-6 leading-relaxed">
                OncoScan asiste al especialista analizando el estudio DICOM, cuantificando las características morfológicas del nódulo y aportando un mapa de explicabilidad visual (Grad-CAM), optimizando la toma de decisiones clínicas y el seguimiento del paciente.
              </p>
              <ul className="space-y-3">
                {[
                  "Priorización asistida de estudios con nódulos sospechosos",
                  "Explicabilidad visual basada en mapas de calor Grad-CAM",
                  "Desidentificación y cadena de custodia bajo estándar DICOM PS 3.15",
                ].map((item, i) => (
                  <li key={i} className="flex items-center text-slate-700 text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mr-2.5 shrink-0" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="md:w-1/2 w-full">
              <div className="bg-brand-bg border border-slate-200 p-7 rounded-2xl shadow-xs space-y-5">
                <div className="flex gap-4 items-start pb-5 border-b border-slate-200">
                  <div className="p-2.5 bg-rose-50 text-brand-danger rounded-xl shrink-0">
                    <Activity className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">Estratificación de Riesgo</h3>
                    <p className="text-xs text-slate-600 mt-0.5">Clasificación en riesgo Bajo, Medio o Alto</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start pb-5 border-b border-slate-200">
                  <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl shrink-0">
                    <ShieldCheck className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">Privacidad y Soberanía del Dato</h3>
                    <p className="text-xs text-slate-600 mt-0.5">Desidentificación irreversible de PHI y zero-retention</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl shrink-0">
                    <Stethoscope className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">Soporte al Criterio Clínico</h3>
                    <p className="text-xs text-slate-600 mt-0.5">Diseñado para asistir y complementar la decisión del especialista</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. CAPACIDADES DEL SISTEMA */}
        <section id="features" className="scroll-mt-20 px-6 py-20 border-b border-slate-200">
          <div className="max-w-6xl mx-auto text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Capacidades del Sistema</h2>
            <p className="text-slate-600 max-w-2xl mx-auto text-base">
              Módulos orientados a garantizar rigor clínico, trazabilidad y explicabilidad diagnóstica.
            </p>
          </div>

          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: <Upload className="w-5 h-5" aria-hidden="true" />,
                title: "Ingesta DICOM y Desidentificación",
                desc: "Anonimización automática de cabeceras médicas bajo el estándar internacional DICOM PS 3.15 con auditoría SHA-256.",
              },
              {
                icon: <Activity className="w-5 h-5" aria-hidden="true" />,
                title: "Inferencia Multimodal IA",
                desc: "Fusión de visión computacional (corte tomográfico) y 8 parámetros morfológicos (espiculación, calcificación, márgenes, etc.).",
              },
              {
                icon: <Eye className="w-5 h-5" aria-hidden="true" />,
                title: "Explicabilidad Grad-CAM",
                desc: "Mapas de atención visual que destacan las áreas espaciales que motivaron la predicción del modelo de aprendizaje profundo.",
              },
              {
                icon: <FileText className="w-5 h-5" aria-hidden="true" />,
                title: "Trazabilidad y Reportes",
                desc: "Historial completo de análisis con exportación estructurada y registro de concordancia clínica para el especialista.",
              },
            ].map((feature, i) => (
              <Card key={i} className="bg-white border-slate-200 hover:border-slate-300 transition duration-200">
                <CardContent className="p-6 flex flex-col items-start gap-3.5">
                  <div className="p-2.5 bg-brand-primary/10 text-brand-primary rounded-xl">
                    {feature.icon}
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{feature.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* 6. EQUIPO DEL PROYECTO */}
        <section id="team" className="scroll-mt-20 px-6 py-20 bg-white border-b border-slate-200">
          <div className="max-w-6xl mx-auto text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Equipo del Proyecto</h2>
            <p className="text-slate-600 max-w-2xl mx-auto text-base">
              Investigadores y desarrolladores detrás de la plataforma OncoScan.
            </p>
          </div>

          <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-8 sm:gap-12">
            {[
              {
                name: "Jair Enrique Sanclemente Castro",
                role: "Docente Asesor / Director de Proyecto",
              },
              {
                name: "Luis Alberto De Avila Mosquera",
                role: "Investigador y Desarrollador",
              },
              {
                name: "Juan Mateo Salas Arturo",
                role: "Investigador y Desarrollador",
              },
            ].map((member, i) => (
              <div key={i} className="flex flex-col items-center group w-56">
                <div className="w-24 h-24 mb-4 rounded-full bg-brand-bg border border-slate-200 overflow-hidden flex items-center justify-center text-slate-500 group-hover:border-brand-primary group-hover:text-brand-primary transition shadow-2xs">
                  <User className="w-10 h-10 stroke-[1.5]" aria-hidden="true" />
                </div>
                <h4 className="font-bold text-base text-slate-900 text-center leading-tight">
                  {member.name}
                </h4>
                <p className="text-xs text-brand-danger font-semibold mt-1.5 text-center">
                  {member.role}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 7. REPOSITORIO DE CÓDIGO */}
        <section className="px-6 py-16 border-b border-slate-200 bg-slate-50">
          <div className="max-w-3xl mx-auto text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-brand-primary shadow-2xs">
              <Code className="w-6 h-6" aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Transparencia y Código Abierto</h2>
            <p className="text-slate-600 text-sm sm:text-base mb-6 leading-relaxed">
              El código fuente de la plataforma OncoScan está disponible para revisión y reproducibilidad académica en GitHub.
            </p>
            <a
              href="https://github.com/ProyectoBenditos/Benditos_cancer_detector"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-6 py-3 bg-brand-primary hover:bg-brand-primary-hover text-white text-sm font-semibold rounded-xl transition shadow-2xs"
            >
              <span>Ver Repositorio</span>
              <ExternalLink className="ml-2 w-4 h-4 opacity-80" aria-hidden="true" />
            </a>
          </div>
        </section>

      </main>

      {/* 8. FOOTER */}
      <footer className="px-6 py-12 bg-slate-950 text-slate-400 text-center md:text-left font-sans">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start">
            <div className="flex items-center gap-2 mb-2">
              <Image
                src="/images/brand/logo-isotype.png"
                alt="Logo OncoScan"
                width={24}
                height={24}
                className="h-6 w-auto object-contain"
              />
              <span className="font-bold text-base text-white">
                Onco<span className="text-brand-danger">Scan</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 max-w-md">
              Herramienta de software para la evaluación y estratificación del riesgo de malignidad en nódulos pulmonares. Proyecto de investigación académica.
            </p>
          </div>
          <div className="flex gap-4 text-xs font-medium text-slate-400">
            <a
              href="https://github.com/ProyectoBenditos/Benditos_cancer_detector"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition"
            >
              GitHub
            </a>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-8 pt-8 border-t border-slate-800 text-xs text-slate-500 text-center">
          © {new Date().getFullYear()} OncoScan. Proyecto de Investigación Académica. Todos los derechos reservados.
        </div>
      </footer>

    </div>
  );
}
