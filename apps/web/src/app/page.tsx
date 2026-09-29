import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Upload,
  Users,
  Activity,
  FileText,
  ShieldCheck,
  Stethoscope,
  ArrowRight,
  CheckCircle2,
  Server,
  Database,
  Layout,
  Globe,
  BriefcaseMedical,
  Code,
  User,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { HeroDemoViewer } from "@/components/landing/HeroDemoViewer";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-brand-bg text-slate-900 selection:bg-brand-danger/20 font-sans">

      {/* 1. NAVBAR CLÍNICO */}
      <nav
        aria-label="Navegación principal"
        className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200"
      >
        <div className="max-w-6xl mx-auto px-6 h-18 flex items-center justify-between">
          {/* Logo oficial con isotipo + texto */}
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

          {/* Enlaces de navegación originales */}
          <div className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a
              href="#about"
              className="hover:text-brand-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded px-1 py-0.5"
            >
              Acerca de
            </a>
            <a
              href="#features"
              className="hover:text-brand-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded px-1 py-0.5"
            >
              Características
            </a>
            <a
              href="#architecture"
              className="hover:text-brand-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded px-1 py-0.5"
            >
              Tecnología
            </a>
            <a
              href="#team"
              className="hover:text-brand-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded px-1 py-0.5"
            >
              Equipo
            </a>
          </div>

          {/* Botón Ingresar */}
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
        {/* 2. HERO SECTION CON DEMOSTRACIÓN INTERACTIVA */}
        <header className="relative px-6 pt-12 pb-20 md:pt-16 md:pb-24 border-b border-slate-200">
          <div className="max-w-6xl mx-auto flex flex-col items-center text-center">
            
            {/* Badge de Investigación */}
            <div className="mb-5 inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs">
              <BriefcaseMedical className="w-3.5 h-3.5 mr-2 text-brand-danger" aria-hidden="true" />
              Prototipo de Investigación Académica
            </div>

            {/* H1 Principal con Rebranding */}
            <h1 className="max-w-4xl text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-900 mb-5 leading-[1.12]">
              Inteligencia Artificial para la{" "}
              <span className="text-brand-danger">
                Detección Temprana
              </span>
            </h1>

            {/* Subtítulo Original */}
            <p className="max-w-2xl text-base sm:text-lg text-slate-600 mb-5 leading-relaxed">
              Plataforma de análisis de imágenes médicas enfocada en priorizar el riesgo oncológico de pulmón para entornos con recursos clínicos limitados.
            </p>

            {/* Aviso Clínico Original */}
            <p className="max-w-2xl text-xs sm:text-sm text-slate-600 mb-8 px-4 py-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <strong>Aviso Clínico:</strong> Esta solución es una herramienta de apoyo investigativo y no reemplaza el juicio clínico del especialista oncológico o neumólogo.
            </p>

            {/* Botones de Acción Originales */}
            <div className="flex flex-wrap items-center justify-center gap-4 mb-14">
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
            </div>

            {/* Visor Clínico Interactivo con los 3 Modos (Cortina, Parpadeo manual con Espacio, Lado a lado) */}
            <div className="w-full max-w-xl">
              <HeroDemoViewer />
            </div>

          </div>
        </header>

        {/* 3. VALIDACIÓN DEL MODELO (LA NUEVA INFORMACIÓN SOLICITADA) */}
        <section id="validation" className="scroll-mt-20 py-14 bg-brand-primary text-white">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="text-xs font-mono uppercase tracking-widest text-slate-300 font-semibold bg-white/10 px-3 py-1 rounded-full border border-white/15">
                Validación Científica
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mt-3 text-white">
                Rendimiento Clínico del Modelo Multimodal
              </h2>
              <p className="text-slate-300 text-sm mt-2">
                Evaluado sobre el dataset internacional LIDC-IDRI con partición a nivel de paciente.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-center">
                <div className="text-3xl sm:text-4xl font-mono font-bold text-white mb-1">
                  85.2%
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
                  0.916
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
                  738
                </div>
                <div className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                  Tomografías de Test
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Casos de validación
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

        {/* 4. ACERCA DE (EL PROBLEMA DE LA DETECCIÓN TARDÍA) */}
        <section id="about" className="scroll-mt-20 px-6 py-20 bg-white border-b border-slate-200">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-12 items-center">
            <div className="md:w-1/2">
              <h2 className="text-3xl font-bold text-slate-900 mb-5">
                El Problema de la Detección Tardía
              </h2>
              <p className="text-slate-600 text-base mb-4 leading-relaxed">
                En Latinoamérica, el cáncer de pulmón se diagnostica frecuentemente en etapas avanzadas, reduciendo drásticamente las tasas de supervivencia. La escasez de especialistas y recursos para lectura oportuna de tomografías agrava esta situación.
              </p>
              <p className="text-slate-600 text-base mb-6 leading-relaxed">
                Nuestra propuesta de valor radica en un sistema de pre-evaluación algorítmica que clasifica y prioriza estudios (DICOM) para que los radiólogos y neumólogos enfoquen su atención donde más se necesita, optimizando tiempo y salvando vidas.
              </p>
              <ul className="space-y-3">
                {[
                  "Optimización del tiempo especialista",
                  "Interfaz diseñada para contextos clínicos reales",
                  "Integración estándar con archivos DICOM",
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
                    <h3 className="font-bold text-base text-slate-900">Priorización de Riesgo Alto</h3>
                    <p className="text-xs text-slate-600 mt-0.5">Reduce tiempos de espera del paciente</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start pb-5 border-b border-slate-200">
                  <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl shrink-0">
                    <ShieldCheck className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">Ambiente Seguro</h3>
                    <p className="text-xs text-slate-600 mt-0.5">Datos encriptados (Supabase RLS)</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl shrink-0">
                    <Stethoscope className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">Asistente, no reemplazo</h3>
                    <p className="text-xs text-slate-600 mt-0.5">Diseñado con &ldquo;Second-Reader Paradigm&rdquo;</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. CARACTERÍSTICAS (MÓDULOS DEL SISTEMA) */}
        <section id="features" className="scroll-mt-20 px-6 py-20 border-b border-slate-200">
          <div className="max-w-6xl mx-auto text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Módulos del Sistema</h2>
            <p className="text-slate-600 max-w-2xl mx-auto text-base">
              Componentes construidos para garantizar eficiencia operativa y seguridad clínica.
            </p>
          </div>

          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: <Upload className="w-5 h-5" aria-hidden="true" />, title: "Carga DICOM Segura", desc: "Subida de tomografías de tórax en formato estándar con extracción de metadatos." },
              { icon: <Users className="w-5 h-5" aria-hidden="true" />, title: "Gestión de Pacientes", desc: "Registro y seguimiento de pacientes vinculados a sus estudios clínicos." },
              { icon: <Activity className="w-5 h-5" aria-hidden="true" />, title: "Análisis con IA", desc: "Inferencia automática sobre imágenes: score de riesgo, nivel y recomendación clínica." },
              { icon: <FileText className="w-5 h-5" aria-hidden="true" />, title: "Historial y Reportes", desc: "Trazabilidad completa de estudios, análisis y reportes exportables." },
              { icon: <ShieldCheck className="w-5 h-5" aria-hidden="true" />, title: "Autenticación JWT", desc: "Acceso protegido exclusivo para médicos autorizados, con panel de administración." },
              { icon: <Stethoscope className="w-5 h-5" aria-hidden="true" />, title: "Dashboard de Alertas", desc: "Panel clínico con clasificación de riesgo y priorización de casos para el especialista." },
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

        {/* 6. TECNOLOGÍA (ARQUITECTURA MODERNA) */}
        <section id="architecture" className="scroll-mt-20 px-6 py-20 bg-white border-b border-slate-200">
          <div className="max-w-6xl mx-auto mb-14 text-center">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Arquitectura Moderna</h2>
            <p className="text-slate-600 max-w-2xl mx-auto text-base">
              Stack tecnológico de punta que asegura escalabilidad, velocidad y fiabilidad en tiempo real.
            </p>
          </div>

          <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: <Layout className="w-8 h-8" aria-hidden="true" />, title: "Next.js 16", sub: "Frontend (React)" },
              { icon: <Server className="w-8 h-8" aria-hidden="true" />, title: "FastAPI", sub: "Backend Python" },
              { icon: <Database className="w-8 h-8" aria-hidden="true" />, title: "Supabase", sub: "Auth & DB" },
              { icon: <Activity className="w-8 h-8" aria-hidden="true" />, title: "PyTorch", sub: "DL Framework" },
            ].map((tech, i) => (
              <div
                key={i}
                className="flex flex-col items-center justify-center p-6 bg-brand-bg border border-slate-200 rounded-2xl hover:border-slate-300 transition text-center group"
              >
                <div className="text-slate-600 group-hover:text-brand-primary transition mb-3">
                  {tech.icon}
                </div>
                <h4 className="font-bold text-base text-slate-900">{tech.title}</h4>
                <p className="text-xs text-slate-500 mt-0.5">{tech.sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 7. CONTEXTO DE INVESTIGACIÓN ESTUDIANTIL */}
        <section className="px-6 py-16 border-b border-slate-200">
          <div className="max-w-3xl mx-auto text-center border p-8 sm:p-10 rounded-2xl border-slate-200 bg-white shadow-2xs">
            <div className="w-12 h-12 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4 text-brand-primary">
              <Globe className="w-6 h-6" aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Contexto de Investigación Estudiantil</h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-5">
              Este prototipo se ha desarrollado dentro de un ambiente académico controlado como parte de un proyecto universitario. Todas las pruebas se realizan con datasets oncológicos públicos y anonimizados (ej. LIDC-IDRI).
            </p>
            <div className="inline-block px-3.5 py-1.5 bg-brand-danger/10 text-brand-danger rounded-lg text-xs font-semibold border border-brand-danger/20">
              Proyecto Universitario — Versión Final
            </div>
          </div>
        </section>

        {/* 8. EQUIPO DESARROLLADOR (CON SILUETA INSTITUCIONAL DE PERSONA) */}
        <section id="team" className="scroll-mt-20 px-6 py-20 bg-white border-b border-slate-200">
          <div className="max-w-6xl mx-auto text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Equipo Desarrollador</h2>
            <p className="text-slate-600 max-w-2xl mx-auto text-base">
              Investigadores y desarrolladores detrás de OncoScan.
            </p>
          </div>

          <div className="max-w-5xl mx-auto flex flex-wrap justify-center gap-6 sm:gap-8">
            {[
              { name: "Juan Esteban Aldana", role: "Backend Developer" },
              { name: "Nicolás Chávez Oliveros", role: "Tech Lead & Data Engineer" },
              { name: "Juan Pablo Sotelo Mejía", role: "Frontend & UI/UX" },
              { name: "Luis De Ávila Mosquera.", role: "AI Engineer & QA" },
              { name: "Juan Mateo Salas Arturo", role: "Project manager & DevOps" },
            ].map((member, i) => (
              <div key={i} className="flex flex-col items-center group w-44">
                <div className="w-20 h-20 mb-3 rounded-full bg-brand-bg border border-slate-200 overflow-hidden flex items-center justify-center text-slate-500 group-hover:border-brand-primary group-hover:text-brand-primary transition">
                  <User className="w-8 h-8 stroke-[1.5]" aria-hidden="true" />
                </div>
                <h4 className="font-bold text-sm text-slate-900 text-center leading-tight">{member.name}</h4>
                <p className="text-xs text-brand-danger font-medium mt-1 text-center">{member.role}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 9. INICIATIVA OPEN SOURCE */}
        <section className="px-6 py-20 border-b border-slate-200">
          <div className="max-w-3xl mx-auto text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-brand-primary shadow-2xs">
              <Code className="w-6 h-6" aria-hidden="true" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">Iniciativa Open Source</h2>
            <p className="text-slate-600 text-sm sm:text-base mb-6 leading-relaxed">
              Creemos que la tecnología médica debe ser transparente y auditable. El código base de la plataforma OncoScan está disponible en el repositorio de la organización.
            </p>
            <a
              href="https://github.com/ProyectoBenditos/Benditos_cancer_detector"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-6 py-3 bg-brand-primary hover:bg-brand-primary-hover text-white text-sm font-semibold rounded-xl transition"
            >
              <span>Ver Repositorio</span>
              <ExternalLink className="ml-2 w-4 h-4 opacity-80" aria-hidden="true" />
            </a>
          </div>
        </section>

      </main>

      {/* 10. FOOTER CON DESCARGO CLÍNICO */}
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
            <p className="text-xs text-slate-500 max-w-sm">
              Sistema de pre-evaluación algorítmica para riesgo oncológico. Proyecto universitario controlado.
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
          © {new Date().getFullYear()} OncoScan by ProyectoBenditos. Todos los derechos reservados.
        </div>
      </footer>

    </div>
  );
}
