import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";
import { 
  Upload, Users, Activity, FileText, ShieldCheck, Stethoscope,
  ArrowRight, CheckCircle2, Server, Database, Layout, Globe,
  BriefcaseMedical, Code
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#020B2D] text-white selection:bg-[#22AFFF]/30 font-sans">
      
      {/* 1. Navbar */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-[#020B2D]/80 backdrop-blur border-b border-white/10">
        <div className="flex items-center gap-2">
          <Image 
            src="/images/brand/logo-oncascan.png" 
            alt="OncaScan Logo" 
            width={120} 
            height={32} 
            className="h-8 w-auto object-contain"
          />
        </div>
        <div className="hidden md:flex gap-6 text-sm font-medium text-slate-300">
          <a href="#about" className="hover:text-[#22AFFF] transition">Acerca de</a>
          <a href="#features" className="hover:text-[#22AFFF] transition">Características</a>
          <a href="#architecture" className="hover:text-[#22AFFF] transition">Tecnología</a>
          <a href="#roadmap" className="hover:text-[#22AFFF] transition">Roadmap</a>
        </div>
        <div>
          <Link href="/login" className="px-5 py-2.5 bg-[#22AFFF] hover:bg-[#1a8ce6] text-[#020B2D] text-sm font-bold rounded-lg transition shadow-[0_0_15px_rgba(34,175,255,0.4)]">
            Ingresar
          </Link>
        </div>
      </nav>

      {/* 2. Hero Section */}
      <header className="relative px-6 py-24 md:py-32 overflow-hidden flex flex-col items-center text-center">
        {/* Glow effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#22AFFF]/20 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="mb-6 inline-flex rounded-full border border-[#22AFFF]/30 bg-[#22AFFF]/10 px-4 py-1.5 text-sm text-[#22AFFF] shadow-[0_0_10px_rgba(34,175,255,0.2)]">
          <BriefcaseMedical className="w-4 h-4 mr-2" />
          Prototipo de Investigación Académica
        </div>
        
        <h1 className="max-w-5xl text-5xl md:text-7xl font-bold tracking-tight mb-6 mt-4">
          Inteligencia Artificial para la <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#22AFFF] to-cyan-300">Detección Temprana</span>
        </h1>
        
        <p className="max-w-3xl text-lg md:text-xl text-slate-300 mb-4 leading-relaxed">
          Plataforma de análisis de imágenes médicas enfocada en priorizar el riesgo oncológico de pulmón para entornos con recursos clínicos limitados.
        </p>

        <p className="max-w-2xl text-xs md:text-sm text-slate-400 mb-10 px-4 py-3 bg-white/5 rounded-lg border border-white/10">
          ⚠️ <strong>Aviso Clínico:</strong> Esta solución es una herramienta de apoyo investigativo y no reemplaza el juicio clínico del especialista oncológico o neumólogo.
        </p>

        <div className="flex gap-4 relative z-10 mb-20">
          <Link href="/login" className="flex items-center px-6 py-3 bg-[#22AFFF] hover:bg-[#1a8ce6] text-[#020B2D] font-semibold rounded-lg transition shadow-[0_0_20px_rgba(34,175,255,0.4)]">
            Acceder a la Plataforma <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
          <a href="#about" className="flex items-center px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-medium rounded-lg transition border border-white/10">
            Conoce más
          </a>
        </div>

        <div className="w-full max-w-6xl relative z-10 perspective-1000">
          <div className="rounded-xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden transform hover:scale-[1.01] transition duration-500">
            <Image 
              src="/images/project/hero-dashboard.png" 
              alt="OncaScan Dashboard" 
              width={1200} 
              height={800} 
              className="w-full h-auto object-cover"
            />
          </div>
        </div>
      </header>

      {/* 3. About */}
      <section id="about" className="px-6 py-24 bg-[#010619]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-12 items-center">
          <div className="md:w-1/2">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">El Problema de la Detección Tardía</h2>
            <p className="text-slate-300 text-lg mb-4">
              En Latinoamérica, el cáncer de pulmón se diagnostica frecuentemente en etapas avanzadas, reduciendo drásticamente las tasas de supervivencia. La escasez de especialistas y recursos para lectura oportuna de tomografías agrava esta situación.
            </p>
            <p className="text-slate-300 text-lg mb-6">
              Nuestra propuesta de valor radica en un sistema de pre-evaluación algorítmica que clasifica y prioriza estudios (DICOM) para que los radiólogos y neumólogos enfoquen su atención donde más se necesita, optimizando tiempo y salvando vidas.
            </p>
            <ul className="space-y-3">
              {[
                "Optimización del tiempo especialista",
                "Interfaz diseñada para contextos clínicos reales",
                "Integración estándar con archivos DICOM",
              ].map((item, i) => (
                <li key={i} className="flex items-center text-slate-200">
                  <CheckCircle2 className="w-5 h-5 text-[#22AFFF] mr-3" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="md:w-1/2 relative">
            <div className="aspect-square bg-gradient-to-tr from-[#22AFFF]/20 to-blue-900/40 rounded-full blur-3xl absolute inset-0"></div>
            <div className="relative border border-white/10 bg-[#020B2D]/90 p-8 rounded-2xl shadow-2xl backdrop-blur-sm">
              <div className="flex gap-4 items-center mb-6 border-b border-white/10 pb-6">
                <div className="p-3 bg-red-500/20 text-red-400 rounded-lg"><Activity className="w-6 h-6" /></div>
                <div>
                  <h3 className="font-semibold text-lg">Priorización de Riesgo Alto</h3>
                  <p className="text-sm text-slate-400">Reduce tiempos de espera del paciente</p>
                </div>
              </div>
              <div className="flex gap-4 items-center mb-6 border-b border-white/10 pb-6">
                <div className="p-3 bg-amber-500/20 text-amber-400 rounded-lg"><ShieldCheck className="w-6 h-6" /></div>
                <div>
                  <h3 className="font-semibold text-lg">Ambiente Seguro</h3>
                  <p className="text-sm text-slate-400">Datos encriptados (Supabase RLS)</p>
                </div>
              </div>
              <div className="flex gap-4 items-center">
                <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-lg"><Stethoscope className="w-6 h-6" /></div>
                <div>
                  <h3 className="font-semibold text-lg">Asistente, no reemplazo</h3>
                  <p className="text-sm text-slate-400">Diseñado con "Second-Reader Paradigm"</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Features */}
      <section id="features" className="px-6 py-24 bg-[#020B2D] relative border-t border-white/5">
        <div className="max-w-6xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Módulos del Sistema</h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Componentes construidos para garantizar eficiencia operativa y seguridad clínica.
          </p>
        </div>
        
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: <Upload className="w-6 h-6" />, title: "Carga DICOM Segura", desc: "Subida robusta de tomografías de tórax en formato estándar." },
            { icon: <Users className="w-6 h-6" />, title: "Gestión de Pacientes", desc: "Perfiles anónimos para proteger la PHI según normativas." },
            { icon: <Activity className="w-6 h-6" />, title: "Análisis con IA (Próx.)", desc: "Inferencia automática usando redes neuronales profundas." },
            { icon: <FileText className="w-6 h-6" />, title: "Historial Clínico", desc: "Trazabilidad completa de estudios y reportes subidos." },
            { icon: <ShieldCheck className="w-6 h-6" />, title: "Autenticación JWT", desc: "Acceso protegido exclusivo para investigadores autorizados." },
            { icon: <Stethoscope className="w-6 h-6" />, title: "Interfaz Médica", desc: "UI orientada a radiología, reduciendo la fatiga visual." },
          ].map((feature, i) => (
            <Card key={i} className="bg-white/5 border-white/10 hover:bg-white/10 hover:border-[#22AFFF]/50 transition duration-300">
              <CardContent className="p-6 flex flex-col items-start gap-4">
                <div className="p-3 bg-[#22AFFF]/10 text-[#22AFFF] rounded-xl">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-slate-100">{feature.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{feature.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* 5. Architecture */}
      <section id="architecture" className="px-6 py-24 bg-[#010619] border-t border-white/5">
        <div className="max-w-6xl mx-auto mb-16 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Arquitectura Moderna</h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Stack tecnológico de punta que asegura escalabilidad, velocidad y fiabilidad en tiempo real.
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: <Layout className="w-10 h-10" />, title: "Next.js 14", sub: "Frontend (React)" },
            { icon: <Server className="w-10 h-10" />, title: "FastAPI", sub: "Backend Python" },
            { icon: <Database className="w-10 h-10" />, title: "Supabase", sub: "Auth & DB" },
            { icon: <Activity className="w-10 h-10" />, title: "PyTorch", sub: "DL Framework" },
          ].map((tech, i) => (
            <div key={i} className="flex flex-col items-center justify-center p-6 bg-white/5 border border-white/10 rounded-2xl hover:border-[#22AFFF]/40 transition text-center group">
              <div className="text-slate-400 group-hover:text-[#22AFFF] transition mb-3">
                {tech.icon}
              </div>
              <h4 className="font-semibold text-lg">{tech.title}</h4>
              <p className="text-xs text-slate-400">{tech.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Research */}
      <section className="px-6 py-24 bg-[#020B2D] border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center border p-12 rounded-3xl border-white/10 bg-gradient-to-b from-white/5 to-transparent">
          <div className="w-16 h-16 mx-auto bg-white/10 rounded-full flex items-center justify-center mb-6">
            <Globe className="text-[#22AFFF] w-8 h-8" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Contexto de Investigación Estudiantil</h2>
          <p className="text-slate-300 text-lg leading-relaxed mb-6">
            Este prototipo se ha desarrollado dentro de un ambiente académico controlado como parte de un proyecto universitario. Todas las pruebas se realizan con datasets oncológicos públicos y anonimizados (ej. LIDC-IDRI). 
          </p>
          <div className="inline-block px-4 py-2 bg-blue-900/30 text-blue-300 rounded-lg text-sm border border-blue-800">
            Fase de Desarrollo Universitario
          </div>
        </div>
      </section>

      {/* 7. Team */}
      <section className="px-6 py-24 bg-[#010619] border-t border-white/5">
        <div className="max-w-6xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Equipo Desarrollador</h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Investigadores y desarrolladores detrás de OncaScan.
          </p>
        </div>
        
        <div className="max-w-5xl mx-auto flex flex-wrap justify-center gap-8">
          {[
            { name: "Andres Suarez", role: "Frontend & UI/UX" },
            { name: "Valeria", role: "Backend & ML" },
            { name: "Juan David", role: "DevOps & Cloud" },
            { name: "Andres B.", role: "Investigador Clínico" },
            { name: "Santiago", role: "Product Manager" },
          ].map((member, i) => (
            <div key={i} className="flex flex-col items-center group">
              <div className="w-24 h-24 mb-4 rounded-full bg-gradient-to-br from-white/10 to-white/5 border border-white/20 overflow-hidden flex items-center justify-center group-hover:border-[#22AFFF] transition">
                <Users className="w-8 h-8 text-slate-500 group-hover:text-[#22AFFF]" />
              </div>
              <h4 className="font-semibold text-slate-100">{member.name}</h4>
              <p className="text-xs text-[#22AFFF]">{member.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 8. Open Source / GitHub */}
      <section className="px-6 py-24 bg-[#020B2D] border-t border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-slate-800/50 blur-[100px] rounded-full"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <Code className="w-16 h-16 mx-auto mb-6 text-slate-300" />
          <h2 className="text-3xl font-bold mb-4">Iniciativa Open Source</h2>
          <p className="text-slate-400 text-lg mb-8 max-w-2xl mx-auto">
            Creemos que la tecnología médica debe ser transparente y auditable. El código base de la plataforma OncaScan estará disponible en el repositorio de la organización.
          </p>
          <a href="https://github.com/ProyectoBenditos/Benditos_cancer_detector" target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-6 py-3 bg-white text-[#020B2D] font-medium rounded-lg hover:bg-slate-200 transition">
            Ver Repositorio <ArrowRight className="ml-2 w-4 h-4" />
          </a>
        </div>
      </section>

      {/* 9. Roadmap */}
      <section id="roadmap" className="px-6 py-24 bg-[#010619] border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Hoja de Ruta del Proyecto</h2>
        </div>
        
        <div className="max-w-3xl mx-auto space-y-6">
          {[
            { phase: "Fase 1", title: "MVP Funcional (Actual)", status: "Completado", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
            { phase: "Fase 2", title: "Integración de Modelos de Predicción", status: "En Proceso", color: "text-[#22AFFF] bg-[#22AFFF]/10 border-[#22AFFF]/20" },
            { phase: "Fase 3", title: "Visor DICOM Interactivo Base", status: "Planificado", color: "text-slate-400 bg-slate-800/50 border-white/10" },
            { phase: "Fase 4", title: "Entrenamiento de modelo", status: "Futuro", color: "text-slate-400 bg-slate-800/50 border-white/10" },
          ].map((item, i) => (
            <div key={i} className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-white/5 border border-white/10 rounded-xl">
              <div className="mb-4 md:mb-0">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 block">{item.phase}</span>
                <h4 className="text-lg font-semibold">{item.title}</h4>
              </div>
              <div className={`px-4 py-1.5 rounded-full text-xs font-medium border ${item.color} w-fit`}>
                {item.status}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 10. Footer */}
      <footer className="px-6 py-12 bg-[#00030d] border-t border-white/10 text-center md:text-left">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start">
            <Image src="/images/brand/logo-oncascan.png" alt="Logo" width={100} height={26} className="h-6 w-auto mb-4 opacity-70 grayscale hover:grayscale-0 transition" />
            <p className="text-xs text-slate-500 max-w-sm">
              Sistema de pre-evaluación algorítmica para riesgo oncológico. Proyecto universitario controlado.
            </p>
          </div>
          <div className="flex gap-4 text-xs font-medium text-slate-500">
            <a href="#" className="hover:text-white transition">Privacidad</a>
            <a href="#" className="hover:text-white transition">Términos</a>
            <a href="https://github.com/ProyectoBenditos" className="hover:text-white transition">GitHub</a>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-8 pt-8 border-t border-white/5 text-xs text-slate-600 text-center">
          © {new Date().getFullYear()} OncaScan by ProyectoBenditos. Todos los derechos reservados.
        </div>
      </footer>

    </div>
  );
}