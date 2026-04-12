"use client";

import Link from "next/link";
import { LayoutDashboard, Users, Bell, Brain, FileText, Settings, Upload, FileStack } from "lucide-react";
import { PhantomLink } from "../ui/PhantomButton";
import { usePathname } from "next/navigation";

export function Sidebar() {
  const pathname = usePathname();
  
  const isActive = (path: string) => {
    if (path === "/platform" && pathname === "/platform") return true;
    if (path !== "/platform" && pathname?.startsWith(path)) return true;
    return false;
  };

  return (
    <aside className="w-64 bg-[#0A0A0A] text-slate-300 flex flex-col h-screen fixed left-0 top-0 border-r border-slate-800">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold text-white tracking-wide">
          <span className="text-rose-600">Onca</span>Scan
        </h1>
      </div>
      
      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Principal</p>
        
        <Link 
          href="/platform" 
          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive('/platform') && pathname === '/platform' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800'}`}
        >
          <LayoutDashboard className="w-5 h-5" />
          Dashboard
        </Link>
        <Link 
          href="/platform/upload" 
          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive('/platform/upload') ? 'bg-slate-800 text-white' : 'hover:bg-slate-800'}`}
        >
          <Upload className="w-5 h-5" />
          Carga DICOM
        </Link>
        <Link 
          href="/platform/uploads" 
          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive('/platform/uploads') ? 'bg-slate-800 text-white' : 'hover:bg-slate-800'}`}
        >
          <FileStack className="w-5 h-5" />
          Historial
        </Link>
        
        <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mt-6 mb-2">Clínico</p>
        
        <PhantomLink featureName="Módulo de Pacientes" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors opacity-70">
          <Users className="w-5 h-5" />
          Pacientes
        </PhantomLink>
        
        <PhantomLink featureName="Centro de Alertas" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors opacity-70">
          <Bell className="w-5 h-5" />
          Centro de Alertas
        </PhantomLink>
        
        <PhantomLink featureName="Análisis de IA" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors opacity-70">
          <Brain className="w-5 h-5" />
          Análisis IA
        </PhantomLink>

        <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mt-6 mb-2">Sistema</p>

        <PhantomLink featureName="Generación de Reportes" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors opacity-70">
          <FileText className="w-5 h-5" />
          Reportes
        </PhantomLink>
        
        <PhantomLink featureName="Ajustes de Plataforma" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors opacity-70">
          <Settings className="w-5 h-5" />
          Ajustes
        </PhantomLink>
      </nav>
      
      <div className="p-4 border-t border-slate-800 text-xs text-slate-500 text-center">
        OncaScan MVP v1.0 <br />Uso Académico
      </div>
    </aside>
  );
}
